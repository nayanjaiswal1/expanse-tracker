import { useRef, useCallback, useState } from 'react';

interface Action<T> {
  type: string;
  data: T;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
  timestamp: number;
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
}

export function useUndoRedo<T>(options: UseUndoRedoOptions = {}) {
  const { maxHistorySize = 50 } = options;

  const historyRef = useRef<Action<T>[]>([]);
  const futureRef = useRef<Action<T>[]>([]);
  const [, forceUpdate] = useState({});

  const addAction = useCallback(
    (action: Omit<Action<T>, 'timestamp'>) => {
      const newAction: Action<T> = {
        ...action,
        timestamp: Date.now(),
      };

      historyRef.current.push(newAction);

      // Limit history size
      if (historyRef.current.length > maxHistorySize) {
        historyRef.current.shift();
      }

      // Clear future when new action is added
      futureRef.current = [];

      forceUpdate({});
    },
    [maxHistorySize, forceUpdate]
  );

  const undo = useCallback(async () => {
    if (historyRef.current.length === 0) return;

    const action = historyRef.current.pop();
    if (!action) return;

    await action.undo();
    futureRef.current.push(action);

    forceUpdate({});
  }, [forceUpdate]);

  const redo = useCallback(async () => {
    if (futureRef.current.length === 0) return;

    const action = futureRef.current.pop();
    if (!action) return;

    await action.redo();
    historyRef.current.push(action);

    forceUpdate({});
  }, [forceUpdate]);

  const clear = useCallback(() => {
    historyRef.current = [];
    futureRef.current = [];
    forceUpdate({});
  }, [forceUpdate]);

  const canUndo = useCallback(() => historyRef.current.length > 0, []);
  const canRedo = useCallback(() => futureRef.current.length > 0, []);

  return {
    addAction,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
  };
}
