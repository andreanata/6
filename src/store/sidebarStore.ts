// ============================================
// INTEGRITY POST — Sidebar Store (Supabase-First)
// ============================================

import { create } from 'zustand';
import { saveAllSidebars, subscribeToSidebars } from '../api/newsApi';
import { DEFAULT_SIDEBARS, type SidebarSlot } from '../data/sidebarDefaults';

export { DEFAULT_SIDEBARS };
export type { SidebarSlot };

type SidebarState = {
  slots: SidebarSlot[];
  loading: boolean;
  error: string | null;
  updateSlot: (id: string, patch: Partial<SidebarSlot>) => Promise<void>;
  resetSlot: (id: string) => Promise<void>;
  subscribeRealtime: () => () => void;
};

export const useSidebarStore = create<SidebarState>((set, get) => ({
  slots: DEFAULT_SIDEBARS,
  loading: true,
  error: null,

  updateSlot: async (id, patch) => {
    const slots = get().slots.map(slot => slot.id === id ? { ...slot, ...patch } : slot);
    set({ slots, error: null }); // Optimistic UI update

    const ok = await saveAllSidebars(slots);
    if (!ok) {
      set({ error: 'Gagal menyimpan perubahan sidebar ke database.' });
    }
  },

  resetSlot: async (id) => {
    const slots = get().slots.map(slot => slot.id === id ? { ...slot, image: '', url: '' } : slot);
    set({ slots, error: null });

    const ok = await saveAllSidebars(slots);
    if (!ok) {
      set({ error: 'Gagal reset sidebar.' });
    }
  },

  subscribeRealtime: () => {
    return subscribeToSidebars((slots) => {
      set({ slots, loading: false, error: null });
    });
  },
}));
