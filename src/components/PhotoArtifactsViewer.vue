<template>
  <div class="artifact-viewer">
    <div class="artifact-image">
      <img :src="imageUrl || '/placeholder-photo.svg'" :alt="alt" @click="$emit('image-click')" @error="$emit('image-error', $event)">
      <div
        v-for="object in activeObjects"
        :key="object.id ?? `${object.objectName}-${object.sortOrder}`"
        class="object-grid"
        :style="gridStyle(object)"
        aria-hidden="true"
      ><span></span></div>
    </div>

    <div v-if="loading" class="artifact-state">Загрузка данных фото…</div>
    <div v-else-if="error" class="artifact-state error">{{ error }} <button type="button" @click="load">Повторить</button></div>
    <template v-else>
      <div v-if="objects.length" class="object-list" aria-label="Объекты на фотографии">
        <span>Объекты:</span>
        <button
          v-for="object in objects"
          :key="object.id ?? `${object.objectName}-${object.sortOrder}`"
          type="button"
          :class="{ active: isActive(object) }"
          :aria-pressed="isActive(object)"
          @click="toggleObject(object)"
        >{{ object.objectName }}</button>
      </div>

      <button v-if="captures.length" type="button" class="details-toggle" :aria-expanded="detailsOpen" @click="detailsOpen=!detailsOpen">
        <Info /> Подробное описание фото <ChevronDown :class="{ rotated: detailsOpen }" />
      </button>
      <section v-if="detailsOpen && captures.length" class="capture-details">
        <article v-for="(capture,index) in captures" :key="capture.id || index">
          <h4>{{ capture.sessionLabel || `Серия ${index + 1}` }}</h4>
          <dl>
            <div><dt>Экспозиция</dt><dd>{{ capture.exposureSeconds }} с × {{ capture.frameCount }}</dd></div>
            <div v-if="capture.totalIntegrationSeconds"><dt>Интеграция</dt><dd>{{ duration(capture.totalIntegrationSeconds) }}</dd></div>
            <div v-if="capture.cameraModel"><dt>Камера</dt><dd>{{ capture.cameraModel }}</dd></div>
            <div v-if="capture.isoValue != null"><dt>ISO</dt><dd>{{ capture.isoValue }}</dd></div>
            <div v-if="capture.gain != null"><dt>Gain / Offset</dt><dd>{{ capture.gain }}<template v-if="capture.offsetValue != null"> / {{ capture.offsetValue }}</template></dd></div>
            <div v-if="capture.sensorTempC != null"><dt>Температура</dt><dd>{{ capture.sensorTempC }} °C</dd></div>
            <div v-if="capture.filterName || capture.filterCode"><dt>Фильтр</dt><dd>{{ capture.filterName || capture.filterCode }}</dd></div>
            <div v-if="capture.focalLengthMm"><dt>Фокус / апертура</dt><dd>{{ capture.focalLengthMm }} / {{ capture.apertureMm || '—' }} мм</dd></div>
            <div v-if="capture.focalRatio"><dt>Светосила</dt><dd>f/{{ Number(capture.focalRatio).toFixed(1) }}</dd></div>
            <div v-if="capture.binningX"><dt>Биннинг</dt><dd>{{ capture.binningX }} × {{ capture.binningY }}</dd></div>
            <div v-if="capture.imageScaleArcsecPx"><dt>Масштаб</dt><dd>{{ capture.imageScaleArcsecPx }} ″/px</dd></div>
            <div v-if="capture.siteName"><dt>Место</dt><dd>{{ capture.siteName }}<template v-if="capture.bortleClass">, Bortle {{ capture.bortleClass }}</template></dd></div>
            <div v-if="capture.skyQualityMagArcsec2"><dt>Качество неба</dt><dd>{{ capture.skyQualityMagArcsec2 }} mag/″²</dd></div>
            <div v-if="capture.seeingArcsec"><dt>Seeing</dt><dd>{{ capture.seeingArcsec }} ″</dd></div>
            <div v-if="capture.moonIlluminationPercent != null"><dt>Луна</dt><dd>{{ capture.moonIlluminationPercent }}%</dd></div>
            <div v-if="capture.guidingRmsArcsec"><dt>Гидирование</dt><dd>{{ capture.guidingRmsArcsec }} ″ RMS</dd></div>
            <div v-if="capture.dithered"><dt>Дизеринг</dt><dd>Да</dd></div>
            <div v-if="capture.captureSoftware"><dt>Съёмка</dt><dd>{{ capture.captureSoftware }}</dd></div>
            <div v-if="capture.stackingSoftware"><dt>Сложение</dt><dd>{{ capture.stackingSoftware }}</dd></div>
            <div v-if="capture.processingSoftware"><dt>Обработка</dt><dd>{{ capture.processingSoftware }}</dd></div>
            <div v-if="capture.notes" class="wide"><dt>Заметки</dt><dd>{{ capture.notes }}</dd></div>
          </dl>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ChevronDown, Info } from 'lucide-vue-next';
import artifactsApi from '@/services/photoArtifacts';
import { getApiErrorMessage } from '@/services/api';

const props = defineProps({ photoId: { type: [Number, String], required: true }, imageUrl: String, alt: String });
defineEmits(['image-error','image-click']);
const captures=ref([]), objects=ref([]), selected=ref(new Set()), loading=ref(false), error=ref(''), detailsOpen=ref(false);
const keyOf=o=>String(o.id ?? `${o.objectName}-${o.sortOrder}`);
const activeObjects=computed(()=>objects.value.filter(isActive));
const isActive=o=>selected.value.has(keyOf(o));
const toggleObject=o=>{const next=new Set(selected.value),key=keyOf(o);next.has(key)?next.delete(key):next.add(key);selected.value=next};
const gridStyle=o=>({left:`${Number(o.positionX)*100}%`,top:`${Number(o.positionY)*100}%`,'--radius':`${Math.max(18,Number(o.markerRadiusNormalized||.025)*600)}px`});
const duration=s=>{const hours=Math.floor(s/3600),minutes=Math.round((s%3600)/60);return hours?`${hours} ч ${minutes} мин`:`${minutes} мин`};
const load=async()=>{if(!props.photoId)return;loading.value=true;error.value='';try{[captures.value,objects.value]=await Promise.all([artifactsApi.getCaptures(props.photoId),artifactsApi.getObjects(props.photoId)])}catch(e){error.value=getApiErrorMessage(e,'Не удалось загрузить описание фото')}finally{loading.value=false}};
watch(()=>props.photoId,()=>{selected.value=new Set();detailsOpen.value=false;load()});
onMounted(load);
</script>

<style scoped>
.artifact-image{position:relative;width:100%;line-height:0;background:#030712}.artifact-image img{display:block;width:100%;height:auto}.object-grid{position:absolute;width:calc(var(--radius)*2);height:calc(var(--radius)*2);transform:translate(-50%,-50%);border:1px solid #facc15aa;border-radius:50%;pointer-events:none;box-shadow:0 0 8px #000}.object-grid::before,.object-grid::after{content:'';position:absolute;opacity:.65;background:#fde047}.object-grid::before{left:50%;top:-45%;width:1px;height:190%}.object-grid::after{top:50%;left:-45%;width:190%;height:1px}.object-grid span{position:absolute;inset:25%;border:1px solid #fde04780;border-radius:50%}.artifact-state{padding:.75rem 1rem;color:#94a3b8;font-size:.85rem}.artifact-state.error{color:#fca5a5}.artifact-state button{color:#93c5fd;background:none;border:0;cursor:pointer}.object-list{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem;padding:.8rem 1.15rem}.object-list>span{color:#94a3b8;font-size:.85rem}.object-list button{padding:.25rem .55rem;color:#bfdbfe;background:#2563eb1a;border:1px solid #60a5fa55;border-radius:99px;cursor:pointer}.object-list button.active{color:#111827;background:#fde047;border-color:#fde047}.details-toggle{display:flex;align-items:center;width:100%;gap:.5rem;padding:.8rem 1.15rem;color:#93c5fd;background:none;border:0;border-top:1px solid #94a3b81f;cursor:pointer}.details-toggle svg{width:18px}.details-toggle svg:last-child{margin-left:auto;transition:.2s}.details-toggle .rotated{transform:rotate(180deg)}.capture-details{display:grid;gap:.8rem;padding:1rem 1.15rem;background:#0b1324;border-top:1px solid #60a5fa26}.capture-details article{padding:.8rem;border:1px solid #334155;border-radius:9px}.capture-details h4{margin:0 0 .6rem;color:#e2e8f0}.capture-details dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem 1rem}.capture-details dl div{display:flex;gap:.4rem;font-size:.82rem}.capture-details dt{color:#64748b}.capture-details dd{margin:0;color:#cbd5e1}.capture-details .wide{grid-column:1/-1}@media(max-width:600px){.capture-details dl{grid-template-columns:1fr}}
</style>
