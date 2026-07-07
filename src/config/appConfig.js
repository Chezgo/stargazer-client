const runtimeConfig = () => window.__APP_CONFIG__ || {};

export const getAppConfig = (key) => runtimeConfig()[key] || import.meta.env[`VITE_${key}`];

export const appConfig = {
  get keycloakUrl() { return getAppConfig('KEYCLOAK_URL'); },
  get keycloakRealm() { return getAppConfig('KEYCLOAK_REALM'); },
  get keycloakClientId() { return getAppConfig('KEYCLOAK_CLIENT_ID'); },
  get authApiUrl() { return getAppConfig('AUTH_API_URL'); },
  get apiBaseUrl() { return getAppConfig('API_BASE_URL'); }
};
