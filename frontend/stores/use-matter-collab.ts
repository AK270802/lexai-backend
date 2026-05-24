import { create } from 'zustand';
import api from '@/lib/api';
import type { Comment, PresenceUser } from '@/lib/types';

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

interface MatterCollabState {
  wsStatus: 'connected' | 'disconnected' | 'error';
  matterId: string | null;
  participants: PresenceUser[];
  comments: Comment[];

  connect: (matterId: string) => void;
  disconnect: () => void;
  fetchComments: (params: { documentId?: string; matterId?: string }) => Promise<void>;
  createComment: (payload: { matterId: string; documentId?: string; text: string; anchor?: Record<string, unknown> }) => Promise<void>;
  reply: (commentId: string, text: string) => Promise<void>;
  resolve: (commentId: string) => Promise<void>;
}

let ws: WebSocket | null = null;

export const useMatterCollab = create<MatterCollabState>((set, get) => ({
  wsStatus: 'disconnected',
  matterId: null,
  participants: [],
  comments: [],

  connect: (matterId) => {
    if (get().matterId === matterId && ws?.readyState === WebSocket.OPEN) return;
    ws?.close();

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    if (!token) return;

    ws = new WebSocket(`${WS_BASE}/matters/${matterId}/?token=${token}`);

    ws.onopen = () => set({ wsStatus: 'connected', matterId, participants: [] });

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);

        if (msg.type === 'presence.current') set({ participants: msg.participants ?? [] });
        if (msg.type === 'presence.join') {
          set((s) => ({
            participants: s.participants.some((p) => p.user_id === msg.user?.user_id)
              ? s.participants
              : [...s.participants, msg.user],
          }));
        }
        if (msg.type === 'presence.leave') {
          set((s) => ({ participants: s.participants.filter((p) => p.user_id !== msg.user?.user_id) }));
        }
        if (['comment.created', 'comment.updated', 'comment.resolved'].includes(msg.type)) {
          const c = msg.comment as Comment;
          set((s) => {
            const idx = s.comments.findIndex((x) => x.id === c.id);
            if (idx === -1) return { comments: [c, ...s.comments] };
            const copy = [...s.comments];
            copy[idx] = c;
            return { comments: copy };
          });
        }
        if (msg.type === 'comment.deleted') {
          set((s) => ({ comments: s.comments.filter((c) => c.id !== msg.comment_id) }));
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => { set({ wsStatus: 'disconnected' }); ws = null; };
    ws.onerror = () => { set({ wsStatus: 'error' }); ws?.close(); };
  },

  disconnect: () => {
    ws?.close();
    ws = null;
    set({ wsStatus: 'disconnected', matterId: null, participants: [], comments: [] });
  },

  fetchComments: async ({ documentId, matterId }) => {
    const res = await api.get('/comments/', { params: { document_id: documentId, matter_id: matterId } });
    const data = res.data;
    set({ comments: Array.isArray(data) ? data : (data.results ?? []) });
  },

  createComment: async ({ matterId, documentId, text, anchor }) => {
    await api.post('/comments/create/', {
      matter_id: matterId,
      document_id: documentId,
      text,
      anchor: anchor ?? {},
    });
  },

  reply: async (commentId, text) => {
    await api.post(`/comments/${commentId}/reply/`, { text });
  },

  resolve: async (commentId) => {
    await api.post(`/comments/${commentId}/resolve/`);
  },
}));
