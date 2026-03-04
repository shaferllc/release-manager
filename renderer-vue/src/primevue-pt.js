/**
 * PrimeVue passthrough (pt) config for unstyled mode.
 * Uses our design tokens (--rm-*) so PrimeVue components match the app.
 * Override per-component with the pt prop when needed.
 * For Button, use severity="primary" | "secondary" | "danger" and variant="outlined" | "text" | "link";
 * add class to root for size (e.g. text-xs py-1.5 px-2.5 for compact).
 */
export const primevuePt = {
  global: {
    unstyled: true,
  },
  button: {
    root: ({ context }) => {
      const base = 'font-medium text-sm transition-colors border cursor-pointer inline-flex items-center justify-center gap-2 rounded-rm-dynamic py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed';
      const severity = context?.severity;
      const variant = context?.variant;
      const size = context?.size;
      if (severity === 'primary') return `${base} bg-rm-accent text-white border-0 hover:bg-rm-accent-hover`;
      if (severity === 'danger') return `${base} bg-transparent text-rm-danger border-rm-border hover:bg-red-500/10 hover:border-red-500/40`;
      if (variant === 'text') return `${base} bg-transparent border-0 text-rm-muted hover:text-rm-text hover:bg-rm-surface-hover`;
      if (size === 'small') return `${base} py-1.5 px-2.5 text-xs bg-transparent text-rm-text border-rm-border hover:bg-rm-surface-hover/60`;
      return `${base} bg-transparent text-rm-text border-rm-border hover:bg-rm-surface-hover/60`;
    },
    label: 'text-inherit',
    icon: 'shrink-0',
  },
  inputtext: {
    root: 'w-full border border-rm-border bg-rm-surface text-rm-text text-sm p-2.5 focus:outline-none focus:border-rm-border-focus rounded-rm-dynamic disabled:opacity-50',
  },
  textarea: {
    root: 'w-full border border-rm-border bg-rm-surface text-rm-text text-sm p-3 resize-y focus:outline-none focus:border-rm-border-focus rounded-rm-dynamic disabled:opacity-50',
  },
  select: {
    root: 'rounded-rm-dynamic border border-rm-border bg-rm-bg text-rm-text text-sm px-2 py-1.5 focus:outline-none focus:border-rm-border-focus transition-colors disabled:opacity-50',
  },
  checkbox: {
    root: 'rounded border shrink-0 w-4 h-4 cursor-pointer focus:ring-2 focus:ring-rm-accent focus:ring-offset-0 disabled:opacity-50 border-rm-border bg-rm-bg text-rm-accent',
  },
  dialog: {
    root: 'border border-rm-border bg-rm-bg shadow-lg rounded-rm',
    header: 'p-4 border-b border-rm-border text-rm-text font-semibold',
    content: 'p-4 text-rm-text',
    footer: 'p-4 border-t border-rm-border flex gap-2 justify-end',
    mask: 'bg-black/50',
  },
  panel: {
    root: 'rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden shadow-sm flex flex-col min-h-0',
    header: 'flex items-center justify-between gap-3 px-4 py-3 border-b border-rm-border bg-rm-surface/50 flex-shrink-0 text-rm-text text-sm font-semibold',
    content: 'min-h-0 flex-1 flex flex-col overflow-hidden p-4 text-rm-text',
    title: 'm-0 tracking-tight',
  },
  tag: {
    root: ({ context }) => {
      const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border rm-status-pill';
      const severity = context?.severity;
      if (severity === 'success') return `${base} bg-rm-success/15 text-rm-success border-rm-success/30`;
      if (severity === 'info') return `${base} bg-rm-accent/15 text-rm-accent border-rm-accent/30`;
      if (severity === 'danger') return `${base} bg-rm-danger/15 text-rm-danger border-rm-danger/30`;
      if (severity === 'secondary') return `${base} bg-rm-muted/20 text-rm-muted border-rm-border`;
      return base;
    },
  },
};
