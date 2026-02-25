// ============================================================
//  store/authStore.js  —  Global Auth State (Zustand)
//  Persists tokens and user to localStorage automatically
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoggedIn:   false,

      // Called after login/register
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isLoggedIn: true }),

      // Called after token refresh
      setAccessToken: (accessToken) => set({ accessToken }),

      // Update user (e.g. after profile edit or cohort selection)
      setUser: (user) => set({ user }),

      // Clear everything on logout
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isLoggedIn: false }),
    }),
    {
      name: 'placementpro-auth', // key in localStorage
    }
  )
)
