import { vi } from 'vitest';

// Mock the preload API so useApi() and components that depend on it don't throw
const mockApi = {
  getProjects: vi.fn(),
  getProjectInfo: vi.fn(),
  getPreference: vi.fn(),
  setPreference: vi.fn(),
  getOllamaSettings: vi.fn(),
  setOllamaSettings: vi.fn(),
  getGitHubToken: vi.fn(),
  setGitHubToken: vi.fn(),
  getBranches: vi.fn(),
  getTags: vi.fn(),
  runProjectTests: vi.fn(),
  openInEditor: vi.fn(),
  openInTerminal: vi.fn(),
  copyToClipboard: vi.fn(),
};
if (typeof globalThis.window !== 'undefined') {
  globalThis.window.releaseManager = mockApi;
}
if (typeof globalThis.global !== 'undefined') {
  globalThis.global.window = globalThis.global.window || {};
  globalThis.global.window.releaseManager = mockApi;
}
