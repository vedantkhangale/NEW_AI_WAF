import { create } from 'zustand';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    token: string | null;
    username: string | null;
    role: string | null;
    error: string | null;

    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    verifySession: () => Promise<boolean>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    isAuthenticated: false,
    isLoading: true,
    token: sessionStorage.getItem('aegisx_token'),
    username: sessionStorage.getItem('aegisx_username'),
    role: sessionStorage.getItem('aegisx_role'),
    error: null,

    login: async (username: string, password: string) => {
        set({ error: null, isLoading: true });

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                set({
                    error: data.detail || 'Authentication failed',
                    isLoading: false,
                });
                return false;
            }

            const data = await response.json();

            // Store session
            sessionStorage.setItem('aegisx_token', data.token);
            sessionStorage.setItem('aegisx_username', data.username);
            sessionStorage.setItem('aegisx_role', data.role);

            set({
                isAuthenticated: true,
                isLoading: false,
                token: data.token,
                username: data.username,
                role: data.role,
                error: null,
            });

            return true;
        } catch (err) {
            set({
                error: 'Network error — unable to reach WAF engine',
                isLoading: false,
            });
            return false;
        }
    },

    logout: async () => {
        const { token } = get();

        try {
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
        } catch {
            // Ignore network errors during logout
        }

        // Clear session
        sessionStorage.removeItem('aegisx_token');
        sessionStorage.removeItem('aegisx_username');
        sessionStorage.removeItem('aegisx_role');

        set({
            isAuthenticated: false,
            isLoading: false,
            token: null,
            username: null,
            role: null,
            error: null,
        });
    },

    verifySession: async () => {
        const token = sessionStorage.getItem('aegisx_token');

        if (!token) {
            set({ isAuthenticated: false, isLoading: false });
            return false;
        }

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                set({
                    isAuthenticated: true,
                    isLoading: false,
                    token,
                    username: data.username,
                    role: data.role,
                });
                return true;
            } else {
                // Token expired or invalid
                sessionStorage.removeItem('aegisx_token');
                sessionStorage.removeItem('aegisx_username');
                sessionStorage.removeItem('aegisx_role');
                set({ isAuthenticated: false, isLoading: false, token: null });
                return false;
            }
        } catch {
            // Backend might be starting up – allow cached session
            set({
                isAuthenticated: true,
                isLoading: false,
                token,
                username: sessionStorage.getItem('aegisx_username'),
                role: sessionStorage.getItem('aegisx_role'),
            });
            return true;
        }
    },

    clearError: () => set({ error: null }),
}));
