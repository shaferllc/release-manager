import { registerDetailTabExtension } from '../registry';
import DetailProjectTrackerCard from './DetailProjectTrackerCard.vue';

const PROJECT_TRACKER_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>';

registerDetailTabExtension({
  id: 'project-tracker',
  label: 'Project Tracker',
  description: 'Track project files, mark complete, group by module. Laravel: list routes, direct access, run app inside, quick login.',
  version: '1.0.0',
  icon: PROJECT_TRACKER_ICON,
  component: DetailProjectTrackerCard,
});
