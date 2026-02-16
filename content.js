const CONTROL_ID = 'pin-dl-controls';
const BTN_CLASS = 'pin-dl-button';
const STATUS_ID = 'pin-dl-status';

function injectStyles() {
  if (document.getElementById('pin-dl-style')) return;
  const style = document.createElement('style');
  style.id = 'pin-dl-style';
  style.textContent = `
    #${CONTROL_ID} {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
    }
    .${BTN_CLASS} {
      border: none;
      border-radius: 999px;
      padding: 10px 14px;
      background: #e60023;
      color: #fff;
      font: 600 13px/1.2 system-ui, sans-serif;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
    }
    .${BTN_CLASS}[disabled] {
      opacity: 0.65;
      cursor: not-allowed;
    }
    #${STATUS_ID} {
      background: rgba(0, 0, 0, 0.78);
      color: #fff;
      padding: 6px 10px;
      border-radius: 999px;
      font: 500 12px/1.2 system-ui, sans-serif;
      max-width: 320px;
      word-break: break-word;
    }
  `;
  document.documentElement.appendChild(style);
}

function setStatus(message) {
  const el = document.getElementById(STATUS_ID);
  if (el) el.textContent = message;
}

function getPathParts() {
  return location.pathname.split('/').filter(Boolean);
}

function isBoardPage() {
  const parts = getPathParts();
  if (parts.length < 2) return false;

  const blocked = new Set([
    'pin',
    'search',
    'ideas',
    'today',
    'explore',
    'video',
    'videos',
    'business',
    'settings',
    '_tools',
    'categories'
  ]);

  return !blocked.has(parts[0]);
}

function getBoardName() {
  const parts = getPathParts();
  if (parts.length >= 2 && isBoardPage()) {
    return decodeURIComponent(parts[1]);
  }

  const title = (document.title || '').replace(/\s*\|\s*Pinterest.*$/i, '').trim();
  return title || 'pinterest-board';
}

function parseSrcsetLargest(srcset) {
  if (!srcset) return '';

  const entries = srcset
    .split(',')
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((entry) => {
      const [url, descriptor = '1x'] = entry.split(/\s+/);
      const score = Number(descriptor.replace(/[^\d.]/g, '')) || 1;
      return { url, score };
    })
    .filter((entry) => entry.url);

  if (!entries.length) return '';
  entries.sort((a, b) => b.score - a.score);
  return entries[0].url;
}

function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}

function buildImageName({ alt, linkTitle, pinId, url }) {
  if (alt) return alt;
  if (linkTitle) return linkTitle;
  if (pinId) return `pin-${pinId}`;

  const leaf = (url.split('?')[0].split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '');
  return leaf || `image-${Date.now()}`;
}

function extractPinData(img) {
  const srcsetUrl = parseSrcsetLargest(img.getAttribute('srcset'));
  const rawUrl = srcsetUrl || img.currentSrc || img.src || '';
  if (!rawUrl || !rawUrl.includes('pinimg.com')) return null;

  const link = img.closest('a[href*="/pin/"]');
  const pinId = link?.href?.match(/\/pin\/(\d+)/)?.[1] || '';
  const alt = (img.getAttribute('alt') || '').trim();
  const linkTitle = (link?.getAttribute('aria-label') || '').trim();
  const imageName = buildImageName({ alt, linkTitle, pinId, url: rawUrl });

  return {
    url: rawUrl,
    pinId,
    alt,
    imageName,
    boardName: getBoardName()
  };
}

function collectPins({ visibleOnly }) {
  const all = Array.from(document.querySelectorAll('img[src*="pinimg.com"], img[srcset*="pinimg.com"]'));
  const seen = new Set();
  const pins = [];

  for (const img of all) {
    if (visibleOnly && !isInViewport(img)) continue;
    const pin = extractPinData(img);
    if (!pin) continue;

    const key = pin.pinId || pin.url;
    if (seen.has(key)) continue;
    seen.add(key);
    pins.push(pin);
  }

  return pins;
}

function sendDownload(payload) {
  return chrome.runtime.sendMessage({ type: 'DOWNLOAD_IMAGE', payload });
}

async function startDownloads(pins, label) {
  if (!pins.length) {
    setStatus(`No Pinterest images found for ${label}.`);
    return;
  }

  setStatus(`Starting ${pins.length} downloads...`);
  let success = 0;

  for (const pin of pins) {
    try {
      const result = await sendDownload(pin);
      if (result?.ok) success += 1;
    } catch (_err) {
      // Continue on individual failures.
    }

    await new Promise((resolve) => setTimeout(resolve, 90));
  }

  setStatus(`Done: ${success}/${pins.length} downloads started.`);
}

async function downloadVisible() {
  const pins = collectPins({ visibleOnly: true });
  await startDownloads(pins, 'visible screen');
}

async function autoScrollAndCollect(limit = 300) {
  const seen = new Map();
  let stableRounds = 0;

  for (let rounds = 0; rounds < 30 && seen.size < limit && stableRounds < 4; rounds += 1) {
    const current = collectPins({ visibleOnly: false });
    const before = seen.size;

    for (const pin of current) {
      const key = pin.pinId || pin.url;
      seen.set(key, pin);
    }

    setStatus(`Scanning board... found ${seen.size} images`);

    window.scrollBy(0, Math.floor(window.innerHeight * 0.9));
    await new Promise((resolve) => setTimeout(resolve, 900));

    if (seen.size === before) stableRounds += 1;
    else stableRounds = 0;
  }

  return Array.from(seen.values());
}

async function downloadBoard() {
  if (!isBoardPage()) {
    setStatus('Open a Pinterest board page to use board download.');
    return;
  }

  const startY = window.scrollY;
  const pins = await autoScrollAndCollect(300);
  window.scrollTo(0, startY);
  await startDownloads(pins, 'board');
}

function addControls() {
  if (document.getElementById(CONTROL_ID)) return;

  const wrap = document.createElement('div');
  wrap.id = CONTROL_ID;

  const visibleBtn = document.createElement('button');
  visibleBtn.className = BTN_CLASS;
  visibleBtn.textContent = 'Download images on screen';
  visibleBtn.addEventListener('click', downloadVisible);

  const boardBtn = document.createElement('button');
  boardBtn.className = BTN_CLASS;
  boardBtn.textContent = 'Download whole board';
  boardBtn.disabled = !isBoardPage();
  boardBtn.dataset.boardButton = 'true';
  boardBtn.addEventListener('click', downloadBoard);

  const status = document.createElement('div');
  status.id = STATUS_ID;
  status.textContent = 'Ready';

  wrap.appendChild(visibleBtn);
  wrap.appendChild(boardBtn);
  wrap.appendChild(status);
  document.body.appendChild(wrap);
}

function refreshControlsForRoute() {
  const boardBtn = document.querySelector(`[data-board-button="true"]`);
  if (!boardBtn) return;
  boardBtn.disabled = !isBoardPage();
}

function monitorRouteChanges() {
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      refreshControlsForRoute();
      setStatus('Ready');
    }
  }, 700);
}

function init() {
  injectStyles();
  addControls();
  monitorRouteChanges();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
