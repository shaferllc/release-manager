# Reusable UI components

We use **PrimeVue** (unstyled) as the shared library; see [PRIMEVUE.md](../../PRIMEVUE.md). The **Rm\*** set: **RmButton**, **RmInput**, **RmTextarea** (PrimeVue Button, InputText, Textarea); **RmStatusPill** (Tag); **RmCheckbox** (Checkbox); **RmListPanel** (Panel); **RmSelect** (Select, use `:options` + `option-label` / `option-value`). **RmModal**, **RmEmptyState**, **RmStatusDot**, **RmCardHeader**, **RmCard** are custom. Use these in templates for consistent styling and API.

## Components

- **RmButton** – `variant`: `primary` | `secondary` | `ghost` | `danger`, `size`: `default` | `compact`. Respects Settings → Corner style via `--rm-radius`. Use `danger` for destructive actions (Delete, Stop, etc.).
- **RmInput** – Text-like inputs; use `v-model`, same radius and border tokens.
- **RmTextarea** – Multi-line text; use `v-model`, same tokens as RmInput.
- **RmSelect** – Native `<select>` with shared styling (border, radius, focus). Use `v-model`, put `<option>` in default slot. Exposes `focus()` for ref-based focus (e.g. toolbar “Branch” button).
- **RmCard** – Container with border and background. Use for card-style sections.
- **RmModal** – Backdrop + title + body + optional footer. Use `title` prop or `#title` slot, default slot for body, `#footer` for actions. `wide` prop for max-w-2xl.
- **RmEmptyState** – Centered empty state: optional `#icon` slot, `title` prop, default slot or `description` for body, optional `#actions` slot. Use in lists/panels when there are no items.
- **RmStatusPill** – Small pill for status (e.g. “Running”, “Disconnected”). `variant`: `success` | `muted` | `accent` | `danger`, optional `dot` prop. Default slot or `label` for text.
- **RmListPanel** – Bordered panel with header row (title + optional `#meta` slot) and default slot for content. Use for list cards (e.g. “Saved connections”, “Processes”).
- **RmStatusDot** – Small status dot; `status`: `running` | `error` | `stopped`. Use for process/connection indicators.
- **RmCheckbox** – Styled checkbox with optional label and description. Use `v-model` (boolean). `rowLayout` gives a two-row grid (checkbox left, label + description right) for settings-style rows. Pass `label` and `description` props or use `#default` and `#description` slots.
- **RmCardHeader** – Section title in card-label style (uppercase, small, semibold). `tag`: `span` | `p` | `label`; `muted` for muted color; optional `meta` prop or `#meta` slot for trailing text (e.g. count). Default `mb-3`; override with `class` if needed.

## Usage

```vue
<script setup>
import { RmButton, RmInput, RmModal } from '@/components/ui';
</script>

<template>
  <RmModal title="Example" @close="open = false">
    <RmInput v-model="name" placeholder="Name" />
    <template #footer>
      <RmButton variant="primary" @click="save">Save</RmButton>
      <RmButton variant="secondary" @click="open = false">Cancel</RmButton>
    </template>
  </RmModal>
</template>
```

## Styling

- Components use Tailwind and the design tokens (`bg-rm-surface`, `text-rm-text`, `border-rm-border`, etc.) and `rounded-rm-dynamic` (reads `--rm-radius` from `html[data-radius]`).
- To style further, pass `class` to the component; it’s merged onto the root where supported (e.g. `RmButton`, `RmInput`, `RmModal`).

## Legacy migration

Screens and modals have been migrated from legacy `input.css` classes (`.btn-primary`, `.btn-secondary`, `.input-field`, `.modal-card`, etc.) to these components; those legacy rules have been removed from `input.css`. Use these components for any new UI.

## Possible future extractions

- (None at the moment.)
