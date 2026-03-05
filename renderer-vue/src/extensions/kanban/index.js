import { registerDetailTabExtension } from '../registry';
import DetailKanbanCard from './DetailKanbanCard.vue';

const KANBAN_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="18"/><rect x="9" y="3" width="6" height="18"/><rect x="15" y="3" width="6" height="18"/></svg>';

registerDetailTabExtension({
  id: 'kanban',
  label: 'Kanban',
  description: 'Per-project board with custom lists, cards (due date, priority, labels), archive column, and filter by tag.',
  version: '2.0.0',
  icon: KANBAN_ICON,
  component: DetailKanbanCard,
  featureFlagId: 'kanban',
});
