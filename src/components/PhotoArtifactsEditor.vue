<template>
  <div class="editor-overlay" role="dialog" aria-modal="true" @click.self="$emit('close')">
    <div class="editor-modal">
      <header><div><span class="step-label">{{ mode === 'captures' ? 'Технические характеристики' : 'Объекты на фотографии' }}</span><h2>{{ title }}</h2></div><button type="button" class="close" title="Закрыть" @click="$emit('close')"><X /></button></header>

      <main v-if="loading" class="state"><i class="spinner"></i>Загрузка…</main>
      <main v-else-if="mode === 'captures'" class="editor-body">
        <p class="intro">Добавьте одну запись для каждой однородной серии кадров. Обязательны только выдержка и число кадров.</p>
        <article v-for="(capture,index) in captures" :key="capture._key" class="capture-card">
          <div class="card-title"><h3>{{ capture.sessionLabel || `Серия ${index+1}` }}</h3><button type="button" class="danger-link" @click="removeCapture(index)"><Trash2/>Удалить</button></div>
          <div class="form-grid">
            <label class="wide">Название серии<input v-model.trim="capture.sessionLabel" placeholder="Например, ночь 1"></label>
            <label>Выдержка, сек. *<input v-model.number="capture.exposureSeconds" type="number" min="0.001" step="0.001" required></label>
            <label>Количество кадров *<input v-model.number="capture.frameCount" type="number" min="1" step="1" required></label>
            <label>Начало съёмки<input v-model="capture.captureStartedAt" type="datetime-local"></label>
            <label>Окончание съёмки<input v-model="capture.captureEndedAt" type="datetime-local"></label>
            <label>Камера<input v-model.trim="capture.cameraModel" placeholder="ZWO ASI533MC Pro"></label>
            <label>Температура, °C<input v-model.number="capture.sensorTempC" type="number" step="0.1"></label>
            <label>ISO<input v-model.number="capture.isoValue" type="number" min="0"></label>
            <label>Gain<input v-model.number="capture.gain" type="number"></label>
            <label>Offset<input v-model.number="capture.offsetValue" type="number"></label>
            <label>Фильтр<input v-model.trim="capture.filterName" placeholder="Название фильтра"></label>
            <label>Код фильтра<input v-model.trim="capture.filterCode" placeholder="DUAL_BAND"></label>
            <label>Фокусное расстояние, мм<input v-model.number="capture.focalLengthMm" type="number" min="0" step="0.1"></label>
            <label>Апертура, мм<input v-model.number="capture.apertureMm" type="number" min="0" step="0.1"></label>
            <label>Биннинг X<input v-model.number="capture.binningX" type="number" min="1"></label>
            <label>Биннинг Y<input v-model.number="capture.binningY" type="number" min="1"></label>
            <label>Масштаб, ″/px<input v-model.number="capture.imageScaleArcsecPx" type="number" min="0" step="0.001"></label>
            <label>Dark-кадры<input v-model.number="capture.darkFrames" type="number" min="0"></label>
            <label>Flat-кадры<input v-model.number="capture.flatFrames" type="number" min="0"></label>
            <label>Bias-кадры<input v-model.number="capture.biasFrames" type="number" min="0"></label>
            <label>Dark flat-кадры<input v-model.number="capture.darkFlatFrames" type="number" min="0"></label>
            <label>Место съёмки<input v-model.trim="capture.siteName"></label>
            <label>Класс Bortle<input v-model.number="capture.bortleClass" type="number" min="1" max="9"></label>
            <label>Качество неба, mag/″²<input v-model.number="capture.skyQualityMagArcsec2" type="number" min="0" step="0.01"></label>
            <label>Seeing, угл. сек.<input v-model.number="capture.seeingArcsec" type="number" min="0" step="0.01"></label>
            <label>Луна, %<input v-model.number="capture.moonIlluminationPercent" type="number" min="0" max="100" step="0.1"></label>
            <label>RMS гидирования, угл. сек.<input v-model.number="capture.guidingRmsArcsec" type="number" min="0" step="0.01"></label>
            <label class="checkbox"><input v-model="capture.dithered" type="checkbox"> Дизеринг</label>
            <label>ПО съёмки<input v-model.trim="capture.captureSoftware"></label>
            <label>ПО сложения<input v-model.trim="capture.stackingSoftware"></label>
            <label>ПО обработки<input v-model.trim="capture.processingSoftware"></label>
            <label class="wide">Заметки<textarea v-model.trim="capture.notes" rows="2"></textarea></label>
          </div>
        </article>
        <button type="button" class="add-button" @click="addCapture"><Plus/>Добавить серию</button>
      </main>

      <main v-else class="editor-body objects-editor">
        <p class="intro">Добавьте объект, выберите его в списке и кликните по центру объекта на фотографии. Координаты сохраняются относительно изображения.</p>
        <div class="editor-image" @click="placeObject">
          <img ref="imageRef" :src="imageUrl || '/placeholder-photo.svg'" alt="Разметка объектов">
          <div v-for="(object,index) in objects" :key="object._key" class="editor-marker" :class="{active:index===activeObject}" :style="markerStyle(object)"><span>{{ index+1 }}</span></div>
        </div>
        <div class="objects-list">
          <article v-for="(object,index) in objects" :key="object._key" :class="{active:index===activeObject}" @click="activeObject=index">
            <span class="number">{{ index+1 }}</span>
            <label>Название *<input v-model.trim="object.objectName" placeholder="NGC 4038"></label>
            <label>Тип<input v-model.trim="object.objectType" placeholder="GALAXY"></label>
            <label>Каталог<input v-model.trim="object.catalogCode" placeholder="NGC"></label>
            <label>Номер<input v-model.trim="object.catalogIdentifier" placeholder="4038"></label>
            <div class="coords">X: {{ coordinate(object.positionX) }} · Y: {{ coordinate(object.positionY) }}</div>
            <button type="button" class="danger-link" @click.stop="removeObject(index)"><Trash2/>Удалить</button>
          </article>
        </div>
        <button type="button" class="add-button" @click="addObject"><Plus/>Добавить объект</button>
      </main>

      <p v-if="error" class="save-error">{{ error }}</p>
      <footer><button v-if="skippable" type="button" class="secondary" :disabled="saving" @click="$emit('skip')">Пропустить</button><span></span><button type="button" class="secondary" :disabled="saving" @click="$emit('close')">Отмена</button><button type="button" class="primary" :disabled="saving" @click="save">{{ saving ? 'Сохранение…' : continueLabel }}</button></footer>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { Plus, Trash2, X } from 'lucide-vue-next';
import artifactsApi from '@/services/photoArtifacts';
import { getApiErrorMessage } from '@/services/api';

const props=defineProps({photoId:{type:[Number,String],required:true},imageUrl:String,mode:{type:String,default:'captures'},title:{type:String,default:'Редактирование фото'},skippable:Boolean,continueLabel:{type:String,default:'Сохранить'}});
const emit=defineEmits(['close','saved','skip']);
const captures=ref([]),objects=ref([]),removedCaptureIds=ref([]),loading=ref(true),saving=ref(false),error=ref(''),activeObject=ref(0),imageRef=ref(null);
const key=()=>`${Date.now()}-${Math.random()}`;
const emptyCapture=()=>({_key:key(),sessionLabel:'',captureStartedAt:'',captureEndedAt:'',exposureSeconds:null,frameCount:null,darkFrames:0,flatFrames:0,biasFrames:0,darkFlatFrames:0,cameraModel:'',isoValue:null,gain:null,offsetValue:null,sensorTempC:null,filterCode:'',filterName:'',focalLengthMm:null,apertureMm:null,binningX:1,binningY:1,imageScaleArcsecPx:null,siteName:'',bortleClass:null,skyQualityMagArcsec2:null,seeingArcsec:null,moonIlluminationPercent:null,guidingRmsArcsec:null,dithered:false,captureSoftware:'',stackingSoftware:'',processingSoftware:'',notes:''});
const emptyObject=()=>({_key:key(),objectName:'',objectType:'',catalogCode:'',catalogIdentifier:'',positionX:null,positionY:null,markerRadiusNormalized:.025,sortOrder:objects.value.length*10+10,rightAscensionDeg:null,declinationDeg:null});
const toLocal=value=>value?new Date(value).toISOString().slice(0,16):'';
const clean=entry=>Object.fromEntries(Object.entries(entry).filter(([k,v])=>!k.startsWith('_')&&v!==''&&v!==undefined));
const capturePayload=entry=>{const p=clean(entry);if(p.captureStartedAt)p.captureStartedAt=new Date(p.captureStartedAt).toISOString();if(p.captureEndedAt)p.captureEndedAt=new Date(p.captureEndedAt).toISOString();delete p.id;delete p.photoId;delete p.createdAt;delete p.updatedAt;delete p.totalIntegrationSeconds;delete p.focalRatio;return p};
const load=async()=>{loading.value=true;try{if(props.mode==='captures'){const data=await artifactsApi.getCaptures(props.photoId);captures.value=data.map(c=>({...c,_key:key(),captureStartedAt:toLocal(c.captureStartedAt),captureEndedAt:toLocal(c.captureEndedAt)}));if(!captures.value.length)addCapture()}else{const data=await artifactsApi.getObjects(props.photoId);objects.value=data.map(o=>({...o,_key:key()}));if(!objects.value.length)addObject()}}catch(e){error.value=getApiErrorMessage(e,'Не удалось загрузить данные')}finally{loading.value=false}};
const addCapture=()=>captures.value.push(emptyCapture());
const removeCapture=index=>{const [entry]=captures.value.splice(index,1);if(entry?.id)removedCaptureIds.value.push(entry.id)};
const addObject=()=>{objects.value.push(emptyObject());activeObject.value=objects.value.length-1};
const removeObject=index=>{objects.value.splice(index,1);activeObject.value=Math.max(0,Math.min(activeObject.value,objects.value.length-1))};
const coordinate=value=>value==null?'не задано':Number(value).toFixed(4);
const markerStyle=o=>({left:`${Number(o.positionX||0)*100}%`,top:`${Number(o.positionY||0)*100}%`,display:o.positionX==null||o.positionY==null?'none':'grid'});
const placeObject=event=>{const img=imageRef.value,obj=objects.value[activeObject.value];if(!img||!obj)return;const rect=img.getBoundingClientRect();obj.positionX=Number(Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width)).toFixed(8));obj.positionY=Number(Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height)).toFixed(8))};
const save=async()=>{error.value='';saving.value=true;try{if(props.mode==='captures'){if(captures.value.some(c=>!Number(c.exposureSeconds)||!Number.isInteger(Number(c.frameCount))||Number(c.frameCount)<1))throw new Error('Для каждой серии укажите выдержку и целое количество кадров');await Promise.all(removedCaptureIds.value.map(artifactsApi.deleteCapture));const saved=await Promise.all(captures.value.map(c=>c.id?artifactsApi.updateCapture(c.id,capturePayload(c)):artifactsApi.createCapture(props.photoId,capturePayload(c))));captures.value=saved.map(c=>({...c,_key:key()}));removedCaptureIds.value=[]}else{const valid=objects.value.filter(o=>o.objectName||o.positionX!=null||o.positionY!=null);if(valid.some(o=>!o.objectName||o.positionX==null||o.positionY==null))throw new Error('Для каждого объекта укажите название и положение на фото');objects.value=await artifactsApi.replaceObjects(props.photoId,valid.map((o,i)=>({...clean(o),sortOrder:(i+1)*10})));}emit('saved',props.mode)}catch(e){error.value=e.response?getApiErrorMessage(e,'Не удалось сохранить данные'):e.message}finally{saving.value=false}};
onMounted(load);
</script>

<style scoped>
.editor-overlay{position:fixed;z-index:3000;inset:0;display:flex;align-items:center;justify-content:center;padding:1rem;background:#020617e8;backdrop-filter:blur(7px)}.editor-modal{display:flex;flex-direction:column;width:min(1040px,100%);max-height:94vh;overflow:hidden;background:#111827;border:1px solid #60a5fa55;border-radius:16px;box-shadow:0 25px 80px #000}.editor-modal>header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid #334155}.editor-modal h2{margin:0;text-shadow:none}.step-label{color:#60a5fa;font-size:.75rem;font-weight:700;text-transform:uppercase}.close{display:grid;place-items:center;width:40px;height:40px;color:#cbd5e1;background:#1e293b;border:0;border-radius:50%;cursor:pointer}.close svg{width:20px}.editor-body{overflow:auto;padding:1.15rem}.intro{margin:0 0 1rem;color:#94a3b8}.capture-card{margin-bottom:1rem;padding:1rem;background:#0b1324;border:1px solid #334155;border-radius:12px}.card-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:.8rem}.card-title h3{margin:0;text-shadow:none}.form-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.8rem}.form-grid label,.objects-list label{display:grid;gap:.3rem;color:#94a3b8;font-size:.78rem}.form-grid .wide{grid-column:span 2}input,textarea{width:100%;padding:.58rem .65rem;color:#e2e8f0;background:#111827;border:1px solid #475569;border-radius:7px;font:inherit}input:focus,textarea:focus{outline:none;border-color:#60a5fa}.danger-link,.add-button{display:inline-flex;align-items:center;gap:.35rem;border:0;cursor:pointer}.danger-link{color:#fca5a5;background:none}.danger-link svg,.add-button svg{width:16px}.add-button{padding:.65rem .8rem;color:#bfdbfe;background:#2563eb26;border:1px dashed #60a5fa;border-radius:8px}.editor-image{position:relative;align-self:center;width:min(100%,820px);line-height:0;cursor:crosshair;background:#020617}.editor-image img{display:block;width:100%;height:auto}.editor-marker{position:absolute;place-items:center;width:34px;height:34px;transform:translate(-50%,-50%);color:#111827;background:#fde047bb;border:2px solid #fff;border-radius:50%;line-height:1;font-weight:800;box-shadow:0 0 0 6px #fde04735}.editor-marker.active{background:#fb7185;box-shadow:0 0 0 7px #fb718544}.objects-list{display:grid;gap:.65rem;margin-top:1rem}.objects-list article{display:grid;grid-template-columns:auto repeat(4,1fr) auto auto;align-items:end;gap:.6rem;padding:.7rem;border:1px solid #334155;border-radius:9px;cursor:pointer}.objects-list article.active{border-color:#60a5fa;background:#2563eb12}.number{align-self:center;color:#fde047;font-weight:800}.coords{align-self:center;color:#94a3b8;font-size:.75rem;white-space:nowrap}.state{display:flex;align-items:center;justify-content:center;gap:.6rem;min-height:250px}.spinner{width:24px;height:24px;border:3px solid #60a5fa33;border-top-color:#60a5fa;border-radius:50%;animation:spin .8s linear infinite}.save-error{margin:0;padding:.7rem 1.25rem;color:#fecaca;background:#7f1d1d55}.editor-modal>footer{display:flex;gap:.65rem;padding:1rem 1.25rem;border-top:1px solid #334155}.editor-modal>footer span{flex:1}.editor-modal>footer button{padding:.65rem 1rem;border-radius:8px;cursor:pointer}.primary{color:#fff;background:#2563eb;border:1px solid #3b82f6}.secondary{color:#cbd5e1;background:#1e293b;border:1px solid #475569}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:800px){.form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.objects-list article{grid-template-columns:auto 1fr 1fr}.objects-list .coords{grid-column:2/-1}}@media(max-width:520px){.editor-overlay{align-items:flex-end;padding:0}.editor-modal{max-height:96dvh;border-radius:14px 14px 0 0}.form-grid{grid-template-columns:1fr}.form-grid .wide{grid-column:auto}.objects-list article{grid-template-columns:auto 1fr}.objects-list .coords{grid-column:1/-1}.editor-modal>footer{flex-wrap:wrap}.editor-modal>footer span{display:none}.editor-modal>footer button{flex:1}}
.form-grid .checkbox{display:flex;align-items:center;align-self:end;min-height:39px;gap:.5rem}.form-grid .checkbox input{width:auto}
.editor-overlay{z-index:10010}.editor-modal>header{position:sticky;z-index:2;top:0;background:#111827}
</style>
