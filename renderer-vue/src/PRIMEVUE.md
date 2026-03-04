# PrimeVue in this project

We use **PrimeVue** (unstyled) with the official **Tailwind** integration ([primevue.org/tailwind](https://primevue.org/tailwind)). Components are styled via **passthrough (pt)** in `primevue-pt.js` using our `--rm-*` tokens.

## Setup

- **primevue**, **primeicons**, and **tailwindcss-primeui** are in `package.json`.
- **Tailwind**: `tailwind.config.js` uses the `tailwindcss-primeui` plugin and `darkMode: ['selector', '[data-theme="dark"]']` so the `dark:` variant matches the app theme. `input.css` uses the layer order `tailwind-base, primevue, tailwind-utilities` so Tailwind utilities can override PrimeVue when using a theme preset.
- **PrimeVue**: `main.js` registers PrimeVue with `unstyled: true`, `pt: primevuePt`, and `theme.options.darkModeSelector` / `theme.options.cssLayer` aligned with the Tailwind setup.
- Icons: import `primeicons/primeicons.css` (already in `main.js`); use classes like `pi pi-check`, `pi pi-times`.

## Using PrimeVue components

Import from `primevue` and use as usual. Global pt from `primevue-pt.js` applies our tokens.

**Button**

```vue
<script setup>
import Button from 'primevue/button';
</script>
<template>
  <Button label="Save" severity="primary" @click="save" />
  <Button label="Cancel" severity="secondary" />
  <Button label="Delete" severity="danger" />
  <!-- Compact: add class -->
  <Button label="Run" severity="primary" class="text-xs py-1.5 px-2.5" />
</template>
```

**InputText**

```vue
<script setup>
import InputText from 'primevue/inputtext';
</script>
<template>
  <InputText v-model="value" placeholder="Name" />
</template>
```

**Checkbox**

```vue
<script setup>
import Checkbox from 'primevue/checkbox';
</script>
<template>
  <Checkbox v-model="checked" :binary="true" inputId="cb1" />
  <label for="cb1">Label</label>
</template>
```

**Dialog (modal)**

```vue
<script setup>
import Dialog from 'primevue/dialog';
</script>
<template>
  <Dialog v-model:visible="open" header="Title" :style="{ width: '28rem' }">
    <p>Body</p>
    <template #footer>
      <Button label="OK" @click="open = false" />
    </template>
  </Dialog>
</template>
```

More: [PrimeVue docs](https://primevue.org/).

## Relation to Rm* components

**PrimeVue-backed (wrappers):** RmButton, RmInput, RmTextarea (Button, InputText, Textarea); RmStatusPill (Tag); RmCheckbox (Checkbox); RmListPanel (Panel); RmSelect (Select, options array + optionLabel/optionValue). **RmModal** stays custom so modal unit tests don’t depend on Dialog. **RmEmptyState**, **RmStatusDot**, **RmCardHeader** remain custom (no direct PrimeVue equivalent). **RmCard** is a presentational wrapper.

- **Use Rm\*** in templates for consistency and our API.
- **RmSelect** requires an `options` array and optionally `option-label` / `option-value` (e.g. `:options="items" option-label="label" option-value="value"`).
- **Use PrimeVue** directly for new features when you need a component we don’t wrap (e.g. DataTable, Dropdown, Dialog with full PrimeVue in tests).

To change default look for PrimeVue components app-wide, edit `primevue-pt.js`.

## Tailwind plugin (tailwindcss-primeui)

The plugin adds PrimeVue-aware utilities. In **styled** mode (with a theme preset), you get semantic utilities like `bg-primary`, `text-surface-500`, `text-muted-color`, `rounded-border`. It also adds **animation** utilities (`animate-fadein`, `animate-slidedown`, `animate-duration-300`, etc.) that work with PrimeVue’s StyleClass and AnimateOnScroll. See [primevue.org/tailwind](https://primevue.org/tailwind) for the full list.
