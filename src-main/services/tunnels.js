/**
 * Create the web tunnels service (Expose-style, localtunnel).
 * @param {Object} deps
 * @param {Function} deps.send - (channel, ...args) => void
 * @param {Function} deps.localtunnel - (port, opts, callback) => void
 */
function createTunnelService(deps) {
  const { send, localtunnel } = deps;
  const activeTunnels = new Map();

  function notifyTunnelsChanged() {
    send('rm-tunnels-changed');
  }

  function startTunnel(port, subdomain) {
    const portNum = Math.max(1, Math.min(65535, parseInt(port, 10) || 0));
    if (!portNum) return Promise.resolve({ ok: false, error: 'Invalid port' });
    return new Promise((resolve) => {
      const opts = {};
      if (subdomain && typeof subdomain === 'string' && subdomain.trim()) opts.subdomain = subdomain.trim();
      localtunnel(portNum, opts, (err, tunnel) => {
        if (err) {
          resolve({ ok: false, error: err.message || 'Tunnel failed to start' });
          return;
        }
        const id = `tunnel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const entry = { id, port: portNum, subdomain: opts.subdomain || null, url: tunnel.url, tunnel };
        tunnel.once('close', () => {
          activeTunnels.delete(id);
          notifyTunnelsChanged();
        });
        tunnel.once('error', () => {
          activeTunnels.delete(id);
          notifyTunnelsChanged();
        });
        activeTunnels.set(id, entry);
        notifyTunnelsChanged();
        resolve({ ok: true, id, port: portNum, url: tunnel.url });
      });
    });
  }

  function stopTunnel(id) {
    const entry = activeTunnels.get(id);
    if (!entry) return Promise.resolve({ ok: true, wasRunning: false });
    return new Promise((resolve) => {
      try {
        entry.tunnel.close();
        activeTunnels.delete(id);
        notifyTunnelsChanged();
        resolve({ ok: true, wasRunning: true });
      } catch (e) {
        activeTunnels.delete(id);
        notifyTunnelsChanged();
        resolve({ ok: false, error: e.message || 'Failed to close tunnel' });
      }
    });
  }

  function getTunnels() {
    return Array.from(activeTunnels.values()).map(({ id, port, subdomain, url }) => ({ id, port, subdomain, url }));
  }

  function cleanup() {
    try {
      for (const [, entry] of activeTunnels) {
        if (entry.tunnel && typeof entry.tunnel.close === 'function') entry.tunnel.close();
      }
      activeTunnels.clear();
    } catch (_) {}
  }

  return {
    startTunnel,
    stopTunnel,
    getTunnels,
    cleanup,
  };
}

module.exports = { createTunnelService };
