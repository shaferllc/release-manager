const DEFAULT_PORT = 3848;
const STORAGE_KEY = 'bookmarksReceiverPort';

async function getPort() {
  const { [STORAGE_KEY]: port } = await chrome.storage.local.get(STORAGE_KEY);
  return typeof port === 'number' && port > 0 && port < 65536 ? port : DEFAULT_PORT;
}

function showMessage(text, isError = false) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.className = 'message ' + (isError ? 'error' : 'success');
}

document.getElementById('send').addEventListener('click', async () => {
  const btn = document.getElementById('send');
  btn.disabled = true;
  showMessage('');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showMessage('This page cannot be bookmarked.', true);
      btn.disabled = false;
      return;
    }
    const port = await getPort();
    const url = `http://127.0.0.1:${port}/bookmarks`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: tab.title || undefined,
        url: tab.url,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      showMessage('Bookmark added.');
    } else {
      showMessage(data.error || `Error ${res.status}`, true);
    }
  } catch (e) {
    showMessage('Release Manager may be closed or the port may be wrong.', true);
  }
  btn.disabled = false;
});
