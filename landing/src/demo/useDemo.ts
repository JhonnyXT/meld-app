'use client';

import { useEffect, useReducer } from 'react';
import { seedItems, toDateKey, type DemoItem, type SeedTitles } from './model';

export const UNDO_MS = 4000;

export type UndoKind = 'task' | 'habit' | 'deleted';

type State = {
  items: DemoItem[];
  todayKey: string;
  selectedKey: string;
  /** Solo un Deshacer pendiente a la vez, como en la app (`undoStore`). */
  undo: { kind: UndoKind; previous: DemoItem[]; at: number } | null;
};

type Action =
  | { type: 'save'; item: DemoItem }
  | { type: 'remove'; id: string }
  | { type: 'toggleTask'; id: string }
  | { type: 'toggleHabit'; id: string; key: string }
  | { type: 'setDay'; key: string }
  | { type: 'undo' }
  | { type: 'clearUndo' };

function withUndo(state: State, kind: UndoKind, items: DemoItem[]): State {
  return { ...state, items, undo: { kind, previous: state.items, at: Date.now() } };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'save': {
      const exists = state.items.some((i) => i.id === action.item.id);
      const items = exists ? state.items.map((i) => (i.id === action.item.id ? action.item : i)) : [...state.items, action.item];
      return { ...state, items };
    }
    case 'remove':
      return withUndo(
        state,
        'deleted',
        state.items.filter((i) => i.id !== action.id),
      );
    case 'toggleTask': {
      const item = state.items.find((i) => i.id === action.id);
      if (!item) return state;
      const items = state.items.map((i) => (i.id === action.id ? { ...i, done: !i.done } : i));
      // Completar muestra Deshacer; desmarcar (p. ej. desde el widget) no.
      return item.done ? { ...state, items } : withUndo(state, 'task', items);
    }
    case 'toggleHabit': {
      const item = state.items.find((i) => i.id === action.id);
      if (!item) return state;
      const completed = item.completed ?? [];
      const wasDone = completed.includes(action.key);
      const items = state.items.map((i) =>
        i.id === action.id ? { ...i, completed: wasDone ? completed.filter((k) => k !== action.key) : [...completed, action.key] } : i,
      );
      return wasDone ? { ...state, items } : withUndo(state, 'habit', items);
    }
    case 'setDay':
      return { ...state, selectedKey: action.key };
    case 'undo':
      return state.undo ? { ...state, items: state.undo.previous, undo: null } : state;
    case 'clearUndo':
      return { ...state, undo: null };
  }
}

/** Estado de la demo, compartido entre el teléfono y los widgets de la
 * portada. Solo en memoria: al recargar vuelve a los datos de ejemplo. */
export function useDemo(seed: SeedTitles) {
  const [state, dispatch] = useReducer(reducer, seed, (titles) => {
    const today = new Date();
    const key = toDateKey(today);
    return { items: seedItems(titles, today), todayKey: key, selectedKey: key, undo: null } satisfies State;
  });

  // El Deshacer se cierra solo a los 4 s (`UNDO_DURATION_MS` de la app).
  const undoAt = state.undo?.at;
  useEffect(() => {
    if (!undoAt) return;
    const id = setTimeout(() => dispatch({ type: 'clearUndo' }), UNDO_MS);
    return () => clearTimeout(id);
  }, [undoAt]);

  return { state, dispatch };
}

export type DemoApi = ReturnType<typeof useDemo>;
