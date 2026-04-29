import { create } from 'zustand';
import api from '@/lib/axios';
import { WSClient } from '@/lib/ws';

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  read_at: string | null;
  created_at: string;
};

type State = {
  unreadCount: number;
  items: Notification[];
  wsStatus: 'connected' | 'disconnected' | 'error';
  ws: WSClient | null;

  fetch: () => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

export const useNotifications = create<State>((set, get) => ({
  unreadCount: 0,
  items: [],
  wsStatus: 'disconnected',
  ws: null,

  fetch: async () => {
    const res = await api.get('/notifications/');
    set({ unreadCount: res.data.unread_count || 0, items: res.data.results || [] });
  },

  connect: () => {
    if (get().ws) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    const base = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
    const url = `${base}/notifications/?token=${encodeURIComponent(token)}`;

    const ws = new WSClient(
      url,
      (msg) => {
        if (msg.type === 'notification.created') {
          set((s) => ({
            unreadCount: s.unreadCount + 1,
            items: [msg.notification as Notification, ...s.items].slice(0, 50),
          }));
        }
      },
      (st) => set({ wsStatus: st })
    );
    ws.connect();
    set({ ws });
  },

  disconnect: () => {
    get().ws?.disconnect();
    set({ ws: null, wsStatus: 'disconnected' });
  },

  markRead: async (id: string) => {
    await api.post(`/notifications/${id}/read/`);
    set((s) => {
      const items = s.items.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      const unreadCount = Math.max(0, items.filter((n) => !n.read_at).length);
      return { items, unreadCount };
    });
  },

  markAllRead: async () => {
    await api.post('/notifications/read-all/');
    set((s) => ({
      unreadCount: 0,
      items: s.items.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
    }));
  },
}));

