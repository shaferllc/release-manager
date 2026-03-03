/**
 * Command-line API for Shipwell. Run the app with subcommands to get JSON output without opening the GUI.
 * Example: electron . -- projects   or   Shipwell -- info /path/to/project
 */

const path = require('path');
const pkg = require(path.join(__dirname, '..', 'package.json'));

function out(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function err(msg) {
  console.error(msg);
}

/**
 * Get CLI args (after -- or from argv slice).
 */
function getCliArgs() {
  const i = process.argv.indexOf('--');
  if (i >= 0 && process.argv.length > i + 1) {
    return process.argv.slice(i + 1);
  }
  return process.argv.slice(2);
}

const HELP = `
Shipwell CLI – interact with the app from the terminal.
Output is JSON to stdout; errors go to stderr. Exit code 0 on success, 1 on error.

Usage:
  shipwell [command] [options...]
  shipwell -- [command] [options...]   (when using electron . --)

Commands:
  help                     Show this help
  version                  Print app version
  projects                 List saved project paths (name, path, tags, starred)
  dashboard                List all projects with full info (version, branch, tags, ahead/behind)
  info <path>              Get project info for a directory (version, branch, git, etc.)
  add <path> [name]        Add a project (optional display name)
  remove <path>            Remove a project from the list
  api <method> [params]    Call any API method; params are JSON. Example: api getBranches '["/path"]'

Examples:
  shipwell projects
  shipwell dashboard
  shipwell info /Users/me/my-app
  shipwell add /Users/me/new-repo "My Repo"
  shipwell api getCommitLog '["/path", 10]'
`.trim();

/**
 * Run CLI: parse args, invoke apiRegistry, print result, resolve with exit code.
 * @param {Record<string, Function>} apiRegistry - same registry used by IPC/HTTP
 * @param {string[]} argv - CLI args (e.g. from getCliArgs())
 * @returns {Promise<number>} exit code 0 or 1
 */
async function runCli(apiRegistry, argv) {
  const args = argv && argv.length ? argv : ['help'];
  const cmd = (args[0] || '').toLowerCase();
  const rest = args.slice(1);

  try {
    if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
      out({ help: HELP });
      return 0;
    }

    if (cmd === 'version' || cmd === '-v' || cmd === '--version') {
      out({ name: pkg.name, productName: pkg.productName || pkg.name, version: pkg.version });
      return 0;
    }

    if (cmd === 'projects') {
      const list = apiRegistry.getProjects ? await Promise.resolve(apiRegistry.getProjects()) : [];
      out({ ok: true, projects: list });
      return 0;
    }

    if (cmd === 'dashboard' || cmd === 'list') {
      const list = apiRegistry.getAllProjectsInfo ? await apiRegistry.getAllProjectsInfo() : [];
      out({ ok: true, projects: list });
      return 0;
    }

    if (cmd === 'info') {
      const dirPath = rest[0];
      if (!dirPath) {
        err('Usage: shipwell info <path>');
        out({ ok: false, error: 'Missing path' });
        return 1;
      }
      const resolved = path.resolve(path.normalize(dirPath));
      const info = apiRegistry.getProjectInfo ? await apiRegistry.getProjectInfo(resolved) : null;
      if (info == null) {
        out({ ok: false, error: 'getProjectInfo not available' });
        return 1;
      }
      out({ ok: true, path: resolved, info });
      return 0;
    }

    if (cmd === 'add') {
      const dirPath = rest[0];
      if (!dirPath) {
        err('Usage: shipwell add <path> [name]');
        out({ ok: false, error: 'Missing path' });
        return 1;
      }
      const name = rest[1] || path.basename(path.normalize(dirPath));
      const resolved = path.resolve(path.normalize(dirPath));
      const current = apiRegistry.getProjects ? apiRegistry.getProjects() : [];
      const exists = current.some((p) => path.normalize(p.path) === path.normalize(resolved));
      if (exists) {
        out({ ok: true, message: 'Project already in list', projects: current.length });
        return 0;
      }
      const next = [...current, { path: resolved, name, tags: [], starred: false }];
      const result = apiRegistry.setProjects ? apiRegistry.setProjects(next) : { ok: false };
      out(result.ok ? { ok: true, saved: result.saved } : { ok: false, error: 'setProjects failed' });
      return result.ok ? 0 : 1;
    }

    if (cmd === 'remove') {
      const dirPath = rest[0];
      if (!dirPath) {
        err('Usage: shipwell remove <path>');
        out({ ok: false, error: 'Missing path' });
        return 1;
      }
      const resolved = path.resolve(path.normalize(dirPath));
      const current = apiRegistry.getProjects ? apiRegistry.getProjects() : [];
      const next = current.filter((p) => path.normalize(p.path) !== path.normalize(resolved));
      if (next.length === current.length) {
        out({ ok: false, error: 'Project not in list' });
        return 1;
      }
      const result = apiRegistry.setProjects ? apiRegistry.setProjects(next) : { ok: false };
      out(result.ok ? { ok: true, saved: result.saved } : { ok: false, error: 'setProjects failed' });
      return result.ok ? 0 : 1;
    }

    if (cmd === 'api') {
      const method = rest[0];
      if (!method) {
        err('Usage: shipwell api <method> [params as JSON array]');
        out({ ok: false, error: 'Missing method' });
        return 1;
      }
      let params = [];
      if (rest.length > 1) {
        try {
          const raw = rest.slice(1).join(' ');
          params = JSON.parse(raw);
          if (!Array.isArray(params)) params = [params];
        } catch (e) {
          err('Params must be a JSON array. Example: shipwell api getBranches \'["/path"]\'');
          out({ ok: false, error: 'Invalid params JSON' });
          return 1;
        }
      }
      const fn = apiRegistry[method];
      if (typeof fn !== 'function') {
        out({ ok: false, error: 'Unknown method: ' + method });
        return 1;
      }
      const result = await Promise.resolve(fn(...params));
      out({ ok: true, result });
      return 0;
    }

    err('Unknown command: ' + cmd);
    out({ ok: false, error: 'Unknown command', help: 'Run "shipwell help" for usage.' });
    return 1;
  } catch (e) {
    const message = e && (e.message || String(e));
    err(message);
    out({ ok: false, error: message });
    return 1;
  }
}

module.exports = { runCli, getCliArgs, HELP };
