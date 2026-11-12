import { create } from 'zustand';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import type { DayItem } from '@/domain/dayItem';

const MIN_LIVE_QUERY_LENGTH = 3;

interface SearchState {
  active: boolean;
  query: string;
  results: DayItem[] | null;
  loading: boolean;
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  submit: () => void;
}

let searchToken = 0;

function runSearch(query: string, set: (partial: Partial<SearchState>) => void) {
  const trimmed = query.trim();
  if (!trimmed) {
    searchToken += 1;
    set({ results: null, loading: false });
    return;
  }
  set({ loading: true });
  const token = ++searchToken;
  dayItemRepository.searchByTitle(trimmed).then((results) => {
    if (token !== searchToken) return;
    set({ results, loading: false });
  });
}

export const useSearchStore = create<SearchState>((set, get) => ({
  active: false,
  query: '',
  results: null,
  loading: false,

  open: () => set({ active: true }),
  close: () => {
    searchToken += 1;
    set({ active: false, query: '', results: null, loading: false });
  },

  setQuery: (query: string) => {
    set({ query });
    if (query.trim().length >= MIN_LIVE_QUERY_LENGTH) {
      runSearch(query, set);
    } else {
      searchToken += 1;
      set({ results: null, loading: false });
    }
  },

  submit: () => runSearch(get().query, set),
}));
