import { defineStore } from 'pinia';
import userProfileApi from '@/services/userProfile';
import { appConfig } from '@/config/appConfig';
import { logger } from '@/utils/logger';

const toBase64Url = (bytes) => btoa(String.fromCharCode.apply(null, bytes))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

export const useAuthStore = defineStore('auth', {
  state: () => ({
    authenticated: false,
    isInitialized: false,
    isRedirecting: false,
    token: null,
    refreshToken: null,
    userInfo: null,
    userProfile: null,
    isProfileLoading: false,
    expiresAt: null,
    refreshTimer: null
  }),

  getters: {
    getUsername: (state) => state.userInfo?.preferred_username
      || state.userInfo?.given_name
      || state.userInfo?.email?.split('@')[0]
      || 'Гость',
    getDisplayName: (state) => state.userInfo?.preferred_username
      || state.userInfo?.given_name
      || state.userInfo?.email?.split('@')[0]
      || 'Гость'
  },

  actions: {
    async login() {
      if (this.isRedirecting) return;
      this.isRedirecting = true;

      logger.debug('Starting login with PKCE');
      this.clearOAuthKeys();

      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = this.generateState();
      const nonce = this.generateNonce();

      sessionStorage.setItem('oauth_code_verifier', codeVerifier);
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_nonce', nonce);

      const clientId = appConfig.keycloakClientId;
      const redirectUri = encodeURIComponent(`${window.location.origin}/callback`);
      const scope = 'openid profile email offline_access';

      const authUrl = `${appConfig.keycloakUrl}/realms/${appConfig.keycloakRealm}/protocol/openid-connect/auth?`
        + `client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
        + `&state=${state}&nonce=${nonce}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      window.location.href = authUrl;
    },

    async handleCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      const savedState = sessionStorage.getItem('oauth_state');
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

      logger.debug('OAuth callback state', {
        codePresent: Boolean(code),
        stateMatches: Boolean(state && savedState && state === savedState),
        verifierPresent: Boolean(codeVerifier)
      });

      try {
        if (error) {
          throw new Error(`OAuth error: ${error} - ${urlParams.get('error_description') || ''}`);
        }
        if (!code) throw new Error('No authorization code in URL');
        if (!state || !savedState || state !== savedState) throw new Error('Invalid OAuth state');
        if (!codeVerifier) throw new Error('No code_verifier found');

        this.clearOAuthKeys();
        window.history.replaceState({}, '', '/');

        const res = await fetch(`${appConfig.authApiUrl}/auth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, codeVerifier, redirectUri: `${window.location.origin}/callback` })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Token exchange failed');
        if (!data.expires_in || typeof data.expires_in !== 'number') throw new Error('Invalid expires_in');

        this.expiresAt = Date.now() + data.expires_in * 1000;
        this.token = data.access_token;
        this.refreshToken = data.refresh_token;
        this.userInfo = data.userInfo;
        this.authenticated = true;
        this.isRedirecting = false;

        sessionStorage.setItem('access_token', data.access_token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
        sessionStorage.setItem('expires_at', this.expiresAt.toString());
        sessionStorage.setItem('user_info', JSON.stringify(data.userInfo));

        this.startSilentRefresh();
      } catch (err) {
        this.clearOAuthKeys();
        window.history.replaceState({}, '', '/');
        logger.error('Auth callback failed:', err);
        this.clear();
        throw err;
      }
    },

    async ensureValidToken() {
      if (this.token && this.expiresAt && Date.now() < this.expiresAt - 5000) return this.token;
      if (this.refreshToken) {
        await this.refreshTokens();
        return this.token;
      }
      this.authenticated = false;
      throw new Error('Session expired');
    },

    async refreshTokens() {
      if (!this.refreshToken) throw new Error('No refresh token');
      try {
        const res = await fetch(`${appConfig.authApiUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Refresh failed');

        this.token = data.access_token;
        this.refreshToken = data.refresh_token;
        this.expiresAt = Date.now() + data.expires_in * 1000;
        this.userInfo = data.userInfo;

        sessionStorage.setItem('access_token', data.access_token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
        sessionStorage.setItem('expires_at', this.expiresAt.toString());
        sessionStorage.setItem('user_info', JSON.stringify(data.userInfo));
        logger.debug('Token refreshed');
      } catch (err) {
        logger.error('Refresh failed:', err);
        this.clear();
        throw err;
      }
    },

    async initAuth() {
      if (this.isInitialized) return;
      try {
        const t = sessionStorage.getItem('access_token');
        const rt = sessionStorage.getItem('refresh_token');
        const exp = sessionStorage.getItem('expires_at');
        const ui = sessionStorage.getItem('user_info');

        if (t && rt && exp) {
          const expiresAt = parseInt(exp, 10);
          if (!Number.isNaN(expiresAt)) {
            this.token = t;
            this.refreshToken = rt;
            this.expiresAt = expiresAt;
            if (ui) this.userInfo = JSON.parse(ui);

            if (Date.now() < expiresAt - 5000) {
              this.authenticated = true;
            } else {
              await this.refreshTokens();
              this.authenticated = true;
            }
          }
        }
      } catch (err) {
        logger.error('initAuth error:', err);
        this.clear();
      } finally {
        this.isInitialized = true;
      }
    },

    startSilentRefresh() {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      const delay = this.expiresAt - Date.now() - 30000;
      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshTokens();
          this.startSilentRefresh();
        } catch {
          this.logout();
        }
      }, Math.max(delay, 1000));
    },

    clearOAuthKeys() {
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_nonce');
      sessionStorage.removeItem('oauth_code_verifier');
    },

    clear() {
      this.authenticated = false;
      this.token = null;
      this.refreshToken = null;
      this.userInfo = null;
      this.expiresAt = null;
      this.isRedirecting = false;
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('expires_at');
      sessionStorage.removeItem('user_info');
    },

    async loadOrCreateProfile() {
      if (this.isProfileLoading || this.userProfile) return;

      this.isProfileLoading = true;

      try {
        const result = await userProfileApi.getProfile();

        if (result.success) {
          this.userProfile = result.data;
        } else if (result.error === 'NOT_FOUND') {
          this.userProfile = await userProfileApi.createProfile();
        }
      } catch (err) {
        logger.error('Failed to load/create profile:', err);
        throw err;
      } finally {
        this.isProfileLoading = false;
      }
    },

    logout() {
      this.clear();

      const clientId = appConfig.keycloakClientId;
      const postLogoutRedirectUri = encodeURIComponent(`${window.location.origin}`);

      const logoutUrl = `${appConfig.keycloakUrl}/realms/${appConfig.keycloakRealm}/protocol/openid-connect/logout?`
        + `client_id=${clientId}`
        + `&post_logout_redirect_uri=${postLogoutRedirectUri}`;

      window.location.href = logoutUrl;
    },

    generateRandomBase64Url(length = 32) {
      const arr = new Uint8Array(length);
      crypto.getRandomValues(arr);
      return toBase64Url(arr);
    },

    generateState() { return this.generateRandomBase64Url(32); },
    generateNonce() { return this.generateRandomBase64Url(32); },
    generateCodeVerifier() { return this.generateRandomBase64Url(64); },

    async generateCodeChallenge(verifier) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      return toBase64Url(new Uint8Array(digest));
    }
  }
});
