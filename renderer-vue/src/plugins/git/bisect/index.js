/**
 * Git Bisect panel plugin: UI and logic for git bisect.
 */
import BisectCard from './BisectCard.vue';

export default {
  id: 'bisect',
  label: 'Bisect',
  defaultPosition: 'center',
  component: BisectCard,
};

export { useBisectRefPicker } from './useBisectRefPicker.js';
