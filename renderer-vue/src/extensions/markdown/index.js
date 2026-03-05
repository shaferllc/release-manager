import { registerDetailTabExtension } from '../registry';
import DetailMarkdownCard from './DetailMarkdownCard.vue';

const MARKDOWN_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>';

registerDetailTabExtension({
  id: 'markdown',
  label: 'Markdown',
  description: 'Browse and edit Markdown documentation files in the project.',
  version: '1.0.0',
  icon: MARKDOWN_ICON,
  component: DetailMarkdownCard,
  featureFlagId: 'markdown',
});
