<template>
  <ExtensionLayout tab-id="email" content-class="detail-email-card">
    <template #toolbar-start>
      <p class="text-sm text-rm-muted m-0">
          Each project has its own SMTP port. Start the server to get a port for this project; point your app’s SMTP at it to catch outgoing mail here.
        </p>
    </template>
    <template #toolbar-end>
        <Tag :severity="smtpStatus.running ? 'info' : 'secondary'">
          {{ smtpStatus.running ? `Running on port ${smtpStatus.port}` : 'Stopped' }}
        </Tag>
        <Button severity="primary" size="small" :disabled="smtpStatus.running || startingSmtp" v-tooltip.top="'Start local SMTP server to catch outgoing mail'" aria-label="Start SMTP server" @click="startSmtpWithProjectPort">
          {{ startingSmtp ? 'Starting…' : 'Start SMTP server' }}
        </Button>
        <Button severity="danger" size="small" :disabled="!smtpStatus.running || stoppingSmtp" v-tooltip.top="'Stop the SMTP server'" aria-label="Stop SMTP server" @click="stopSmtp">
          {{ stoppingSmtp ? 'Stopping…' : 'Stop' }}
        </Button>
        <Button severity="secondary" size="small" icon="pi pi-send" label="Compose" v-tooltip.top="'Open compose modal to send an email'" @click="openComposeModal" />
        <Button severity="secondary" size="small" icon="pi pi-ellipsis-v" label="More" aria-haspopup="true" aria-controls="email-toolbar-more-menu" v-tooltip.top="'Connection info, configure app, email settings'" @click="emailToolbarMoreMenuRef?.toggle($event)" />
        <Menu id="email-toolbar-more-menu" ref="emailToolbarMoreMenuRef" :model="emailToolbarMoreMenuItems" :popup="true" class="email-toolbar-more-menu" />
    </template>

    <Dialog
      v-model:visible="emailSettingsModalVisible"
      header="Email settings"
      :style="{ width: 'min(90vw, 520px)' }"
      modal
      class="email-settings-modal"
    >
      <div v-if="projectPath" class="email-project-settings space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <label for="project-smtp-port" class="text-sm font-medium text-rm-text shrink-0">SMTP port (this project)</label>
        <InputText
          id="project-smtp-port"
          v-model.number="projectSmtpPort"
          type="number"
          min="1"
          max="65535"
          class="w-24"
          placeholder="1025"
          @blur="saveProjectSmtpPort"
        />
        <span class="text-xs text-rm-muted">Port to use when you start the server. Next available if in use.</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <label for="project-mailbox-input" class="text-sm font-medium text-rm-text shrink-0">Project mailbox</label>
      <InputText
        id="project-mailbox-input"
        v-model="projectMailboxEmail"
        type="text"
        class="flex-1 min-w-[12rem] max-w-xs"
        placeholder="e.g. releases@example.com"
        @keydown.enter="saveProjectMailbox"
      />
      <Button severity="secondary" size="small" label="Save" @click="saveProjectMailbox" />
      <span class="text-xs text-rm-muted">Optional. Use “Send to project mailbox” in Compose to send to this address.</span>
      </div>
      <Divider class="my-2" />
      <div class="space-y-3">
        <label class="flex items-center gap-3 cursor-pointer">
          <Checkbox v-model="projectCheckBrokenLinks" binary @update:model-value="saveProjectEmailOptions" />
          <span class="text-sm text-rm-text">Automatically check broken links</span>
        </label>
        <p class="text-xs text-rm-muted m-0 ml-8">The link checker may perform HEAD or GET requests to links in emails.</p>
        <label class="flex items-center gap-3 cursor-pointer">
          <Checkbox v-model="projectEnableSpamChecking" binary @update:model-value="saveProjectEmailOptions" />
          <span class="text-sm text-rm-text">Enable spam checking</span>
        </label>
        <p class="text-xs text-rm-muted m-0 ml-8">Compute a local spam score for caught emails and show it in the Spam Report tab.</p>
      </div>
      <Divider class="my-2" />
      <div class="space-y-3">
        <span class="text-sm font-medium text-rm-text block">Outgoing email (this project)</span>
        <p class="text-xs text-rm-muted m-0">SMTP used to send or forward mail from this project (e.g. compose/forward).</p>
        <div class="grid grid-cols-1 gap-2 max-w-md">
          <div>
            <label for="project-outgoing-host" class="block text-xs text-rm-muted mb-0.5">Host</label>
            <InputText id="project-outgoing-host" v-model="projectOutgoingHost" type="text" class="w-full text-sm" placeholder="smtp.example.com" @blur="saveProjectOutgoing" />
          </div>
          <div>
            <label for="project-outgoing-username" class="block text-xs text-rm-muted mb-0.5">Username</label>
            <InputText id="project-outgoing-username" v-model="projectOutgoingUsername" type="text" class="w-full text-sm" placeholder="user@example.com" @blur="saveProjectOutgoing" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="project-outgoing-port" class="block text-xs text-rm-muted mb-0.5">Port</label>
              <InputText id="project-outgoing-port" v-model.number="projectOutgoingPort" type="number" min="1" max="65535" class="w-full text-sm" placeholder="587" @blur="saveProjectOutgoing" />
            </div>
            <div>
              <label for="project-outgoing-encryption" class="block text-xs text-rm-muted mb-0.5">Encryption</label>
              <Select id="project-outgoing-encryption" v-model="projectOutgoingEncryption" :options="projectOutgoingEncryptionOptionsSafe" option-label="label" option-value="value" class="w-full text-sm" @change="saveProjectOutgoing" />
            </div>
          </div>
          <div>
            <label for="project-outgoing-password" class="block text-xs text-rm-muted mb-0.5">Password</label>
            <InputText id="project-outgoing-password" v-model="projectOutgoingPassword" type="password" class="w-full text-sm" placeholder="••••••••" @blur="saveProjectOutgoing" />
          </div>
        </div>
      </div>
      </div>
    </Dialog>

    <Toolbar v-if="emails.length > 0" class="extension-toolbar extension-toolbar-compact mb-3">
      <template #end>
      <Button severity="secondary" size="small" label="Select all" @click="selectAll" />
      <Button severity="secondary" size="small" :disabled="selectedIds.length === 0" label="Clear selection" @click="clearSelection" />
      <Button severity="secondary" size="small" label="Clear all" v-tooltip.top="'Clear all caught emails'" aria-label="Clear all emails" @click="clearAll" />
      <Button severity="danger" size="small" :disabled="selectedIds.length === 0" :label="selectedIds.length ? `Delete selected (${selectedIds.length})` : 'Delete selected'" @click="deleteSelected" />
      <Button v-if="selectedIds.length > 0" severity="secondary" size="small" icon="pi pi-share-alt" label="Share selected" aria-haspopup="true" aria-controls="email-bulk-share-menu" @click="bulkShareMenuRef?.toggle($event)" />
      <Menu id="email-bulk-share-menu" ref="bulkShareMenuRef" :model="bulkShareMenuItems" :popup="true" class="email-share-menu" />
      <span v-if="selectedIds.length > 0" class="text-xs text-rm-muted">{{ selectedIds.length }} selected</span>
      </template>
    </Toolbar>

    <Panel class="email-inbox-wrap flex-1">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Inbox</h3>
          <span class="text-xs text-rm-muted">{{ emails.length }} email{{ emails.length === 1 ? '' : 's' }}</span>
        </div>
      </template>
      <div class="email-inbox-body flex min-h-0 flex-1">
        <div class="email-list border-r border-rm-border flex flex-col min-w-0 w-80 shrink-0">
          <ul class="email-list-ul overflow-y-auto flex-1">
            <li v-for="email in emails" :key="email.id" class="email-list-item" :class="{ 'email-list-item-selected': selectedEmail?.id === email.id }" @click="selectedEmail = email">
              <Checkbox :model-value="isSelected(email.id)" binary class="email-list-checkbox shrink-0" @click.stop @update:model-value="(v) => setSelection(email.id, v)" />
              <div class="email-list-item-body min-w-0 flex-1">
                <div class="email-list-item-from text-rm-text font-medium truncate">{{ email.from || '—' }}</div>
                <div class="email-list-item-subject text-rm-muted text-xs truncate">{{ email.subject }}</div>
                <div class="email-list-item-date text-rm-muted text-xs">{{ formatDateWithTime(email.date) }}</div>
              </div>
            </li>
          </ul>
          <div v-if="emails.length === 0" class="empty-state py-12 px-4">
            <div class="empty-state-icon"><svg class="w-10 h-10 text-rm-muted opacity-60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
            <h4 class="empty-state-title">No emails yet</h4>
            <div class="empty-state-body"><p class="text-sm text-rm-muted m-0">Start the SMTP server and send mail from your app</p></div>
          </div>
        </div>
        <div class="email-message flex flex-col flex-1 min-w-0">
          <template v-if="selectedEmail">
            <div class="email-message-meta px-4 py-3 border-b border-rm-border bg-rm-surface/30 flex flex-col gap-1">
              <div class="flex flex-wrap gap-x-4 gap-y-0 text-sm"><span class="text-rm-muted">From:</span><span class="text-rm-text">{{ selectedEmail.from }}</span></div>
              <div class="flex flex-wrap gap-x-4 gap-y-0 text-sm"><span class="text-rm-muted">To:</span><span class="text-rm-text">{{ selectedEmail.to }}</span></div>
              <div class="flex flex-wrap gap-x-4 gap-y-0 text-sm"><span class="text-rm-muted">Subject:</span><span class="text-rm-text font-medium">{{ selectedEmail.subject }}</span></div>
            </div>
            <div class="email-message-actions flex items-center gap-2 px-4 py-2 border-b border-rm-border bg-rm-surface/20 shrink-0">
              <Button severity="secondary" size="small" icon="pi pi-share-alt" label="Share" aria-haspopup="true" aria-controls="email-share-menu" @click="shareMenuRef?.toggle($event)" />
              <Menu id="email-share-menu" ref="shareMenuRef" :model="shareMenuItems" :popup="true" class="email-share-menu" />
              <Button severity="secondary" size="small" icon="pi pi-forward" label="Forward" v-tooltip.top="'Open forward modal'" @click="openForwardModal" />
              <Button severity="danger" variant="text" size="small" icon="pi pi-trash" label="Delete" v-tooltip.top="'Delete this email'" @click="deleteEmail(selectedEmail?.id)" />
              <span v-if="shareMessage" class="text-xs text-rm-muted">{{ shareMessage }}</span>
            </div>
            <div class="email-message-tabs flex gap-1 px-4 py-2 border-b border-rm-border bg-rm-surface/20 shrink-0">
              <SelectButton v-model="viewMode" :options="viewModeOptionsSafe" option-label="label" option-value="value" class="email-view-mode-select" />
            </div>
            <div class="email-message-content flex-1 overflow-auto p-4 min-h-0">
              <div v-if="viewMode === 'html'" class="email-html-body prose prose-invert max-w-none" v-html="selectedEmail.sanitizedHtml || '<p class=\'text-rm-muted\'>No HTML content</p>'"></div>
              <pre v-else-if="viewMode === 'html-source'" class="email-pre text-xs text-rm-muted whitespace-pre-wrap break-words m-0 font-mono">{{ selectedEmail.html || 'No HTML source' }}</pre>
              <pre v-else-if="viewMode === 'text'" class="email-pre text-sm text-rm-text whitespace-pre-wrap break-words m-0">{{ selectedEmail.text || 'No plain text content' }}</pre>
              <pre v-else-if="viewMode === 'raw'" class="email-pre text-xs text-rm-muted whitespace-pre-wrap break-words m-0 font-mono">{{ selectedEmail.raw || '' }}</pre>
              <div v-else-if="viewMode === 'debug'" class="email-debug text-sm">
                <dl class="email-debug-dl m-0 space-y-1.5">
                  <div><dt class="text-rm-muted inline">From:</dt><dd class="inline ml-2 text-rm-text">{{ selectedEmail.from || '—' }}</dd></div>
                  <div><dt class="text-rm-muted inline">To:</dt><dd class="inline ml-2 text-rm-text">{{ selectedEmail.to || '—' }}</dd></div>
                  <div><dt class="text-rm-muted inline">Subject:</dt><dd class="inline ml-2 text-rm-text">{{ selectedEmail.subject || '—' }}</dd></div>
                  <div><dt class="text-rm-muted inline">Date:</dt><dd class="inline ml-2 text-rm-text">{{ selectedEmail.date || '—' }}</dd></div>
                  <div><dt class="text-rm-muted inline">ID:</dt><dd class="inline ml-2 text-rm-text font-mono text-xs">{{ selectedEmail.id || '—' }}</dd></div>
                  <div><dt class="text-rm-muted inline">Raw size:</dt><dd class="inline ml-2 text-rm-text">{{ selectedEmail.raw ? selectedEmail.raw.length : 0 }} chars</dd></div>
                  <div><dt class="text-rm-muted inline">Has HTML:</dt><dd class="inline ml-2 text-rm-text">{{ selectedEmail.html ? 'Yes' : 'No' }}</dd></div>
                  <div><dt class="text-rm-muted inline">Has text:</dt><dd class="inline ml-2 text-rm-text">{{ selectedEmail.text ? 'Yes' : 'No' }}</dd></div>
                </dl>
              </div>
              <pre v-else-if="viewMode === 'headers'" class="email-pre text-xs text-rm-muted whitespace-pre-wrap break-words m-0 font-mono">{{ selectedEmail.headers || '{}' }}</pre>
              <div v-else-if="viewMode === 'links'" class="email-links">
                <p v-if="emailLinks.length === 0" class="text-sm text-rm-muted m-0">No links found in this email.</p>
                <ul v-else class="m-0 pl-0 list-none space-y-2">
                  <li v-for="(link, i) in emailLinks" :key="i" class="flex items-center gap-2 flex-wrap">
                    <Button variant="link" :label="link.href" class="text-rm-accent truncate max-w-full font-mono text-sm p-0 min-w-0 h-auto justify-start text-left" @click="openLink(link.href)" />
                    <Button variant="text" size="small" icon="pi pi-external-link" class="shrink-0" v-tooltip.top="'Open in browser'" aria-label="Open link" @click="openLink(link.href)" />
                  </li>
                </ul>
              </div>
              <div v-else-if="viewMode === 'spam-report'" class="email-spam-report space-y-4">
                <div v-if="selectedEmail.spamScore != null" class="flex flex-wrap items-center gap-3">
                  <span class="text-sm text-rm-muted">Score</span>
                  <Tag :severity="spamScoreSeverity(selectedEmail.spamScore)" class="font-mono">{{ selectedEmail.spamScore }}</Tag>
                  <span class="text-xs text-rm-muted">(0 = low, 10 = high; heuristic only)</span>
                </div>
                <p v-else class="text-sm text-rm-muted m-0">Not scored (email was received before spam scoring was enabled).</p>
                <div v-if="selectedEmail.spamSignals?.length" class="space-y-1">
                  <p class="text-xs font-medium text-rm-muted uppercase tracking-wider m-0">Signals</p>
                  <ul class="m-0 pl-4 space-y-0.5 text-sm text-rm-text">
                    <li v-for="(s, i) in selectedEmail.spamSignals" :key="i">{{ s }}</li>
                  </ul>
                </div>
                <p v-else-if="selectedEmail.spamScore != null" class="text-xs text-rm-muted m-0">No specific signals detected.</p>
              </div>
              <div v-else-if="viewMode === 'testing'" class="email-testing">
                <p class="text-sm text-rm-muted m-0 mb-3">Use the <strong class="text-rm-text">Send test email</strong> button in the toolbar above to send a test message to this inbox. Configure your app with the connection details shown when the SMTP server is running.</p>
                <Button severity="secondary" size="small" :disabled="!smtpStatus.running || sendingTestEmail" @click="sendTestEmail">{{ sendingTestEmail ? 'Sending…' : 'Send test email' }}</Button>
              </div>
            </div>
          </template>
          <div v-else class="email-no-selection flex flex-col items-center justify-center flex-1 py-12 text-rm-muted text-sm"><p class="m-0">Select an email to view</p></div>
        </div>
      </div>
    </Panel>

    <Dialog
      v-model:visible="connectionInfoModalVisible"
      header="Connection info"
      :style="{ width: '28rem' }"
      modal
      class="email-connection-modal"
    >
      <p class="text-sm text-rm-muted m-0 mb-3">Point your app’s SMTP at this server. Start the server to see the port.</p>
      <div class="flex items-center justify-end gap-2 mb-2">
        <Button severity="secondary" size="small" icon="pi pi-copy" :label="connectionCopyFeedback || 'Copy'" :disabled="!connectionEnvText" @click="copyConnectionInfo" />
      </div>
      <pre v-if="connectionEnvText" class="email-connection-pre m-0 p-3 rounded-rm bg-rm-bg border border-rm-border text-xs font-mono text-rm-text whitespace-pre-wrap">{{ connectionEnvText }}</pre>
      <p v-else class="text-sm text-rm-muted m-0">Start the SMTP server to see the port and copy connection details.</p>
    </Dialog>

    <Dialog
      v-model:visible="configureAppModalVisible"
      header="Configure your app"
      :style="{ width: '36rem' }"
      modal
      class="email-configure-modal"
    >
      <p class="text-sm text-rm-muted m-0 mb-4">Replace <code class="bg-rm-bg px-1 rounded">PORT</code> with the port from Connection info.</p>
      <Accordion value="laravel" class="email-instructions-accordion">
        <AccordionPanel value="laravel">
          <AccordionHeader class="text-sm font-medium">Laravel / PHP (.env)</AccordionHeader>
          <AccordionContent>
            <p class="text-xs text-rm-muted m-0 mb-2">Add or override in your <code class="bg-rm-bg px-1 rounded">.env</code>.</p>
            <pre class="email-instruction-pre m-0 p-3 rounded-rm bg-rm-bg border border-rm-border text-xs font-mono text-rm-text whitespace-pre-wrap">MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=PORT
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null</pre>
            <Button severity="secondary" size="small" icon="pi pi-copy" class="mt-2" @click="copyInstruction('laravel')">Copy</Button>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="node">
          <AccordionHeader class="text-sm font-medium">Node (Nodemailer)</AccordionHeader>
          <AccordionContent>
            <p class="text-xs text-rm-muted m-0 mb-2">Use this transport config.</p>
            <pre class="email-instruction-pre m-0 p-3 rounded-rm bg-rm-bg border border-rm-border text-xs font-mono text-rm-text whitespace-pre-wrap">const transporter = nodemailer.createTransport({
  host: '127.0.0.1',
  port: PORT,
  secure: false,
  ignoreTLS: true
});</pre>
            <Button severity="secondary" size="small" icon="pi pi-copy" class="mt-2" @click="copyInstruction('node')">Copy</Button>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="python">
          <AccordionHeader class="text-sm font-medium">Python (smtplib)</AccordionHeader>
          <AccordionContent>
            <pre class="email-instruction-pre m-0 p-3 rounded-rm bg-rm-bg border border-rm-border text-xs font-mono text-rm-text whitespace-pre-wrap">import smtplib
smtp = smtplib.SMTP('127.0.0.1', PORT)
# no starttls/auth needed for catch server</pre>
            <Button severity="secondary" size="small" icon="pi pi-copy" class="mt-2" @click="copyInstruction('python')">Copy</Button>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="ruby">
          <AccordionHeader class="text-sm font-medium">Ruby (Action Mailer)</AccordionHeader>
          <AccordionContent>
            <p class="text-xs text-rm-muted m-0 mb-2">In <code class="bg-rm-bg px-1 rounded">config/environments/development.rb</code> or via env.</p>
            <pre class="email-instruction-pre m-0 p-3 rounded-rm bg-rm-bg border border-rm-border text-xs font-mono text-rm-text whitespace-pre-wrap">config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: '127.0.0.1',
  port: PORT,
  enable_starttls_auto: false
}</pre>
            <Button severity="secondary" size="small" icon="pi pi-copy" class="mt-2" @click="copyInstruction('ruby')">Copy</Button>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="dotnet">
          <AccordionHeader class="text-sm font-medium">.NET / C#</AccordionHeader>
          <AccordionContent>
            <p class="text-xs text-rm-muted m-0 mb-2">No credentials needed.</p>
            <pre class="email-instruction-pre m-0 p-3 rounded-rm bg-rm-bg border border-rm-border text-xs font-mono text-rm-text whitespace-pre-wrap">// appsettings.Development.json or code
{
  "Mail": {
    "Host": "127.0.0.1",
    "Port": PORT,
    "EnableSsl": false
  }
}</pre>
            <Button severity="secondary" size="small" icon="pi pi-copy" class="mt-2" @click="copyInstruction('dotnet')">Copy</Button>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </Dialog>

    <Dialog
      v-model:visible="composeModalVisible"
      :header="composeMode === 'forward' ? 'Forward email' : 'Compose email'"
      :style="{ width: '32rem' }"
      modal
      class="email-compose-dialog"
      @hide="onComposeModalHide"
    >
      <p class="text-xs text-rm-muted m-0 mb-3">Your default mail client will open with the message. Use To, CC, and BCC for different mailboxes (comma-separated). With attachments, a draft .eml file is opened instead of a mailto link.</p>
      <div class="flex flex-col gap-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <label for="compose-to" class="block text-sm font-medium text-rm-text">To</label>
            <Button v-if="projectMailboxEmail" variant="text" size="small" class="text-xs p-0 min-w-0 h-auto" label="Send to project mailbox" @click="useProjectMailboxInCompose" />
          </div>
          <InputText id="compose-to" v-model="composeTo" type="text" class="w-full" placeholder="recipient@example.com or comma-separated" />
        </div>
        <div>
          <label for="compose-cc" class="block text-sm font-medium text-rm-text mb-1">CC</label>
          <InputText id="compose-cc" v-model="composeCc" type="text" class="w-full" placeholder="cc@example.com (optional, comma-separated)" />
        </div>
        <div>
          <label for="compose-bcc" class="block text-sm font-medium text-rm-text mb-1">BCC</label>
          <InputText id="compose-bcc" v-model="composeBcc" type="text" class="w-full" placeholder="bcc@example.com (optional, comma-separated)" />
        </div>
        <div>
          <label for="compose-subject" class="block text-sm font-medium text-rm-text mb-1">Subject</label>
          <InputText id="compose-subject" v-model="composeSubject" type="text" class="w-full" placeholder="Subject" />
        </div>
        <div>
          <label for="compose-body" class="block text-sm font-medium text-rm-text mb-1">Body</label>
          <Textarea id="compose-body" v-model="composeBody" class="w-full min-h-[12rem]" placeholder="Message body" :auto-resize="false" />
        </div>
        <div>
          <label class="block text-sm font-medium text-rm-text mb-1">Attachments</label>
          <div class="flex flex-wrap items-center gap-2">
            <FileUpload
              ref="composeFileUploadRef"
              mode="basic"
              :multiple="true"
              customUpload
              chooseLabel="Add files"
              :showUploadButton="false"
              class="email-compose-fileupload"
              @select="onComposeFileSelect"
            ></FileUpload>
            <template v-for="(att, idx) in composeAttachments" :key="idx">
              <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-rm-surface border border-rm-border text-rm-text">
                {{ att.name }}
                <Button variant="text" size="small" icon="pi pi-times" class="p-0.5 min-w-0 h-auto rounded hover:bg-rm-surface/80 text-rm-muted hover:text-rm-text" aria-label="Remove attachment" @click="removeComposeAttachment(idx)" />
              </span>
            </template>
          </div>
        </div>
      </div>
      <template #footer>
        <Button severity="secondary" size="small" label="Cancel" @click="composeModalVisible = false" />
        <Button severity="primary" size="small" label="Send" icon="pi pi-send" :disabled="!composeSubject && !composeBody" @click="sendFromComposeModal" />
      </template>
    </Dialog>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Menu from 'primevue/menu';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import Divider from 'primevue/divider';
import FileUpload from 'primevue/fileupload';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';
import { useEmail } from './useEmail';
import { formatDateWithTime } from '../../utils/formatDate';

const props = defineProps({ info: { type: Object, default: null } });
const store = useAppStore();
const projectPath = computed(() => (props.info?.path ?? store.selectedPath ?? '').trim() || '');
const api = useApi();
const { smtpStatus, emails, selectedEmail, selectedIds, selectedEmails, viewMode, viewModeOptions, emailLinks, startingSmtp, stoppingSmtp, sendingTestEmail, startSmtp, stopSmtp, clearAll, sendTestEmail, toggleSelectEmail, setSelection, selectAll, clearSelection, isSelected, deleteEmail, deleteSelected } = useEmail(projectPath);
const viewModeOptionsSafe = computed(() => (Array.isArray(viewModeOptions) ? viewModeOptions : []));

const projectMailboxEmail = ref('');
const projectSmtpPort = ref(null);
const connectionCopyFeedback = ref('');

const effectivePort = computed(() => {
  if (smtpStatus.value?.running && smtpStatus.value?.port) return smtpStatus.value.port;
  const p = projectSmtpPort.value;
  return (p != null && Number(p) >= 1 && Number(p) <= 65535) ? Number(p) : 1025;
});

const connectionEnvText = computed(() => {
  const port = effectivePort.value;
  return `MAIL_HOST=127.0.0.1\nMAIL_PORT=${port}\nMAIL_USERNAME=null\nMAIL_PASSWORD=null\nMAIL_ENCRYPTION=null`;
});

async function loadProjectSmtpPort() {
  const path = projectPath.value;
  if (!path) {
    projectSmtpPort.value = null;
    return;
  }
  try {
    const map = await api.getPreference?.('projectSmtpSettings');
    const obj = typeof map === 'object' && map !== null ? map : {};
    const entry = obj[path];
    const port = entry?.port;
    projectSmtpPort.value = (port != null && Number(port) >= 1 && Number(port) <= 65535) ? Number(port) : null;
  } catch {
    projectSmtpPort.value = null;
  }
}

async function saveProjectSmtpPort() {
  const path = projectPath.value;
  if (!path || !api.setPreference) return;
  const raw = projectSmtpPort.value;
  const port = (raw != null && raw !== '' && Number(raw) >= 1 && Number(raw) <= 65535) ? Number(raw) : null;
  try {
    const current = (await api.getPreference?.('projectSmtpSettings')) || {};
    const next = { ...current };
    if (port != null) next[path] = { port };
    else delete next[path];
    await api.setPreference('projectSmtpSettings', next);
  } catch (_) {}
}

function startSmtpWithProjectPort() {
  const p = projectSmtpPort.value;
  const preferred = (p != null && p !== '' && Number(p) >= 1 && Number(p) <= 65535) ? Number(p) : undefined;
  startSmtp(preferred);
}

async function copyConnectionInfo() {
  if (!connectionEnvText.value) return;
  try {
    await copyToClipboard(connectionEnvText.value);
    connectionCopyFeedback.value = 'Copied';
    scheduleClear(2000, () => { connectionCopyFeedback.value = ''; });
  } catch (_) {}
}

const instructionTemplates = {
  laravel: `MAIL_MAILER=smtp\nMAIL_HOST=127.0.0.1\nMAIL_PORT=PORT\nMAIL_USERNAME=null\nMAIL_PASSWORD=null\nMAIL_ENCRYPTION=null`,
  node: `const transporter = nodemailer.createTransport({\n  host: '127.0.0.1',\n  port: PORT,\n  secure: false,\n  ignoreTLS: true\n});`,
  python: `import smtplib\nsmtp = smtplib.SMTP('127.0.0.1', PORT)\n# no starttls/auth needed for catch server`,
  ruby: `config.action_mailer.delivery_method = :smtp\nconfig.action_mailer.smtp_settings = {\n  address: '127.0.0.1',\n  port: PORT,\n  enable_starttls_auto: false\n}`,
  dotnet: `// appsettings.Development.json or code\n{\n  "Mail": {\n    "Host": "127.0.0.1",\n    "Port": PORT,\n    "EnableSsl": false\n  }\n}`,
};

async function copyInstruction(app) {
  const tpl = instructionTemplates[app];
  if (!tpl) return;
  const text = tpl.replace(/PORT/g, String(effectivePort.value));
  try {
    await copyToClipboard(text);
    shareMessage.value = 'Copied to clipboard';
    scheduleClear(2000, () => { shareMessage.value = ''; });
  } catch (_) {}
}

async function loadProjectMailbox() {
  const path = projectPath.value;
  if (!path) {
    projectMailboxEmail.value = '';
    return;
  }
  try {
    const map = await api.getPreference?.('projectMailbox');
    const obj = typeof map === 'object' && map !== null ? map : {};
    projectMailboxEmail.value = (obj[path] && typeof obj[path] === 'string') ? obj[path].trim() : '';
  } catch {
    projectMailboxEmail.value = '';
  }
}
async function saveProjectMailbox() {
  const path = projectPath.value;
  if (!path || !api.setPreference) return;
  try {
    const current = (await api.getPreference?.('projectMailbox')) || {};
    const next = { ...current };
    const value = projectMailboxEmail.value?.trim();
    if (value) next[path] = value;
    else delete next[path];
    await api.setPreference('projectMailbox', next);
  } catch (_) {}
}
function useProjectMailboxInCompose() {
  if (projectMailboxEmail.value) composeTo.value = projectMailboxEmail.value;
}
const OUTGOING_ENCRYPTION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'tls', label: 'TLS' },
  { value: 'ssl', label: 'SSL' },
];
const projectOutgoingEncryptionOptionsSafe = computed(() => Array.isArray(OUTGOING_ENCRYPTION_OPTIONS) ? OUTGOING_ENCRYPTION_OPTIONS : []);

const projectCheckBrokenLinks = ref(false);
const projectEnableSpamChecking = ref(true);
const projectOutgoingHost = ref('');
const projectOutgoingUsername = ref('');
const projectOutgoingPort = ref(587);
const projectOutgoingPassword = ref('');
const projectOutgoingEncryption = ref('tls');

async function loadProjectEmailOptions() {
  const path = projectPath.value;
  if (!path) {
    projectCheckBrokenLinks.value = false;
    projectEnableSpamChecking.value = true;
    return;
  }
  try {
    const map = await api.getPreference?.('projectEmailOptions');
    const obj = typeof map === 'object' && map !== null ? map : {};
    const entry = obj[path];
    projectCheckBrokenLinks.value = !!entry?.checkBrokenLinks;
    projectEnableSpamChecking.value = entry?.enableSpamChecking !== false;
  } catch {
    projectCheckBrokenLinks.value = false;
    projectEnableSpamChecking.value = true;
  }
}

async function saveProjectEmailOptions() {
  const path = projectPath.value;
  if (!path || !api.setPreference) return;
  try {
    const current = (await api.getPreference?.('projectEmailOptions')) || {};
    const next = { ...current };
    next[path] = {
      checkBrokenLinks: projectCheckBrokenLinks.value,
      enableSpamChecking: projectEnableSpamChecking.value,
    };
    await api.setPreference('projectEmailOptions', next);
  } catch (_) {}
}

async function loadProjectOutgoing() {
  const path = projectPath.value;
  if (!path) {
    projectOutgoingHost.value = '';
    projectOutgoingUsername.value = '';
    projectOutgoingPort.value = 587;
    projectOutgoingPassword.value = '';
    projectOutgoingEncryption.value = 'tls';
    return;
  }
  try {
    const map = await api.getPreference?.('projectOutgoingSmtp');
    const obj = typeof map === 'object' && map !== null ? map : {};
    const entry = obj[path];
    projectOutgoingHost.value = entry?.host ?? '';
    projectOutgoingUsername.value = entry?.username ?? '';
    projectOutgoingPort.value = (entry?.port != null && Number(entry.port) >= 1 && Number(entry.port) <= 65535) ? Number(entry.port) : 587;
    projectOutgoingPassword.value = entry?.password ?? '';
    projectOutgoingEncryption.value = ['none', 'tls', 'ssl'].includes(entry?.encryption) ? entry.encryption : 'tls';
  } catch {
    projectOutgoingHost.value = '';
    projectOutgoingUsername.value = '';
    projectOutgoingPort.value = 587;
    projectOutgoingPassword.value = '';
    projectOutgoingEncryption.value = 'tls';
  }
}

async function saveProjectOutgoing() {
  const path = projectPath.value;
  if (!path || !api.setPreference) return;
  try {
    const current = (await api.getPreference?.('projectOutgoingSmtp')) || {};
    const next = { ...current };
    next[path] = {
      host: projectOutgoingHost.value?.trim() ?? '',
      username: projectOutgoingUsername.value?.trim() ?? '',
      port: (projectOutgoingPort.value != null && Number(projectOutgoingPort.value) >= 1 && Number(projectOutgoingPort.value) <= 65535) ? Number(projectOutgoingPort.value) : 587,
      password: projectOutgoingPassword.value ?? '',
      encryption: projectOutgoingEncryption.value ?? 'tls',
    };
    await api.setPreference('projectOutgoingSmtp', next);
  } catch (_) {}
}

watch(projectPath, () => { loadProjectMailbox(); loadProjectSmtpPort(); loadProjectEmailOptions(); loadProjectOutgoing(); }, { immediate: true });
onMounted(() => { loadProjectMailbox(); loadProjectSmtpPort(); loadProjectEmailOptions(); loadProjectOutgoing(); });
onUnmounted(() => {
  pendingTimeouts.forEach((id) => clearTimeout(id));
  pendingTimeouts.clear();
});

const shareMenuRef = ref(null);
const bulkShareMenuRef = ref(null);
const shareMessage = ref('');

const connectionInfoModalVisible = ref(false);
const configureAppModalVisible = ref(false);
const emailSettingsModalVisible = ref(false);
const emailToolbarMoreMenuRef = ref(null);

const emailToolbarMoreMenuItems = computed(() => [
  { label: 'Send test email', icon: 'pi pi-envelope', command: () => sendTestEmail(), disabled: sendingTestEmail.value },
  { label: 'Connection info', icon: 'pi pi-info-circle', command: () => { connectionInfoModalVisible.value = true; } },
  { label: 'Configure your app', icon: 'pi pi-cog', command: () => { configureAppModalVisible.value = true; } },
  { label: 'Email settings', icon: 'pi pi-sliders-h', command: () => { emailSettingsModalVisible.value = true; } },
]);
const composeModalVisible = ref(false);
const composeMode = ref('compose');
const composeTo = ref('');
const composeCc = ref('');
const composeBcc = ref('');
const composeSubject = ref('');
const composeBody = ref('');
const composeAttachments = ref([]);
const composeFileUploadRef = ref(null);
const pendingTimeouts = new Set();
function scheduleClear(delay, fn) {
  const id = setTimeout(() => {
    pendingTimeouts.delete(id);
    fn();
  }, delay);
  pendingTimeouts.add(id);
  return id;
}

const shareMenuItems = computed(() => [
  { label: 'Copy summary', icon: 'pi pi-copy', command: () => copySummary() },
  { label: 'Copy raw', icon: 'pi pi-code', command: () => copyRaw() },
  { label: 'Save as .eml', icon: 'pi pi-download', command: () => saveAsEml() },
]);

const bulkShareMenuItems = computed(() => [
  { label: 'Copy summary (selected)', icon: 'pi pi-copy', command: () => copySummarySelected() },
  { label: 'Copy raw (selected)', icon: 'pi pi-code', command: () => copyRawSelected() },
  { label: 'Save selected as .eml', icon: 'pi pi-download', command: () => saveSelectedAsEml() },
]);

function openLink(href) {
  if (href && api.openUrl) api.openUrl(href);
}

function spamScoreSeverity(score) {
  if (score == null) return 'secondary';
  if (score < 2) return 'success';
  if (score < 5) return 'info';
  if (score < 7) return 'warn';
  return 'danger';
}

async function copySummary() {
  const e = selectedEmail.value;
  if (!e) return;
  const lines = [
    `From: ${e.from || ''}`,
    `To: ${e.to || ''}`,
    `Subject: ${e.subject || ''}`,
    `Date: ${e.date || ''}`,
    '',
    (e.text || '').slice(0, 2000) || '(No plain text)',
  ];
  await copyToClipboard(lines.join('\n'));
  shareMessage.value = 'Summary copied to clipboard';
  scheduleClear(2000, () => { shareMessage.value = ''; });
}

async function copyRaw() {
  const e = selectedEmail.value;
  if (!e?.raw) return;
  await copyToClipboard(e.raw);
  shareMessage.value = 'Raw email copied to clipboard';
  scheduleClear(2000, () => { shareMessage.value = ''; });
}

function saveAsEml() {
  const e = selectedEmail.value;
  if (!e?.raw) return;
  const subject = (e.subject || 'email').replace(/[<>:"/\\|?*]/g, '_').slice(0, 80);
  const filename = `${subject}.eml`;
  const blob = new Blob([e.raw], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  shareMessage.value = 'Saved as .eml';
  scheduleClear(2000, () => { shareMessage.value = ''; });
}

function buildSummaryLines(e) {
  return [
    `From: ${e.from || ''}`,
    `To: ${e.to || ''}`,
    `Subject: ${e.subject || ''}`,
    `Date: ${e.date || ''}`,
    '',
    (e.text || '').slice(0, 2000) || '(No plain text)',
  ];
}

async function copySummarySelected() {
  const list = selectedEmails.value;
  if (!list?.length) return;
  const blocks = list.map((e) => buildSummaryLines(e).join('\n'));
  const text = blocks.join('\n\n---\n\n');
  await copyToClipboard(text);
  shareMessage.value = `Summary of ${list.length} email(s) copied`;
  scheduleClear(2000, () => { shareMessage.value = ''; });
}

async function copyRawSelected() {
  const list = selectedEmails.value;
  if (!list?.length) return;
  const text = list.map((e) => e?.raw ?? '').join('\n\n---\n\n');
  await copyToClipboard(text);
  shareMessage.value = `Raw of ${list.length} email(s) copied`;
  scheduleClear(2000, () => { shareMessage.value = ''; });
}

function saveSelectedAsEml() {
  const list = selectedEmails.value;
  if (!list?.length) return;
  list.forEach((e, idx) => {
    if (!e?.raw) return;
    const subject = (e.subject || 'email').replace(/[<>:"/\\|?*]/g, '_').slice(0, 60);
    const filename = `${String(idx + 1).padStart(2, '0')}-${subject}.eml`;
    const blob = new Blob([e.raw], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
  shareMessage.value = `Saved ${list.length} as .eml`;
  scheduleClear(2000, () => { shareMessage.value = ''; });
}

function buildForwardBody() {
  const e = selectedEmail.value;
  if (!e) return '';
  const body = (e.text || '').trim() || '(No plain text content)';
  return [
    '---------- Forwarded message ---------',
    `From: ${e.from || ''}`,
    `To: ${e.to || ''}`,
    `Date: ${e.date || ''}`,
    `Subject: ${e.subject || ''}`,
    '',
    body,
  ].join('\n');
}

function openForwardModal() {
  const e = selectedEmail.value;
  if (!e) return;
  composeMode.value = 'forward';
  composeTo.value = '';
  composeCc.value = '';
  composeBcc.value = '';
  composeSubject.value = `Fwd: ${(e.subject || '').trim() || '(no subject)'}`;
  composeBody.value = buildForwardBody();
  composeAttachments.value = [];
  composeModalVisible.value = true;
}

function openComposeModal() {
  composeMode.value = 'compose';
  composeTo.value = '';
  composeCc.value = '';
  composeBcc.value = '';
  composeSubject.value = '';
  composeBody.value = '';
  composeAttachments.value = [];
  composeModalVisible.value = true;
}

function onComposeModalHide() {
  composeTo.value = '';
  composeCc.value = '';
  composeBcc.value = '';
  composeSubject.value = '';
  composeBody.value = '';
  composeAttachments.value = [];
}

async function onComposeFileSelect(e) {
  const files = e?.files || [];
  if (!files.length) return;
  for (const file of files) {
    const base64 = await fileToBase64(file);
    composeAttachments.value.push({ name: file.name, base64 });
  }
  composeFileUploadRef.value?.clear?.();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function removeComposeAttachment(idx) {
  composeAttachments.value = composeAttachments.value.filter((_, i) => i !== idx);
}

function encodeMimeSubject(s) {
  if (!s) return '';
  try {
    return '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(s))) + '?=';
  } catch {
    return s;
  }
}

function buildEmlDraft() {
  const to = (composeTo.value || '').trim();
  const cc = (composeCc.value || '').trim();
  const bcc = (composeBcc.value || '').trim();
  const subject = (composeSubject.value || '').trim();
  const body = (composeBody.value || '').trim().replace(/\r?\n/g, '\r\n');
  const attachments = composeAttachments.value || [];
  const boundary = '----=_Part_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
  const lines = [];
  lines.push('MIME-Version: 1.0');
  if (to) lines.push('To: ' + to);
  if (cc) lines.push('Cc: ' + cc);
  if (bcc) lines.push('Bcc: ' + bcc);
  lines.push('Subject: ' + encodeMimeSubject(subject));
  lines.push('Content-Type: multipart/mixed; boundary="' + boundary + '"');
  lines.push('');
  lines.push('--' + boundary);
  lines.push('Content-Type: text/plain; charset=UTF-8');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(body || '');
  for (const att of attachments) {
    const safeName = (att.name || 'attachment').replace(/[\r\n"]/g, '_');
    lines.push('--' + boundary);
    lines.push('Content-Disposition: attachment; filename="' + safeName + '"');
    lines.push('Content-Type: application/octet-stream');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(att.base64 || '');
  }
  lines.push('--' + boundary + '--');
  return lines.join('\r\n');
}

function sendFromComposeModal() {
  const to = (composeTo.value || '').trim();
  const cc = (composeCc.value || '').trim();
  const bcc = (composeBcc.value || '').trim();
  const subject = (composeSubject.value || '').trim();
  const body = (composeBody.value || '').trim();
  const hasAttachments = composeAttachments.value?.length > 0;

  if (hasAttachments && api.writeEmlDraftAndOpen) {
    const eml = buildEmlDraft();
    api.writeEmlDraftAndOpen(eml).then((result) => {
      if (result?.ok) composeModalVisible.value = false;
    });
    return;
  }

  let mailto = 'mailto:';
  if (to) mailto += encodeURIComponent(to);
  const params = [];
  if (cc) params.push(`cc=${encodeURIComponent(cc)}`);
  if (bcc) params.push(`bcc=${encodeURIComponent(bcc)}`);
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  if (params.length) mailto += '?' + params.join('&');
  if (api.openUrl) api.openUrl(mailto);
  composeModalVisible.value = false;
}

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error('Clipboard not available'));
}
</script>

<style scoped>
.email-code { padding: 2px 8px; border-radius: 4px; background: rgb(var(--rm-bg)); border: 1px solid rgb(var(--rm-border)); font-size: 12px; font-family: ui-monospace, monospace; }
.email-list-item { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-bottom: 1px solid rgb(var(--rm-border)); cursor: pointer; transition: background 0.1s; }
.email-list-item:hover { background: rgb(var(--rm-surface) / 0.6); }
.email-list-item-selected { background: rgb(var(--rm-accent) / 0.12); border-left: 3px solid rgb(var(--rm-accent)); padding-left: 9px; }
.email-list-item-body { min-width: 0; }
.email-list-checkbox { margin-top: 2px; }
.email-view-mode-select :deep(button) { padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; background: transparent; border: none; color: rgb(var(--rm-muted)); transition: color 0.15s, background 0.15s; }
.email-view-mode-select :deep(button:hover) { color: rgb(var(--rm-text)); background: rgb(var(--rm-surface)); }
.email-view-mode-select :deep(button[data-p-active="true"]) { color: rgb(var(--rm-accent)); background: rgb(var(--rm-accent) / 0.1); }
.email-pre { font-family: ui-monospace, monospace; }
.email-html-body :deep(a) { color: rgb(var(--rm-accent)); }
.email-html-body :deep(img) { max-width: 100%; height: auto; }
</style>
