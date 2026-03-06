import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MarkdownFileTreeNode from './MarkdownFileTreeNode.vue';

describe('MarkdownFileTreeNode', () => {
  it('renders a file node with name and emits select on click', async () => {
    const wrapper = mount(MarkdownFileTreeNode, {
      props: {
        node: { name: 'README.md', path: 'README.md' },
        selectedPath: null,
        expandedFolders: {},
      },
    });
    expect(wrapper.text()).toContain('README.md');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('select')).toEqual([['README.md']]);
  });

  it('applies selected class when selectedPath matches node path', () => {
    const wrapper = mount(MarkdownFileTreeNode, {
      props: {
        node: { name: 'README.md', path: 'README.md' },
        selectedPath: 'README.md',
        expandedFolders: {},
      },
    });
    const btn = wrapper.find('button');
    expect(btn.classes()).toContain('markdown-file-item-selected');
  });

  it('renders a folder node and emits toggle-folder on click', async () => {
    const wrapper = mount(MarkdownFileTreeNode, {
      props: {
        node: { name: 'docs', folderKey: 'docs', children: [] },
        selectedPath: null,
        expandedFolders: {},
      },
    });
    expect(wrapper.text()).toContain('docs');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('toggle-folder')).toEqual([['docs']]);
  });

  it('renders folder children when expanded', () => {
    const wrapper = mount(MarkdownFileTreeNode, {
      props: {
        node: {
          name: 'docs',
          folderKey: 'docs',
          children: [{ name: 'readme.md', path: 'docs/readme.md' }],
        },
        selectedPath: null,
        expandedFolders: { docs: true },
      },
    });
    expect(wrapper.text()).toContain('docs');
    expect(wrapper.text()).toContain('readme.md');
  });
});
