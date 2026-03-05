import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { useMarkdownToolbar } from './useMarkdownToolbar';

describe('useMarkdownToolbar', () => {
  let contentRef;
  let textareaRef;
  let onDirty;

  beforeEach(() => {
    contentRef = ref('');
    textareaRef = ref(null);
    onDirty = vi.fn();
  });

  function createFakeTextarea(value, selectionStart = 0, selectionEnd = 0) {
    const ta = typeof document !== 'undefined' ? document.createElement('textarea') : { value: '', selectionStart: 0, selectionEnd: 0, focus: vi.fn(), setSelectionRange: vi.fn(), scrollTop: 0, scrollHeight: 0, clientHeight: 0 };
    if (ta instanceof HTMLTextAreaElement) {
      ta.value = value;
      ta.selectionStart = selectionStart;
      ta.selectionEnd = selectionEnd;
    } else {
      ta.value = value;
      ta.selectionStart = selectionStart;
      ta.selectionEnd = selectionEnd;
    }
    return ta;
  }

  async function runToolbarAction(action) {
    action();
    await nextTick();
  }

  it('bold wraps selection with **', async () => {
    contentRef.value = 'hello';
    textareaRef.value = createFakeTextarea('hello', 0, 5);
    const { bold } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(bold);
    expect(contentRef.value).toBe('**hello**');
    expect(onDirty).toHaveBeenCalled();
  });

  it('bold uses placeholder when no selection', async () => {
    contentRef.value = 'hello';
    textareaRef.value = createFakeTextarea('hello', 0, 0);
    const { bold } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(bold);
    expect(contentRef.value).toBe('**bold text**hello');
    expect(onDirty).toHaveBeenCalled();
  });

  it('italic wraps selection with _', async () => {
    contentRef.value = 'word';
    textareaRef.value = createFakeTextarea('word', 0, 4);
    const { italic } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(italic);
    expect(contentRef.value).toBe('_word_');
  });

  it('strikethrough wraps selection with ~~', async () => {
    contentRef.value = 'x';
    textareaRef.value = createFakeTextarea('x', 0, 1);
    const { strikethrough } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(strikethrough);
    expect(contentRef.value).toBe('~~x~~');
  });

  it('code wraps selection with backticks', async () => {
    contentRef.value = 'fn()';
    textareaRef.value = createFakeTextarea('fn()', 0, 4);
    const { code } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(code);
    expect(contentRef.value).toBe('`fn()`');
  });

  it('codeBlock inserts fenced block', async () => {
    contentRef.value = 'code here';
    textareaRef.value = createFakeTextarea('code here', 0, 9);
    const { codeBlock } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(codeBlock);
    expect(contentRef.value).toContain('```');
    expect(contentRef.value).toContain('code here');
    expect(contentRef.value).toContain('```');
  });

  it('link inserts [text](url) and selects url', async () => {
    contentRef.value = 'link';
    textareaRef.value = createFakeTextarea('link', 0, 4);
    const { link } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(link);
    expect(contentRef.value).toBe('[link](url)');
  });

  it('image inserts ![alt](url)', async () => {
    contentRef.value = 'pic';
    textareaRef.value = createFakeTextarea('pic', 0, 3);
    const { image } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(image);
    expect(contentRef.value).toBe('![pic](url)');
  });

  it('heading adds # prefix to line', async () => {
    contentRef.value = 'Title';
    textareaRef.value = createFakeTextarea('Title', 0, 0);
    const { heading } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(() => heading(1));
    expect(contentRef.value).toBe('# Title');
  });

  it('heading(2) adds ## prefix', async () => {
    contentRef.value = 'Sub';
    textareaRef.value = createFakeTextarea('Sub', 0, 0);
    const { heading } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(() => heading(2));
    expect(contentRef.value).toBe('## Sub');
  });

  it('bulletList adds - prefix', async () => {
    contentRef.value = 'item';
    textareaRef.value = createFakeTextarea('item', 0, 0);
    const { bulletList } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(bulletList);
    expect(contentRef.value).toBe('- item');
  });

  it('numberedList adds 1. prefix', async () => {
    contentRef.value = 'first';
    textareaRef.value = createFakeTextarea('first', 0, 0);
    const { numberedList } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(numberedList);
    expect(contentRef.value).toBe('1. first');
  });

  it('blockquote adds > prefix', async () => {
    contentRef.value = 'quote';
    textareaRef.value = createFakeTextarea('quote', 0, 0);
    const { blockquote } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(blockquote);
    expect(contentRef.value).toBe('> quote');
  });

  it('horizontalRule inserts ---', async () => {
    contentRef.value = '';
    textareaRef.value = createFakeTextarea('', 0, 0);
    const { horizontalRule } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(horizontalRule);
    expect(contentRef.value).toContain('---');
  });

  it('taskList adds - [ ] prefix', async () => {
    contentRef.value = 'task';
    textareaRef.value = createFakeTextarea('task', 0, 0);
    const { taskList } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(taskList);
    expect(contentRef.value).toBe('- [ ] task');
  });

  it('insertTable inserts markdown table', async () => {
    contentRef.value = '';
    textareaRef.value = createFakeTextarea('', 0, 0);
    const { insertTable } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(insertTable);
    expect(contentRef.value).toContain('| Column 1 |');
    expect(contentRef.value).toContain('| -------- |');
  });

  it('footnote inserts [^ref] and [^ref]: ', async () => {
    contentRef.value = '1';
    textareaRef.value = createFakeTextarea('1', 0, 1);
    const { footnote } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(footnote);
    expect(contentRef.value).toContain('[^1]');
    expect(contentRef.value).toContain('[^1]: ');
  });

  it('works when textareaRef is null (no DOM)', async () => {
    contentRef.value = 'hi';
    textareaRef.value = null;
    const { bold } = useMarkdownToolbar(contentRef, textareaRef, onDirty);
    await runToolbarAction(bold);
    expect(contentRef.value).toBe('**bold text**hi');
  });

  it('works without onDirty callback', async () => {
    contentRef.value = 'hi';
    textareaRef.value = createFakeTextarea('hi', 0, 2);
    const { bold } = useMarkdownToolbar(contentRef, textareaRef, null);
    await runToolbarAction(bold);
    expect(contentRef.value).toBe('**hi**');
  });
});
