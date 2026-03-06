import { registerDetailTabExtension } from '../registry';
import DetailNotesCard from './DetailNotesCard.vue';

const NOTES_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';

registerDetailTabExtension({
  id: 'notes',
  label: 'Notes',
  description: 'Per-project scratch area for plain text or Markdown. Stored in app preferences.',
  version: '1.0.0',
  icon: NOTES_ICON,
  component: DetailNotesCard,
});
