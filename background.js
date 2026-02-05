const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function sanitizeFilePart(input, fallback = 'pinterest-image') {
  return (input || fallback)
    .toString()
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || fallback;
}

function extensionFromUrl(url) {
  const clean = url.split('?')[0].toLowerCase();
  const ext = clean.split('.').pop();
  return IMAGE_EXTENSIONS.includes(ext) ? ext : 'jpg';
}

function buildFilename(payload) {
  const board = sanitizeFilePart(payload.boardName, 'pinterest-board');
  const title = sanitizeFilePart(payload.imageName || payload.alt || payload.pinId || 'image');
  const ext = extensionFromUrl(payload.url);
  return `${board}/${title}.${ext}`;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'DOWNLOAD_IMAGE') {
    return false;
  }

  const filename = buildFilename(message.payload || {});
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
