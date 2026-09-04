<template>
  <div class="feed-page" data-testid="page-feed">
    <header class="page-header">
      <div><h1><Sparkles /> Лента наблюдений</h1><p class="page-subtitle">Астрофотографии сообщества Stargazer</p></div>
      <button class="refresh" :disabled="loading" title="Обновить ленту" @click="refreshFeed"><RefreshCw :class="{ spinning: loading }"/><span>Обновить</span></button>
    </header>

    <div v-if="loading && !photos.length" class="state"><i class="spinner"></i><p>Ищем новые наблюдения…</p></div>
    <div v-else-if="feedError && !photos.length" class="state error"><AlertTriangle/><p>{{ feedError }}</p><button class="btn" @click="refreshFeed">Повторить</button></div>
    <div v-else-if="!photos.length" class="state"><Telescope/><h2>Лента пока пуста</h2><p>Опубликуйте первое наблюдение в разделе «Мои наблюдения».</p><router-link class="btn btn-primary" to="/my-observations">Перейти к фотографиям</router-link></div>

    <section v-else class="feed-list">
      <article v-for="photo in photos" :key="photo.id" class="feed-card" :data-photo-id="photo.id">
        <header class="photo-header">
          <span class="avatar">{{ initial(photo.author?.username) }}</span>
          <div class="author"><strong>{{ photo.author?.username || 'Неизвестный автор' }}</strong><time>{{ formatDate(photo.publishedAt || photo.createdAt) }}</time></div>
          <button
            v-if="photo.assembly?.name"
            class="assembly"
            type="button"
            :aria-expanded="assemblyPanel(photo.id).open"
            @click="toggleAssembly(photo)"
          >
            <Telescope/>{{ photo.assembly.name }}<ChevronDown :class="{ rotated: assemblyPanel(photo.id).open }"/>
          </button>
          <button
            v-if="photo.assembly?.id"
            class="assembly-like"
            :class="{ liked: assemblyLikeState(photo).liked }"
            :disabled="assemblyLikeState(photo).busy"
            :aria-pressed="assemblyLikeState(photo).liked"
            :title="assemblyLikeState(photo).liked ? 'Убрать лайк со сборки' : 'Лайкнуть сборку'"
            @click.stop="toggleAssemblyLike(photo)"
          >
            <Heart :fill="assemblyLikeState(photo).liked ? 'currentColor' : 'none'" />
            <span v-if="assemblyLikeState(photo).hasCount">{{ assemblyLikeState(photo).likesCount }}</span>
          </button>
        </header>
        <section v-if="photo.assembly && assemblyPanel(photo.id).open" class="assembly-panel">
          <div v-if="assemblyPanel(photo.id).loading" class="assembly-panel-state"><i class="spinner small"></i>Загрузка сборки…</div>
          <div v-else-if="assemblyPanel(photo.id).error" class="assembly-panel-state error">
            <span>{{ assemblyPanel(photo.id).error }}</span><button type="button" @click="loadAssembly(photo, true)">Повторить</button>
          </div>
          <template v-else>
            <h3>{{ assemblyPanel(photo.id).info?.name || photo.assembly.name }}</h3>
            <p v-if="assemblyPanel(photo.id).info?.description" class="assembly-description">{{ assemblyPanel(photo.id).info.description }}</p>
            <template v-if="assemblyPanel(photo.id).details.length">
              <h4>Детали в сборке:</h4>
              <div class="assembly-details">
                <div v-for="item in assemblyPanel(photo.id).details" :key="item.assemblyDetailId" class="assembly-detail">
                  <strong>{{ item.detail?.name || 'Деталь' }}</strong>
                  <span v-if="item.detail?.type?.name" class="detail-type">{{ item.detail.type.name }}</span>
                  <span v-if="item.description" class="detail-note">— {{ item.description }}</span>
                </div>
              </div>
            </template>
            <p v-else class="assembly-empty">В этой сборке пока нет деталей</p>
          </template>
        </section>
        <div class="photo-frame">
          <PhotoArtifactsViewer :photo-id="photo.id" :image-url="photo.thumbnailUrl || photo.imageUrl" :alt="photo.title" @image-click="openDetail(photo)" @image-error="imageError" />
          <button title="Открыть публикацию" @click="openDetail(photo)"><Maximize2/></button>
        </div>
        <div class="photo-content">
          <h2 v-if="photo.title">{{ photo.title }}</h2>
          <p v-if="photo.description" class="description">{{ photo.description }}</p>
          <div class="engagement-actions">
            <button class="like-button" :class="{ liked: photo.likedByMe }" :disabled="likeBusy[photo.id]" :aria-pressed="photo.likedByMe" @click="togglePhotoLike(photo)"><Heart :fill="photo.likedByMe ? 'currentColor' : 'none'"/>{{ likesLabel(photo.likesCount) }}</button>
            <button class="comments-toggle" @click="toggleComments(photo)"><MessageCircle/>{{ commentsLabel(photo.commentsCount) }}<ChevronDown :class="{ rotated: thread(photo.id).open }"/></button>
          </div>
        </div>

        <section v-if="thread(photo.id).open" class="comments-section">
          <form class="comment-form" @submit.prevent="submitComment(photo)">
            <textarea v-model="thread(photo.id).draft" maxlength="2000" rows="2" placeholder="Написать комментарий…" aria-label="Текст комментария"></textarea>
            <button :disabled="thread(photo.id).submitting || !thread(photo.id).draft.trim()"><Send/><span>Отправить</span></button>
          </form>
          <div v-if="thread(photo.id).loading && !thread(photo.id).items.length" class="comments-state"><i class="spinner small"></i>Загрузка комментариев…</div>
          <div v-else-if="thread(photo.id).error" class="comments-state error">{{ thread(photo.id).error }} <button @click="loadComments(photo,true)">Повторить</button></div>
          <p v-else-if="!thread(photo.id).items.length" class="comments-state">Будьте первым, кто оставит комментарий.</p>

          <div v-else class="comment-list">
            <div v-for="comment in thread(photo.id).items" :key="comment.id" class="comment-thread">
              <CommentRow :comment="comment" :own="isOwn(comment)" :editing-id="editingId" :edit-text="editText" :busy-id="actionId" @edit="startEdit" @edit-text="editText=$event" @save="saveEdit(photo,comment)" @cancel="cancelEdit" @remove="removeComment(photo,comment)" @reply="startReply(photo.id,comment)"/>
              <form v-if="thread(photo.id).replyTo?.id === comment.id" class="reply-form" @submit.prevent="submitReply(photo,comment)">
                <textarea v-model="thread(photo.id).replyDraft" maxlength="2000" rows="2" :placeholder="`Ответ для ${comment.author?.username || 'пользователя'}…`"></textarea>
                <div class="inline-actions"><button :disabled="thread(photo.id).submitting || !thread(photo.id).replyDraft.trim()">Ответить</button><button type="button" @click="cancelReply(photo.id)">Отмена</button></div>
              </form>
              <CommentRow v-for="reply in comment.replies || []" :key="reply.id" class="reply" :comment="reply" :own="isOwn(reply)" :editing-id="editingId" :edit-text="editText" :busy-id="actionId" :is-reply="true" @edit="startEdit" @edit-text="editText=$event" @save="saveEdit(photo,reply)" @cancel="cancelEdit" @remove="removeComment(photo,reply)"/>
            </div>
          </div>
          <button v-if="thread(photo.id).nextCursor" class="load-comments" :disabled="thread(photo.id).loading" @click="loadComments(photo)">{{ thread(photo.id).loading ? 'Загрузка…' : 'Показать ещё комментарии' }}</button>
        </section>
      </article>
    </section>
    <p v-if="feedError && photos.length" class="inline-error">{{ feedError }}</p>
    <button v-if="nextCursor" class="load-more" :disabled="loadingMore" @click="loadMore"><LoaderCircle v-if="loadingMore" class="spinning"/>{{ loadingMore ? 'Загрузка…' : 'Показать ещё' }}</button>
    <p v-else-if="photos.length && !loading" class="feed-end">Вы посмотрели все публикации</p>

    <Teleport to="body">
    <div v-if="imageModal" class="feed-detail-overlay" role="dialog" aria-modal="true" @click.self="closeDetail">
      <article class="detail-card">
        <header class="photo-header">
          <span class="avatar">{{ initial(imageModal.author?.username) }}</span>
          <div class="author"><strong>{{ imageModal.author?.username || 'Неизвестный автор' }}</strong><time>{{ formatDate(imageModal.publishedAt || imageModal.createdAt) }}</time></div>
          <button class="modal-close" title="Закрыть" aria-label="Закрыть подробный режим" @click="closeDetail"><X/></button>
        </header>
        <div class="detail-scroll">
          <PhotoArtifactsViewer :photo-id="imageModal.id" :image-url="imageModal.imageUrl || imageModal.thumbnailUrl" :alt="imageModal.title" @image-error="imageError" />
          <div class="photo-content">
            <h2 v-if="imageModal.title">{{ imageModal.title }}</h2>
            <p v-if="imageModal.description" class="description">{{ imageModal.description }}</p>
            <button class="like-button" :class="{ liked: imageModal.likedByMe }" :disabled="likeBusy[imageModal.id]" :aria-pressed="imageModal.likedByMe" @click="togglePhotoLike(imageModal)"><Heart :fill="imageModal.likedByMe ? 'currentColor' : 'none'"/>{{ likesLabel(imageModal.likesCount) }}</button>
          </div>
          <section class="comments-section detail-comments">
            <h3><MessageCircle/> {{ commentsLabel(imageModal.commentsCount) }}</h3>
            <form class="comment-form" @submit.prevent="submitComment(imageModal)">
              <textarea v-model="thread(imageModal.id).draft" maxlength="2000" rows="2" placeholder="Написать комментарий…" aria-label="Текст комментария"></textarea>
              <button :disabled="thread(imageModal.id).submitting || !thread(imageModal.id).draft.trim()"><Send/><span>Отправить</span></button>
            </form>
            <div v-if="thread(imageModal.id).loading && !thread(imageModal.id).items.length" class="comments-state"><i class="spinner small"></i>Загрузка комментариев…</div>
            <div v-else-if="thread(imageModal.id).error" class="comments-state error">{{ thread(imageModal.id).error }} <button @click="loadComments(imageModal,true)">Повторить</button></div>
            <p v-else-if="!thread(imageModal.id).items.length" class="comments-state">Будьте первым, кто оставит комментарий.</p>
            <div v-else class="comment-list">
              <div v-for="comment in thread(imageModal.id).items" :key="comment.id" class="comment-thread">
                <CommentRow :comment="comment" :own="isOwn(comment)" :editing-id="editingId" :edit-text="editText" :busy-id="actionId" @edit="startEdit" @edit-text="editText=$event" @save="saveEdit(imageModal,comment)" @cancel="cancelEdit" @remove="removeComment(imageModal,comment)" @reply="startReply(imageModal.id,comment)"/>
                <form v-if="thread(imageModal.id).replyTo?.id === comment.id" class="reply-form" @submit.prevent="submitReply(imageModal,comment)"><textarea v-model="thread(imageModal.id).replyDraft" maxlength="2000" rows="2" :placeholder="`Ответ для ${comment.author?.username || 'пользователя'}…`"></textarea><div class="inline-actions"><button :disabled="thread(imageModal.id).submitting || !thread(imageModal.id).replyDraft.trim()">Ответить</button><button type="button" @click="cancelReply(imageModal.id)">Отмена</button></div></form>
                <CommentRow v-for="reply in comment.replies || []" :key="reply.id" class="reply" :comment="reply" :own="isOwn(reply)" :editing-id="editingId" :edit-text="editText" :busy-id="actionId" :is-reply="true" @edit="startEdit" @edit-text="editText=$event" @save="saveEdit(imageModal,reply)" @cancel="cancelEdit" @remove="removeComment(imageModal,reply)"/>
              </div>
            </div>
            <button v-if="thread(imageModal.id).nextCursor" class="load-comments" :disabled="thread(imageModal.id).loading" @click="loadComments(imageModal)">{{ thread(imageModal.id).loading ? 'Загрузка…' : 'Показать ещё комментарии' }}</button>
          </section>
        </div>
      </article>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { AlertTriangle, ChevronDown, Heart, LoaderCircle, Maximize2, MessageCircle, RefreshCw, Send, Sparkles, Telescope, X } from 'lucide-vue-next';
import feedApi from '@/services/feed';
import { getApiErrorMessage } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import CommentRow from '@/components/FeedComment.vue';
import PhotoArtifactsViewer from '@/components/PhotoArtifactsViewer.vue';

const auth=useAuthStore(), photos=ref([]), nextCursor=ref(null), loading=ref(false), loadingMore=ref(false), feedError=ref(''), threads=reactive({}), editingId=ref(null), editText=ref(''), actionId=ref(null), imageModal=ref(null);
const thread=id=>threads[id]||(threads[id]={open:false,items:[],nextCursor:null,loaded:false,loading:false,submitting:false,error:'',draft:'',replyTo:null,replyDraft:''});
const assemblyPanels=reactive({});
const assemblyLikes=reactive({});
const likeBusy=reactive({});
const assemblyPanel=photoId=>assemblyPanels[photoId]||(assemblyPanels[photoId]={open:false,loaded:false,loading:false,error:'',info:null,details:[]});
const assemblyLikeState=photo=>{const assembly=photo.assembly||{};const id=assembly.id;if(!assemblyLikes[id]){const rawCount=assembly.likesCount;assemblyLikes[id]={liked:Boolean(assembly.likedByMe),likesCount:Number(rawCount)||0,hasCount:rawCount!==null&&rawCount!==undefined&&Number.isFinite(Number(rawCount)),busy:false}}return assemblyLikes[id]};
const toggleAssembly=photo=>{const panel=assemblyPanel(photo.id);panel.open=!panel.open;if(panel.open&&!panel.loaded)loadAssembly(photo)};
const loadAssembly=async(photo,reload=false)=>{const panel=assemblyPanel(photo.id);if(panel.loading)return;panel.loading=true;panel.error='';try{const snapshot=await feedApi.getPhotoAssemblySnapshot(photo.id);panel.info=snapshot?.assembly||photo.assembly;panel.details=snapshot?.assembly?.components||[];panel.loaded=true}catch(e){panel.error=getApiErrorMessage(e,'Не удалось загрузить снимок сборки');if(reload)panel.loaded=false}finally{panel.loading=false}};
const page=data=>({items:data?.items||data?.content||(Array.isArray(data)?data:[]),nextCursor:data?.nextCursor??null});
const normalizePhoto=photo=>({...photo,likesCount:Number(photo.likesCount)||0,likedByMe:Boolean(photo.likedByMe)});
const refreshFeed=async()=>{loading.value=true;feedError.value='';try{const p=page(await feedApi.getFeed());photos.value=p.items.map(normalizePhoto);nextCursor.value=p.nextCursor}catch(e){feedError.value=getApiErrorMessage(e,'Не удалось загрузить ленту')}finally{loading.value=false}};
const loadMore=async()=>{if(!nextCursor.value||loadingMore.value)return;loadingMore.value=true;feedError.value='';try{const p=page(await feedApi.getFeed(nextCursor.value));photos.value.push(...p.items.map(normalizePhoto));nextCursor.value=p.nextCursor}catch(e){feedError.value=getApiErrorMessage(e,'Не удалось загрузить следующую страницу')}finally{loadingMore.value=false}};
const togglePhotoLike=async photo=>{if(likeBusy[photo.id])return;likeBusy[photo.id]=true;try{const state=photo.likedByMe?await feedApi.unlikePhoto(photo.id):await feedApi.likePhoto(photo.id);photo.likedByMe=Boolean(state.liked);photo.likesCount=Number(state.likesCount)||0}catch(e){notify(e,'Не удалось изменить лайк')}finally{likeBusy[photo.id]=false}};
const toggleAssemblyLike=async photo=>{const id=photo.assembly?.id;if(!id)return;const current=assemblyLikeState(photo);if(current.busy)return;current.busy=true;try{const state=current.liked?await feedApi.unlikeAssembly(id):await feedApi.likeAssembly(id);current.liked=Boolean(state.liked);current.likesCount=Number(state.likesCount)||0;current.hasCount=true}catch(e){notify(e,'Не удалось изменить лайк сборки')}finally{current.busy=false}};
const toggleComments=p=>{const t=thread(p.id);t.open=!t.open;if(t.open&&!t.loaded)loadComments(p,true)};
const loadComments=async(p,reset=false)=>{const t=thread(p.id);if(t.loading)return;t.loading=true;t.error='';try{const result=page(await feedApi.getComments(p.id,reset?null:t.nextCursor));t.items=reset?result.items:[...t.items,...result.items];t.nextCursor=result.nextCursor;t.loaded=true}catch(e){t.error=getApiErrorMessage(e,'Не удалось загрузить комментарии')}finally{t.loading=false}};
const submitComment=async p=>{const t=thread(p.id),text=t.draft.trim();if(!text||t.submitting)return;t.submitting=true;try{const c=await feedApi.createComment(p.id,text);t.items.unshift({...c,replies:c.replies||[]});t.draft='';p.commentsCount=(p.commentsCount||0)+1}catch(e){notify(e,'Не удалось отправить комментарий')}finally{t.submitting=false}};
const startReply=(id,c)=>{thread(id).replyTo=c;thread(id).replyDraft=''};const cancelReply=id=>{thread(id).replyTo=null;thread(id).replyDraft=''};
const submitReply=async(p,parent)=>{const t=thread(p.id),text=t.replyDraft.trim();if(!text||t.submitting)return;t.submitting=true;try{const r=await feedApi.createComment(p.id,text,parent.id);parent.replies=[...(parent.replies||[]),r];cancelReply(p.id);p.commentsCount=(p.commentsCount||0)+1}catch(e){notify(e,'Не удалось отправить ответ')}finally{t.submitting=false}};
const startEdit=c=>{editingId.value=c.id;editText.value=c.text||''};const cancelEdit=()=>{editingId.value=null;editText.value=''};
const saveEdit=async(_p,c)=>{const text=editText.value.trim();if(!text||actionId.value)return;actionId.value=c.id;try{Object.assign(c,await feedApi.updateComment(c.id,text)||{},{text});cancelEdit()}catch(e){notify(e,'Не удалось изменить комментарий')}finally{actionId.value=null}};
const removeComment=async(p,c)=>{if(!confirm('Удалить комментарий? Ответы на него сохранятся.'))return;actionId.value=c.id;try{await feedApi.deleteComment(c.id);c.deleted=true;c.text=null;p.commentsCount=Math.max(0,(p.commentsCount||0)-1)}catch(e){notify(e,'Не удалось удалить комментарий')}finally{actionId.value=null}};
const openDetail=p=>{imageModal.value=p;document.body.style.overflow='hidden';const t=thread(p.id);if(!t.loaded)loadComments(p,true)};
const closeDetail=()=>{imageModal.value=null;document.body.style.overflow=''};
const notify=(e,f)=>window.$toast?.error(getApiErrorMessage(e,f),'Ошибка');const isOwn=c=>c.author?.username===auth.getUsername;const initial=u=>(u||'?').trim()[0].toUpperCase();
const plural=(n,w)=>n%100>=11&&n%100<=19?w[2]:n%10===1?w[0]:n%10>=2&&n%10<=4?w[1]:w[2];const commentsLabel=(n=0)=>`${n} ${plural(n,['комментарий','комментария','комментариев'])}`;
const likesLabel=(n=0)=>`${n} ${plural(n,['лайк','лайка','лайков'])}`;
function formatDate(v,compact=false){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('ru-RU',compact?{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}:{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)}
const imageError=e=>{e.target.src='/placeholder-photo.svg'};const onKeydown=e=>{if(e.key==='Escape'&&imageModal.value)closeDetail()};onMounted(()=>{window.addEventListener('keydown',onKeydown);refreshFeed()});onBeforeUnmount(()=>{window.removeEventListener('keydown',onKeydown);document.body.style.overflow=''});
</script>

<style scoped>
.feed-page{position:relative;z-index:1;width:100%;max-width:860px;margin:auto}.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}.page-header h1{display:flex;align-items:center;gap:.65rem;margin:0}.page-header h1 svg{width:28px;color:#60a5fa}.refresh{display:flex;align-items:center;gap:.5rem;padding:.6rem .85rem;color:#93c5fd;background:#2563eb1f;border:1px solid #60a5fa59;border-radius:9px;cursor:pointer}.refresh svg{width:17px}.refresh:disabled{opacity:.6}.feed-list{display:grid;gap:1.5rem}.feed-card{overflow:hidden;background:#111827f7;border:1px solid #60a5fa40;border-radius:16px;box-shadow:0 16px 45px #00000047}.photo-header{display:flex;align-items:center;gap:.75rem;padding:1rem 1.15rem}.avatar,.comment-avatar{display:grid;flex:0 0 auto;place-items:center;width:42px;height:42px;border-radius:50%;color:#fff;font-weight:700;background:linear-gradient(135deg,#2563eb,#7c3aed)}.author{display:flex;min-width:0;flex:1;flex-direction:column;line-height:1.35}.author strong{overflow:hidden;color:#e0e7ff;text-overflow:ellipsis}.author time{color:#64748b;font-size:.78rem}.assembly{display:flex;align-items:center;gap:.35rem;max-width:45%;padding:.35rem .6rem;overflow:hidden;border:1px solid #60a5fa40;border-radius:99px;color:#93c5fd;font-size:.75rem;white-space:nowrap;text-overflow:ellipsis}.assembly svg{width:14px}.photo-frame{position:relative;min-height:260px;max-height:620px;overflow:hidden;background:#030712}.photo-frame img{display:block;width:100%;max-height:620px;object-fit:contain;cursor:zoom-in}.photo-frame button{position:absolute;right:.75rem;bottom:.75rem;display:grid;place-items:center;width:38px;height:38px;color:#fff;background:#030712b8;border:1px solid #ffffff40;border-radius:9px;cursor:pointer}.photo-frame button svg{width:18px}.photo-content{padding:1.15rem}.photo-content h2{margin:0 0 .45rem;font-size:1.22rem;overflow-wrap:anywhere}.description{color:#cbd5e1;white-space:pre-wrap;overflow-wrap:anywhere}.metadata{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.9rem}.metadata div{display:flex;gap:.35rem;padding:.3rem .55rem;background:#3b82f61a;border-radius:7px;font-size:.78rem}.metadata dt{color:#64748b}.metadata dd{color:#bfdbfe;font-weight:600}.comments-toggle{display:flex;align-items:center;width:100%;gap:.5rem;margin-top:1rem;padding-top:.85rem;color:#93c5fd;background:none;border:0;border-top:1px solid #94a3b81f;cursor:pointer}.comments-toggle svg{width:18px}.comments-toggle svg:last-child{margin-left:auto;transition:.2s}.comments-toggle .rotated{transform:rotate(180deg)}.comments-section{padding:1rem 1.15rem 1.2rem;background:#03071252;border-top:1px solid #60a5fa26}.comment-form{display:flex;align-items:flex-end;gap:.65rem;margin-bottom:1rem}textarea{width:100%;resize:vertical;min-height:44px;max-height:180px;padding:.7rem .8rem;color:#e2e8f0;background:#0b1120;border:1px solid #60a5fa4d;border-radius:9px;font:inherit;line-height:1.35}textarea:focus{outline:none;border-color:#60a5fa;box-shadow:0 0 0 2px #60a5fa26}.comment-form>button{display:flex;align-items:center;gap:.4rem;min-height:44px;padding:.65rem .9rem;color:#fff;background:#2563eb;border:0;border-radius:9px;cursor:pointer}.comment-form>button svg{width:16px}.comment-form>button:disabled{opacity:.5}.comment-list{display:grid;gap:1rem}.comment{display:flex;gap:.7rem;min-width:0}.comment-avatar{width:32px;height:32px;font-size:.78rem}.comment-body{min-width:0;flex:1;padding:.65rem .75rem;background:#1e293b8c;border-radius:0 10px 10px}.comment-meta{display:flex;align-items:baseline;flex-wrap:wrap;gap:.45rem;margin-bottom:.25rem;font-size:.75rem}.comment-meta strong{color:#bfdbfe;font-size:.82rem}.comment-meta time,.comment-meta span{color:#64748b}.comment-body p{color:#cbd5e1;overflow-wrap:anywhere;white-space:pre-wrap}.comment-body p.deleted{color:#64748b;font-style:italic}.comment-actions{display:flex;gap:.7rem;margin-top:.4rem}.comment-actions button,.inline-actions button,.comments-state button,.load-comments{color:#93c5fd;background:none;border:0;cursor:pointer;font-size:.75rem}.comment-actions .danger{color:#fca5a5}.reply,.reply-form{margin:.65rem 0 0 2.45rem}.edit-form textarea,.reply-form textarea{min-height:60px}.inline-actions{display:flex;gap:.75rem;margin-top:.35rem}.comments-state{display:flex;align-items:center;justify-content:center;gap:.55rem;padding:1.5rem;color:#64748b;text-align:center}.comments-state.error,.inline-error{color:#fca5a5}.load-comments{display:block;margin:1rem auto 0;padding:.55rem}.state{display:flex;min-height:260px;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;padding:2rem;color:#94a3b8;background:#111827;border:1px solid #60a5fa40;border-radius:16px;text-align:center}.state>svg{width:38px;color:#60a5fa}.state h2{margin:0}.state.error>svg{color:#fca5a5}.load-more{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;margin-top:1.25rem;padding:.8rem;color:#bfdbfe;background:#2563eb1f;border:1px solid #60a5fa4d;border-radius:10px;cursor:pointer}.feed-end,.inline-error{margin-top:1.25rem;text-align:center;font-size:.85rem}.image-modal{position:fixed;z-index:2000;inset:0;display:grid;grid-template-rows:1fr auto;place-items:center;padding:3rem 1rem 1rem;background:#000000eb;backdrop-filter:blur(8px)}.image-modal>button{position:absolute;top:1rem;right:1rem;display:grid;place-items:center;width:42px;height:42px;color:#fff;background:#1e293bb3;border:1px solid #475569;border-radius:50%;cursor:pointer}.image-modal img{max-width:100%;max-height:calc(100vh - 110px);object-fit:contain}.image-modal div{display:flex;gap:.75rem;align-items:baseline;padding-top:.75rem}.image-modal span{color:#94a3b8}.spinner{display:block;width:34px;height:34px;border:3px solid #60a5fa33;border-top-color:#60a5fa;border-radius:50%;animation:spin .8s linear infinite}.spinner.small{width:18px;height:18px;border-width:2px}.spinning{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.photo-content{padding:.85rem 1.15rem}.description{margin:0;color:#cbd5e1;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.comments-toggle{margin-top:0;padding-top:0;border-top:0}.description+.comments-toggle{margin-top:.85rem;padding-top:.75rem;border-top:1px solid #94a3b81f}.image-modal{display:flex;align-items:center;justify-content:center}
.engagement-actions{display:flex;align-items:center;gap:1rem;margin-top:.85rem;padding-top:.75rem;border-top:1px solid #94a3b81f}.engagement-actions .comments-toggle{flex:1}.like-button{display:inline-flex;align-items:center;gap:.45rem;padding:.35rem 0;color:#94a3b8;background:none;border:0;cursor:pointer;font:inherit;font-size:.9rem}.like-button svg{width:19px}.like-button.liked{color:#fb7185}.like-button:disabled{opacity:.55;cursor:wait}.detail-scroll .photo-content>.like-button{margin-top:.85rem}
.assembly-like{display:inline-flex;flex:0 0 auto;align-items:center;gap:.25rem;padding:.35rem .5rem;color:#94a3b8;background:transparent;border:1px solid #94a3b840;border-radius:99px;cursor:pointer;font-size:.75rem}.assembly-like svg{width:15px;height:15px}.assembly-like.liked{color:#fb7185;border-color:#fb718580;background:#fb718514}.assembly-like:disabled{opacity:.55;cursor:wait}
.assembly{background:transparent;cursor:pointer}.assembly svg:last-child{margin-left:.1rem;transition:transform .2s}.assembly svg:last-child.rotated{transform:rotate(180deg)}.assembly-panel{padding:1rem 1.15rem;background:#0b1324;border-top:1px solid #60a5fa26}.assembly-panel h3{margin:0 0 .35rem;color:#e0e7ff;font-size:1rem;text-shadow:none}.assembly-description{margin:0 0 .9rem;color:#cbd5e1;font-size:.9rem;white-space:pre-wrap}.assembly-panel h4{margin:0 0 .55rem;color:#94a3b8;font-size:.85rem}.assembly-details{display:grid;gap:.55rem}.assembly-detail{display:flex;align-items:baseline;flex-wrap:wrap;gap:.4rem;color:#cbd5e1;font-size:.85rem}.assembly-detail strong{color:#e2e8f0}.detail-type{padding:.12rem .38rem;color:#bfdbfe;background:#3b82f61a;border-radius:4px;font-size:.72rem;font-weight:600}.detail-note,.assembly-empty{color:#94a3b8}.assembly-empty{margin:0;font-size:.85rem}.assembly-panel-state{display:flex;align-items:center;justify-content:center;gap:.55rem;min-height:70px;color:#94a3b8}.assembly-panel-state.error{flex-wrap:wrap;color:#fca5a5}.assembly-panel-state button{color:#93c5fd;background:none;border:0;cursor:pointer}
@media(max-width:640px){.page-header{align-items:center}.page-header h1{font-size:1.45rem}.page-subtitle{font-size:.85rem}.refresh{width:42px;height:42px;justify-content:center;padding:0}.refresh span{display:none}.feed-list{gap:1rem}.feed-card{border-radius:12px}.photo-header,.photo-content,.comments-section{padding-left:.85rem;padding-right:.85rem}.photo-frame{min-height:180px}.assembly{max-width:38%}.avatar{width:38px;height:38px}.comment-form{align-items:stretch}.comment-form>button{width:44px;justify-content:center;padding:0}.comment-form>button span{display:none}.reply,.reply-form{margin-left:1.25rem}.comment-body{padding:.55rem .65rem}}
.photo-frame{max-height:none}.photo-frame>button{top:.75rem;bottom:auto}.photo-frame :deep(.artifact-image img){max-height:none;cursor:zoom-in;object-fit:initial}.feed-detail-overlay{position:fixed;z-index:2000;inset:0;display:flex;align-items:center;justify-content:center;padding:1.25rem;background:#000000eb;backdrop-filter:blur(8px)}.detail-card{display:flex;flex-direction:column;width:min(1000px,100%);max-height:calc(100dvh - 2.5rem);min-height:0;overflow:hidden;background:#111827;border:1px solid #475569;border-radius:15px;box-shadow:0 25px 80px #000}.detail-card>.photo-header{flex:0 0 auto;border-bottom:1px solid #334155}.modal-close{display:grid;flex:0 0 42px;place-items:center;width:42px;height:42px;color:#fff;background:#1e293b;border:1px solid #475569;border-radius:50%;cursor:pointer}.modal-close svg{width:20px}.detail-scroll{min-height:0;overflow-x:hidden;overflow-y:auto}.detail-scroll :deep(.artifact-viewer){width:100%;overflow:hidden}.detail-scroll :deep(.artifact-image){width:fit-content;max-width:100%;margin:0 auto}.detail-scroll :deep(.artifact-image img){display:block;width:auto;max-width:100%;max-height:min(62dvh,680px);cursor:default;object-fit:contain}.detail-scroll :deep(.object-list){width:100%}.detail-comments h3{display:flex;align-items:center;gap:.5rem;margin:0 0 1rem;text-shadow:none}.detail-comments h3 svg{width:19px}@media(max-width:640px){.feed-detail-overlay{align-items:flex-end;padding:0}.detail-card{max-height:96dvh;border-radius:14px 14px 0 0}.detail-scroll :deep(.artifact-image img){max-height:55dvh}.detail-card>.photo-header{padding:.75rem}.detail-comments{padding:.9rem}.detail-comments .reply,.detail-comments .reply-form{margin-left:.75rem}}
.feed-detail-overlay{z-index:10000}.detail-card>.photo-header{position:sticky;z-index:2;top:0;background:#111827}@media(max-width:640px){.detail-card{max-height:100dvh}}
</style>
