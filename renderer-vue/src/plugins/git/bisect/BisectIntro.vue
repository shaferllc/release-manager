<template>
  <div v-if="show" class="bisect-intro mb-4 space-y-3">
    <p class="text-xs text-rm-muted m-0">
      <strong class="text-rm-text">Git bisect</strong> finds the commit that introduced a bug using binary search. You point to one "bad" commit (has the bug) and one "good" commit (no bug); Git checks out a commit in the middle and you repeat until the first bad commit is found.
    </p>
    <div class="bisect-steps rounded-rm border border-rm-border bg-rm-surface/20 p-3 text-xs">
      <p class="font-medium text-rm-text m-0 mb-2">Steps</p>
      <ol class="m-0 pl-4 space-y-1.5 text-rm-muted list-decimal">
        <li><strong class="text-rm-text">Set refs</strong> — Choose the bad ref (e.g. HEAD) and a good ref (e.g. main or an older commit).</li>
        <li><strong class="text-rm-text">Test</strong> — Git checks out a commit in the range. Run your app or tests.</li>
        <li><strong class="text-rm-text">Mark</strong> — Click Good if the bug is absent, Bad if it's present.</li>
        <li><strong class="text-rm-text">Repeat</strong> — Git narrows the range until it reports the first bad commit.</li>
      </ol>
    </div>
    <Button variant="text" size="small" class="text-[11px] p-0 min-w-0 text-rm-muted hover:text-rm-accent" @click="show = false">Hide intro</Button>
  </div>
  <div v-else class="mb-3">
    <Button variant="text" size="small" class="text-[11px] p-0 min-w-0 text-rm-muted hover:text-rm-accent" @click="show = true">What is bisect?</Button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';

const show = ref(true);
</script>
