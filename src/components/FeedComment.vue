<template>
  <div :class="['comment', { reply: isReply }]">
    <span class="comment-avatar">{{ initial(comment.author?.username) }}</span>
    <div class="comment-body">
      <div class="comment-meta">
        <strong>{{ comment.author?.username || 'Пользователь' }}</strong>
        <time>{{ formatDate(comment.createdAt) }}</time>
        <span v-if="comment.updatedAt && comment.updatedAt !== comment.createdAt">изменён</span>
      </div>
      <form v-if="editingId === comment.id" class="edit-form" @submit.prevent="$emit('save')">
        <textarea :value="editText" maxlength="2000" rows="2" @input="$emit('edit-text', $event.target.value)"></textarea>
        <div class="inline-actions">
          <button :disabled="busyId === comment.id || !editText.trim()">Сохранить</button>
          <button type="button" @click="$emit('cancel')">Отмена</button>
        </div>
      </form>
      <p v-else :class="{ deleted: comment.deleted }">{{ comment.deleted ? 'Комментарий удалён' : comment.text }}</p>
      <div v-if="!comment.deleted" class="comment-actions">
        <button v-if="!isReply" @click="$emit('reply')">Ответить</button>
        <button v-if="own" @click="$emit('edit', comment)">Изменить</button>
        <button v-if="own" class="danger" :disabled="busyId === comment.id" @click="$emit('remove')">Удалить</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  comment: { type: Object, required: true }, own: Boolean,
  editingId: [Number, String], editText: { type: String, default: '' },
  busyId: [Number, String], isReply: Boolean
});
defineEmits(['edit', 'edit-text', 'save', 'cancel', 'remove', 'reply']);
const initial = username => (username || '?').trim().charAt(0).toUpperCase();
const formatDate = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
};
</script>

<style scoped>
.comment { display: flex; gap: .7rem; min-width: 0; }
.comment-avatar { display: grid; flex: 0 0 auto; place-items: center; width: 32px; height: 32px; border-radius: 50%; color: #fff; font-size: .78rem; font-weight: 700; background: linear-gradient(135deg,#2563eb,#7c3aed); }
.comment-body { min-width: 0; flex: 1; padding: .65rem .75rem; background: rgba(30,41,59,.55); border-radius: 0 10px 10px; }
.comment-meta { display: flex; align-items: baseline; flex-wrap: wrap; gap: .45rem; margin-bottom: .25rem; font-size: .75rem; }
.comment-meta strong { color: #bfdbfe; font-size: .82rem; }.comment-meta time,.comment-meta span { color: #64748b; }
.comment-body p { color: #cbd5e1; overflow-wrap: anywhere; white-space: pre-wrap; }.comment-body p.deleted { color: #64748b; font-style: italic; }
.comment-actions { display: flex; gap: .7rem; margin-top: .4rem; }.comment-actions button,.inline-actions button { color: #93c5fd; background: none; border: 0; cursor: pointer; font-size: .75rem; }.comment-actions .danger { color: #fca5a5; }
textarea { width: 100%; min-height: 60px; resize: vertical; padding: .7rem .8rem; color: #e2e8f0; background: #0b1120; border: 1px solid rgba(96,165,250,.3); border-radius: 9px; font: inherit; }
textarea:focus { outline: none; border-color: #60a5fa; }.inline-actions { display: flex; gap: .75rem; margin-top: .35rem; }
@media(max-width:640px){.comment-body{padding:.55rem .65rem}}
</style>
