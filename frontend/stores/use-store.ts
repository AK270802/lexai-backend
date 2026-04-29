import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  currentMatterId: string | null;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setCurrentMatterId: (id: string | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'light',
      currentMatterId: null,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      setCurrentMatterId: (id) => set({ currentMatterId: id }),
    }),
    {
      name: 'lexai-storage',
    }
  )
);