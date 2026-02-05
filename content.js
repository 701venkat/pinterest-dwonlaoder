const CONTROL_ID = 'pin-dl-controls';
const BTN_CLASS = 'pin-dl-button';

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
    }
    .${BTN_CLASS} {
      border: none;
      border-radius: 999px;
      padding: 10px 14px;
      background: #e60023;
      color: white;
      font: 600 13px/1.2 system-ui, sans-serif;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.22);
    }
    .${BTN_CLASS}:hover { filter: brightness(0.95); }
  `;
  document.documentElement.appendChild(style);
}

function getBoardName() {
  const path = location.pathname.split('/').filter(Boolean);
  if (path.length >= 2 && path[1] !== 'pin') {
    return decodeURIComponent(path[1]);
  }
  const title = document.title?.replace(/\s*\|\s*Pinterest.*$/i, '').trim();
  return title || 'pinterest-board';
}

function pickHighestQuality(srcset) {
  if (!srcset) return '';
  const options = srcset.split(',').map((part) => part.trim()).filter(Boolean);
  if (!options.length) return '';

  const parsed = options
    .map((entry) => {
      const [url, descriptor] = entry.split(/\s+/);
      const scale = Number(descriptor?.replace('x', '')) || 1;
      return { url, scale };
    })
    .sort((a, b) => b.scale - a.scale);

  return parsed[0]?.url || '';
}

function extractPinData(img) {
  const url = pickHighestQuality(img.getAttribute('srcset')) || img.currentSrc || img.src;
  if (!url) return null;

  const link = img.closest('a[href*="/pin/"]');
  const pinId = link?.href?.match(/\/pin\/(\d+)/)?.[1] || '';
  const alt = img.getAttribute('alt') || '';
  const imageName = alt || `pin-${pinId || Date.now()}`;

  return {
    url,
    pinId,
    alt,
    imageName,
    boardName: getBoardName()
  };
}

function uniquePins() {
  const all = Array.from(document.querySelectorAll('img[src*="i.pinimg.com"], img[srcset*="i.pinimg.com"]'));
  const seen = new Set();
  const results = [];

  for (const img of all) {
    const pin = extractPinData(img);
    if (!pin || seen.has(pin.url)) continue;
    seen.add(pin.url);
    results.push(pin);
  }

  return results;
}

async function downloadOne(payload) {
  return chrome.runtime.sendMessage({
    type: 'DOWNLOAD_IMAGE',
    payload
  });
}

async function downloadBoard() {
  const pins = uniquePins();
  if (!pins.length) {
    alert('No Pinterest images found on this screen yet. Scroll to load more pins and try again.');
    return;
  }

  for (const pin of pins) {
    await downloadOne(pin);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  alert(`Started ${pins.length} downloads. Files are grouped in a board folder with image names.`);
}

function addControls() {
  if (document.getElementById(CONTROL_ID)) return;

  const wrap = document.createElement('div');
  wrap.id = CONTROL_ID;

  const downloadScreenBtn = document.createElement('button');
  downloadScreenBtn.className = BTN_CLASS;
  downloadScreenBtn.textContent = 'Download images on screen';
  downloadScreenBtn.addEventListener('click', downloadBoard);

  wrap.appendChild(downloadScreenBtn);
  document.body.appendChild(wrap);
}

function init() {
  injectStyles();
  addControls();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
