import { CompletionEntry, GameState, NotificationItem } from '../store/types.js';
import { QUEST_PACKAGES, QuestPackageDef, PackageTaskDef } from '../data/questPackages.js';
import { getDateKey } from './dates.js';

export function isTaskCompleted(completions: CompletionEntry[], taskId: string): boolean {
  return completions.some(c => c.key === taskId);
}

export function isPackageCleared(completions: CompletionEntry[], packageId: string): boolean {
  return completions.some(c => c.key === `clear:${packageId}`);
}

export function canAttemptTask(
  state: GameState,
  pkg: QuestPackageDef,
  task: PackageTaskDef
): { canAttempt: boolean; reason?: string } {
  const isFirstTask = pkg.tasks[0]?.id === task.id;
  const isOwned = state.unlockedPackages.includes(pkg.id);
  const isAbandoned = state.abandonedPackages.includes(pkg.id);

  if (isTaskCompleted(state.completions, task.id)) {
    return { canAttempt: false, reason: 'Nhiệm vụ này đã được hoàn thành!' };
  }

  // First task can always be attempted for free (trial)
  if (isFirstTask) {
    return { canAttempt: true };
  }

  // Other tasks require ownership
  if (!isOwned) {
    return { canAttempt: false, reason: 'Cần mở khóa gói nhiệm vụ này để tiếp tục.' };
  }

  if (isAbandoned) {
    return { canAttempt: false, reason: 'Gói đang tạm dừng. Hãy bấm "Tiếp tục gói" để tham gia lại.' };
  }

  // If Boss task, check that all preceding tasks are completed
  if (task.isBoss) {
    const precedingTasks = pkg.tasks.filter(t => !t.isBoss);
    const allPrecedingDone = precedingTasks.every(t => isTaskCompleted(state.completions, t.id));
    if (!allPrecedingDone) {
      return { canAttempt: false, reason: 'Cần hoàn thành toàn bộ các nhiệm vụ trước để mở khóa Boss Dungeon!' };
    }
  }

  return { canAttempt: true };
}

export interface CompletePackageTaskResult {
  nextCompletions: CompletionEntry[];
  addedEntries: CompletionEntry[];
  notifications: NotificationItem[];
}

export function completePackageTask(
  state: GameState,
  packageId: string,
  taskId: string,
  now: Date = new Date()
): CompletePackageTaskResult {
  // Anti-duplication check: if taskId already completed, no-op
  if (state.completions.some(c => c.key === taskId)) {
    return {
      nextCompletions: state.completions,
      addedEntries: [],
      notifications: [],
    };
  }

  const pkg = QUEST_PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    return { nextCompletions: state.completions, addedEntries: [], notifications: [] };
  }

  const task = pkg.tasks.find(t => t.id === taskId);
  if (!task) {
    return { nextCompletions: state.completions, addedEntries: [], notifications: [] };
  }

  const dateKey = getDateKey(now);
  const activeTask = state.activeTasks[taskId];
  let onTime = true;
  if (activeTask?.dueAt) {
    onTime = new Date(activeTask.dueAt).getTime() >= now.getTime();
  }

  const taskEntry: CompletionEntry = {
    key: taskId,
    kind: 'task',
    questId: taskId,
    packageId,
    dateKey,
    completedAt: now.toISOString(),
    xp: task.xp,
    category: task.category,
    difficulty: task.difficulty,
    locationId: task.locationId,
    dueAt: activeTask?.dueAt,
    onTime,
  };

  const addedEntries: CompletionEntry[] = [taskEntry];
  const notifications: NotificationItem[] = [
    {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'quest_completed',
      title: task.isBoss ? 'HẠ GỤC BOSS DUNGEON!' : 'Nhiệm Vụ Gói Hoàn Thành!',
      message: `Bạn đã xong "${task.title}" (+${task.xp} XP).`,
      xpEarned: task.xp,
    },
  ];

  // If this task was the Boss, and package clear bonus has not been awarded yet, grant it!
  const clearKey = `clear:${packageId}`;
  const alreadyCleared = state.completions.some(c => c.key === clearKey);
  if (task.isBoss && !alreadyCleared) {
    const clearEntry: CompletionEntry = {
      key: clearKey,
      kind: 'clear',
      questId: clearKey,
      packageId,
      dateKey,
      completedAt: now.toISOString(),
      xp: pkg.clearBonusXp,
      category: pkg.category,
      difficulty: 'Boss',
      locationId: task.locationId,
      onTime: true,
    };
    addedEntries.push(clearEntry);

    notifications.push({
      id: `notif-clear-${Date.now()}`,
      type: 'quest_completed',
      title: 'PACKAGE CLEAR BONUS!',
      message: `Chúc mừng bạn đã chinh phục trọn vẹn "${pkg.title}"! Thưởng thêm +${pkg.clearBonusXp} XP!`,
      xpEarned: pkg.clearBonusXp,
    });
  }

  return {
    nextCompletions: [...state.completions, ...addedEntries],
    addedEntries,
    notifications,
  };
}
