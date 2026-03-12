/** Shared helpers for SettingsView spec files */
export function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function goToAccountSection(wrapper) {
  const accountBtn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Account'));
  expect(accountBtn).toBeDefined();
  await accountBtn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return accountBtn;
}

export async function goToAiSection(wrapper) {
  const aiBtn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('AI'));
  expect(aiBtn).toBeDefined();
  await aiBtn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return aiBtn;
}

export async function goToAppearanceSection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Appearance'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}

export async function goToApplicationSection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Application'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}

export async function goToBehaviorSection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Behavior'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}

export async function goToDataPrivacySection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Data & privacy'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}

export async function goToDeveloperSection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Developer'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}

export async function goToGitSection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Git'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}

export async function goToKeyboardSection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Keyboard'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}

export async function goToNotificationsSection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Notifications'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}

export async function goToSubscriptionSection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Subscription'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}

export async function goToWebhooksSection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Webhooks'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}

export async function goToWindowSection(wrapper) {
  const btn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Window'));
  expect(btn).toBeDefined();
  await btn.trigger('click');
  await flushPromises();
  await wrapper.vm.$nextTick();
  return btn;
}
