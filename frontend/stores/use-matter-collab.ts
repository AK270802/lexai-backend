import { create } from 'zustand';
import api from '@/lib/axios';
import { WSClient } from '@/lib/ws';

export type Participant = { id: string; name: string; role: string };

export type Comment = {
  id: string;
  matter: string;
  document: string;
  user: string;
  user_name: string;
  parent: string | null;
  anchor: any;
  text: string;
  status: 'open' | 'resolved';
  created_at: string;
  replies: Array<{ id: string; user_name: string; text: string; created_at: string }>;
};

type State = {
  wsStatus: 'connected' | 'disconnected' | 'error';
  ws: WSClient | null;
  matterId: string | null;
  participants: Participant[];
  comments: Comment[];

  connect: (matterId: string) => void;
  disconnect: () => void;

  fetchComments: (params: { documentId?: string; matterId?: string }) => Promise<void>;
  createComment: (payload: { matterId: string; documentId: string; text: string; anchor?: any }) => Promise<void>;
  reply: (commentId: string, text: string) => Promise<void>;
  resolve: (commentId: string) => Promise<void>;
};

export const useMatterCollab = create<State>((set, get) => ({
  wsStatus: 'disconnected',
  ws: null,
  matterId: null,
  participants: [],
  comments: [],

  connect: (matterId: string) => {
    if (get().ws && get().matterId === matterId) return;
    get().ws?.disconnect();
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    const base = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
    const url = `${base}/matters/${matterId}/?token=${encodeURIComponent(token)}`;

    const ws = new WSClient(
      url,
      (msg) => {
        if (msg.type === 'presence.current') {
          set({ participants: msg.participants || [] });
        }
        if (msg.type === 'presence.join') {
          set((s) => ({
            participants: s.participants.some((p) => p.id === msg.user.id) ? s.participants : [...s.participants, msg.user],
          }));
        }
        if (msg.type === 'presence.leave') {
          set((s) => ({ participants: s.participants.filter((p) => p.id !== msg.user.id) }));
        }
        if (msg.type === 'comment.created' || msg.type === 'comment.updated' || msg.type === 'comment.resolved') {
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
          const id = msg.comment_id as string;
          set((s) => ({ comments: s.comments.filter((c) => c.id !== id) }));
        }
      },
      (st) => set({ wsStatus: st })
    );
    ws.connect();
    set({ ws, matterId, participants: [] });
  },

  disconnect: () => {
    get().ws?.disconnect();
    set({ ws: null, wsStatus: 'disconnected', matterId: null, participants: [], comments: [] });
  },

  fetchComments: async ({ documentId, matterId }) => {
    const res = await api.get('/comments/', { params: { document_id: documentId, matter_id: matterId } });
    set({ comments: Array.isArray(res.data.results) ? res.data.results : res.data });
  },

  createComment: async ({ matterId, documentId, text, anchor }) => {
    await api.post('/comments/create/', {
      matter_id: matterId,
      document_id: documentId,
      text,
      anchor: anchor || {},
    });
  },

  reply: async (commentId, text) => {
    await api.post(`/comments/${commentId}/reply/`, { text });
  },

  resolve: async (commentId) => {
    await api.post(`/comments/${commentId}/resolve/`, {});
  },
}));

