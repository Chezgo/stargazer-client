# План исправлений Stargazer Client

Документ составлен по итогам ревью Vue/Vite SPA. Цель: привести проект к более надежному состоянию для production-деплоя на Ubuntu-сервере и заранее подготовить интерфейс к UI-автотестам.

## 1. Критичные исправления безопасности авторизации

### 1.1. Жестко проверять OAuth `state`

**Файл:** `src/stores/auth.js`

Сейчас при несовпадении `state` авторизация продолжается. Это нужно исправить в первую очередь.

Шаги:

1. В `handleCallback()` заменить warning на выброс ошибки.
2. Проверять не только несовпадение, но и отсутствие `state` или `savedState`.
3. Очищать временные OAuth-ключи только после чтения и фиксации ошибки.
4. После ошибки показывать пользователю понятный сценарий: повторить вход.

Ожидаемый результат:

```js
if (!state || !savedState || state !== savedState) {
  throw new Error('Invalid OAuth state');
}
```

### 1.2. Перейти на криптографически стойкие `state` и `nonce`

**Файл:** `src/stores/auth.js`

Сейчас `generateState()` и `generateNonce()` используют `Math.random()`. Для OAuth лучше использовать `crypto.getRandomValues()`.

Шаги:

1. Сделать общий helper `generateRandomBase64Url(length = 32)`.
2. Использовать его для `generateState()`, `generateNonce()` и можно для `generateCodeVerifier()`.
3. Убедиться, что значения URL-safe.

### 1.3. Пересмотреть хранение refresh token

**Файл:** `src/stores/auth.js`

Сейчас `refresh_token` хранится в `sessionStorage`. Это рабочий вариант для pet/internal проекта, но рискованный для публичного сервиса.

План миграции:

1. Краткосрочно: уменьшить время жизни access token и убрать лишние `console.log` с auth-данными.
2. Среднесрочно: перенести refresh token на backend.
3. Сделать refresh через `HttpOnly; Secure; SameSite=Lax/Strict` cookie.
4. В SPA хранить только состояние пользователя и короткоживущий access token в памяти.
5. Добавить endpoint на backend для `/auth/session`, чтобы фронт мог восстановить сессию без чтения refresh token.

## 2. Стабилизация зависимостей

### 2.1. Уйти с beta/RC версий Vue-стека

**Файлы:** `package.json`, `package-lock.json`

Сейчас используются `vue: beta`, `vue-router: ^5.0.4`, `vite: ^8.0.8`. Для production лучше закрепиться на стабильных версиях.

Шаги:

1. Заменить Vue на стабильную ветку Vue 3.
2. Заменить `vue-router` на стабильную ветку Vue Router 4.
3. Убрать `overrides` с `beta` пакетами Vue.
4. Проверить совместимость `@vitejs/plugin-vue`.
5. Выполнить чистую установку зависимостей.
6. Запустить `npm run build`.
7. Проверить авторизацию, роутинг, сборки, наблюдения и модальные окна.

Пример целевого направления:

```json
{
  "dependencies": {
    "vue": "^3.x",
    "vue-router": "^4.x"
  }
}
```

Точные версии лучше выбрать при обновлении, ориентируясь на актуальные стабильные релизы.

### 2.2. Отключить Vue Devtools plugin в production build

**Файл:** `vite.config.js`

Шаги:

1. Оставить `vueDevTools()` только для dev-режима.
2. Сделать конфиг через `defineConfig(({ mode }) => ({ ... }))`.
3. Проверить, что production bundle не содержит devtools-интеграции.

## 3. Runtime-баги интерфейса

### 3.1. Исправить getter имени пользователя в header

**Файл:** `src/components/AppHeader.vue`

Сейчас используется `authStore.getDisplayName`, но в store есть `getUsername`.

Шаги:

1. Заменить `authStore.getDisplayName` на `authStore.getUsername`.
2. Либо добавить getter `getDisplayName` в `src/stores/auth.js`.
3. Проверить header после входа.

Рекомендуемый быстрый фикс:

```vue
<span class="username">{{ authStore.getUsername }}</span>
```

### 3.2. Добавить отсутствующий placeholder для фото

**Файл:** `public/placeholder-photo.svg`

Сейчас `MyObservations.vue` использует `/placeholder-photo.svg`, но файла нет.

Шаги:

1. Добавить SVG-заглушку в `public/placeholder-photo.svg`.
2. Проверить карточку фото при ошибке presigned URL.
3. Проверить детальную модалку фото.

### 3.3. Исправить очистку file input

**Файл:** `src/views/MyObservations.vue`

Сейчас `clearSelectedFile()` ищет `.file-input`, но input имеет класс `hidden-file-input` и уже есть `fileInputRef`.

Шаги:

1. Убрать `document.querySelector('.file-input')`.
2. Использовать `fileInputRef.value`.
3. После удаления файла сбрасывать `selectedFile`, `uploadPreview`, `uploadError`.

Пример:

```js
if (fileInputRef.value) {
  fileInputRef.value.value = '';
}
```

### 3.4. Проверить тип `selectedGoalId`

**Файлы:** `src/composables/useAssemblyEvaluation.js`, `src/views/assemblies/AssemblyGoalsPanel.vue`

`selectedGoalId` хранится как строка, а `goal.id` может приходить числом. Это может ломать `find(g => g.id === selectedGoalId.value)`.

Шаги:

1. Выбрать единый тип: строка или число.
2. Если ID числовой, использовать `Number(event.target.value)` для выбранной цели.
3. Для свободной сборки оставить `null` или пустую строку, но единообразно.
4. Обновить сравнения и запрос `evaluateAssembly`.

## 4. API и обработка запросов

### 4.1. Использовать общий axios-инстанс для upload

**Файлы:** `src/services/userPhotos.js`, `src/services/api.js`

Сейчас upload создает отдельный `axios.create()` и обходит общий refresh/401 interceptor.

Шаги:

1. Переписать `uploadPhoto()` на общий `api.post(...)`.
2. Не задавать вручную `Content-Type: multipart/form-data`, чтобы браузер сам добавил boundary.
3. Перед upload вызывать общий interceptor или `authStore.ensureValidToken()`.
4. Проверить upload с почти истекшим access token.

Пример направления:

```js
return api.post(url, formData, { onUploadProgress });
```

### 4.2. Централизовать обработку ошибок

**Файлы:** `src/services/api.js`, views/composables

Сейчас ошибки часто обрабатываются через `alert()` или локальные `toast`.

Шаги:

1. Сделать единый helper для получения текста ошибки.
2. Постепенно заменить `alert()` на toast-компонент.
3. Для 401 не всегда сразу делать `logout()`: сначала пробовать refresh, если это применимо.
4. Добавить обработку network error без `response`.

### 4.3. Убрать лишние production-логи

**Файлы:** `src/stores/auth.js`, `src/views/*`, `src/composables/*`

Шаги:

1. Оставить подробные auth-логи только в dev.
2. Не логировать profile/userInfo целиком.
3. Сделать маленький logger helper, который пишет debug только при `import.meta.env.DEV`.

## 5. Docker и деплой на Ubuntu

### 5.1. Добавить `.dockerignore`

**Файл:** `.dockerignore`

Минимальный список:

```gitignore
node_modules
dist
.git
.env
.env.*
npm-debug.log*
Dockerfile
docker-compose.yml
README.md
```

Важно: если `Dockerfile` и `docker-compose.yml` нужны внутри build context, их не добавлять в ignore. Для текущей сборки они не нужны после старта build, но можно оставить их неигнорируемыми для простоты.

### 5.2. Заменить `npm install` на `npm ci`

**Файл:** `Dockerfile`

Шаги:

1. Заменить `RUN npm install` на `RUN npm ci`.
2. Убедиться, что `package-lock.json` актуален.
3. Проверить `docker compose build --no-cache`.

### 5.3. Продумать runtime config

**Файлы:** `Dockerfile`, `docker-compose.yml`, `nginx.conf`, возможно `public/config.js`

Сейчас `VITE_*` переменные запекаются на этапе сборки. Это нормально, если image пересобирается под окружение. Если нужен один image для dev/stage/prod, нужен runtime config.

Шаги:

1. Создать `public/config.js` с `window.__APP_CONFIG__`.
2. В Docker entrypoint генерировать этот файл из environment variables.
3. В приложении читать config из `window.__APP_CONFIG__`, а не только из `import.meta.env`.
4. Отключить кеширование `config.js` в nginx.

### 5.4. Усилить nginx config

**Файл:** `nginx.conf`

Шаги:

1. Добавить security headers.
2. Настроить `client_max_body_size`, если upload идет через этот nginx.
3. Проверить, где завершается HTTPS: в этом контейнере или внешнем reverse proxy.
4. Если HTTPS завершается снаружи, HSTS добавлять во внешнем nginx.

Пример базовых headers:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

CSP нужно настраивать осторожно, учитывая Keycloak, API и домены изображений.

### 5.5. Проверить docker-compose сеть

**Файл:** `docker-compose.yml`

Сейчас используется external network `monitoring`.

Шаги:

1. Убедиться, что сеть существует на сервере.
2. Если сеть нужна не только для monitoring, переименовать ее более предметно.
3. Если сервис за reverse proxy, не публиковать порт `80` наружу без необходимости.
4. Использовать `127.0.0.1:${APP_PORT:-8080}:80`, если доступ должен идти только через локальный proxy.

## 6. Подготовка к UI-автотестам

Рекомендация: использовать `data-testid`, а не `id`.  
`id` участвует в CSS, якорях и может конфликтовать. `data-testid` почти не влияет на приложение и удобнее для Playwright/Cypress.

Формат:

```html
data-testid="page-observations"
data-testid="btn-upload-photo"
data-testid="input-assembly-name"
```

Правила:

1. Селекторы должны быть стабильными и не зависеть от текста на экране.
2. Не использовать auto-generated ID.
3. Не привязываться к CSS-классам.
4. Для повторяющихся элементов добавлять ID сущности в отдельный атрибут: `data-entity-id`.
5. Для таблиц и списков использовать контейнер, item и actions.

### 6.1. Общий layout

**Файлы:** `src/App.vue`, `src/components/AppHeader.vue`, `src/components/AppSidebar.vue`, `src/components/AppFooter.vue`, `src/components/Toast.vue`

Добавить:

```html
data-testid="app-root"
data-testid="app-loading"
data-testid="app-auth-redirect"
data-testid="app-header"
data-testid="app-logo"
data-testid="header-username"
data-testid="btn-logout"
data-testid="app-sidebar"
data-testid="nav-profile"
data-testid="nav-assemblies"
data-testid="nav-observations"
data-testid="nav-feed"
data-testid="app-footer"
data-testid="toast-container"
data-testid="toast-item"
data-testid="toast-close"
```

### 6.2. Callback авторизации

**Файл:** `src/views/Callback.vue`

Добавить:

```html
data-testid="page-callback"
data-testid="callback-spinner"
data-testid="callback-message"
```

### 6.3. Profile

**Файл:** `src/views/Profile.vue`

Добавить:

```html
data-testid="page-profile"
data-testid="profile-loading"
data-testid="profile-content"
data-testid="profile-avatar"
data-testid="profile-display-name"
data-testid="profile-email"
data-testid="profile-email-verified"
data-testid="profile-error"
data-testid="btn-profile-retry"
data-testid="quick-link-assemblies"
data-testid="quick-link-observations"
data-testid="quick-link-feed"
```

### 6.4. Assemblies list

**Файл:** `src/views/Assemblies.vue`

Добавить:

```html
data-testid="page-assemblies"
data-testid="btn-create-assembly"
data-testid="select-assemblies-sort"
data-testid="btn-assemblies-prev-page"
data-testid="btn-assemblies-next-page"
data-testid="assemblies-page-info"
data-testid="assemblies-loading"
data-testid="assemblies-error"
data-testid="btn-assemblies-retry"
data-testid="assemblies-table"
data-testid="assembly-row"
data-assembly-id="..."
data-testid="btn-edit-assembly"
data-testid="btn-delete-assembly"
data-testid="assemblies-empty"
```

Модалка создания/редактирования:

```html
data-testid="assembly-modal"
data-testid="assembly-modal-title"
data-testid="btn-close-assembly-modal"
data-testid="input-assembly-name"
data-testid="textarea-assembly-description"
data-testid="btn-cancel-assembly"
data-testid="btn-save-assembly"
```

### 6.5. Assembly detail

**Файл:** `src/views/assemblies/AssemblyDetail.vue`

Добавить:

```html
data-testid="page-assembly-detail"
data-testid="btn-back-assemblies"
data-testid="assembly-detail-title"
data-testid="assembly-detail-loading"
data-testid="assembly-detail-error"
data-testid="btn-retry-assembly-detail"
data-testid="assembly-info-card"
data-testid="btn-edit-current-assembly"
data-testid="btn-delete-current-assembly"
data-testid="assembly-two-column-layout"
```

Модалки:

```html
data-testid="edit-assembly-modal"
data-testid="edit-assembly-name"
data-testid="edit-assembly-description"
data-testid="btn-save-edit-assembly"
data-testid="edit-assembly-detail-modal"
data-testid="textarea-detail-note"
data-testid="readonly-selected-detail"
data-testid="btn-save-detail-note"
```

### 6.6. Assembly goals/evaluation panels

**Файлы:** `AssemblyGoalsPanel.vue`, `AssemblyEvaluationPanel.vue`

Добавить:

```html
data-testid="assembly-goals-panel"
data-testid="select-assembly-goal"
data-testid="assembly-goal-description"
data-testid="assembly-evaluation-summary"
data-testid="assembly-score"
data-testid="assembly-status"
data-testid="btn-show-checklist"
data-testid="assembly-evaluation-panel"
data-testid="checklist-item"
data-requirement-type="..."
data-status="..."
data-testid="btn-add-missing-type"
data-testid="btn-close-checklist"
```

### 6.7. Add detail panel

**Файл:** `src/views/assemblies/AddDetailPanel.vue`

Добавить:

```html
data-testid="add-detail-panel"
data-testid="btn-toggle-all-detail-groups"
data-testid="detail-type-group"
data-group-name="..."
data-testid="btn-toggle-detail-group"
data-testid="detail-type-button"
data-detail-type-id="..."
data-compatible="true|false"
```

### 6.8. Detail catalog modal

**Файл:** `src/views/assemblies/DetailCatalogModal.vue`

Добавить:

```html
data-testid="detail-catalog-modal"
data-testid="btn-close-detail-catalog"
data-testid="select-detail-brand"
data-testid="input-detail-search"
data-testid="btn-search-detail"
data-testid="btn-reset-detail-filters"
data-testid="detail-catalog-loading"
data-testid="detail-catalog-error"
data-testid="detail-catalog-card"
data-detail-id="..."
data-testid="btn-select-detail"
data-testid="btn-catalog-prev-page"
data-testid="btn-catalog-next-page"
data-testid="catalog-page-info"
```

### 6.9. My observations

**Файл:** `src/views/MyObservations.vue`

Добавить:

```html
data-testid="page-observations"
data-testid="btn-open-upload-photo"
data-testid="btn-observations-prev-page"
data-testid="btn-observations-next-page"
data-testid="observations-page-info"
data-testid="observations-total-count"
data-testid="observations-loading"
data-testid="observations-error"
data-testid="btn-observations-retry"
data-testid="photos-gallery"
data-testid="photo-card"
data-photo-id="..."
data-testid="photo-preview"
data-testid="photo-name"
data-testid="photo-file-size"
data-testid="photo-assembly-badge"
data-testid="photo-created-date"
data-testid="btn-open-photo-detail"
data-testid="btn-delete-photo"
data-testid="photos-empty"
```

Upload modal:

```html
data-testid="upload-photo-modal"
data-testid="btn-close-upload-modal"
data-testid="photo-drop-zone"
data-testid="btn-select-photo-file"
data-testid="input-photo-file"
data-testid="photo-upload-preview"
data-testid="btn-clear-selected-photo"
data-testid="select-photo-assembly"
data-testid="photo-upload-progress"
data-testid="btn-cancel-upload"
data-testid="btn-submit-upload"
```

Photo detail modal:

```html
data-testid="photo-detail-modal"
data-testid="btn-close-photo-detail"
data-testid="photo-detail-image"
data-testid="photo-detail-id"
data-testid="photo-detail-file-size"
data-testid="photo-detail-content-type"
data-testid="photo-detail-created-at"
data-testid="photo-detail-assembly"
data-testid="photo-detail-assembly-detail"
data-testid="btn-delete-photo-from-detail"
```

### 6.10. Feed

**Файл:** `src/views/Feed.vue`

Добавить базовые селекторы даже если страница пока простая:

```html
data-testid="page-feed"
data-testid="feed-loading"
data-testid="feed-error"
data-testid="feed-empty"
data-testid="feed-item"
```

## 7. Рекомендуемый порядок выполнения

1. Исправить OAuth `state`, генерацию `state/nonce`, header username и placeholder фото.
2. Добавить `.dockerignore`, заменить `npm install` на `npm ci`.
3. Переписать upload на общий API-клиент.
4. Добавить `data-testid` в layout и основные страницы.
5. Добавить `data-testid` в модалки, таблицы, карточки и панели сборок.
6. Стабилизировать зависимости Vue/Vite.
7. Усилить nginx и продумать runtime config.
8. Перенести refresh token на backend/cookie-схему.
9. После каждого блока запускать `npm run build`.
10. После добавления селекторов подключить первые smoke UI-тесты.

## 8. Минимальный набор smoke UI-тестов после добавления селекторов

1. Пользователь без сессии перенаправляется на авторизацию.
2. После callback открывается профиль.
3. Header показывает имя пользователя и кнопку выхода.
4. Открывается список сборок.
5. Создается новая сборка.
6. Открывается detail page сборки.
7. В сборку добавляется деталь из каталога.
8. Открывается страница наблюдений.
9. Открывается upload modal.
10. Ошибка загрузки фото показывает toast.
11. Карточка фото открывает detail modal.
12. Logout завершает сессию.

## 9. Definition of Done

Исправления можно считать завершенными, когда:

1. `npm run build` проходит локально и на Ubuntu-сервере.
2. Docker image собирается через `npm ci`.
3. Production image не зависит от локальных `node_modules` и `.env` в build context.
4. OAuth callback отклоняет неверный `state`.
5. Header показывает имя пользователя.
6. Галерея не показывает битые картинки при ошибке preview URL.
7. Upload использует общую auth-логику.
8. Основные страницы имеют стабильные `data-testid`.
9. Минимальные UI smoke-тесты могут выбирать элементы без CSS-классов и текста.
10. Никакие тестовые селекторы не ломают визуальный UI.
