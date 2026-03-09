import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderMarkdown } from './useMarkdown';

vi.mock('../utils/renderGfm', () => ({
  renderGfmToHtml: vi.fn(),
}));

import { renderGfmToHtml } from '../utils/renderGfm';

describe('useMarkdown', () => {
  beforeEach(() => {
    vi.mocked(renderGfmToHtml).mockResolvedValue('<p>hello</p>');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty string for null or undefined', async () => {
    expect(await renderMarkdown(null)).toBe('');
    expect(await renderMarkdown(undefined)).toBe('');
  });

  it('returns empty string for non-string', async () => {
    expect(await renderMarkdown(123)).toBe('');
  });

  it('renders markdown and adds target/rel to links', async () => {
    vi.mocked(renderGfmToHtml).mockResolvedValue('<a href="https://x.com">link</a>');
    const result = await renderMarkdown('# Hello');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('href=');
  });

  it('returns empty string when renderGfmToHtml returns non-string', async () => {
    vi.mocked(renderGfmToHtml).mockResolvedValue(null);
    expect(await renderMarkdown('hi')).toBe('');
  });

  it('calls renderGfmToHtml with the markdown', async () => {
    await renderMarkdown('# Test');
    expect(renderGfmToHtml).toHaveBeenCalledWith('# Test');
  });
});
