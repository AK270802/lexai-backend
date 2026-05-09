import { create } from 'zustand';
import { researchApi } from '@/lib/api/research';
import type { ResearchQuery, ResearchSource } from '@/lib/types';

interface ResearchState {
  history: ResearchQuery[];
  currentQuery: string;
  currentResponse: string;
  currentSources: ResearchSource[];
  isStreaming: boolean;
  statusMessage: string;
  stopStream: (() => void) | null;

  fetchHistory: () => Promise<void>;
  startResearch: (query: string, matterId?: string) => void;
  stopResearch: () => void;
  resetCurrent: () => void;
  loadFromHistory: (item: ResearchQuery) => void;
}

export const useResearch = create<ResearchState>((set, get) => ({
  history: [],
  currentQuery: '',
  currentResponse: '',
  currentSources: [],
  isStreaming: false,
  statusMessage: '',
  stopStream: null,

  fetchHistory: async () => {
    try {
      const history = await researchApi.listHistory();
      set({ history });
    } catch { /* silent */ }
  },

  startResearch: (query, matterId) => {
    get().stopResearch();

    set({
      currentQuery: query,
      currentResponse: '',
      currentSources: [],
      isStreaming: true,
      statusMessage: 'Initializing…',
    });

    const stop = researchApi.streamResearch(query, matterId, {
      onStatus: (msg) => set({ statusMessage: msg }),
      onSources: (sources) => set({ currentSources: sources }),
      onToken: (token) => set((s) => ({ currentResponse: s.currentResponse + token })),
      onDone: () => {
        set({ isStreaming: false, statusMessage: '', stopStream: null });
        get().fetchHistory();
      },
      onError: (err) => set({ isStreaming: false, statusMessage: `Error: ${err}`, stopStream: null }),
    });

    set({ stopStream: stop });
  },

  stopResearch: () => {
    const { stopStream } = get();
    stopStream?.();
    set({ isStreaming: false, stopStream: null });
  },

  resetCurrent: () => set({
    currentQuery: '',
    currentResponse: '',
    currentSources: [],
    isStreaming: false,
    statusMessage: '',
    stopStream: null,
  }),

  loadFromHistory: (item) => set({
    currentQuery: item.query,
    currentResponse: item.response,
    currentSources: item.sources,
    isStreaming: false,
    statusMessage: '',
  }),
}));
