import { CompletionEntry, GameState, NotificationItem } from '../store/types.js';
import { DAILY_QUESTS } from '../data/dailyQuests.js';
import { getDateKey } from './dates.js';

export function getDailyQuestDedupKey(questId: string, dateKey: string): string {
  return `${questId}@${dateKey}`;
}

export function isDailyQuestCompleted(
  completions: CompletionEntry[],
  questId: string,
  dateKey: string
): boolean {
  const targetKey = getDailyQuestDedupKey(questId, dateKey);
  return completions.some(c => c.key === targetKey);
}

export interface CompleteDailyQuestResult {
  nextCompletions: CompletionEntry[];
  addedEntry: CompletionEntry | null;
  notification: NotificationItem | null;
  isReplay?: boolean;
}

export function completeDailyQuest(
  state: GameState,
  questId: string,
  now: Date = new Date()
): CompleteDailyQuestResult {
  const dateKey = getDateKey(now);
  const targetKey = getDailyQuestDedupKey(questId, dateKey);

  // Check anti-duplication / Replay mode
  if (state.completions.some(c => c.key === targetKey)) {
    const quest = DAILY_QUESTS.find(q => q.id === questId);
    return {
      nextCompletions: state.completions,
      addedEntry: null,
      isReplay: true,
      notification: quest
        ? {
            id: `notif-replay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: 'quest_completed',
            title: 'Hoàn Thành Luyện Tập!',
            message: `Bạn đã làm lại thành công nhiệm vụ "${quest.name}". (Chế độ rèn luyện: 0 XP)`,
            xpEarned: 0,
          }
        : null,
    };
  }


  const quest = DAILY_QUESTS.find(q => q.id === questId);
  if (!quest) {
    return {
      nextCompletions: state.completions,
      addedEntry: null,
      notification: null,
    };
  }

  const activeTask = state.activeTasks[questId];
  let onTime = true;
  if (activeTask?.dueAt) {
    onTime = new Date(activeTask.dueAt).getTime() >= now.getTime();
  }

  const newEntry: CompletionEntry = {
    key: targetKey,
    kind: 'daily',
    questId,
    dateKey,
    completedAt: now.toISOString(),
    xp: quest.xp,
    category: quest.category,
    difficulty: quest.difficulty,
    locationId: quest.locationId,
    dueAt: activeTask?.dueAt,
    onTime,
  };

  const notification: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'quest_completed',
    title: 'Nhiệm Vụ Hoàn Thành!',
    message: `Bạn đã hoàn thành "${quest.name}" và nhận được +${quest.xp} XP.`,
    xpEarned: quest.xp,
  };

  return {
    nextCompletions: [...state.completions, newEntry],
    addedEntry: newEntry,
    notification,
  };
}
