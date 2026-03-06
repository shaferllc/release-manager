<template>
  <ExtensionLayout tab-id="kanban" content-class="detail-kanban-card">
    <template #toolbar-start>
        <h3 class="kanban-title card-label mb-0 mr-4">Kanban</h3>
        <div class="flex items-center gap-2">
          <span class="text-rm-muted text-sm font-medium">Board</span>
          <template v-if="editingBoardName">
            <InputText
              ref="editBoardNameInputRef"
              v-model="editBoardNameInput"
              class="text-sm w-40"
              placeholder="Board name"
              @keydown.enter="saveRenameBoard"
              @keydown.escape="cancelRenameBoard"
            />
            <Button variant="text" size="small" class="text-sm" @click="saveRenameBoard">Save</Button>
            <Button variant="text" size="small" class="text-sm" @click="cancelRenameBoard">Cancel</Button>
          </template>
          <template v-else>
            <Select
              v-model="activeBoardId"
              :options="boardList"
              option-label="name"
              option-value="id"
              class="kanban-select text-sm min-w-[10rem]"
            />
            <Button variant="text" size="small" class="text-sm p-1 min-w-0" aria-label="Rename board" title="Rename board" @click="startRenameBoard">✎</Button>
            <Button
              v-if="boardList.length > 1"
              variant="text"
              severity="danger"
              size="small"
              class="text-sm p-1 min-w-0"
              aria-label="Delete board"
              title="Delete board"
              @click="confirmDeleteBoard"
            >
              ×
            </Button>
            <Button variant="outlined" size="small" class="text-sm" @click="addBoard">+ Board</Button>
          </template>
        </div>
    </template>
    <template #toolbar-end>
        <Button
          variant="outlined"
          size="small"
          class="text-sm"
          @click="startAddColumn"
        >
          + Add list
        </Button>
        <template v-if="optInSmartFilteringViews">
          <div v-if="allLabels.length" class="flex items-center gap-2">
            <span class="text-rm-muted text-sm font-medium">Filter</span>
            <Select
              v-model="filterLabel"
              :options="filterLabelOptions"
              option-label="label"
              option-value="value"
              placeholder="All cards"
              class="kanban-select text-sm min-w-[8rem]"
              @update:model-value="selectedViewId = ''"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-rm-muted text-sm font-medium">Swimlanes</span>
            <Select v-model="swimlaneBy" :options="SWIMLANE_OPTIONS" option-label="label" option-value="value" class="kanban-select text-sm min-w-[8rem]" @update:model-value="selectedViewId = ''" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-rm-muted text-sm font-medium">View</span>
            <Select
              v-model="selectedViewId"
              :options="savedViewOptions"
              option-label="label"
              option-value="id"
              placeholder="Current"
              class="kanban-select text-sm min-w-[8rem]"
              @update:model-value="applySavedView($event)"
            />
            <Button variant="text" size="small" class="text-sm" title="Save current filter and swimlane as view" @click="saveCurrentView">Save view</Button>
          </div>
        </template>
        <div class="flex items-center gap-2">
          <Checkbox v-model="showArchived" binary input-id="kanban-show-archived" />
          <label for="kanban-show-archived" class="text-sm text-rm-muted cursor-pointer">Show archived</label>
        </div>
        <Button variant="text" size="small" class="text-sm" @click="showMetrics = !showMetrics">
          {{ showMetrics ? 'Hide' : 'Show' }} metrics
        </Button>
        <Button variant="text" size="small" class="text-sm" :class="{ 'text-rm-accent': showFeaturesPanel }" @click="showFeaturesPanel = !showFeaturesPanel">
          Features
        </Button>
    </template>
    <div v-if="showFeaturesPanel" class="kanban-features-panel rounded-rm border border-rm-border bg-rm-surface/50 p-4 mb-4">
      <p class="text-sm text-rm-muted mb-3">Enable optional features (all off by default).</p>
      <div class="flex flex-wrap gap-6">
        <div class="flex items-center gap-2">
          <Checkbox v-model="optInWorkflowAutomation" binary input-id="opt-workflow" />
          <label for="opt-workflow" class="text-sm text-rm-text cursor-pointer">Workflow automation (timestamps on move)</label>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="optInCycleTimeAnalytics" binary input-id="opt-cycle" />
          <label for="opt-cycle" class="text-sm text-rm-text cursor-pointer">Cycle time analytics</label>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="optInDependencyTracking" binary input-id="opt-deps" />
          <label for="opt-deps" class="text-sm text-rm-text cursor-pointer">Dependency tracking</label>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="optInSmartFilteringViews" binary input-id="opt-filter" />
          <label for="opt-filter" class="text-sm text-rm-text cursor-pointer">Smart filtering &amp; multiple views (filter, swimlanes)</label>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="optInForecastingPredictive" binary input-id="opt-forecast" />
          <label for="opt-forecast" class="text-sm text-rm-text cursor-pointer">Forecasting and predictive delivery</label>
        </div>
      </div>
    </div>
    <div v-if="showMetrics" class="kanban-metrics-panel rounded-rm border border-rm-border bg-rm-surface/50 p-4 mb-4 flex flex-wrap gap-6">
      <div class="kanban-metric">
        <span class="text-sm text-rm-muted block">Throughput (7d)</span>
        <span class="text-xl font-semibold text-rm-text">{{ throughputLast7 }}</span>
      </div>
      <div v-if="leadTimeAvg != null" class="kanban-metric">
        <span class="text-sm text-rm-muted block">Avg lead time (days)</span>
        <span class="text-xl font-semibold text-rm-text">{{ leadTimeAvg }}</span>
      </div>
      <div v-if="optInCycleTimeAnalytics && cycleTimeAvg != null" class="kanban-metric">
        <span class="text-sm text-rm-muted block">Avg cycle time (days)</span>
        <span class="text-xl font-semibold text-rm-text">{{ cycleTimeAvg }}</span>
      </div>
      <div v-if="sleCurrentPercent != null" class="kanban-metric">
        <span class="text-sm text-rm-muted block">SLE ({{ sleTargetPercent }}% within {{ sleDays }}d)</span>
        <span class="text-xl font-semibold" :class="sleCurrentPercent >= sleTargetPercent ? 'text-rm-success' : 'text-rm-warning'">{{ sleCurrentPercent }}%</span>
      </div>
      <div class="flex items-center gap-4">
        <div v-if="optInCycleTimeAnalytics">
          <label class="text-sm text-rm-muted block">In-progress column (cycle time)</label>
          <Select v-model="inProgressColumnId" :options="inProgressColumnOptions" option-label="label" option-value="id" class="text-sm min-w-[8rem]" />
        </div>
        <div>
          <label class="text-sm text-rm-muted block">SLE target %</label>
          <InputText v-model.number="sleTargetPercent" type="number" class="text-sm w-16" />
        </div>
        <div>
          <label class="text-sm text-rm-muted block">SLE days</label>
          <InputText v-model.number="sleDays" type="number" class="text-sm w-16" />
        </div>
        <div>
          <label class="text-sm text-rm-muted block">Aging warn (days)</label>
          <InputText v-model.number="agingWarnDays" type="number" class="text-sm w-14" />
        </div>
        <div>
          <label class="text-sm text-rm-muted block">Aging urgent (days)</label>
          <InputText v-model.number="agingUrgentDays" type="number" class="text-sm w-14" />
        </div>
      </div>
      <div class="w-full">
        <Button variant="text" size="small" class="text-sm p-0 min-w-0 text-rm-muted hover:text-rm-accent" @click="showBlockerAnalytics = !showBlockerAnalytics">{{ showBlockerAnalytics ? 'Hide' : 'Show' }} blocker analytics</Button>
        <div v-if="showBlockerAnalytics && blockerTableData.length" class="mt-2 text-sm">
          <DataTable :value="blockerTableData" dataKey="reason" size="small" class="kanban-blocker-table w-full max-w-md">
            <Column field="reason" header="Reason" />
            <Column field="count" header="Count" />
          </DataTable>
        </div>
      </div>
      <div class="w-full">
        <Button variant="text" size="small" class="text-sm p-0 min-w-0 text-rm-muted hover:text-rm-accent" @click="showCfd = !showCfd">{{ showCfd ? 'Hide' : 'Show' }} cumulative flow (30d)</Button>
        <div v-if="showCfd && cfdData.length" class="mt-2 cfd-chart flex items-end gap-0.5 h-24">
          <div v-for="point in cfdData" :key="point.date" class="flex-1 min-w-0 flex flex-col justify-end bg-rm-accent/30 rounded-t" :style="{ height: (totalCount(point.counts) / Math.max(1, maxCfdTotal) * 100) + '%' }" :title="point.date + ': ' + totalCount(point.counts) + ' cards'" />
        </div>
      </div>
      <div v-if="optInForecastingPredictive" class="w-full border-t border-rm-border pt-3">
        <span class="text-sm font-medium text-rm-muted">Forecast</span>
        <div class="mt-2 text-sm text-rm-text space-y-1">
          <p v-if="backlogCount != null">Backlog: <strong>{{ backlogCount }}</strong> items (not in Done)</p>
          <p v-if="forecastSummary">{{ forecastSummary }}</p>
          <p v-if="forecastConfidence" class="text-rm-muted">{{ forecastConfidence }}</p>
        </div>
      </div>
    </div>
    <div class="kanban-board flex gap-6 overflow-x-auto pb-4 pt-1 min-h-[22rem]">
      <div
        v-for="(col, colIndex) in visibleColumns"
        :key="col.id"
        class="kanban-column flex-shrink-0 w-72 rounded-rm border border-rm-border bg-rm-surface/30 flex flex-col min-h-0"
      >
        <div
          class="kanban-column-header px-4 py-3 border-b border-rm-border font-medium text-sm text-rm-text shrink-0 flex flex-col gap-2"
          :class="{ 'kanban-column-header-wip-over': isWipOver(col), 'kanban-column-header-backlog': col.isBacklog }"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <template v-if="editingColumnId === col.id">
              <InputText
                ref="editColumnInputRef"
                v-model="editColumnLabel"
                class="text-sm flex-1 min-w-0"
                placeholder="List name"
                @keydown.enter="submitEditColumn"
                @keydown.escape="cancelEditColumn"
              />
              <Button variant="text" size="small" class="text-sm" @click="submitEditColumn">Save</Button>
              <Button variant="text" size="small" class="text-sm" @click="cancelEditColumn">Cancel</Button>
            </template>
            <template v-else>
              <span class="truncate flex-1 min-w-0 flex items-center gap-2" @dblclick="startEditColumn(col)">
                {{ col.label }}
                <span v-if="col.isBacklog" class="kanban-badge-backlog text-sm px-2 py-0.5 rounded font-normal">Backlog</span>
              </span>
              <div class="flex items-center gap-1 shrink-0">
              <Button
                v-if="colIndex > 0"
                variant="text"
                size="small"
                class="p-1 min-w-0"
                aria-label="Move list left"
                @click="moveColumn(col.id, 'left')"
              >
                <span class="text-sm">←</span>
              </Button>
              <Button
                v-if="colIndex < visibleColumns.length - 1"
                variant="text"
                size="small"
                class="p-1 min-w-0"
                aria-label="Move list right"
                @click="moveColumn(col.id, 'right')"
              >
                <span class="text-sm">→</span>
              </Button>
              <Button
                variant="text"
                severity="danger"
                size="small"
                class="p-1 min-w-0"
                aria-label="Delete list"
                @click="confirmRemoveColumn(col)"
              >
                ×
              </Button>
              <Button
                v-if="colIndex > 0 && pullSourceCards(colIndex).length > 0"
                variant="text"
                size="small"
                class="p-1 min-w-0 text-sm"
                :title="`Pull one card from ${visibleColumns[colIndex - 1]?.label}`"
                aria-label="Pull from previous"
                @click="pullOneToColumn(col.id, colIndex)"
              >
                Pull
              </Button>
            </div>
          </template>
          </div>
          <div v-if="!editingColumnId && col.wipLimit != null" class="kanban-wip-row text-sm font-normal" :class="isWipOver(col) ? 'text-rm-warning' : 'text-rm-muted'">
            {{ (cardsByColumn[col.id] || []).length }} / {{ col.wipLimit }} WIP
          </div>
          <div v-if="editingColumnId === col.id" class="flex flex-col gap-3 mt-1">
            <Textarea v-model="editColumnPolicy" class="text-sm w-full min-h-[2.5rem]" placeholder="Workflow policy / definition of done (optional)" rows="2" />
            <InputText v-model="editColumnWipLimit" type="number" class="text-sm w-24" placeholder="WIP limit" />
            <div class="flex items-center gap-2">
              <Checkbox v-model="editColumnIsBacklog" binary input-id="edit-col-backlog" />
              <label for="edit-col-backlog" class="text-sm text-rm-muted">Backlog queue</label>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox v-model="editColumnIsArchive" binary input-id="edit-col-archive" />
              <label for="edit-col-archive" class="text-sm text-rm-muted">Archive (hide by default)</label>
            </div>
          </div>
          <p v-else-if="col.policy" class="text-sm text-rm-muted mt-0 mb-0 font-normal italic leading-relaxed">{{ col.policy }}</p>
        </div>
        <div
          class="kanban-column-cards flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[4rem]"
          :class="{ 'kanban-column-cards-drag-over': dragOverColumnId === col.id }"
          :data-column-id="col.id"
        >
          <template v-for="group in cardsGroupedBySwimlaneForColumn[col.id]" :key="group.key + col.id">
            <div v-if="group.cards.length || effectiveSwimlaneBy === 'none'" class="space-y-2">
              <div v-if="effectiveSwimlaneBy !== 'none' && group.label" class="text-sm font-medium text-rm-muted uppercase tracking-wider border-b border-rm-border pb-1">
                {{ group.label }}
              </div>
              <div
                v-for="card in group.cards"
                :key="card.id"
                class="kanban-card rounded-rm border border-rm-border bg-rm-surface p-4 text-sm shadow-sm cursor-pointer"
                :data-card-id="card.id"
                :class="[
                  { 'kanban-card-overdue': isOverdue(card), 'kanban-card-blocked': card.blocked, 'kanban-card-dragging': draggedCardId === card.id, 'kanban-card-editing': editingCardId === card.id, 'kanban-card-drop-after': dropIndicatorAfterCardId === card.id },
                  agingClass(card),
                  classOfServiceStyle(card.classOfService),
                ]"
                @click="onCardClick($event, card)"
              >
            <template v-if="editingCardId === card.id">
              <div class="flex flex-col gap-3">
                <InputText v-model="editCardTitle" class="text-sm w-full" placeholder="Title" />
                <Textarea v-model="editCardDescription" class="text-sm min-h-[2.5rem] w-full" placeholder="Description" rows="2" />
                <DatePicker
                  v-model="editCardDueDate"
                  update-model-type="string"
                  date-format="yy-mm-dd"
                  show-clear
                  class="text-sm w-full"
                  placeholder="Due date"
                />
                <Select v-model="editCardPriority" :options="PRIORITY_OPTIONS" option-label="label" option-value="value" placeholder="Priority" class="text-sm w-full" />
                <div>
                  <label class="text-sm text-rm-muted block mb-1">Assignees</label>
                  <div class="flex flex-wrap items-center gap-2">
                    <span v-if="assigneesSummary(editCardAssignees)" class="text-sm text-rm-text">{{ assigneesSummary(editCardAssignees) }}</span>
                    <Button variant="outlined" size="small" class="text-sm" @click="openAssigneesModal('edit')">
                      {{ editCardAssignees.filter((a) => (a.name && a.name.trim()) || (a.email && a.email.trim())).length ? 'Edit assignees' : 'Add assignees' }}
                    </Button>
                  </div>
                </div>
                <div>
                  <label class="text-sm text-rm-muted block mb-1">Work type</label>
                  <Select v-model="editCardWorkType" :options="WORK_TYPE_OPTIONS" option-label="label" option-value="value" placeholder="Task" class="text-sm w-full" />
                </div>
                <div>
                  <label class="text-sm text-rm-muted block mb-1">Class of service</label>
                  <Select v-model="editCardClassOfService" :options="CLASS_OF_SERVICE_OPTIONS" option-label="label" option-value="value" placeholder="Standard" class="text-sm w-full" />
                </div>
                <div v-if="optInDependencyTracking">
                  <label class="text-sm text-rm-muted block mb-1">Depends on (cards)</label>
                  <div class="flex flex-wrap gap-2">
                    <label v-for="c in otherCardsForDeps(editingCardId)" :key="c.id" class="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox v-model="editCardDependsOn" :value="c.id" />
                      {{ c.title }}
                    </label>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Checkbox v-model="editCardBlocked" binary input-id="edit-card-blocked" />
                  <label for="edit-card-blocked" class="text-sm text-rm-muted">Blocked</label>
                </div>
                <InputText v-if="editCardBlocked" v-model="editCardBlockerReason" class="text-sm w-full" placeholder="Blocker reason" />
                <div class="flex flex-wrap gap-2 items-center">
                  <span v-for="tag in editCardLabels" :key="tag" class="inline-flex items-center gap-1 px-2 py-1 rounded text-sm bg-rm-surface-hover">
                    {{ tag }}
                    <Button variant="text" size="small" class="p-0 min-w-0 leading-none text-rm-muted hover:text-rm-text" @click="removeEditLabel(tag)">×</Button>
                  </span>
                  <InputText
                    v-model="newLabelInput"
                    class="w-20 text-sm"
                    placeholder="+ label"
                    @keydown.enter.prevent="addEditLabel"
                  />
                </div>
                <div class="flex gap-2 pt-1">
                  <Button severity="primary" size="small" class="text-sm" :disabled="!editCardTitle.trim()" @click="submitEditCard">Save</Button>
                  <Button variant="text" size="small" class="text-sm" @click="cancelEditCard">Cancel</Button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="flex items-start gap-2 min-w-0">
                <span
                  class="kanban-card-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text touch-none select-none self-center py-0.5"
                  title="Drag to move"
                  aria-hidden="true"
                  @pointerdown.stop="onCardPointerDown($event, card)"
                >⋮⋮</span>
                <div class="min-w-0 flex-1 flex items-center justify-between gap-2">
                  <h4 class="kanban-card-title font-medium text-rm-text text-sm m-0 truncate leading-snug">{{ card.title }}</h4>
                  <div class="flex items-center gap-0.5 shrink-0">
                    <Button
                      v-if="col.id !== firstColumnId"
                      variant="text"
                      size="small"
                      class="kanban-card-action-btn p-1.5 min-w-0 rounded text-rm-muted hover:text-rm-text"
                      aria-label="Move left"
                      title="Move left"
                      @click="moveCard(card.id, col.id, 'left')"
                    >
                      <span class="text-sm">←</span>
                    </Button>
                    <Button
                      v-if="col.id !== lastColumnId"
                      variant="text"
                      size="small"
                      class="kanban-card-action-btn p-1.5 min-w-0 rounded text-rm-muted hover:text-rm-text"
                      aria-label="Move right"
                      title="Move right"
                      @click="moveCard(card.id, col.id, 'right')"
                    >
                      <span class="text-sm">→</span>
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      class="kanban-card-action-btn p-1.5 min-w-0 rounded text-rm-muted hover:text-rm-text"
                      :aria-label="card.startedAt && !card.stoppedAt ? 'Stop work timer' : 'Start work timer'"
                      :title="card.startedAt && !card.stoppedAt ? 'Stop' : 'Start'"
                      @click.stop="toggleCardTimer(card.id)"
                    >
                      {{ card.startedAt && !card.stoppedAt ? '⏹' : '▶' }}
                    </Button>
                    <Button variant="text" size="small" class="kanban-card-action-btn p-1.5 min-w-0 rounded text-rm-muted hover:text-rm-text" aria-label="Edit card" title="Edit" @click="startEditCard(card)">
                      ✎
                    </Button>
                    <Button variant="text" severity="danger" size="small" class="kanban-card-action-btn p-1.5 min-w-0 rounded opacity-80 hover:opacity-100" aria-label="Remove card" title="Remove" @click="removeCard(card.id)">
                      ×
                    </Button>
                  </div>
                </div>
              </div>
              <p v-if="card.description" class="kanban-card-description text-sm text-rm-muted mt-1 mb-0 leading-relaxed">{{ card.description }}</p>
              <div class="kanban-card-actions mt-2 pt-2 border-t border-rm-border/50">
                <Select
                  v-if="visibleColumns.length > 1"
                  :model-value="col.id"
                  :options="getMoveOptionsForCard(card)"
                  option-label="label"
                  option-value="id"
                  option-disabled="disabled"
                  class="kanban-card-move text-sm w-full"
                  style="min-width: 0; max-width: 9rem"
                  title="Move to..."
                  @update:model-value="moveCardToColumn(card.id, $event)"
                />
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  variant="outlined"
                  size="small"
                  class="text-xs"
                  :class="card.startedAt && !card.stoppedAt ? 'border-rm-accent/50 text-rm-accent' : 'text-rm-muted'"
                  :aria-label="card.startedAt && !card.stoppedAt ? 'Stop work timer' : 'Start work timer'"
                  :title="card.startedAt && !card.stoppedAt ? 'Stop' : 'Start'"
                  @click.stop="toggleCardTimer(card.id)"
                >
                  {{ card.startedAt && !card.stoppedAt ? '⏹ Stop' : '▶ Start' }}
                </Button>
                <Button
                  v-if="hasWorkTime(card)"
                  variant="text"
                  size="small"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs min-w-0 text-rm-muted hover:bg-rm-surface-hover hover:text-rm-text"
                  :class="card.startedAt && !card.stoppedAt ? 'bg-rm-accent/15 text-rm-accent font-medium tabular-nums' : ''"
                  title="View work time"
                  @click="openWorkSessionsModal(card)"
                >
                  ⏱ {{ card.startedAt && !card.stoppedAt ? [formatTotalWorkDuration(card), formatElapsedLive(card.startedAt, timerTick)].filter(Boolean).join(' + ') : formatTotalWorkDuration(card) }}
                </Button>
              </div>
              <p v-if="card.blocked && card.blockerReason" class="text-sm text-rm-warning mt-2 mb-0 break-words">🚫 {{ card.blockerReason }}</p>
              <p v-else-if="card.blocked" class="text-sm text-rm-warning mt-2 mb-0">🚫 Blocked</p>
              <div v-if="card.dueDate || card.priority || card.classOfService || (card.labels && card.labels.length) || card.createdAt || card.updatedAt" class="kanban-card-meta mt-2 pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-rm-muted">
                <span v-if="card.dueDate" :class="isOverdue(card) ? 'text-rm-warning' : ''">
                  📅 {{ formatDueDate(card.dueDate) }}
                </span>
                <span v-if="card.priority" class="kanban-priority-badge px-1.5 py-0.5 rounded text-xs" :class="priorityClass(card.priority)">
                  {{ card.priority }}
                </span>
                <span v-if="card.classOfService" class="px-1.5 py-0.5 rounded text-xs bg-rm-surface-hover">{{ classOfServiceLabel(card.classOfService) }}</span>
                <span v-for="l in (card.labels || [])" :key="l" class="px-1.5 py-0.5 rounded text-xs bg-rm-surface-hover">{{ l }}</span>
                <span v-if="flowSummary(card)" class="text-xs">
                  {{ flowSummary(card) }}
                </span>
              </div>
              <p v-if="daysInColumn(card) > 0 || getColumnTimeSummary(card).length > 0" class="text-xs text-rm-muted mt-1 mb-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span v-if="daysInColumn(card) > 0">In column {{ daysInColumn(card) }}d</span>
                <span v-for="seg in getColumnTimeSummary(card)" :key="seg.columnId" class="inline">
                  <span class="font-medium">{{ seg.label }}:</span> {{ formatDurationMs(seg.durationMs) }}<span v-if="seg.columnId === card.columnId" class="text-rm-accent/80"> (current)</span>
                </span>
              </p>
              <template v-if="optInDependencyTracking">
                <p v-if="(card.dependsOn || []).length" class="text-sm text-rm-muted mt-2 mb-0">
                  Depends on: {{ (card.dependsOn || []).map((id) => getCardById(id)?.title || id).join(', ') }}
                </p>
                <p v-if="dependsOnNotDone(card).length && col.id !== firstColumnId" class="text-sm text-rm-warning mt-1 mb-0">
                  ⚠ Dependencies not done
                </p>
              </template>
            </template>
          </div>
            </div>
          </template>
          <div v-if="(filteredCardsByColumn[col.id] || []).length === 0" class="text-center py-6 text-sm text-rm-muted">
            No cards
          </div>
        </div>
        <div class="kanban-column-add px-4 py-4 border-t border-rm-border shrink-0">
          <Button
            v-if="!colAddingCard[col.id]"
            variant="text"
            size="small"
            class="kanban-add-card-btn text-sm w-full justify-center py-2.5"
            :disabled="isWipAtLimit(col)"
            :title="isWipAtLimit(col) ? 'WIP limit reached' : ''"
            @click="startAddCard(col.id)"
          >
            + Add card
          </Button>
          <div v-else class="flex flex-col gap-3">
            <InputText v-model="newCardTitle" class="text-sm w-full" placeholder="Title" @keydown.enter.prevent="submitAddCard(col.id)" />
            <Textarea v-model="newCardDescription" class="text-sm min-h-[2.5rem] w-full" placeholder="Description (optional)" rows="2" />
            <DatePicker
              v-model="newCardDueDate"
              update-model-type="string"
              date-format="yy-mm-dd"
              show-clear
              class="text-sm w-full"
              placeholder="Due date"
            />
            <Select v-model="newCardPriority" :options="PRIORITY_OPTIONS" option-label="label" option-value="value" placeholder="Priority" class="text-sm w-full" />
            <div>
              <label class="text-sm text-rm-muted block mb-1">Assignees</label>
              <div class="flex flex-wrap items-center gap-2">
                <span v-if="assigneesSummary(newCardAssignees)" class="text-sm text-rm-text">{{ assigneesSummary(newCardAssignees) }}</span>
                <Button variant="outlined" size="small" class="text-sm" @click="openAssigneesModal('new')">
                  {{ newCardAssignees.filter((a) => (a.name && a.name.trim()) || (a.email && a.email.trim())).length ? 'Edit assignees' : 'Add assignees' }}
                </Button>
              </div>
            </div>
            <div>
              <label class="text-sm text-rm-muted block mb-1">Work type</label>
              <Select v-model="newCardWorkType" :options="WORK_TYPE_OPTIONS" option-label="label" option-value="value" placeholder="Task" class="text-sm w-full" />
            </div>
            <div>
              <label class="text-sm text-rm-muted block mb-1">Class of service</label>
              <Select v-model="newCardClassOfService" :options="CLASS_OF_SERVICE_OPTIONS" option-label="label" option-value="value" placeholder="Standard" class="text-sm w-full" />
            </div>
            <div v-if="optInDependencyTracking">
              <label class="text-sm text-rm-muted block mb-1">Depends on (cards)</label>
              <div class="flex flex-wrap gap-2">
                <label v-for="c in otherCardsForDeps(null)" :key="c.id" class="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox v-model="newCardDependsOn" :value="c.id" />
                  {{ c.title }}
                </label>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox v-model="newCardBlocked" binary input-id="new-card-blocked" />
              <label for="new-card-blocked" class="text-sm text-rm-muted">Blocked</label>
            </div>
            <InputText v-if="newCardBlocked" v-model="newCardBlockerReason" class="text-sm w-full" placeholder="Blocker reason" />
            <div class="flex flex-wrap gap-2 items-center">
              <span v-for="tag in newCardLabels" :key="tag" class="inline-flex items-center gap-1 px-2 py-1 rounded text-sm bg-rm-surface-hover">
                {{ tag }}
                <Button variant="text" size="small" class="p-0 min-w-0 leading-none text-rm-muted hover:text-rm-text" @click="newCardLabels = newCardLabels.filter((t) => t !== tag)">×</Button>
              </span>
              <InputText
                v-model="newLabelInputAdd"
                class="w-24 text-sm"
                placeholder="+ label"
                @keydown.enter.prevent="addNewCardLabel"
              />
            </div>
            <div class="flex gap-2 pt-1">
              <Button severity="primary" size="small" class="text-sm" :disabled="!newCardTitle.trim()" @click="submitAddCard(col.id)">Add</Button>
              <Button variant="text" size="small" class="text-sm" @click="cancelAddCard">Cancel</Button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="addingColumn" class="flex-shrink-0 w-72 rounded-rm border border-dashed border-rm-border bg-rm-surface/10 flex flex-col p-5 gap-4">
        <InputText
          ref="newColumnInputRef"
          v-model="newColumnLabel"
          class="text-sm w-full"
          placeholder="List name"
          @keydown.enter.prevent="submitAddColumn"
          @keydown.escape="cancelAddColumn"
        />
        <InputText v-model="newColumnWipLimit" type="number" class="text-sm w-full" placeholder="WIP limit (optional)" />
        <Textarea v-model="newColumnPolicy" class="text-sm w-full min-h-[2.5rem]" placeholder="Workflow policy (optional)" rows="2" />
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <Checkbox v-model="newColumnIsBacklog" binary input-id="new-col-backlog" />
            <label for="new-col-backlog" class="text-sm text-rm-muted">Backlog queue</label>
          </div>
          <div class="flex items-center gap-2">
            <Checkbox v-model="newColumnIsArchive" binary input-id="new-col-archive" />
            <label for="new-col-archive" class="text-sm text-rm-muted">Archive (hide by default)</label>
          </div>
        </div>
        <div class="flex gap-2 pt-1">
          <Button severity="primary" size="small" class="text-sm" :disabled="!newColumnLabel.trim()" @click="submitAddColumn">Add list</Button>
          <Button variant="text" size="small" class="text-sm" @click="cancelAddColumn">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Work time (sessions) modal -->
    <Dialog
      v-model:visible="workSessionsModalVisible"
      :header="workSessionsModalCard ? `Work time — ${workSessionsModalCard.title}` : 'Work time'"
      :style="{ width: '32rem' }"
      :modal="true"
      :dismissableMask="true"
      class="kanban-work-sessions-modal max-w-[95vw]"
      @hide="workSessionsModalCard = null"
    >
      <template v-if="workSessionsModalCard">
        <div class="space-y-3">
          <p v-if="getWorkSessionsList(workSessionsModalCard).length === 0" class="text-sm text-rm-muted m-0">No work sessions yet. Use Start on the card to track time.</p>
          <div v-else class="overflow-x-auto">
            <DataTable :value="getWorkSessionsList(workSessionsModalCard)" size="small" class="kanban-sessions-table w-full text-sm">
              <Column header="Start">
                <template #body="{ data }">{{ formatSessionDateTime(data.startedAt) }}</template>
              </Column>
              <Column header="Stop">
                <template #body="{ data }">{{ data.stoppedAt ? formatSessionDateTime(data.stoppedAt) : '—' }}</template>
              </Column>
              <Column header="Duration">
                <template #body="{ data }">{{ data.durationMs != null ? formatDurationMs(data.durationMs) : '…' }}</template>
              </Column>
            </DataTable>
          </div>
          <p v-if="getTotalWorkDurationMs(workSessionsModalCard) > 0" class="text-sm font-medium text-rm-text mt-2 mb-0">
            Total: {{ formatTotalWorkDuration(workSessionsModalCard) }}
          </p>
        </div>
      </template>
      <template #footer>
        <Button
          v-if="workSessionsModalCard && (workSessionsModalCard.startedAt || (workSessionsModalCard.workSessions && workSessionsModalCard.workSessions.length))"
          variant="text"
          size="small"
          class="text-rm-muted"
          title="Keep history and start a fresh session"
          @click="resetCardStartStop(workSessionsModalCard); workSessionsModalVisible = false"
        >
          Reset and start over
        </Button>
        <Button severity="secondary" size="small" @click="workSessionsModalVisible = false">Close</Button>
      </template>
    </Dialog>

    <!-- Assignees modal (add / edit assignees) -->
    <Dialog
      v-model:visible="assigneesModalVisible"
      header="Assignees"
      :style="{ width: '28rem' }"
      :modal="true"
      :dismissableMask="true"
      class="kanban-assignees-modal max-w-[95vw]"
    >
      <div class="space-y-3">
        <p class="text-sm text-rm-muted m-0">Add people with name, email, and optional role.</p>
        <div class="space-y-2">
          <div
            v-for="(a, idx) in assigneesModalList"
            :key="idx"
            class="flex flex-wrap items-center gap-2"
          >
            <InputText v-model="a.name" class="text-sm flex-1 min-w-0" placeholder="Name" />
            <InputText v-model="a.email" class="text-sm flex-1 min-w-0" type="email" placeholder="Email" />
            <InputText v-model="a.role" class="text-sm w-24 min-w-0" placeholder="Role" />
            <Button variant="text" size="small" class="p-1 min-w-0 text-rm-muted hover:text-rm-danger" aria-label="Remove assignee" @click="assigneesModalList.splice(idx, 1)">×</Button>
          </div>
          <Button variant="text" size="small" class="text-sm text-rm-accent" @click="assigneesModalList.push({ name: '', email: '', role: '' })">+ Add assignee</Button>
        </div>
      </div>
      <template #footer>
        <Button variant="text" size="small" @click="assigneesModalVisible = false">Cancel</Button>
        <Button severity="primary" size="small" @click="saveAssigneesModal">Save</Button>
      </template>
    </Dialog>

    <!-- Card detail modal (view all info) -->
    <Dialog
      v-model:visible="cardDetailVisible"
      :header="cardDetailCard ? cardDetailCard.title : 'Card'"
      :style="{ width: '28rem' }"
      :modal="true"
      :dismissableMask="true"
      class="kanban-card-detail-modal max-w-[95vw]"
      @hide="cardDetailCardId = null"
    >
      <template v-if="cardDetailCard">
        <div class="space-y-4 text-sm">
          <p v-if="cardDetailCard.description" class="text-rm-text m-0 leading-relaxed">{{ cardDetailCard.description }}</p>
          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-rm-muted">
            <dt>Column</dt>
            <dd class="text-rm-text">{{ (columns.find((c) => c.id === cardDetailCard.columnId))?.label ?? cardDetailCard.columnId }}</dd>
            <template v-if="cardDetailCard.dueDate">
              <dt>Due</dt>
              <dd class="text-rm-text" :class="isOverdue(cardDetailCard) ? 'text-rm-warning' : ''">{{ formatDueDate(cardDetailCard.dueDate) }}</dd>
            </template>
            <template v-if="cardDetailCard.priority">
              <dt>Priority</dt>
              <dd class="text-rm-text">{{ cardDetailCard.priority }}</dd>
            </template>
            <template v-if="getCardAssignees(cardDetailCard).length">
              <dt>Assignees</dt>
              <dd class="text-rm-text">
                <div v-for="(a, i) in getCardAssignees(cardDetailCard)" :key="i" class="mb-1 last:mb-0">
                  <span v-if="a.name">{{ a.name }}</span>
                  <Button v-if="a.email" variant="link" :label="a.email" class="text-rm-accent ml-1 p-0 min-w-0 h-auto" @click="openMailto(a.email)" />
                  <span v-if="a.role" class="text-rm-muted text-xs ml-1">({{ a.role }})</span>
                </div>
              </dd>
            </template>
            <template v-if="cardDetailCard.workType">
              <dt>Work type</dt>
              <dd class="text-rm-text">{{ cardDetailCard.workType }}</dd>
            </template>
            <template v-if="cardDetailCard.classOfService">
              <dt>Class of service</dt>
              <dd class="text-rm-text">{{ classOfServiceLabel(cardDetailCard.classOfService) }}</dd>
            </template>
            <template v-if="cardDetailCard.labels?.length">
              <dt>Labels</dt>
              <dd class="text-rm-text">{{ cardDetailCard.labels.join(', ') }}</dd>
            </template>
            <template v-if="flowSummary(cardDetailCard)">
              <dt>Activity</dt>
              <dd class="text-rm-text">{{ flowSummary(cardDetailCard) }}</dd>
            </template>
          </dl>
          <div v-if="cardDetailCard.blocked" class="rounded border border-rm-warning/50 bg-rm-warning/10 p-2 text-rm-warning">
            <span class="font-medium">Blocked</span>
            <p v-if="cardDetailCard.blockerReason" class="m-0 mt-1 text-sm">{{ cardDetailCard.blockerReason }}</p>
          </div>
          <div v-if="(cardDetailCard.dependsOn || []).length" class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt class="text-rm-muted">Depends on</dt>
            <dd class="text-rm-text">{{ (cardDetailCard.dependsOn || []).map((id) => getCardById(id)?.title || id).join(', ') }}</dd>
          </div>
          <div class="pt-2 border-t border-rm-border">
            <p class="text-rm-muted text-xs mb-1">Work time</p>
            <p v-if="getTotalWorkDurationMs(cardDetailCard) > 0" class="text-rm-text m-0">
              Total: {{ formatTotalWorkDuration(cardDetailCard) }}
              <Button variant="text" size="small" class="ml-2 text-xs text-rm-accent hover:underline p-0 min-h-0" @click="openWorkSessionsModal(cardDetailCard); cardDetailVisible = false; cardDetailCardId = null">View sessions</Button>
            </p>
            <p v-else class="text-rm-muted m-0">No time logged yet.</p>
          </div>
          <div v-if="getColumnTimeSummary(cardDetailCard).length > 0" class="pt-2 border-t border-rm-border">
            <p class="text-rm-muted text-xs mb-1">Time in columns</p>
            <p class="text-rm-text m-0 flex flex-wrap gap-x-2 gap-y-0.5">
              <span v-for="seg in getColumnTimeSummary(cardDetailCard)" :key="seg.columnId">
                {{ seg.label }}: {{ formatDurationMs(seg.durationMs) }}<span v-if="seg.columnId === cardDetailCard.columnId" class="text-rm-accent/80"> (current)</span>
              </span>
            </p>
          </div>
        </div>
      </template>
      <template #footer>
        <Button variant="text" size="small" class="text-rm-muted" @click="closeCardDetailAndEdit()">Edit</Button>
        <Button severity="secondary" size="small" @click="cardDetailVisible = false; cardDetailCardId = null">Close</Button>
      </template>
    </Dialog>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import * as debug from '../../utils/debug';

const PRIORITY_OPTIONS = [
  { label: 'No priority', value: '' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const CLASS_OF_SERVICE_OPTIONS = [
  { label: 'Standard', value: 'standard' },
  { label: 'Expedite', value: 'expedite' },
  { label: 'Fixed date', value: 'fixedDate' },
  { label: 'Intangible', value: 'intangible' },
];

const WORK_TYPE_OPTIONS = [
  { label: 'Task', value: 'task' },
  { label: 'Feature', value: 'feature' },
  { label: 'Bug', value: 'bug' },
  { label: 'Support', value: 'support' },
];

const SWIMLANE_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'By priority', value: 'priority' },
  { label: 'By class of service', value: 'classOfService' },
  { label: 'By work type', value: 'workType' },
  { label: 'By assignee', value: 'assignee' },
];

const AGING_WARN_DAYS = 3;
const AGING_URGENT_DAYS = 7;

const DEFAULT_COLUMNS = [
  { id: 'todo', label: 'To Do', isBacklog: true },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

const KANBAN_PREF = 'ext.kanban';

const props = defineProps({ info: { type: Object, default: null } });

const store = useAppStore();
const api = useApi();

function openMailto(email) {
  if (email && api.openUrl) api.openUrl('mailto:' + email);
}

const boards = ref({});
const activeBoardId = ref('team');
const editingBoardName = ref(false);
const editBoardNameInput = ref('');
const editBoardNameInputRef = ref(null);
const draggedCardId = ref(null);
const dragOverColumnId = ref(null);
const dragSourceColumnId = ref(null);
const dropIndicatorAfterCardId = ref(null);
const dragCleanupRef = ref(null);
const timerTick = ref(0);
let timerInterval = null;
const workSessionsModalVisible = ref(false);
const workSessionsModalCard = ref(null);
const cardDetailCardId = ref(null);
const cardDetailVisible = ref(false);
const assigneesModalVisible = ref(false);
const assigneesModalMode = ref('edit');
const assigneesModalList = ref([]);
const cardDetailCard = computed(() =>
  cardDetailCardId.value ? cards.value.find((c) => c.id === cardDetailCardId.value) : null
);

const columns = ref([...DEFAULT_COLUMNS]);
const cards = ref([]);
const colAddingCard = ref({});
const newCardTitle = ref('');
const newCardDescription = ref('');
const newCardDueDate = ref('');
const newCardPriority = ref('');
const newCardLabels = ref([]);
const newLabelInputAdd = ref('');
const newCardBlocked = ref(false);
const newCardBlockerReason = ref('');
let addCardColumnId = null;

const addingColumn = ref(false);
const newColumnLabel = ref('');
const newColumnIsArchive = ref(false);
const newColumnIsBacklog = ref(false);
const newColumnWipLimit = ref(undefined);
const newColumnPolicy = ref('');
const newColumnInputRef = ref(null);

const editingColumnId = ref(null);
const editColumnLabel = ref('');
const editColumnPolicy = ref('');
const editColumnWipLimit = ref(undefined);
const editColumnIsBacklog = ref(false);
const editColumnIsArchive = ref(false);
const editColumnInputRef = ref(null);

const editingCardId = ref(null);
const editCardTitle = ref('');
const editCardDescription = ref('');
const editCardDueDate = ref('');
const editCardPriority = ref('');
const editCardLabels = ref([]);
const editCardBlocked = ref(false);
const editCardBlockerReason = ref('');
const newLabelInput = ref('');

const filterLabel = ref('');
const showArchived = ref(false);
const swimlaneBy = ref('none');
const savedViews = ref([]);
const selectedViewId = ref('');
const agingWarnDays = ref(AGING_WARN_DAYS);
const agingUrgentDays = ref(AGING_URGENT_DAYS);
const inProgressColumnId = ref('');
const sleTargetPercent = ref(85);
const sleDays = ref(5);
const boardHistory = ref([]);
const showMetrics = ref(false);
const showBlockerAnalytics = ref(false);
const showCfd = ref(false);
const showFeaturesPanel = ref(false);

const optInWorkflowAutomation = ref(false);
const optInCycleTimeAnalytics = ref(false);
const optInDependencyTracking = ref(false);
const optInSmartFilteringViews = ref(false);
const optInForecastingPredictive = ref(false);

const editCardAssignees = ref([]);
const editCardWorkType = ref('');
const editCardClassOfService = ref('standard');
const editCardDependsOn = ref([]);
const newCardAssignees = ref([]);
const newCardWorkType = ref('task');
const newCardClassOfService = ref('standard');
const newCardDependsOn = ref([]);

const projectPath = computed(() => store.selectedPath || '');

const boardList = computed(() =>
  Object.entries(boards.value).map(([id, b]) => ({ id, name: b.name || id })).sort((a, b) => a.name.localeCompare(b.name))
);

const visibleColumns = computed(() => {
  if (showArchived.value) return columns.value;
  return columns.value.filter((c) => !c.isArchive);
});

const inProgressColumnOptions = computed(() => [{ label: 'Auto', id: '' }, ...visibleColumns.value]);

const firstColumnId = computed(() => visibleColumns.value[0]?.id ?? '');
const lastColumnId = computed(() => visibleColumns.value[visibleColumns.value.length - 1]?.id ?? '');

const allLabels = computed(() => {
  const set = new Set();
  cards.value.forEach((c) => (c.labels || []).forEach((l) => set.add(l)));
  return [...set].sort();
});

const filterLabelOptions = computed(() => [
  { label: 'All cards', value: '' },
  ...allLabels.value.map((l) => ({ label: l, value: l })),
]);

const savedViewOptions = computed(() => [
  { id: '', label: '— Current —' },
  ...savedViews.value.map((v) => ({ id: v.id, label: v.name })),
]);

const cardsByColumn = computed(() => {
  const byCol = {};
  columns.value.forEach((col) => { byCol[col.id] = []; });
  cards.value.forEach((card) => {
    if (byCol[card.columnId]) byCol[card.columnId].push(card);
  });
  return byCol;
});

const filteredCardsByColumn = computed(() => {
  const byCol = { ...cardsByColumn.value };
  if (!optInSmartFilteringViews.value || !filterLabel.value) return byCol;
  Object.keys(byCol).forEach((id) => {
    byCol[id] = byCol[id].filter((c) => (c.labels || []).includes(filterLabel.value));
  });
  return byCol;
});

const effectiveSwimlaneBy = computed(() => (optInSmartFilteringViews.value ? swimlaneBy.value : 'none'));

const swimlaneKeys = computed(() => {
  const by = effectiveSwimlaneBy.value;
  if (by === 'none') return [];
  if (by === 'priority') return ['high', 'medium', 'low', ''];
  if (by === 'classOfService') return ['expedite', 'fixedDate', 'standard', 'intangible'];
  if (by === 'workType') return ['feature', 'bug', 'support', 'task'];
  if (by === 'assignee') {
    const set = new Set(cards.value.flatMap((c) => getCardAssignees(c).map((a) => (a.email || a.name || '').trim()).filter(Boolean)));
    return [...set].sort();
  }
  return [];
});

function getSwimlaneKey(card) {
  const by = effectiveSwimlaneBy.value;
  if (by === 'priority') return card.priority || '';
  if (by === 'classOfService') return card.classOfService || 'standard';
  if (by === 'workType') return card.workType || 'task';
  if (by === 'assignee') {
    const assignees = getCardAssignees(card);
    const first = assignees[0];
    return first ? (first.email || first.name || '').trim() : '';
  }
  return '';
}

function getSwimlaneLabel(key) {
  if (effectiveSwimlaneBy.value === 'priority') return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'No priority';
  if (effectiveSwimlaneBy.value === 'classOfService') {
    const o = CLASS_OF_SERVICE_OPTIONS.find((x) => x.value === key);
    return o ? o.label : key;
  }
  if (effectiveSwimlaneBy.value === 'workType') {
    const o = WORK_TYPE_OPTIONS.find((x) => x.value === key);
    return o ? o.label : key;
  }
  return key || 'Unassigned';
}

const cardsGroupedBySwimlaneForColumn = computed(() => {
  const byCol = {};
  visibleColumns.value.forEach((col) => {
    const list = filteredCardsByColumn.value[col.id] || [];
    if (effectiveSwimlaneBy.value === 'none') {
      byCol[col.id] = [{ key: '_', cards: list, label: '' }];
      return;
    }
    const groups = {};
    swimlaneKeys.value.forEach((k) => { groups[k] = []; });
    groups[''] = groups[''] || [];
    list.forEach((c) => {
      const k = getSwimlaneKey(c);
      if (!groups[k]) groups[k] = [];
      groups[k].push(c);
    });
    const order = effectiveSwimlaneBy.value === 'assignee' ? [...swimlaneKeys.value, ''] : swimlaneKeys.value;
    byCol[col.id] = order.map((key) => ({ key, cards: groups[key] || [], label: getSwimlaneLabel(key) }));
  });
  return byCol;
});

function daysInColumn(card) {
  const entered = card.columnEnteredAt || card.updatedAt || card.createdAt;
  if (!entered) return 0;
  const d = new Date(entered);
  const now = new Date();
  return Math.floor((now - d) / (24 * 60 * 60 * 1000));
}

function agingClass(card) {
  const days = daysInColumn(card);
  if (days >= agingUrgentDays.value) return 'kanban-card-aging-urgent';
  if (days >= agingWarnDays.value) return 'kanban-card-aging-warn';
  return '';
}

const completedCards = computed(() => cards.value.filter((c) => c.completedAt));
const completedLast7 = computed(() => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return completedCards.value.filter((c) => new Date(c.completedAt) >= cutoff).length;
});
const throughputLast7 = computed(() => completedLast7.value);

const leadTimeAvg = computed(() => {
  const completed = completedCards.value.filter((c) => c.createdAt && c.completedAt);
  if (completed.length === 0) return null;
  const sum = completed.reduce((acc, c) => acc + (new Date(c.completedAt) - new Date(c.createdAt)) / (24 * 60 * 60 * 1000), 0);
  return (sum / completed.length).toFixed(1);
});

const cycleTimeAvg = computed(() => {
  const inProgressCol = inProgressColumnId.value || visibleColumns.value[1]?.id;
  const completed = completedCards.value.filter((c) => c.inProgressAt && c.completedAt);
  if (completed.length === 0) return null;
  const sum = completed.reduce((acc, c) => acc + (new Date(c.completedAt) - new Date(c.inProgressAt)) / (24 * 60 * 60 * 1000), 0);
  return (sum / completed.length).toFixed(1);
});

const blockerReasonsCount = computed(() => {
  const map = {};
  cards.value.forEach((c) => {
    if (c.blocked && c.blockerReason) {
      map[c.blockerReason] = (map[c.blockerReason] || 0) + 1;
    }
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
});
const blockerTableData = computed(() =>
  blockerReasonsCount.value.map(([reason, count]) => ({ reason, count }))
);

const sleCurrentPercent = computed(() => {
  const completed = completedCards.value.filter((c) => c.completedAt && c.createdAt);
  if (completed.length === 0) return null;
  const within = completed.filter((c) => {
    const days = (new Date(c.completedAt) - new Date(c.createdAt)) / (24 * 60 * 60 * 1000);
    return days <= sleDays.value;
  }).length;
  return Math.round((within / completed.length) * 100);
});

const cfdData = computed(() => boardHistory.value.slice(-30));

function totalCount(counts) {
  return Object.values(counts || {}).reduce((s, n) => s + n, 0);
}

const maxCfdTotal = computed(() => {
  if (cfdData.value.length === 0) return 1;
  return Math.max(...cfdData.value.map((p) => totalCount(p.counts)), 1);
});

const backlogCount = computed(() => cards.value.filter((c) => c.columnId !== lastColumnId.value).length);

const forecastSummary = computed(() => {
  const backlog = backlogCount.value;
  const rate = throughputLast7.value;
  if (rate <= 0) return backlog > 0 ? `Backlog of ${backlog} items; no recent completions to estimate.` : null;
  const weeks = backlog / rate;
  return `At current rate (${rate} in 7d), backlog of ${backlog} → ~${weeks <= 0.1 ? '<1' : Math.ceil(weeks)} week(s) to clear.`;
});

const forecastConfidence = computed(() => {
  const rate = throughputLast7.value;
  if (rate <= 0) return null;
  const in10 = Math.round((rate / 7) * 10);
  return `~${in10} items in next 10 days (based on 7d throughput).`;
});

function getCardById(id) {
  return cards.value.find((c) => c.id === id);
}

/** Normalized assignees list: from card.assignees or legacy card.assignee string. */
function getCardAssignees(card) {
  if (!card) return [];
  if (Array.isArray(card.assignees) && card.assignees.length) {
    return card.assignees.map((a) => ({
      name: a?.name ?? '',
      email: a?.email ?? '',
      role: a?.role ?? '',
    }));
  }
  if (card.assignee && String(card.assignee).trim()) {
    return [{ name: String(card.assignee).trim(), email: '', role: '' }];
  }
  return [];
}

function otherCardsForDeps(excludeId) {
  return cards.value.filter((c) => c.id !== excludeId);
}

function dependsOnNotDone(card) {
  const deps = card.dependsOn || [];
  const lastId = lastColumnId.value;
  return deps.filter((depId) => {
    const dep = getCardById(depId);
    return dep && dep.columnId !== lastId;
  });
}

function classOfServiceStyle(cos) {
  if (cos === 'expedite') return 'border-l-4 border-rm-danger bg-rm-danger/5';
  if (cos === 'fixedDate') return 'border-l-4 border-rm-warning bg-rm-warning/5';
  if (cos === 'intangible') return 'border-l-4 border-rm-muted bg-rm-muted/10';
  return '';
}

function classOfServiceLabel(cos) {
  return CLASS_OF_SERVICE_OPTIONS.find((o) => o.value === cos)?.label ?? cos;
}

function applySavedView(id) {
  if (!id) return;
  const v = savedViews.value.find((x) => x.id === id);
  if (v) {
    filterLabel.value = v.filterLabel ?? '';
    swimlaneBy.value = v.swimlaneBy ?? 'none';
  }
}

function saveCurrentView() {
  const name = window.prompt('View name');
  if (!name?.trim()) return;
  const id = `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  savedViews.value = [...savedViews.value, { id, name: name.trim(), filterLabel: filterLabel.value, swimlaneBy: swimlaneBy.value }];
  selectedViewId.value = id;
}

function getPrefKey() {
  const path = projectPath.value || 'default';
  return `${KANBAN_PREF}.${encodeURIComponent(path)}`;
}

function persistCurrentBoard() {
  const id = activeBoardId.value;
  if (!id || !boards.value[id]) return;
  const b = boards.value[id];
  b.columns = [...columns.value];
  b.cards = [...cards.value];
  b.showArchived = showArchived.value;
  b.swimlaneBy = swimlaneBy.value;
  b.agingWarnDays = agingWarnDays.value;
  b.agingUrgentDays = agingUrgentDays.value;
  b.inProgressColumnId = inProgressColumnId.value;
  b.sleTargetPercent = sleTargetPercent.value;
  b.sleDays = sleDays.value;
  b.boardHistory = [...boardHistory.value];
  b.optInWorkflowAutomation = optInWorkflowAutomation.value;
  b.optInCycleTimeAnalytics = optInCycleTimeAnalytics.value;
  b.optInDependencyTracking = optInDependencyTracking.value;
  b.optInSmartFilteringViews = optInSmartFilteringViews.value;
  b.optInForecastingPredictive = optInForecastingPredictive.value;
  b.savedViews = savedViews.value.map((v) => ({ ...v }));
}

function loadBoard(id) {
  const b = boards.value[id];
  if (!b) return;
  columns.value = Array.isArray(b.columns) && b.columns.length > 0 ? [...b.columns] : [...DEFAULT_COLUMNS];
  cards.value = Array.isArray(b.cards) ? [...b.cards] : [];
  showArchived.value = typeof b.showArchived === 'boolean' ? b.showArchived : false;
  swimlaneBy.value = b.swimlaneBy || 'none';
  agingWarnDays.value = b.agingWarnDays != null ? b.agingWarnDays : AGING_WARN_DAYS;
  agingUrgentDays.value = b.agingUrgentDays != null ? b.agingUrgentDays : AGING_URGENT_DAYS;
  inProgressColumnId.value = b.inProgressColumnId ?? '';
  sleTargetPercent.value = b.sleTargetPercent != null ? b.sleTargetPercent : 85;
  sleDays.value = b.sleDays != null ? b.sleDays : 5;
  boardHistory.value = Array.isArray(b.boardHistory) ? [...b.boardHistory] : [];
  optInWorkflowAutomation.value = b.optInWorkflowAutomation === true;
  optInCycleTimeAnalytics.value = b.optInCycleTimeAnalytics === true;
  optInDependencyTracking.value = b.optInDependencyTracking === true;
  optInSmartFilteringViews.value = b.optInSmartFilteringViews === true;
  optInForecastingPredictive.value = b.optInForecastingPredictive === true;
  savedViews.value = Array.isArray(b.savedViews) ? b.savedViews.map((v) => ({ ...v })) : [];
  selectedViewId.value = '';
}

function addBoard() {
  const names = ['Team', 'Program', 'Portfolio'];
  const used = Object.values(boards.value).map((b) => b.name).filter(Boolean);
  const name = names.find((n) => !used.includes(n)) || `Board ${Object.keys(boards.value).length + 1}`;
  const id = `board-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  boards.value[id] = {
    name,
    columns: [...DEFAULT_COLUMNS],
    cards: [],
    showArchived: false,
    swimlaneBy: 'none',
    agingWarnDays: AGING_WARN_DAYS,
    agingUrgentDays: AGING_URGENT_DAYS,
    inProgressColumnId: '',
    sleTargetPercent: 85,
    sleDays: 5,
    boardHistory: [],
    optInWorkflowAutomation: false,
    optInCycleTimeAnalytics: false,
    optInDependencyTracking: false,
    optInSmartFilteringViews: false,
    optInForecastingPredictive: false,
    savedViews: [],
  };
  persistCurrentBoard();
  activeBoardId.value = id;
  loadBoard(id);
}

function startRenameBoard() {
  const b = boards.value[activeBoardId.value];
  editBoardNameInput.value = b?.name || '';
  editingBoardName.value = true;
  nextTick(() => {
    const el = editBoardNameInputRef.value?.$el ?? editBoardNameInputRef.value;
    if (el && typeof el.focus === 'function') el.focus();
  });
}

function saveRenameBoard() {
  const name = editBoardNameInput.value.trim();
  if (name && boards.value[activeBoardId.value]) {
    boards.value[activeBoardId.value].name = name;
  }
  editingBoardName.value = false;
  editBoardNameInput.value = '';
}

function cancelRenameBoard() {
  editingBoardName.value = false;
  editBoardNameInput.value = '';
}

function confirmDeleteBoard() {
  if (boardList.value.length <= 1) return;
  const b = boards.value[activeBoardId.value];
  const name = b?.name || activeBoardId.value;
  if (!window.confirm(`Delete board "${name}"? Cards and lists will be removed.`)) return;
  deleteBoard();
}

function deleteBoard() {
  const id = activeBoardId.value;
  const ids = Object.keys(boards.value).filter((k) => k !== id);
  if (ids.length === 0) return;
  const nextId = ids[0];
  const next = { ...boards.value };
  delete next[id];
  boards.value = next;
  activeBoardId.value = nextId;
  loadBoard(nextId);
}

async function load() {
  if (!api.getPreference) {
    cards.value = [];
    return;
  }
  const loadStart = performance.now();
  try {
    const key = getPrefKey();
    const raw = await api.getPreference(key);
    const data = raw && typeof raw === 'object' ? raw : {};
    if (data.boards && typeof data.boards === 'object' && data.activeBoardId && data.boards[data.activeBoardId]) {
      boards.value = { ...data.boards };
      activeBoardId.value = data.activeBoardId;
      loadBoard(activeBoardId.value);
    } else {
      boards.value = {
        team: {
          name: 'Team',
          columns: Array.isArray(data.columns) && data.columns.length > 0 ? data.columns : [...DEFAULT_COLUMNS],
          cards: Array.isArray(data.cards) ? data.cards : [],
          showArchived: typeof data.showArchived === 'boolean' ? data.showArchived : false,
          swimlaneBy: data.swimlaneBy || 'none',
          agingWarnDays: data.agingWarnDays != null ? data.agingWarnDays : AGING_WARN_DAYS,
          agingUrgentDays: data.agingUrgentDays != null ? data.agingUrgentDays : AGING_URGENT_DAYS,
          inProgressColumnId: data.inProgressColumnId ?? '',
          sleTargetPercent: data.sleTargetPercent != null ? data.sleTargetPercent : 85,
          sleDays: data.sleDays != null ? data.sleDays : 5,
          boardHistory: Array.isArray(data.boardHistory) ? data.boardHistory : [],
          optInWorkflowAutomation: false,
          optInCycleTimeAnalytics: false,
          optInDependencyTracking: false,
          optInSmartFilteringViews: false,
          optInForecastingPredictive: false,
          savedViews: [],
        },
      };
      activeBoardId.value = 'team';
      loadBoard('team');
    }
  } catch {
    boards.value = { team: { name: 'Team', columns: [...DEFAULT_COLUMNS], cards: [], showArchived: false, swimlaneBy: 'none', agingWarnDays: AGING_WARN_DAYS, agingUrgentDays: AGING_URGENT_DAYS, inProgressColumnId: '', sleTargetPercent: 85, sleDays: 5, boardHistory: [], optInWorkflowAutomation: false, optInCycleTimeAnalytics: false, optInDependencyTracking: false, optInSmartFilteringViews: false, optInForecastingPredictive: false, savedViews: [] } };
    activeBoardId.value = 'team';
    loadBoard('team');
  } finally {
    const loadMs = Math.round(performance.now() - loadStart);
    debug.log('kanban', 'load', `${loadMs}ms`);
  }
}

async function save() {
  if (!api.setPreference) return;
  const saveStart = performance.now();
  try {
    persistCurrentBoard();
    const id = activeBoardId.value;
    const b = boards.value[id];
    if (b) appendBoardHistorySnapshot(b);
    const payload = JSON.parse(JSON.stringify({ activeBoardId: activeBoardId.value, boards: boards.value }));
    await api.setPreference(getPrefKey(), payload);
  } catch (_) {}
  const saveMs = Math.round(performance.now() - saveStart);
  debug.log('kanban', 'save', `${saveMs}ms`);
}

function appendBoardHistorySnapshot(data) {
  const today = new Date().toISOString().slice(0, 10);
  const counts = {};
  columns.value.forEach((col) => {
    counts[col.id] = cards.value.filter((c) => c.columnId === col.id).length;
  });
  const history = [...(data.boardHistory || [])];
  const last = history[history.length - 1];
  if (last && last.date === today) {
    last.counts = { ...counts };
  } else {
    history.push({ date: today, counts: { ...counts } });
  }
  if (history.length > 90) history.splice(0, history.length - 90);
  boardHistory.value = history;
  data.boardHistory = boardHistory.value;
}

watch(projectPath, load, { immediate: true });
watch(activeBoardId, (newId, oldId) => {
  if (oldId != null && boards.value[oldId] && newId !== oldId) persistCurrentBoard();
  if (newId && boards.value[newId] && oldId != null) loadBoard(newId);
});
watch([cards, columns, showArchived, swimlaneBy, agingWarnDays, agingUrgentDays, inProgressColumnId, sleTargetPercent, sleDays, optInWorkflowAutomation, optInCycleTimeAnalytics, optInDependencyTracking, optInSmartFilteringViews, optInForecastingPredictive, savedViews], save, { deep: true });

// ——— Custom lists ———
function startAddColumn() {
  addingColumn.value = true;
  newColumnLabel.value = '';
  newColumnIsArchive.value = false;
  nextTick(() => {
    const el = newColumnInputRef.value?.$el ?? newColumnInputRef.value;
    if (el && typeof el.focus === 'function') el.focus();
  });
}

function cancelAddColumn() {
  addingColumn.value = false;
}

function submitAddColumn() {
  const label = newColumnLabel.value.trim();
  if (!label) return;
  const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const wipNum = Number(newColumnWipLimit.value);
  const col = {
    id,
    label,
    isArchive: newColumnIsArchive.value,
    isBacklog: newColumnIsBacklog.value,
    wipLimit: wipNum > 0 ? wipNum : undefined,
    policy: newColumnPolicy.value.trim() || undefined,
  };
  columns.value = [...columns.value, col];
  addingColumn.value = false;
  newColumnLabel.value = '';
  newColumnIsArchive.value = false;
  newColumnIsBacklog.value = false;
  newColumnWipLimit.value = undefined;
  newColumnPolicy.value = '';
}

function startEditColumn(col) {
  editingColumnId.value = col.id;
  editColumnLabel.value = col.label;
  editColumnPolicy.value = col.policy || '';
  editColumnWipLimit.value = col.wipLimit ?? '';
  editColumnIsBacklog.value = !!col.isBacklog;
  editColumnIsArchive.value = !!col.isArchive;
  nextTick(() => editColumnInputRef.value?.focus?.());
}

function cancelEditColumn() {
  editingColumnId.value = null;
}

function submitEditColumn() {
  const label = editColumnLabel.value.trim();
  if (!label || !editingColumnId.value) return;
  const wipNum = Number(editColumnWipLimit.value);
  columns.value = columns.value.map((c) => {
    if (c.id !== editingColumnId.value) return c;
    return {
      ...c,
      label,
      policy: editColumnPolicy.value.trim() || undefined,
      wipLimit: wipNum > 0 ? wipNum : undefined,
      isBacklog: editColumnIsBacklog.value,
      isArchive: editColumnIsArchive.value,
    };
  });
  editingColumnId.value = null;
}

function isWipOver(col) {
  if (col.wipLimit == null || col.wipLimit <= 0) return false;
  const count = (cardsByColumn.value[col.id] || []).length;
  return count >= col.wipLimit;
}

function isWipAtLimit(col) {
  if (col.wipLimit == null || col.wipLimit <= 0) return false;
  const count = (cardsByColumn.value[col.id] || []).length;
  return count >= col.wipLimit;
}

function pullSourceCards(colIndex) {
  if (colIndex <= 0) return [];
  const prevCol = visibleColumns.value[colIndex - 1];
  return prevCol ? (cardsByColumn.value[prevCol.id] || []) : [];
}

function pullOneToColumn(toColumnId, colIndex) {
  const source = pullSourceCards(colIndex);
  if (source.length === 0) return;
  const card = source[0];
  const now = new Date().toISOString();
  cards.value = cards.value.map((c) => (c.id === card.id ? { ...c, columnId: toColumnId, updatedAt: now } : c));
}

function moveColumn(columnId, direction) {
  const idx = columns.value.findIndex((c) => c.id === columnId);
  if (idx < 0) return;
  const swap = direction === 'right' ? idx + 1 : idx - 1;
  if (swap < 0 || swap >= columns.value.length) return;
  const next = [...columns.value];
  [next[idx], next[swap]] = [next[swap], next[idx]];
  columns.value = next;
}

function confirmRemoveColumn(col) {
  const count = (cardsByColumn.value[col.id] || []).length;
  const msg = count > 0
    ? `Delete "${col.label}"? ${count} card(s) will be moved to the first column.`
    : `Delete list "${col.label}"?`;
  if (!window.confirm(msg)) return;
  const firstId = columns.value[0]?.id;
  if (firstId && firstId !== col.id) {
    cards.value = cards.value.map((c) => (c.columnId === col.id ? { ...c, columnId: firstId } : c));
  }
  columns.value = columns.value.filter((c) => c.id !== col.id);
}

// ——— Cards (add) ———
function startAddCard(columnId) {
  addCardColumnId = columnId;
  colAddingCard.value = { ...colAddingCard.value, [columnId]: true };
  newCardTitle.value = '';
  newCardDescription.value = '';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  newCardDueDate.value = tomorrow.toISOString().slice(0, 10);
  newCardPriority.value = '';
  newCardLabels.value = [];
  newCardAssignees.value = [{ name: '', email: '', role: '' }];
}

function cancelAddCard() {
  if (addCardColumnId) colAddingCard.value = { ...colAddingCard.value, [addCardColumnId]: false };
  addCardColumnId = null;
}

function addNewCardLabel() {
  const t = newLabelInputAdd.value.trim();
  if (t && !newCardLabels.value.includes(t)) {
    newCardLabels.value = [...newCardLabels.value, t];
    newLabelInputAdd.value = '';
  }
}

function submitAddCard(columnId) {
  const title = newCardTitle.value.trim();
  if (!title) return;
  const id = `card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  cards.value = [
    ...cards.value,
    {
      id,
      title,
      description: newCardDescription.value.trim() || undefined,
      columnId: columnId,
      columnEnteredAt: now,
      dueDate: newCardDueDate.value || undefined,
      priority: newCardPriority.value || undefined,
      labels: newCardLabels.value.length ? [...newCardLabels.value] : undefined,
      blocked: newCardBlocked.value,
      blockerReason: newCardBlocked.value ? (newCardBlockerReason.value.trim() || undefined) : undefined,
      blockedAt: newCardBlocked.value ? now : undefined,
      assignees: newCardAssignees.value.filter((a) => (a.name && a.name.trim()) || (a.email && a.email.trim())).map((a) => ({ name: (a.name || '').trim() || undefined, email: (a.email || '').trim() || undefined, role: (a.role || '').trim() || undefined })),
      workType: newCardWorkType.value || undefined,
      classOfService: newCardClassOfService.value || 'standard',
      dependsOn: newCardDependsOn.value.length ? [...newCardDependsOn.value] : undefined,
      createdAt: now,
      updatedAt: now,
    },
  ];
  colAddingCard.value = { ...colAddingCard.value, [columnId]: false };
  addCardColumnId = null;
  newCardTitle.value = '';
  newCardDescription.value = '';
  newCardDueDate.value = '';
  newCardPriority.value = '';
  newCardLabels.value = [];
  newCardBlocked.value = false;
  newCardBlockerReason.value = '';
  newCardAssignees.value = [];
  newCardWorkType.value = 'task';
  newCardClassOfService.value = 'standard';
  newCardDependsOn.value = [];
}

// ——— Edit card ———
function onCardClick(e, card) {
  if (e.target.closest('.kanban-card-drag-handle, button, .p-button, .p-select, .p-dropdown, input, select, textarea')) return;
  cardDetailCardId.value = card.id;
  cardDetailVisible.value = true;
}

function closeCardDetailAndEdit() {
  const card = cardDetailCardId.value ? cards.value.find((c) => c.id === cardDetailCardId.value) : null;
  cardDetailVisible.value = false;
  cardDetailCardId.value = null;
  if (card) startEditCard(card);
}

function startEditCard(card) {
  editingCardId.value = card.id;
  editCardTitle.value = card.title;
  editCardDescription.value = card.description || '';
  editCardDueDate.value = card.dueDate || '';
  editCardPriority.value = card.priority || '';
  editCardLabels.value = [...(card.labels || [])];
  editCardBlocked.value = !!card.blocked;
  editCardBlockerReason.value = card.blockerReason || '';
  editCardAssignees.value = getCardAssignees(card).length ? getCardAssignees(card).map((a) => ({ name: a.name || '', email: a.email || '', role: a.role || '' })) : [{ name: '', email: '', role: '' }];
  editCardWorkType.value = card.workType || 'task';
  editCardClassOfService.value = card.classOfService || 'standard';
  editCardDependsOn.value = [...(card.dependsOn || [])];
  newLabelInput.value = '';
}

function cancelEditCard() {
  editingCardId.value = null;
}

function addEditLabel() {
  const t = newLabelInput.value.trim();
  if (t && !editCardLabels.value.includes(t)) {
    editCardLabels.value = [...editCardLabels.value, t];
    newLabelInput.value = '';
  }
}

function removeEditLabel(tag) {
  editCardLabels.value = editCardLabels.value.filter((t) => t !== tag);
}

function assigneesSummary(list) {
  if (!list || !list.length) return '';
  const filled = list.filter((a) => (a.name && a.name.trim()) || (a.email && a.email.trim()));
  if (filled.length === 0) return '';
  if (filled.length === 1) return filled[0].name?.trim() || filled[0].email?.trim() || '1 assignee';
  return `${filled.length} assignees`;
}

function openAssigneesModal(mode) {
  assigneesModalMode.value = mode;
  const source = mode === 'edit' ? editCardAssignees.value : newCardAssignees.value;
  assigneesModalList.value = source.length
    ? source.map((a) => ({ name: a.name || '', email: a.email || '', role: a.role || '' }))
    : [{ name: '', email: '', role: '' }];
  assigneesModalVisible.value = true;
}

function saveAssigneesModal() {
  const list = assigneesModalList.value.map((a) => ({ name: (a.name || '').trim(), email: (a.email || '').trim(), role: (a.role || '').trim() }));
  if (assigneesModalMode.value === 'edit') {
    editCardAssignees.value = list.some((a) => a.name || a.email) ? list : [{ name: '', email: '', role: '' }];
  } else {
    newCardAssignees.value = list.some((a) => a.name || a.email) ? list : [{ name: '', email: '', role: '' }];
  }
  assigneesModalVisible.value = false;
}

function submitEditCard() {
  const title = editCardTitle.value.trim();
  if (!title || !editingCardId.value) return;
  const now = new Date().toISOString();
  cards.value = cards.value.map((c) => {
    if (c.id !== editingCardId.value) return c;
    const wasBlocked = c.blocked;
    const nowBlocked = editCardBlocked.value;
    return {
      ...c,
      title,
      description: editCardDescription.value.trim() || undefined,
      dueDate: editCardDueDate.value || undefined,
      priority: editCardPriority.value || undefined,
      labels: editCardLabels.value.length ? [...editCardLabels.value] : undefined,
      blocked: nowBlocked,
      blockerReason: nowBlocked ? (editCardBlockerReason.value.trim() || undefined) : undefined,
      blockedAt: nowBlocked && !wasBlocked ? now : c.blockedAt,
      assignees: editCardAssignees.value.filter((a) => (a.name && a.name.trim()) || (a.email && a.email.trim())).map((a) => ({ name: (a.name || '').trim() || undefined, email: (a.email || '').trim() || undefined, role: (a.role || '').trim() || undefined })),
      workType: editCardWorkType.value || undefined,
      classOfService: editCardClassOfService.value || 'standard',
      dependsOn: editCardDependsOn.value.length ? [...editCardDependsOn.value] : undefined,
      updatedAt: now,
    };
  });
  editingCardId.value = null;
}

// ——— Move / remove card ———
function applyMoveAutomation(card, nextColumnId) {
  const now = new Date().toISOString();
  const base = {
    ...card,
    columnId: nextColumnId,
    updatedAt: now,
    columnEnteredAt: now,
  };
  if (!optInWorkflowAutomation.value) {
    return appendColumnHistory(base, card, nextColumnId, now);
  }
  const isLastColumn = nextColumnId === lastColumnId.value;
  const isInProgressColumn = nextColumnId === (inProgressColumnId.value || visibleColumns.value[1]?.id);
  const withAutomation = {
    ...base,
    completedAt: isLastColumn ? now : card.completedAt,
    inProgressAt: isInProgressColumn && !card.inProgressAt ? now : card.inProgressAt,
  };
  return appendColumnHistory(withAutomation, card, nextColumnId, now);
}

function appendColumnHistory(nextCard, prevCard, nextColumnId, now) {
  const history = Array.isArray(prevCard.columnHistory) ? [...prevCard.columnHistory] : [];
  if (history.length > 0 && history[history.length - 1].leftAt == null) {
    history[history.length - 1] = { ...history[history.length - 1], leftAt: now };
  } else if (history.length === 0 && prevCard.columnId) {
    history.push({
      columnId: prevCard.columnId,
      enteredAt: prevCard.columnEnteredAt || prevCard.updatedAt || now,
      leftAt: now,
    });
  }
  history.push({ columnId: nextColumnId, enteredAt: now, leftAt: null });
  return { ...nextCard, columnHistory: history };
}

function wouldExceedWipLimit(columnId, excludeCardId) {
  const col = columns.value.find((c) => c.id === columnId);
  if (!col || col.wipLimit == null || col.wipLimit <= 0) return false;
  const count = cards.value.filter((c) => c.columnId === columnId && c.id !== excludeCardId).length;
  return count >= col.wipLimit;
}

function getMoveOptionsForCard(card) {
  return visibleColumns.value.map((col) => ({
    id: col.id,
    label: col.label,
    disabled: col.id !== card.columnId && wouldExceedWipLimit(col.id, card.id),
  }));
}

function moveCard(cardId, fromColumnId, direction) {
  const colIndex = columns.value.findIndex((c) => c.id === fromColumnId);
  if (colIndex < 0) return;
  const nextColumn = direction === 'right' ? columns.value[colIndex + 1] : columns.value[colIndex - 1];
  if (!nextColumn) return;
  const card = cards.value.find((c) => c.id === cardId);
  if (!card) return;
  if (wouldExceedWipLimit(nextColumn.id, cardId)) return;
  cards.value = cards.value.map((c) => (c.id === cardId ? applyMoveAutomation(c, nextColumn.id) : c));
}

function moveCardToColumn(cardId, toColumnId) {
  const card = cards.value.find((c) => c.id === cardId);
  if (!card || !toColumnId || card.columnId === toColumnId || !columns.value.some((c) => c.id === toColumnId)) return;
  if (wouldExceedWipLimit(toColumnId, cardId)) return;
  cards.value = cards.value.map((c) => (c.id === cardId ? applyMoveAutomation(c, toColumnId) : c));
}

function reorderCardToEndOfColumn(cardId) {
  const card = cards.value.find((c) => c.id === cardId);
  if (!card) return;
  const rest = cards.value.filter((c) => c.id !== cardId);
  const colId = card.columnId;
  let insertAt = rest.length;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].columnId === colId) insertAt = i + 1;
  }
  cards.value = [...rest.slice(0, insertAt), card, ...rest.slice(insertAt)];
}

/** Insert dragged card so it appears right after the target card (i.e. below it in the list). */
function reorderCardAfterCard(cardId, afterCardId) {
  const card = cards.value.find((c) => c.id === cardId);
  const afterCard = cards.value.find((c) => c.id === afterCardId);
  if (!card || !afterCard || card.columnId !== afterCard.columnId) return;
  const rest = cards.value.filter((c) => c.id !== cardId);
  const afterIndex = rest.findIndex((c) => c.id === afterCardId);
  if (afterIndex === -1) return;
  const insertIndex = afterIndex + 1;
  cards.value = [...rest.slice(0, insertIndex), card, ...rest.slice(insertIndex)];
}

// Pointer-based drag (works in Electron where HTML5 DnD is unreliable)
function onCardPointerDown(e, card) {
  if (editingCardId.value === card.id) return;
  // Only ignore if the click is on a control that should not start a drag (buttons, inputs, dropdowns)
  if (e.target.closest('button, input, select, textarea, [role="button"], .p-select, .p-inputtext, .p-button, .p-dropdown')) return;
  e.preventDefault();
  const pointerId = e.pointerId;
  const cardEl = e.currentTarget;
  draggedCardId.value = card.id;
  dragSourceColumnId.value = card.columnId;
  dragOverColumnId.value = card.columnId;
  let dragOverCardId = null;

  function onPointerMove(ev) {
    if (ev.pointerId !== pointerId || !draggedCardId.value) return;
    ev.preventDefault();
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const cardElUnder = el?.closest('.kanban-card');
    const cardIdUnder = cardElUnder?.getAttribute('data-card-id') ?? null;
    const columnEl = el?.closest('.kanban-column-cards');
    const colId = columnEl?.getAttribute('data-column-id') ?? null;
    // Sticky targets: only update when we have a clear hit, so releasing slightly off still drops correctly
    if (colId) dragOverColumnId.value = colId;
    if (cardIdUnder) dragOverCardId = cardIdUnder;
    const sameCol = dragOverColumnId.value === dragSourceColumnId.value;
    if (sameCol && dragOverCardId && dragOverCardId !== draggedCardId.value) {
      dropIndicatorAfterCardId.value = dragOverCardId;
    } else {
      dropIndicatorAfterCardId.value = null;
    }
  }

  function onPointerUp(ev) {
    if (ev.pointerId !== pointerId || !draggedCardId.value) return;
    ev.preventDefault();
    const cardId = draggedCardId.value;
    const toColId = dragOverColumnId.value;
    const fromColId = dragSourceColumnId.value;
    if (toColId && toColId !== fromColId && !wouldExceedWipLimit(toColId, cardId)) {
      moveCardToColumn(cardId, toColId);
      reorderCardToEndOfColumn(cardId);
    } else if (toColId && toColId === fromColId) {
      const targetCard = dragOverCardId ? cards.value.find((c) => c.id === dragOverCardId) : null;
      const targetInSameColumn = targetCard && targetCard.columnId === toColId;
      if (targetInSameColumn && dragOverCardId !== cardId) {
        reorderCardAfterCard(cardId, dragOverCardId);
      } else {
        reorderCardToEndOfColumn(cardId);
      }
    }
    draggedCardId.value = null;
    dragOverColumnId.value = null;
    dragSourceColumnId.value = null;
    dropIndicatorAfterCardId.value = null;
    try {
      cardEl.releasePointerCapture(pointerId);
    } catch (_) {}
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    dragCleanupRef.value = null;
  }

  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', onPointerUp, true);
  dragCleanupRef.value = () => {
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    dragCleanupRef.value = null;
  };
  try {
    cardEl.setPointerCapture(pointerId);
  } catch (_) {}
}

function removeCard(cardId) {
  cards.value = cards.value.filter((c) => c.id !== cardId);
}

function toggleCardTimer(cardId) {
  const card = cards.value.find((c) => c.id === cardId);
  if (!card) return;
  if (card.startedAt && !card.stoppedAt) {
    setCardStoppedAt(cardId);
  } else {
    setCardStartedAt(cardId);
  }
}

function setCardStartedAt(card) {
  const cardId = typeof card === 'string' ? card : card?.id;
  if (!cardId) return;
  const now = new Date().toISOString();
  cards.value = cards.value.map((c) => {
    if (c.id === cardId) return { ...c, startedAt: now, stoppedAt: undefined };
    if (c.startedAt && !c.stoppedAt) return { ...c, stoppedAt: now };
    return c;
  });
  debug.log('kanban', 'card started', { cardId, title: cards.value.find((c) => c.id === cardId)?.title });
}

function setCardStoppedAt(card) {
  const cardId = typeof card === 'string' ? card : card?.id;
  if (!cardId) return;
  const current = cards.value.find((c) => c.id === cardId);
  const now = new Date().toISOString();
  cards.value = cards.value.map((c) => (c.id === cardId ? { ...c, stoppedAt: now } : c));
  const duration = current?.startedAt ? formatWorkDuration(current.startedAt, now) : null;
  debug.log('kanban', 'card stopped', { cardId, title: current?.title, duration });
}

function resetCardStartStop(card) {
  const now = new Date().toISOString();
  cards.value = cards.value.map((c) => {
    if (c.id !== card.id) return c;
    const sessions = [...(c.workSessions || [])];
    if (c.startedAt) {
      sessions.push({ startedAt: c.startedAt, stoppedAt: c.stoppedAt || now });
    }
    return {
      ...c,
      workSessions: sessions,
      startedAt: undefined,
      stoppedAt: undefined,
      updatedAt: now,
    };
  });
}

function workDurationMs(startedAt, stoppedAt) {
  if (!startedAt || !stoppedAt) return 0;
  const ms = new Date(stoppedAt) - new Date(startedAt);
  return ms > 0 ? ms : 0;
}

function hasWorkTime(card) {
  return (card.workSessions && card.workSessions.length > 0) || !!card.startedAt;
}

function openWorkSessionsModal(card) {
  workSessionsModalCard.value = card;
  workSessionsModalVisible.value = true;
}

function getWorkSessionsList(card) {
  const list = [];
  for (const s of card.workSessions || []) {
    list.push({
      startedAt: s.startedAt,
      stoppedAt: s.stoppedAt,
      durationMs: workDurationMs(s.startedAt, s.stoppedAt) || null,
    });
  }
  if (card.startedAt) {
    list.push({
      startedAt: card.startedAt,
      stoppedAt: card.stoppedAt || null,
      durationMs: card.stoppedAt ? workDurationMs(card.startedAt, card.stoppedAt) : null,
    });
  }
  return list;
}

function formatSessionDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function getTotalWorkDurationMs(card) {
  let ms = 0;
  for (const s of card.workSessions || []) {
    ms += workDurationMs(s.startedAt, s.stoppedAt);
  }
  if (card.startedAt && card.stoppedAt) ms += workDurationMs(card.startedAt, card.stoppedAt);
  return ms;
}

function formatWorkDuration(startedAt, stoppedAt) {
  const ms = workDurationMs(startedAt, stoppedAt);
  if (ms === 0) return '';
  const totalM = Math.floor(ms / (60 * 1000));
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTotalWorkDuration(card) {
  const ms = getTotalWorkDurationMs(card);
  if (ms === 0) return '';
  const totalM = Math.floor(ms / (60 * 1000));
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatElapsedLive(startedAt, _tick) {
  if (!startedAt) return '0:00';
  const ms = Date.now() - new Date(startedAt);
  if (ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function onVisibilityChange() {
  if (document.hidden) {
    const running = cards.value.find((c) => c.startedAt && !c.stoppedAt);
    if (!running) return;
    const now = new Date().toISOString();
    cards.value = cards.value.map((c) =>
      c.id === running.id ? { ...c, stoppedAt: now, updatedAt: now } : c
    );
    debug.log('kanban', 'auto-pause (window blur)', { cardId: running.id, title: running.title });
  }
}

onMounted(() => {
  timerInterval = setInterval(() => {
    timerTick.value = Date.now();
  }, 1000);
  document.addEventListener('visibilitychange', onVisibilityChange);
});
onUnmounted(() => {
  dragCleanupRef.value?.();
  dragCleanupRef.value = null;
  if (timerInterval) clearInterval(timerInterval);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});

// ——— Due date & priority ———
function formatDueDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(card) {
  if (!card.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(card.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today && !card.columnId?.startsWith?.('done');
}

function priorityClass(p) {
  if (p === 'high') return 'bg-rm-warning/20 text-rm-warning';
  if (p === 'medium') return 'bg-rm-accent/15 text-rm-accent';
  return 'bg-rm-muted/20 text-rm-muted';
}

function flowSummary(card) {
  const added = card.createdAt ? timeAgo(card.createdAt) : null;
  const moved = card.updatedAt && card.updatedAt !== card.createdAt ? timeAgo(card.updatedAt) : null;
  if (added && moved) return `Added ${added} · Moved ${moved}`;
  if (added) return `Added ${added}`;
  if (moved) return `Moved ${moved}`;
  return '';
}

function getColumnTimeSummary(card) {
  const history = card.columnHistory;
  if (!Array.isArray(history) || history.length === 0) {
    const col = columns.value.find((c) => c.id === card.columnId);
    if (!col) return [];
    const entered = card.columnEnteredAt || card.updatedAt || card.createdAt;
    const left = null;
    const ms = entered ? (left ? new Date(left) - new Date(entered) : Date.now() - new Date(entered)) : 0;
    return [{ columnId: col.id, label: col.label, durationMs: ms }];
  }
  const now = Date.now();
  const byCol = {};
  history.forEach((seg) => {
    const left = seg.leftAt ? new Date(seg.leftAt) : now;
    const entered = new Date(seg.enteredAt);
    const ms = Math.max(0, left - entered);
    if (!byCol[seg.columnId]) byCol[seg.columnId] = 0;
    byCol[seg.columnId] += ms;
  });
  return visibleColumns.value.map((col) => ({
    columnId: col.id,
    label: col.label,
    durationMs: byCol[col.id] ?? 0,
  }));
}

function formatDurationMs(ms) {
  if (ms <= 0) return '—';
  const totalM = Math.floor(ms / (60 * 1000));
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  const s = Math.floor(ms / 1000);
  return `${s}s`;
}

function timeAgo(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week}w ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
</script>

<style scoped>
.detail-kanban-card {
  padding: 1.5rem 1.5rem 1.75rem;
}

.kanban-title {
  font-size: 1rem;
  font-weight: 600;
}

.kanban-board {
  padding-left: 0.125rem;
}

.kanban-column-cards {
  scrollbar-width: thin;
}

.kanban-card {
  transition: box-shadow 0.15s ease;
  cursor: grab;
  touch-action: none;
}
.kanban-card:active {
  cursor: grabbing;
}
.kanban-card-editing {
  cursor: default;
  touch-action: auto;
}
.kanban-card:hover {
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.06);
}
.kanban-card-dragging {
  opacity: 0.5;
  pointer-events: none;
}
.kanban-card-drop-after {
  box-shadow: inset 0 -3px 0 0 rgb(var(--rm-accent));
}
.kanban-column-cards-drag-over {
  background: rgb(var(--rm-accent) / 0.06);
  border-radius: var(--rm-radius, 0.375rem);
}

.kanban-card-title {
  word-break: break-word;
}

.kanban-card-description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.kanban-card-actions {
  min-height: 2.5rem;
}
.kanban-card-actions .p-select {
  flex: 1 1 auto;
}

.kanban-card-action-btn:hover {
  background: rgb(var(--rm-surface-hover) / 0.6);
}

.kanban-card-meta {
  border-top: 1px solid rgb(var(--rm-border) / 0.4);
}

.kanban-card-overdue {
  border-left: 4px solid rgb(var(--rm-warning));
}
.kanban-card-blocked {
  border-left: 4px solid rgb(var(--rm-warning));
  background: rgb(var(--rm-warning) / 0.06);
}
.kanban-card-aging-warn {
  box-shadow: 0 0 0 1px rgb(var(--rm-warning) / 0.4);
}
.kanban-card-aging-urgent {
  box-shadow: 0 0 0 2px rgb(var(--rm-danger));
  background: rgb(var(--rm-danger) / 0.04);
}
.kanban-priority-badge {
  text-transform: capitalize;
}
.kanban-column-header-wip-over {
  background: rgb(var(--rm-warning) / 0.1);
}
.kanban-column-header-backlog {
  background: rgb(var(--rm-muted) / 0.08);
}
.kanban-badge-backlog {
  background: rgb(var(--rm-muted) / 0.25);
  color: rgb(var(--rm-muted));
}

.kanban-select:focus,
.kanban-card-move:focus {
  outline: none;
  border-color: rgb(var(--rm-accent) / 0.5);
}

.kanban-add-card-btn:not(:disabled):hover {
  background: rgb(var(--rm-surface-hover) / 0.5);
}
</style>
