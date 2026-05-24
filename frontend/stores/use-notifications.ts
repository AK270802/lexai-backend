import { create } from 'zustand';
import { notificationsApi } from '@/lib/api/notifications';
import type { Notification } from '@/lib/types';

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  isConnected: boolean;
  fetch: () => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addItem: (n: Notification) => void;
}

let ws: WebSocket | null = null;

export const useNotifications = create<NotificationsState>((set) => ({
  items: [],
  unreadCount: 0,
  isConnected: false,

  fetch: async () => {
    try {
      const data = await notificationsApi.list();
      set({ items: data.results, unreadCount: data.unread_count });
    } catch {
      // silent
    }
  },

  connect: () => {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    if (!token) return;

    ws = new WebSocket(`${WS_BASE}/notifications/?token=${token}`);
    ws.onopen = () => set({ isConnected: true });
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'notification.created') {
          const n = msg.payload as Notification;
          set((s) => ({ items: [n, ...s.items], unreadCount: s.unreadCount + 1 }));
        }
      } catch { /* ignore */ }
    };
    ws.onclose = () => { set({ isConnected: false }); ws = null; };
    ws.onerror = () => { ws?.close(); };
  },

  disconnect: () => {
    ws?.close();
    ws = null;
    set({ isConnected: false });
  },

  markRead: async (id) => {
    await notificationsApi.markRead(id);
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await notificationsApi.markAllRead();
    set((s) => ({
      items: s.items.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      unreadCount: 0,
    }));
  },

  addItem: (n) => set((s) => ({ items: [n, ...s.items], unreadCount: s.unreadCount + 1 })),
}));
