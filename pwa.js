/* Install and offline support stays separate from the game. */
(() => {
  'use strict';
  const help = document.getElementById('pwa-install-help');
  const instructions = document.getElementById('pwa-instructions');
  const installButton = document.getElementById('btn-install');
  const status = document.getElementById('pwa-status');
  const retryButton = document.getElementById('btn-offline-retry');
  const update = document.getElementById('pwa-update');
  const standalone = window.matchMedia('(display-mode: standalone)');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installPrompt = null;
  let busy = false;
  let offlineReady = false;

  const syncInstallHelp = () => {
    help.hidden = standalone.matches || navigator.standalone === true;
  };
  syncInstallHelp();
  standalone.addEventListener('change', syncInstallHelp);
  if (isIOS) {
    instructions.textContent = '用 Safari 打开此页面，点“分享”（部分版本先点“更多”），选择“添加到主屏幕”。如有“作为网页 App 打开”选项，请开启，再点“添加”。添加后请从桌面打开一次，等离线准备完成。';
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    installButton.hidden = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') help.open = false;
    } catch (error) {
      instructions.textContent = '请在浏览器菜单中选择“安装应用”或“添加到主屏幕”。';
    }
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    help.hidden = true;
    installButton.hidden = true;
  });

  if (!window.isSecureContext || !/^https?:$/.test(location.protocol)) {
    status.textContent = '通过 HTTPS 网页地址打开后，可准备离线游戏。';
    return;
  }
  if (!('serviceWorker' in navigator)) {
    status.textContent = '此浏览器暂不支持离线，仍可在线玩。';
    return;
  }

  const ready = () => {
    offlineReady = true;
    busy = false;
    status.dataset.ready = 'true';
    status.textContent = '离线已就绪 · 断网也能玩';
    retryButton.hidden = true;
  };
  const failed = () => {
    busy = false;
    if (offlineReady) return;
    status.textContent = '离线内容尚未准备好，请联网后重试。';
    retryButton.hidden = false;
  };
  const register = async () => {
    if (busy) return;
    busy = true;
    retryButton.hidden = true;
    if (!offlineReady) status.textContent = '正在准备离线游戏…';
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      if (registration.active) ready();
      if (registration.waiting) update.hidden = false;
      const watch = worker => {
        if (!worker) return;
        const changed = () => {
          if (worker.state === 'activated') ready();
          if (worker.state === 'installed' && registration.active) update.hidden = false;
          if (worker.state === 'redundant') failed();
        };
        worker.addEventListener('statechange', changed);
        changed();
      };
      watch(registration.installing);
      registration.addEventListener('updatefound', () => watch(registration.installing));
    } catch (error) {
      failed();
    }
  };
  retryButton.addEventListener('click', register);
  window.addEventListener('online', () => { if (!offlineReady) register(); });
  register();
})();
