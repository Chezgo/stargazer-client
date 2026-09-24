<template>
  <section class="equipment-section" data-testid="observation-equipment-panel">
    <div class="section-header">
      <div>
        <h2>
          <Telescope class="section-icon" />
          Оборудование для наблюдений
        </h2>
        <p>{{ hasGoal ? 'Оборудование отсортировано по важности для выбранной цели' : 'Добавляйте и контролируйте детали сборки в одном месте' }}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline btn-sm" @click="$emit('reload')">
          <RefreshCw class="btn-icon" />
          Обновить
        </button>
        <button class="btn btn-outline btn-sm" data-testid="btn-toggle-all-detail-groups" @click="toggleAllGroups">
          <component :is="allExpanded ? Minus : Plus" class="btn-icon" />
          {{ allExpanded ? 'Свернуть все' : 'Развернуть все' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="state">
      <div class="spinner-small"></div>
      <p>Загрузка оборудования...</p>
    </div>

    <div v-else-if="error" class="state error-state">
      <p>{{ error }}</p>
      <button class="btn btn-sm" @click="$emit('reload')">Повторить</button>
    </div>

    <div v-else class="equipment-groups">
      <article
        v-for="group in displayGroups"
        :key="group.key"
        :class="['equipment-group', `group-${group.tone}`]"
        data-testid="detail-type-group"
        :data-group-name="group.name"
      >
        <button class="group-header" data-testid="btn-toggle-detail-group" @click="toggleGroup(group.key)">
          <span>{{ group.name }}</span>
          <span class="group-summary">{{ installedCount(group.types) }} / {{ group.types.length }}</span>
          <component :is="isExpanded(group.key) ? ChevronUp : ChevronDown" class="toggle-icon" />
        </button>

        <div v-show="isExpanded(group.key)" class="group-body">
          <div v-for="type in group.types" :key="type.id" :class="['equipment-row', recommendationRowClass(type)]">
            <div class="type-column">
              <span v-if="hasGoal && type.functionalGroup" class="functional-group">{{ type.functionalGroup }}</span>
              <span class="type-name">{{ type.name }}</span>
              <span v-if="hasInstalledDetail(type.name)" class="type-status installed">Установлено</span>
              <span v-else class="type-status missing">Не установлено</span>

              <div v-if="recommendationFor(type.name)" class="recommendation-info">
                <div class="recommendation-meta">
                  <span :class="['recommendation-badge', `recommendation-${recommendationTone(type)}`]">
                    {{ requirementLabel(recommendationFor(type.name).requirementType) }}
                  </span>
                  <span :class="['recommendation-status', `status-${recommendationFor(type.name).itemStatus.toLowerCase()}`]">
                    {{ statusLabel(recommendationFor(type.name).itemStatus) }}
                  </span>
                </div>
                <span class="quantity">
                  Количество: {{ recommendationFor(type.name).currentQuantity }} /
                  {{ recommendationFor(type.name).minQuantity }}–{{ recommendationFor(type.name).maxQuantity }}
                </span>
                <p v-if="recommendationFor(type.name).adviceText" class="recommendation-text">
                  {{ recommendationFor(type.name).adviceText }}
                </p>
              </div>
            </div>

            <div class="detail-column">
              <template v-if="hasInstalledDetail(type.name)">
                <div class="installed-details">
                  <div v-for="item in detailsForType(type.name)" :key="item.id" class="detail-card-mini">
                    <div class="detail-title-row">
                      <div>
                        <strong>{{ item.detailInfo?.nameDetail || 'Деталь загружается' }}</strong>
                        <span v-if="item.detailInfo?.nameBrand" class="brand">{{ item.detailInfo.nameBrand }}</span>
                      </div>
                      <button class="remove-button" title="Удалить из сборки" @click="$emit('remove-detail', item.id)">
                        <Trash2 />
                      </button>
                    </div>

                    <div v-if="item.detailInfo?.attribute?.length" class="attributes">
                      <span v-for="attribute in item.detailInfo.attribute.slice(0, 3)" :key="attribute.id">
                        {{ attribute.attributeName }}: <strong>{{ attribute.value || '—' }}</strong>
                      </span>
                      <span v-if="item.detailInfo.attribute.length > 3">+{{ item.detailInfo.attribute.length - 3 }}</span>
                    </div>
                  </div>
                </div>

                <button
                  class="add-more"
                  :title="addTitle(type)"
                  @click="$emit('add-detail', type)"
                >
                  <Plus />
                  Добавить ещё
                </button>
              </template>

              <button
                v-else
                class="missing-detail"
                :title="addTitle(type)"
                data-testid="detail-type-button"
                :data-detail-type-id="type.id"
                @click="$emit('add-detail', type)"
              >
                <PlusCircle />
                <span>Отсутствует {{ type.name }}</span>
                <small>Нажмите, чтобы выбрать деталь</small>
              </button>
            </div>
          </div>
        </div>
      </article>

      <article v-if="unmatchedDetails.length" class="equipment-group">
        <div class="group-header static-header">
          <span>Другие детали</span>
          <span class="group-summary">{{ unmatchedDetails.length }}</span>
        </div>
        <div class="group-body">
          <div v-for="item in unmatchedDetails" :key="item.id" class="equipment-row unmatched-row">
            <div class="type-column"><span class="type-name">{{ item.detailInfo?.nameType || 'Без типа' }}</span></div>
            <div class="detail-column">
              <div class="detail-card-mini">
                <div class="detail-title-row">
                  <strong>{{ item.detailInfo?.nameDetail || 'Деталь' }}</strong>
                  <button class="remove-button" title="Удалить из сборки" @click="$emit('remove-detail', item.id)"><Trash2 /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ChevronDown, ChevronUp, Minus, Plus, PlusCircle, RefreshCw, Telescope, Trash2 } from 'lucide-vue-next';

const props = defineProps({
  types: { type: Object, default: () => ({}) },
  details: { type: Array, default: () => [] },
  hasGoal: Boolean,
  evaluation: { type: Object, default: null },
  typesLoading: Boolean,
  detailsLoading: Boolean,
  typesError: String,
  detailsError: String
});

defineEmits(['reload', 'add-detail', 'remove-detail']);

const collapsedGroups = ref({});

const knownTypeNames = computed(() => new Set(
  Object.values(props.types).flat().map(type => type.name)
));

const installedByType = computed(() => props.details.reduce((result, item) => {
  const typeName = item.detailInfo?.nameType;
  if (!typeName) return result;
  if (!result[typeName]) result[typeName] = [];
  result[typeName].push(item);
  return result;
}, {}));

const unmatchedDetails = computed(() => props.details.filter(item => (
  !knownTypeNames.value.has(item.detailInfo?.nameType)
)));

const recommendationsByType = computed(() => (props.evaluation?.details || []).reduce((result, item) => {
  result[item.typeName] = item;
  return result;
}, {}));

const availableTypeEntries = computed(() => Object.entries(props.types).flatMap(([functionalGroup, types]) => (
  types.map(type => ({ ...type, functionalGroup }))
)));

const displayGroups = computed(() => {
  if (!props.hasGoal || !props.evaluation?.details?.length) {
    return Object.entries(props.types).map(([name, types]) => ({
      key: `functional-${name}`,
      name,
      tone: 'standard',
      types: types.map(type => ({ ...type, functionalGroup: name }))
    }));
  }

  const definitions = [
    { key: 'required', name: 'Критически важное оборудование', tone: 'critical', requirementType: 'REQUIRED' },
    { key: 'recommended', name: 'Рекомендуемое оборудование', tone: 'recommended', requirementType: 'RECOMMENDED' },
    { key: 'optional', name: 'Опциональное оборудование', tone: 'optional', requirementType: 'OPTIONAL' },
    { key: 'other', name: 'Остальное оборудование', tone: 'standard', requirementType: null }
  ];

  const statusPriority = { MISSING: 0, PARTIAL: 1, OK: 2 };

  return definitions.map(definition => {
    const types = availableTypeEntries.value
      .filter(type => {
        const recommendation = recommendationsByType.value[type.name];
        return definition.requirementType
          ? recommendation?.requirementType === definition.requirementType
          : !recommendation;
      })
      .sort((left, right) => {
        const leftStatus = recommendationsByType.value[left.name]?.itemStatus;
        const rightStatus = recommendationsByType.value[right.name]?.itemStatus;
        const priorityDifference = (statusPriority[leftStatus] ?? 3) - (statusPriority[rightStatus] ?? 3);
        return priorityDifference || left.name.localeCompare(right.name, 'ru');
      });

    return { ...definition, types };
  }).filter(group => group.types.length);
});

const allExpanded = computed(() => displayGroups.value.every(group => !collapsedGroups.value[group.key]));

const loading = computed(() => props.typesLoading || props.detailsLoading);
const error = computed(() => props.typesError || props.detailsError);
const detailsForType = typeName => installedByType.value[typeName] || [];
const hasInstalledDetail = typeName => detailsForType(typeName).length > 0;
const installedCount = types => types.filter(type => hasInstalledDetail(type.name)).length;
const recommendationFor = typeName => recommendationsByType.value[typeName];
const isExpanded = groupKey => !collapsedGroups.value[groupKey];
const toggleGroup = groupKey => { collapsedGroups.value[groupKey] = !collapsedGroups.value[groupKey]; };
const toggleAllGroups = () => {
  const collapse = allExpanded.value;
  displayGroups.value.forEach(group => { collapsedGroups.value[group.key] = collapse; });
};
const addTitle = () => 'Выбрать деталь';
const recommendationTone = type => ({ REQUIRED: 'critical', RECOMMENDED: 'recommended', OPTIONAL: 'optional' }[recommendationFor(type.name)?.requirementType] || 'standard');
const recommendationRowClass = type => recommendationFor(type.name) ? `row-${recommendationTone(type)}` : 'row-standard';
const requirementLabel = requirementType => ({ REQUIRED: 'Обязательно', RECOMMENDED: 'Рекоменуется', OPTIONAL: 'Опционально' }[requirementType] || requirementType);
const statusLabel = status => ({ OK: 'Готово', PARTIAL: 'Нужно дополнить', MISSING: 'Отсутствует' }[status] || status);
</script>

<style scoped>
.equipment-section { margin-bottom: 2rem; }
.section-header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1rem; }
.section-header h2 { display:flex; align-items:center; gap:.55rem; margin:0; color:#e0e7ff; font-size:1.35rem; }
.section-header p { margin:.3rem 0 0; color:#64748b; font-size:.88rem; }
.section-icon { width:22px; height:22px; }
.header-actions { display:flex; gap:.65rem; flex:0 0 auto; }
.btn-icon { width:16px; height:16px; }
.btn-sm { padding:.5rem .8rem; font-size:.85rem; }
.equipment-groups { display:grid; gap:1rem; }
.equipment-group { overflow:hidden; background:#111827; border:1px solid rgba(59,130,246,.3); border-radius:12px; }
.equipment-group.group-critical { border-color:rgba(239,68,68,.48); }
.equipment-group.group-recommended { border-color:rgba(245,158,11,.42); }
.equipment-group.group-optional { border-color:rgba(96,165,250,.38); }
.group-critical > .group-header { background:rgba(127,29,29,.28); }
.group-recommended > .group-header { background:rgba(120,53,15,.22); }
.group-header { display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:.8rem; width:100%; padding:.9rem 1.1rem; color:#e0e7ff; background:rgba(59,130,246,.1); border:0; cursor:pointer; text-align:left; font:inherit; font-weight:700; }
.group-header:hover { background:rgba(59,130,246,.16); }
.static-header { cursor:default; }
.group-summary { padding:.2rem .55rem; color:#93c5fd; background:rgba(59,130,246,.22); border-radius:99px; font-size:.78rem; }
.toggle-icon { width:18px; height:18px; color:#93c5fd; }
.group-body { display:grid; }
.equipment-row { display:grid; grid-template-columns:minmax(240px,36%) minmax(0,1fr); gap:1rem; align-items:start; padding:1rem 1.1rem; border-top:1px solid rgba(59,130,246,.16); }
.equipment-row.row-critical { border-left:3px solid rgba(239,68,68,.85); }
.equipment-row.row-recommended { border-left:3px solid rgba(245,158,11,.8); }
.equipment-row.row-optional { border-left:3px solid rgba(96,165,250,.7); }
.type-column { display:flex; flex-direction:column; align-items:flex-start; gap:.4rem; padding:.6rem 0; }
.functional-group { color:#64748b; font-size:.7rem; font-weight:600; letter-spacing:.03em; text-transform:uppercase; }
.type-name { color:#dbeafe; font-weight:650; overflow-wrap:anywhere; }
.type-status { padding:.15rem .45rem; border-radius:99px; font-size:.7rem; font-weight:600; }
.type-status.installed { color:#86efac; background:rgba(34,197,94,.12); }
.type-status.missing { color:#94a3b8; background:rgba(100,116,139,.15); }
.recommendation-info { display:grid; gap:.35rem; width:100%; margin-top:.35rem; padding:.65rem .7rem; background:rgba(15,23,42,.58); border-radius:8px; }
.recommendation-meta { display:flex; align-items:center; flex-wrap:wrap; gap:.4rem; }
.recommendation-badge, .recommendation-status { padding:.15rem .42rem; border-radius:99px; font-size:.68rem; font-weight:700; }
.recommendation-critical { color:#fca5a5; background:rgba(239,68,68,.16); }
.recommendation-recommended { color:#fcd34d; background:rgba(245,158,11,.14); }
.recommendation-optional { color:#93c5fd; background:rgba(59,130,246,.15); }
.status-ok { color:#86efac; background:rgba(34,197,94,.13); }
.status-partial { color:#fcd34d; background:rgba(245,158,11,.13); }
.status-missing { color:#fca5a5; background:rgba(239,68,68,.13); }
.quantity { color:#94a3b8; font-size:.76rem; }
.recommendation-text { margin:0; color:#cbd5e1; font-size:.82rem; line-height:1.45; }
.detail-column, .installed-details { display:grid; gap:.65rem; min-width:0; }
.detail-card-mini { padding:.85rem 1rem; background:rgba(59,130,246,.055); border:1px solid rgba(59,130,246,.22); border-radius:9px; }
.detail-title-row { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; }
.detail-title-row > div { display:flex; min-width:0; flex-direction:column; gap:.3rem; }
.detail-title-row strong { color:#e0e7ff; overflow-wrap:anywhere; }
.brand { width:max-content; max-width:100%; padding:.15rem .45rem; color:#93c5fd; background:rgba(59,130,246,.15); border-radius:99px; font-size:.72rem; }
.remove-button { display:grid; flex:0 0 auto; place-items:center; width:34px; height:34px; color:#94a3b8; background:transparent; border:1px solid rgba(148,163,184,.18); border-radius:7px; cursor:pointer; }
.remove-button svg { width:16px; height:16px; }
.remove-button:hover { color:#fca5a5; background:rgba(239,68,68,.12); border-color:rgba(239,68,68,.55); }
.attributes { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.7rem; }
.attributes span { padding:.2rem .4rem; color:#94a3b8; background:rgba(59,130,246,.1); border-radius:4px; font-size:.78rem; }
.attributes strong { color:#60a5fa; }
.missing-detail { display:grid; grid-template-columns:auto minmax(0,1fr); gap:.15rem .65rem; align-items:center; width:100%; padding:.9rem 1rem; color:#93c5fd; background:rgba(59,130,246,.06); border:1px dashed rgba(96,165,250,.5); border-radius:9px; cursor:pointer; text-align:left; }
.missing-detail svg { grid-row:1/3; width:22px; height:22px; }
.missing-detail span { font-weight:650; }
.missing-detail small { color:#64748b; }
.missing-detail:hover:not(:disabled) { background:rgba(59,130,246,.13); border-color:#60a5fa; }
.missing-detail:disabled { opacity:.55; cursor:not-allowed; }
.add-more { display:inline-flex; align-items:center; justify-self:start; gap:.4rem; padding:.35rem .55rem; color:#93c5fd; background:transparent; border:0; cursor:pointer; font:inherit; font-size:.8rem; }
.add-more svg { width:15px; height:15px; }
.add-more:hover:not(:disabled) { color:#bfdbfe; }
.add-more:disabled { opacity:.45; cursor:not-allowed; }
.state { display:flex; min-height:150px; flex-direction:column; align-items:center; justify-content:center; gap:.75rem; color:#94a3b8; background:#111827; border:1px solid rgba(59,130,246,.3); border-radius:12px; }
.error-state { color:#fca5a5; }
.spinner-small { width:24px; height:24px; border:2px solid rgba(96,165,250,.2); border-top-color:#60a5fa; border-radius:50%; animation:spin 1s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
@media (max-width:760px) {
  .section-header { flex-direction:column; }
  .header-actions { width:100%; }
  .header-actions .btn { flex:1; justify-content:center; }
  .equipment-row { grid-template-columns:1fr; gap:.25rem; padding:.85rem; }
  .type-column { padding:0; }
}
@media (max-width:480px) {
  .header-actions { flex-direction:column; }
  .group-header { padding:.8rem; }
  .detail-card-mini { padding:.75rem; }
}
</style>
