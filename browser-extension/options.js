const STORAGE_KEY = 'bookmarksReceiverPort';
const DEFAULT_PORT = 3848;

document.getElementById('port').value = DEFAULT_PORT;
chrome.storage.local.get(STORAGE_KEY, (o) => {
  if (typeof o[STORAGE_KEY] === 'number') document.getElementById('port').value = o[STORAGE_KEY];
});

document.getElementById('save').addEventListener('click', () => {
  const p = parseInt(document.getElementById('port').value, 10);
  if (!Number.isFinite(p) || p < 1 || p > 65535) {
    document.getElementById('status').textContent = 'Enter a port between 1 and 65535.';
    return;
  }
  chrome.storage.local.set({ [STORAGE_KEY]: p }, () => {
    document.getElementById('status').textContent = 'Saved.';
  });
});
