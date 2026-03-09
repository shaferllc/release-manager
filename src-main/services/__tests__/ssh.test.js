const { createSshManager } = require('../ssh');

describe('ssh', () => {
  describe('createSshManager', () => {
    let getPreference;
    let setPreference;
    let manager;

    beforeEach(() => {
      const prefs = {};
      getPreference = (key) => prefs[key];
      setPreference = (key, value) => { prefs[key] = value; };
      manager = createSshManager({ getPreference, setPreference });
    });

    describe('getSshConnections', () => {
      it('returns empty array when no connections saved', () => {
        expect(manager.getSshConnections()).toEqual([]);
      });

      it('returns saved connections after setSshConnections', () => {
        const list = [{ id: '1', name: 'Server', host: 'host.example.com', user: 'root', port: 22 }];
        manager.setSshConnections(list);
        expect(manager.getSshConnections()).toEqual(list);
      });
    });

    describe('setSshConnections', () => {
      it('stores connections and getSshConnections returns them', () => {
        const list = [{ id: 'a', host: 'a.com', user: 'deploy' }];
        manager.setSshConnections(list);
        expect(manager.getSshConnections()).toEqual(list);
      });

      it('replaces previous list', () => {
        manager.setSshConnections([{ id: '1', host: 'one.com' }]);
        manager.setSshConnections([{ id: '2', host: 'two.com' }]);
        expect(manager.getSshConnections()).toHaveLength(1);
        expect(manager.getSshConnections()[0].host).toBe('two.com');
      });

      it('normalizes non-array to empty', () => {
        manager.setSshConnections(null);
        expect(manager.getSshConnections()).toEqual([]);
      });
    });

    describe('openSshInTerminal', () => {
      it('returns error when connection missing', async () => {
        const result = await manager.openSshInTerminal(null);
        expect(result.ok).toBe(false);
        expect(result.error).toContain('host');
      });

      it('returns error when host is empty', async () => {
        const result = await manager.openSshInTerminal({ host: '  ', user: 'root' });
        expect(result.ok).toBe(false);
      });

      it('returns error when host is not a string', async () => {
        const result = await manager.openSshInTerminal({ host: 123 });
        expect(result.ok).toBe(false);
      });

      it('returns ok: true when host and user provided (spawns terminal)', async () => {
        const result = await manager.openSshInTerminal({
          host: 'example.com',
          user: 'root',
          port: 22,
        });
        expect(result.ok).toBe(true);
      });
    });
  });
});
