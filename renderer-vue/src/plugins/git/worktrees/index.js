import WorktreesCard from './WorktreesCard.vue';

export default {
  id: 'worktrees',
  label: 'Worktrees',
  defaultPosition: 'center',
  component: WorktreesCard,
};

export { useAddWorktree } from './useAddWorktree.js';
