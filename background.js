const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function sanitizeFilePart(input, fallback = 'pinterest-image') {
  return (input || fallback)
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || fallback;
}

function extensionFromUrl(url = '') {
  const clean = url.split('?')[0].toLowerCase();
  const ext = clean.split('.').pop();
  return IMAGE_EXTENSIONS.includes(ext) ? ext : 'jpg';
}

function fallbackNameFromUrl(url = '') {
  const clean = url.split('?')[0];
  const leaf = clean.split('/').pop() || 'image';
  return leaf.replace(/\.[a-z0-9]+$/i, '');
}

function buildFilename(payload) {
  const board = sanitizeFilePart(payload.boardName, 'pinterest-board');
  const baseName = payload.imageName || payload.alt || payload.pinId || fallbackNameFromUrl(payload.url);
  const title = sanitizeFilePart(baseName, 'image');
  const ext = extensionFromUrl(payload.url);
  return `${board}/${title}.${ext}`;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'DOWNLOAD_IMAGE' || !message?.payload?.url) {
    return false;
  }

  const filename = buildFilename(message.payload);
  chrome.downloads.download(
    {
      url: message.payload.url,
      filename,
      conflictAction: 'uniquify',
      saveAs: false
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ ok: true, downloadId, filename });
    }
  );

  return true;
});
