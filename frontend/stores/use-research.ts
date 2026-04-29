import { create } from 'zustand';
import api from '@/lib/axios';

export interface Source {
  id: string;
  document_id: string;
  document_name: string;
  excerpt: string;
  score: number;
  page_number: number;
}

export interface ResearchQuery {
  id: string;
  query: string;
  response: string;
  sources: Source[];
  created_at: string;
  matter_title?: string;
}

interface ResearchState {
  history: ResearchQuery[];
  currentQuery: string;
  currentResponse: string;
  currentSources: Source[];
  isStreaming: boolean;
  statusMessage: string;
  
  setHistory: (history: ResearchQuery[]) => void;
  fetchHistory: () => Promise<void>;
  startResearch: (query: string, matterId?: string) => Promise<void>;
  resetCurrent: () => void;
}

export const useResearch = create<ResearchState>((set, get) => ({
  history: [],
  currentQuery: '',
  currentResponse: '',
  currentSources: [],
  isStreaming: false,
  statusMessage: '',

  setHistory: (history) => set({ history }),

  fetchHistory: async () => {
    try {
      const response = await api.get('/research/history/');
      set({ history: response.data.results || response.data });
    } catch (error) {
      console.error('Failed to fetch research history:', error);
    }
  },

  resetCurrent: () => set({
    currentQuery: '',
    currentResponse: '',
    currentSources: [],
    isStreaming: false,
    statusMessage: ''
  }),

  startResearch: async (query: string, matterId?: string) => {
    set({ 
      currentQuery: query,
      currentResponse: '',
      currentSources: [],
      isStreaming: true,
      statusMessage: 'Initializing...'
    });

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/research/stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, matter_id: matterId })
      });

      if (!response.ok) throw new Error('Failed to start research');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.event === 'token') {
                set((state) => ({ currentResponse: state.currentResponse + data.data }));
              } else if (data.event === 'status') {
                set({ statusMessage: data.message });
              } else if (data.event === 'sources') {
                set({ currentSources: data.data });
              } else if (data.event === 'done') {
                set({ isStreaming: false, statusMessage: '' });
                get().fetchHistory();
              } else if (data.event === 'error') {
                set({ isStreaming: false, statusMessage: `Error: ${data.message}` });
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Research error:', error);
      set({ isStreaming: false, statusMessage: `Error: ${error.message}` });
    }
  }
}));
