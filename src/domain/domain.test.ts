import test from 'node:test';
import assert from 'node:assert/strict';

import { getDateKey, getYesterdayKey, getDaysDifference } from './dates.ts';
import { calculateLevelFromXp, getLevelProgress } from './progression.ts';
import { calculateStreak } from './streak.ts';
import { completeDailyQuest, getDailyQuestDedupKey } from './quests.ts';
import { completePackageTask, canAttemptTask, isTaskCompleted } from './packages.ts';
import { calculateCart, calculateComboPrice } from './cart.ts';
import { evaluateAchievements } from './achievements.ts';
import { gradeExamSession, calculateExamHearts } from './exams.ts';
import { GameState } from '../store/types.ts';
import { QUEST_PACKAGES } from '../data/questPackages.ts';
import { EXAMS } from '../data/exams/index.ts';
import { gameReducer } from '../store/reducer.ts';

function createMockState(partial: Partial<GameState> = {}): GameState {
  return {
    schemaVersion: 1,
    profile: {
      nickname: 'TestUser',
      characterId: 'hero',
      createdAt: '2026-10-01T00:00:00.000Z',
      motionPreference: 'system',
    },
    completions: [],
    activeTasks: {},
    abandonedPackages: [],
    unlockedPackages: [],
    unlockedAchievements: [],
    equippedCosmetics: {},
    equippedGear: {},
    seenCosmetics: [],
    seenGear: [],
    customGearMeta: [],
    examHistory: [],
    personalExams: [],
    lastLocationId: 'dorm',
    cart: [],
    appliedCoupon: null,
    orders: [],
    contactMessages: [],
    ...partial,
  };
}

test('Date domain handles local date keys properly', () => {
  const testDate = new Date(2026, 9, 18, 0, 5, 0); // Oct 18 2026 00:05 local
  const key = getDateKey(testDate);
  assert.equal(key, '2026-10-18');

  const yest = getYesterdayKey(key);
  assert.equal(yest, '2026-10-17');

  assert.equal(getDaysDifference(key, yest), 1);
});

test('Progression formula 50 * L * (L - 1) calculates level correctly', () => {
  // L1: 0..99
  assert.equal(calculateLevelFromXp(0), 1);
  assert.equal(calculateLevelFromXp(99), 1);
  // L2: 100..299 (50 * 2 * 1 = 100)
  assert.equal(calculateLevelFromXp(100), 2);
  assert.equal(calculateLevelFromXp(299), 2);
  // L3: 300..599 (50 * 3 * 2 = 300)
  assert.equal(calculateLevelFromXp(300), 3);
  // L4: 600..999 (50 * 4 * 3 = 600)
  assert.equal(calculateLevelFromXp(600), 4);
  // L5: 1000.. (50 * 5 * 4 = 1000)
  assert.equal(calculateLevelFromXp(1000), 5);

  const prog = getLevelProgress(150);
  assert.equal(prog.level, 2);
  assert.equal(prog.xpInCurrentLevel, 50); // 150 - 100
  assert.equal(prog.xpRequiredForNextLevel, 200); // 300 - 100
  assert.equal(prog.progressPercent, 25);
});

test('Daily Quest deduplication prevents duplicate XP', () => {
  const state = createMockState();
  const now = new Date(2026, 9, 18, 10, 0, 0);

  // First completion
  const res1 = completeDailyQuest(state, 'daily-morning-spawn', now);
  assert.equal(res1.nextCompletions.length, 1);
  assert.equal(res1.addedEntry?.xp, 10);
  assert.ok(res1.notification);

  // Second completion on same day (double click / replay)
  const stateWith1 = { ...state, completions: res1.nextCompletions };
  const res2 = completeDailyQuest(stateWith1, 'daily-morning-spawn', now);
  assert.equal(res2.nextCompletions.length, 1);
  assert.equal(res2.addedEntry, null);
  assert.equal(res2.notification, null);

  // Next day completion should work
  const tomorrow = new Date(2026, 9, 19, 10, 0, 0);
  const res3 = completeDailyQuest(stateWith1, 'daily-morning-spawn', tomorrow);
  assert.equal(res3.nextCompletions.length, 2);
  assert.equal(res3.addedEntry?.dateKey, '2026-10-19');
});

test('Streak calculation works across multiple days and skips correctly', () => {
  const today = '2026-10-18';
  const completions = [
    {
      key: 'daily-morning-spawn@2026-10-16',
      kind: 'daily' as const,
      questId: 'daily-morning-spawn',
      dateKey: '2026-10-16',
      completedAt: '2026-10-16T08:00:00Z',
      xp: 10,
      category: 'Daily Life',
      difficulty: 'Easy' as const,
    },
    {
      key: 'daily-morning-spawn@2026-10-17',
      kind: 'daily' as const,
      questId: 'daily-morning-spawn',
      dateKey: '2026-10-17',
      completedAt: '2026-10-17T08:00:00Z',
      xp: 10,
      category: 'Daily Life',
      difficulty: 'Easy' as const,
    },
    // Multiple quests on same day 2026-10-17 only counts as 1 day
    {
      key: 'daily-academic-grind@2026-10-17',
      kind: 'daily' as const,
      questId: 'daily-academic-grind',
      dateKey: '2026-10-17',
      completedAt: '2026-10-17T09:00:00Z',
      xp: 25,
      category: 'Academic',
      difficulty: 'Normal' as const,
    },
  ];

  // If today has no completion yet, streak is preserved from yesterday (streak = 2)
  const resBeforeToday = calculateStreak(completions, today);
  assert.equal(resBeforeToday.currentStreak, 2);
  assert.equal(resBeforeToday.hasCompletedToday, false);

  // Now complete today
  completions.push({
    key: 'daily-morning-spawn@2026-10-18',
    kind: 'daily' as const,
    questId: 'daily-morning-spawn',
    dateKey: '2026-10-18',
    completedAt: '2026-10-18T08:00:00Z',
    xp: 10,
    category: 'Daily Life',
    difficulty: 'Easy' as const,
  });

  const resAfterToday = calculateStreak(completions, today);
  assert.equal(resAfterToday.currentStreak, 3);
  assert.equal(resAfterToday.longestStreak, 3);
  assert.equal(resAfterToday.hasCompletedToday, true);
});

test('Package tasks: trial is free, Boss requires prior tasks, clear bonus awarded', () => {
  const pythonPkg = QUEST_PACKAGES.find(p => p.id === 'pkg-master-python')!;
  const state = createMockState({ unlockedPackages: [] }); // User does not own package

  // First task (trial) is allowed
  const trialCheck = canAttemptTask(state, pythonPkg, pythonPkg.tasks[0]);
  assert.equal(trialCheck.canAttempt, true);

  // Second task is blocked because package is locked
  const secondCheck = canAttemptTask(state, pythonPkg, pythonPkg.tasks[1]);
  assert.equal(secondCheck.canAttempt, false);

  // Now user unlocks package
  const stateUnlocked = createMockState({ unlockedPackages: ['pkg-master-python'] });

  // Boss task (last) is blocked because preceding tasks are not done yet
  const bossTask = pythonPkg.tasks[pythonPkg.tasks.length - 1];
  const bossCheck = canAttemptTask(stateUnlocked, pythonPkg, bossTask);
  assert.equal(bossCheck.canAttempt, false);

  // Complete Boss task after preceding tasks done
  const precedingCompletions = pythonPkg.tasks.slice(0, -1).map(t => ({
    key: t.id,
    kind: 'task' as const,
    questId: t.id,
    packageId: pythonPkg.id,
    dateKey: '2026-10-18',
    completedAt: '2026-10-18T08:00:00Z',
    xp: t.xp,
    category: t.category,
    difficulty: t.difficulty,
  }));

  const stateReadyForBoss = createMockState({
    unlockedPackages: ['pkg-master-python'],
    completions: precedingCompletions,
  });

  const bossReadyCheck = canAttemptTask(stateReadyForBoss, pythonPkg, bossTask);
  assert.equal(bossReadyCheck.canAttempt, true);

  // Complete Boss
  const bossRes = completePackageTask(stateReadyForBoss, pythonPkg.id, bossTask.id);
  // Should include boss task + package clear bonus
  assert.equal(bossRes.addedEntries.length, 2);
  const clearEntry = bossRes.addedEntries.find(e => e.kind === 'clear');
  assert.ok(clearEntry);
  assert.equal(clearEntry?.xp, pythonPkg.clearBonusXp); // 200 XP bonus
});

test('Cart calculations: combo pricing and coupons LEVELUP10 & FRESHMAN', () => {
  // If user owns 0 packages, combo can be purchased (7 unowned >= 3)
  const { canBuy } = calculateComboPrice([]);
  assert.equal(canBuy, true);

  // Cart with single package 15.000đ + coupon LEVELUP10 (10% off)
  const cart1 = calculateCart(['pkg-master-python'], [], 'LEVELUP10');
  assert.equal(cart1.subtotal, 15000);
  assert.equal(cart1.discount, 1500);
  assert.equal(cart1.total, 13500);

  // Coupon FRESHMAN (5.000đ off for orders >= 20.000đ)
  const cart2 = calculateCart(['pkg-master-python'], [], 'FRESHMAN');
  assert.equal(cart2.isCouponValid, false); // 15.000 < 20.000

  const cart3 = calculateCart(['pkg-master-python', 'pkg-gym-rat'], [], 'FRESHMAN');
  // 15.000 + 10.000 = 25.000 >= 20.000
  assert.equal(cart3.subtotal, 25000);
  assert.equal(cart3.discount, 5000);
  assert.equal(cart3.total, 20000);
});

test('Exam grading and hearts calculation', () => {
  // 10 questions, 70% pass threshold -> 4 hearts
  assert.equal(calculateExamHearts(10, 70), 4);

  const pythonExam = EXAMS.find(e => e.id === 'exam-python')!;
  const testQuestions = pythonExam.questions.slice(0, 10);

  // User answers all correctly
  const userAnswers: Record<string, number> = {};
  for (const q of testQuestions) {
    userAnswers[q.id] = q.correctIndex;
  }

  const state = createMockState();
  const result = gradeExamSession(state, pythonExam, userAnswers, testQuestions);

  assert.equal(result.historyEntry.percentage, 100);
  assert.equal(result.historyEntry.passed, true);
  assert.equal(result.historyEntry.grade, 'S');
  // Should award pass XP (50) and perfect XP (25)
  assert.equal(result.addedCompletions.length, 2);
});

test('Wardrobe: UNEQUIP_ALL_GEAR and UNEQUIP_EVERYTHING clear all gear and accessories', () => {
  const initial = createMockState({
    profile: {
      nickname: 'Hero',
      characterId: 'hero',
      createdAt: '2026-10-01T00:00:00.000Z',
      motionPreference: 'system',
    },
    equippedGear: {
      hero: {
        head: 'gear-headband-red',
        body: 'gear-hoodie-pixel',
      },
    },
    equippedCustomGearIds: ['custom-hat-1', 'custom-glasses-2'],
    equippedCosmetics: {
      backdrop: 'cos-bg-starry',
      aura: 'cos-aura-fire',
    },
  });

  // Test UNEQUIP_ALL_GEAR
  const afterGearUnequip = gameReducer(initial, {
    type: 'UNEQUIP_ALL_GEAR',
    payload: { characterId: 'hero' },
  }).state;
  assert.deepEqual(afterGearUnequip.equippedGear.hero, undefined);
  assert.deepEqual(afterGearUnequip.equippedCustomGearIds, []);
  assert.equal(afterGearUnequip.equippedCosmetics.backdrop, 'cos-bg-starry');

  // Test UNEQUIP_EVERYTHING
  const afterEverythingUnequip = gameReducer(initial, {
    type: 'UNEQUIP_EVERYTHING',
    payload: { characterId: 'hero' },
  }).state;
  assert.deepEqual(afterEverythingUnequip.equippedGear, {});
  assert.deepEqual(afterEverythingUnequip.equippedCustomGearIds, []);
  assert.deepEqual(afterEverythingUnequip.equippedCosmetics, {});
});

test('Custom GIFs: CLEAR_ALL_CUSTOM_GIFS and REMOVE_CUSTOM_CHARACTER work properly', () => {
  const initial = createMockState({
    profile: {
      nickname: 'CustomGuy',
      characterId: 'custom-char-123',
      createdAt: '2026-10-01T00:00:00.000Z',
      motionPreference: 'system',
    },
    customCharacters: [
      {
        id: 'custom-char-123',
        displayName: 'Custom Hero',
        tagline: 'Pixel fan',
        idleSrc: 'blob:http://localhost/abc',
        pixelArt: true,
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ],
    customGearMeta: [
      {
        id: 'custom-gear-456',
        name: 'Cool Hat',
        slot: 'head',
        imageBlobUrl: 'blob:http://localhost/def',
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        flipX: false,
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ],
    equippedCustomGearIds: ['custom-gear-456'],
  });

  // Test removing the active custom character
  const afterRemoveChar = gameReducer(initial, {
    type: 'REMOVE_CUSTOM_CHARACTER',
    payload: { id: 'custom-char-123' },
  }).state;
  assert.equal(afterRemoveChar.customCharacters?.length, 0);
  assert.equal(afterRemoveChar.profile.characterId, 'hero');

  // Test CLEAR_ALL_CUSTOM_GIFS
  const afterClearAll = gameReducer(initial, {
    type: 'CLEAR_ALL_CUSTOM_GIFS',
  }).state;
  assert.deepEqual(afterClearAll.customCharacters, []);
  assert.deepEqual(afterClearAll.customGearMeta, []);
  assert.deepEqual(afterClearAll.equippedCustomGearIds, []);
  assert.equal(afterClearAll.profile.characterId, 'hero');
});
