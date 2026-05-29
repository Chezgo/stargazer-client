import { defineStore } from 'pinia';
import userProfileApi from '@/services/userProfile';

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
    getUsername: (state) => state.userInfo?.preferred_username || state.userInfo?.given_name || state.userInfo?.email?.split('@')[0] || 'Гость'
  },

  actions: {
    async login() {
      if (this.isRedirecting) return;
      this.isRedirecting = true;
      
      console.log('🔐 Starting login with PKCE');
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_nonce');
      sessionStorage.removeItem('oauth_code_verifier');

      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);

      const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
      const redirectUri = encodeURIComponent(`${window.location.origin}/callback`);
      const scope = 'openid profile email offline_access';
      const state = this.generateState();
      const nonce = this.generateNonce();

      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_nonce', nonce);

      const authUrl = `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/protocol/openid-connect/auth?` +
        `client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}` +
        `&state=${state}&nonce=${nonce}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      console.log('➡️ Redirecting to Keycloak');
      window.location.href = authUrl;
    },

    async handleCallback() {
      console.log('🔄 handleCallback: STARTED');
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      const savedState = sessionStorage.getItem('oauth_state');
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

      console.log('🔍 Debug:', {
        codePresent: !!code,
        stateUrl: state?.substring(0, 15),
        stateSaved: savedState?.substring(0, 15),
        match: state === savedState,
        verifier: !!codeVerifier
      });

      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_nonce');
      sessionStorage.removeItem('oauth_code_verifier');
      window.history.replaceState({}, '', '/');

      if (error) throw new Error(`OAuth error: ${error} - ${urlParams.get('error_description')}`);
      if (!code) throw new Error('No authorization code in URL');
      
      if (state !== savedState) {
        console.warn('⚠️ State mismatch detected. Likely race condition. Proceeding carefully...');
      }
      
      if (!codeVerifier) throw new Error('No code_verifier found');

      try {
        const res = await fetch(`${import.meta.env.VITE_AUTH_API_URL}/auth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, codeVerifier, redirectUri: `${window.location.origin}/callback` })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Token exchange failed');
        if (!data.expires_in || typeof data.expires_in !== 'number') throw new Error('Invalid expires_in');

        this.expiresAt = Date.now() + data.expires_in * 1000;
        sessionStorage.setItem('expires_at', this.expiresAt.toString());

        this.token = data.access_token;
        this.refreshToken = data.refresh_token;
        this.userInfo = data.userInfo;
        this.authenticated = true;
        this.isRedirecting = false;

        sessionStorage.setItem('access_token', data.access_token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
        sessionStorage.setItem('user_info', JSON.stringify(data.userInfo));

        console.log('✅ Auth successful');
        this.startSilentRefresh();
      } catch (err) {
        console.error('❌ Auth exchange failed:', err);
        this.clear();
        throw err;
      }
    },

    async ensureValidToken() {
      if (this.token && this.expiresAt && Date.now() < this.expiresAt - 5000) return this.token;
      if (this.refreshToken) { await this.refreshTokens(); return this.token; }
      this.authenticated = false;
      throw new Error('Session expired');
    },

    async refreshTokens() {
      if (!this.refreshToken) throw new Error('No refresh token');
      try {
        const res = await fetch(`${import.meta.env.VITE_AUTH_API_URL}/auth/refresh`, {
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
        console.log('🔄 Token refreshed');
      } catch (err) {
        console.error('❌ Refresh failed:', err);
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
          if (!isNaN(expiresAt)) {
            this.token = t; this.refreshToken = rt; this.expiresAt = expiresAt;
            if (ui) this.userInfo = JSON.parse(ui);

            if (Date.now() < expiresAt - 5000) {
              this.authenticated = true;
              console.log('✅ Session restored');
            } else {
              await this.refreshTokens();
              this.authenticated = true;
            }
          }
        } else {
          console.log('ℹ️ No session data found');
        }
      } catch (err) {
        console.error('❌ initAuth error:', err);
        this.clear();
      } finally {
        this.isInitialized = true;
        console.log('🏁 Auth initialized');
      }
    },

    startSilentRefresh() {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      const delay = this.expiresAt - Date.now() - 30000;
      this.refreshTimer = setTimeout(async () => {
        try { await this.refreshTokens(); this.startSilentRefresh(); }
        catch { this.logout(); }
      }, Math.max(delay, 1000));
    },

    clear() {
      this.authenticated = false; this.token = null; this.refreshToken = null;
      this.userInfo = null; this.expiresAt = null; this.isRedirecting = false;
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
        console.log('📥 Loading user profile...');
        const result = await userProfileApi.getProfile();
        
        if (result.success) {
          console.log('✅ Profile loaded:', result.data);
          this.userProfile = result.data;
        } else if (result.error === 'NOT_FOUND') {
          console.log('⚠️ Profile not found, creating...');
          const newProfile = await userProfileApi.createProfile();
          console.log('✅ Profile created:', newProfile);
          this.userProfile = newProfile;
        }
      } catch (err) {
        console.error('❌ Failed to load/create profile:', err);
        throw err;
      } finally {
        this.isProfileLoading = false;
      }
    },

    logout() {
      this.clear();
      
      const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
      const postLogoutRedirectUri = encodeURIComponent(`${window.location.origin}`);
      
      const logoutUrl = `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/protocol/openid-connect/logout?` +
        `client_id=${clientId}` +
        `&post_logout_redirect_uri=${postLogoutRedirectUri}`;
      
      console.log('🚪 Logging out, redirecting to:', logoutUrl);
      window.location.href = logoutUrl;
    },

    generateState() { return Math.random().toString(36).substring(2) + Date.now().toString(36); },
    generateNonce() { return Math.random().toString(36).substring(2) + Date.now().toString(36); },
    generateCodeVerifier() {
      const arr = new Uint8Array(32); crypto.getRandomValues(arr);
      return btoa(String.fromCharCode.apply(null, arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    async generateCodeChallenge(verifier) {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      return btoa(String.fromCharCode.apply(null, new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  }
});