/**
 * Create the file dialogs service (save/open for FTP etc.).
 * @param {Object} deps
 * @param {Object} deps.dialog - Electron dialog
 * @param {Function} deps.getBrowserWindow - () => BrowserWindow | null
 */
function createDialogsService(deps) {
  const { dialog, getBrowserWindow } = deps;

  async function showSaveDialog(options) {
    const win = getBrowserWindow();
    const opts = {
      defaultPath: options?.defaultPath,
      title: options?.title || 'Save file',
    };
    if (options?.filters && Array.isArray(options.filters) && options.filters.length > 0) {
      opts.filters = options.filters;
    }
    const { canceled, filePath } = await dialog.showSaveDialog(win || undefined, opts);
    return { canceled: !!canceled, filePath: canceled ? null : filePath };
  }

  async function showOpenDialog(options) {
    const win = getBrowserWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(win || undefined, {
      properties: options?.multiSelect ? ['openFile', 'multiSelections'] : ['openFile'],
      title: options?.title || 'Open file',
    });
    return { canceled: !!canceled, filePaths: canceled ? [] : (filePaths || []) };
  }

  return {
    showSaveDialog,
    showOpenDialog,
  };
}

module.exports = { createDialogsService };
