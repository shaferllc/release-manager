import TagsCard from './TagsCard.vue';

export default {
  id: 'tags',
  label: 'Tags',
  defaultPosition: 'center',
  component: TagsCard,
};

export { useCreateTag } from './useCreateTag.js';
