import { nextTick } from 'vue';

/**
 * Apply a wrap around the current selection (or placeholder if empty).
 * Returns { content, selectionStart, selectionEnd } for the new state.
 */
function applyWrap(text, selectionStart, selectionEnd, before, after, placeholder) {
  const selected = selectionStart !== selectionEnd ? text.slice(selectionStart, selectionEnd) : placeholder;
  const newText = text.slice(0, selectionStart) + before + selected + after + text.slice(selectionEnd);
  const newStart = selectionStart + before.length;
  const newEnd = newStart + selected.length;
  return { content: newText, selectionStart: newStart, selectionEnd: newEnd };
}

/**
 * Insert a block at the cursor (or on the current line). If selection is on one line, add prefix to line start.
 */
function applyLinePrefix(text, selectionStart, selectionEnd, prefix) {
  const lineStart = text.slice(0, selectionStart).lastIndexOf('\n') + 1;
  const newText = text.slice(0, lineStart) + prefix + text.slice(lineStart);
  const offset = prefix.length;
  return {
    content: newText,
    selectionStart: selectionStart + offset,
    selectionEnd: selectionEnd + offset,
  };
}

/**
 * Insert template at cursor. placeholder can be used for "select this after" (e.g. url in [text](url)).
 * Returns { content, selectionStart, selectionEnd }.
 */
function applyInsert(text, selectionStart, selectionEnd, template, selectPlaceholder) {
  const newText = text.slice(0, selectionStart) + template + text.slice(selectionEnd);
  let newStart, newEnd;
  if (selectPlaceholder != null && selectPlaceholder.length === 2) {
    newStart = selectionStart + selectPlaceholder[0];
    newEnd = selectionStart + selectPlaceholder[1];
  } else {
    newStart = selectionEnd + template.length;
    newEnd = newStart;
  }
  return { content: newText, selectionStart: newStart, selectionEnd: newEnd };
}

/**
 * Resolve the actual textarea DOM element from a ref that may be a native textarea or a PrimeVue Textarea component.
 * @param {HTMLTextAreaElement|import('vue').ComponentPublicInstance|null} refVal
 * @returns {HTMLTextAreaElement|null}
 */
function getTextareaEl(refVal) {
  if (!refVal) return null;
  if (refVal instanceof HTMLTextAreaElement) return refVal;
  const el = refVal.$el;
  if (el instanceof HTMLTextAreaElement) return el;
  return el?.querySelector?.('textarea') ?? null;
}

/**
 * Composable for markdown editor toolbar: wrap selection or insert at cursor.
 * @param {import('vue').Ref<string>} contentRef
 * @param {import('vue').Ref<HTMLTextAreaElement|import('vue').ComponentPublicInstance|null>} textareaRef - ref to native textarea or PrimeVue Textarea component
 * @param {() => void} onDirty
 */
export function useMarkdownToolbar(contentRef, textareaRef, onDirty) {
  function getState() {
    const ta = getTextareaEl(textareaRef.value);
    const text = contentRef.value ?? '';
    if (!ta) return { text, start: 0, end: 0, scrollTop: 0 };
    return { text, start: ta.selectionStart, end: ta.selectionEnd, scrollTop: ta.scrollTop };
  }

  function apply(result, { scrollTop } = {}) {
    if (!result) return;
    const savedScrollTop = scrollTop;
    contentRef.value = result.content;
    onDirty?.();
    nextTick(() => {
      const ta = getTextareaEl(textareaRef.value);
      if (ta) {
        ta.focus();
        ta.setSelectionRange(result.selectionStart, result.selectionEnd);
        if (savedScrollTop != null) {
          ta.scrollTop = Math.min(savedScrollTop, ta.scrollHeight - ta.clientHeight);
        }
      }
    });
  }

  function bold() {
    const state = getState();
    apply(applyWrap(state.text, state.start, state.end, '**', '**', 'bold text'), { scrollTop: state.scrollTop });
  }

  function italic() {
    const state = getState();
    apply(applyWrap(state.text, state.start, state.end, '_', '_', 'italic text'), { scrollTop: state.scrollTop });
  }

  function strikethrough() {
    const state = getState();
    apply(applyWrap(state.text, state.start, state.end, '~~', '~~', 'strikethrough'), { scrollTop: state.scrollTop });
  }

  function code() {
    const state = getState();
    apply(applyWrap(state.text, state.start, state.end, '`', '`', 'code'), { scrollTop: state.scrollTop });
  }

  function codeBlock() {
    const state = getState();
    const selected = state.start !== state.end ? state.text.slice(state.start, state.end) : 'code block';
    const block = `\n\`\`\`\n${selected}\n\`\`\`\n`;
    apply(applyInsert(state.text, state.start, state.end, block), { scrollTop: state.scrollTop });
  }

  function link() {
    const state = getState();
    const selected = state.start !== state.end ? state.text.slice(state.start, state.end) : 'link text';
    const template = `[${selected}](url)`;
    apply(applyInsert(state.text, state.start, state.end, template, [selected.length + 3, selected.length + 6]), { scrollTop: state.scrollTop });
  }

  function image() {
    const state = getState();
    const selected = state.start !== state.end ? state.text.slice(state.start, state.end) : 'alt text';
    const template = `![${selected}](url)`;
    apply(applyInsert(state.text, state.start, state.end, template, [selected.length + 4, selected.length + 7]), { scrollTop: state.scrollTop });
  }

  function heading(level) {
    const state = getState();
    apply(applyLinePrefix(state.text, state.start, state.start, '#'.repeat(level) + ' '), { scrollTop: state.scrollTop });
  }

  function bulletList() {
    const state = getState();
    apply(applyLinePrefix(state.text, state.start, state.start, '- '), { scrollTop: state.scrollTop });
  }

  function numberedList() {
    const state = getState();
    apply(applyLinePrefix(state.text, state.start, state.start, '1. '), { scrollTop: state.scrollTop });
  }

  function blockquote() {
    const state = getState();
    apply(applyLinePrefix(state.text, state.start, state.start, '> '), { scrollTop: state.scrollTop });
  }

  function horizontalRule() {
    const state = getState();
    const insert = state.text.slice(0, state.start).length > 0 && !state.text.slice(0, state.start).endsWith('\n') ? '\n\n---\n\n' : '\n---\n\n';
    apply(applyInsert(state.text, state.start, state.end, insert), { scrollTop: state.scrollTop });
  }

  function taskList() {
    const state = getState();
    apply(applyLinePrefix(state.text, state.start, state.start, '- [ ] '), { scrollTop: state.scrollTop });
  }

  function insertTable() {
    const state = getState();
    const table = `

| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Cell     | Cell     | Cell     |
| Cell     | Cell     | Cell     |
`;
    apply(applyInsert(state.text, state.start, state.end, table), { scrollTop: state.scrollTop });
  }

  function footnote() {
    const state = getState();
    const ref = state.start !== state.end ? state.text.slice(state.start, state.end) : '1';
    const template = `[^${ref}]\n\n[^${ref}]: `;
    apply(applyInsert(state.text, state.start, state.end, template), { scrollTop: state.scrollTop });
  }

  return {
    bold,
    italic,
    strikethrough,
    code,
    codeBlock,
    link,
    image,
    heading,
    bulletList,
    numberedList,
    blockquote,
    horizontalRule,
    taskList,
    insertTable,
    footnote,
  };
}
