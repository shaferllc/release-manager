# UI: PrimeVue only

This app uses **PrimeVue** (unstyled) and inline/CSS only. There are **no Rm\*** custom components.

See [PRIMEVUE.md](../../PRIMEVUE.md) for:

- **Button** – `severity`, `size`, `variant="text"`; optional `class="rm-btn"` for tests/NavBar.
- **Select** – `:options`, `optionLabel`, `optionValue` (camelCase).
- **Dialog** – Modals: `header`, `#footer`, `:visible` / `@hide`.
- **Tag** – Status pills; **Panel** – Section with header.
- **Checkbox** – `binary`; wrap in label for settings rows.
- **InputText**, **Textarea** – `v-model` and standard props.

**CSS classes** (in `input.css`): `card-label`, `card-label-meta`, `empty-state`, `empty-state-icon`, `empty-state-title`, `empty-state-body`, `empty-state-actions`, `status-dot`, `status-dot-running`, `status-dot-error`, `status-dot-stopped`.

Import components from `primevue/button`, `primevue/inputtext`, `primevue/select`, `primevue/dialog`, `primevue/checkbox`, `primevue/textarea`, `primevue/panel`, `primevue/tag`, etc.
