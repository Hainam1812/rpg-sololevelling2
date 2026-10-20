import React, { createContext, useContext, useEffect, useReducer, useState, useRef, useCallback } from 'react';
import { GameState, NotificationItem } from './types.js';
import { Action, gameReducer } from './reducer.js';
import { loadStateFromStorage, saveStateToStorage, STORAGE_KEY } from './persistence.js';
import { getMsUntilNextMidnight } from '../domain/dates.js';
import { getGearBlob, getCharBlob } from './indexedDb.js';

interface GameContextValue {
  state: GameState;
  dispatch: (action: Action) => void;
  notifications: NotificationItem[];
  currentNotification: NotificationItem | null;
  dismissNotification: () => void;
  isCelebrating: boolean;
  triggerCelebration: (durationMs?: number) => void;
  now: Date;
  // DEV-only time travel helper
  advanceDateByDays?: (days: number) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

interface InternalStoreState {
  gameState: GameState;
  notifications: NotificationItem[];
}

type InternalAction = Action | { type: '__DISMISS_NOTIFICATION' };

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const nowRef = useRef(now);
  nowRef.current = now;

  const [store, rawDispatch] = useReducer(
    (prevState: InternalStoreState, action: InternalAction): InternalStoreState => {
      if (action.type === '__DISMISS_NOTIFICATION') {
        return {
          ...prevState,
          notifications: prevState.notifications.slice(1),
        };
      }
      const { state: nextState, notificationsQueue } = gameReducer(prevState.gameState, action, nowRef.current);
      return {
        gameState: nextState,
        notifications: notificationsQueue.length > 0 ? [...prevState.notifications, ...notificationsQueue] : prevState.notifications,
      };
    },
    null,
    () => ({
      gameState: loadStateFromStorage(),
      notifications: [],
    })
  );

  const state = store.gameState;
  const notifications = store.notifications;
  const [isCelebrating, setIsCelebrating] = useState(false);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger 5-second victory celebration
  const triggerCelebration = useCallback((durationMs: number = 5000) => {
    setIsCelebrating(true);
    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current);
    }
    celebrationTimerRef.current = setTimeout(() => {
      setIsCelebrating(false);
    }, durationMs);
  }, []);

  // Save on state change
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Sync across tabs via window storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const remoteState = JSON.parse(e.newValue);
          rawDispatch({ type: 'SET_PROFILE', payload: remoteState.profile || {} });
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Hydrate custom gear and character blobs from IndexedDB
  useEffect(() => {
    let isMounted = true;
    const hydrateBlobs = async () => {
      let changed = false;
      if (state.customGearMeta?.length) {
        for (const item of state.customGearMeta) {
          if (!item.imageBlobUrl || item.imageBlobUrl.startsWith('blob:')) {
            const blob = await getGearBlob(item.id);
            if (blob && isMounted) {
              item.imageBlobUrl = URL.createObjectURL(blob);
              changed = true;
            }
          }
        }
      }
      if (state.customCharacters?.length) {
        for (const char of state.customCharacters) {
          if (!char.idleSrc || char.idleSrc.startsWith('blob:')) {
            const blob = await getCharBlob(char.id);
            if (blob && isMounted) {
              char.idleSrc = URL.createObjectURL(blob);
              changed = true;
            }
          }
        }
      }
      if (changed && isMounted) {
        rawDispatch({ type: 'SET_PROFILE', payload: {} });
      }
    };
    hydrateBlobs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Midnight rollover watcher & focus/visibilitychange watcher
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const scheduleMidnightRefresh = () => {
      const ms = getMsUntilNextMidnight();
      timerId = setTimeout(() => {
        setNow(new Date());
        scheduleMidnightRefresh();
      }, ms);
    };

    scheduleMidnightRefresh();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date());
      }
    };

    const handleFocus = () => {
      setNow(new Date());
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Enhanced dispatch that also checks for celebration triggers
  const dispatch = useCallback((action: Action) => {
    if (
      action.type === 'COMPLETE_DAILY_QUEST' ||
      action.type === 'COMPLETE_PACKAGE_TASK' ||
      action.type === 'COMPLETE_EVENT_TASK'
    ) {
      triggerCelebration(5000);
    }
    rawDispatch(action);
  }, [triggerCelebration]);

  const currentNotification = notifications[0] || null;

  const dismissNotification = useCallback(() => {
    rawDispatch({ type: '__DISMISS_NOTIFICATION' });
  }, []);

  // DEV-only date advancement
  const advanceDateByDays = useCallback((days: number) => {
    setNow(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  }, []);

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        notifications,
        currentNotification,
        dismissNotification,
        isCelebrating,
        triggerCelebration,
        now,
        advanceDateByDays: import.meta.env.DEV ? advanceDateByDays : undefined,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}
