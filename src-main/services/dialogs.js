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
    const { canceled, filePath } = await dialog.showSaveDialog(win || undefined, {
      defaultPath: options?.defaultPath,
      title: options?.title || 'Save file',
    });
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
