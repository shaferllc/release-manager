import { registerDetailTabExtension } from '../registry';
import DetailBookmarksCard from './DetailBookmarksCard.vue';

const BOOKMARKS_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';

registerDetailTabExtension({
  id: 'bookmarks',
  label: 'Bookmarks',
  description: 'Save and organize links for this project. Quick access to docs, dashboards, and tools.',
  version: '1.0.0',
  icon: BOOKMARKS_ICON,
  component: DetailBookmarksCard,
});
