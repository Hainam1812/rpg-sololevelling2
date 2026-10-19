import { GameState, NotificationItem, CosmeticSlot, GearSlot, CustomGearItem, ExamHistoryEntry, Order } from './types.js';
import { completeDailyQuest } from '../domain/quests.js';
import { completePackageTask } from '../domain/packages.js';
import { completeEventTask } from '../domain/events.js';
import { evaluateAchievements } from '../domain/achievements.js';
import { evaluateNewCosmetics, getUnlockedCosmetics } from '../domain/cosmetics.js';
import { calculateLevelFromXp } from '../domain/progression.js';
import { getDefaultState } from './persistence.js';

export type Action =
  | { type: 'SET_PROFILE'; payload: { nickname?: string; characterId?: string; motionPreference?: 'system' | 'reduced' | 'full' } }
  | { type: 'START_TASK'; payload: { questId: string; dueAfterDays?: number } }
  | { type: 'COMPLETE_DAILY_QUEST'; payload: { questId: string; now?: Date } }
  | { type: 'COMPLETE_PACKAGE_TASK'; payload: { packageId: string; taskId: string; now?: Date } }
  | { type: 'ABANDON_PACKAGE'; payload: { packageId: string } }
  | { type: 'RESUME_PACKAGE'; payload: { packageId: string } }
  | { type: 'COMPLETE_EVENT_TASK'; payload: { eventId: string; taskId: string; now?: Date } }
  | { type: 'RECORD_EXAM_RESULT'; payload: { historyEntry: ExamHistoryEntry; addedCompletions: any[]; notifications: NotificationItem[] } }
  | { type: 'ADD_PERSONAL_EXAM'; payload: { title: string; examDate: string } }
  | { type: 'REMOVE_PERSONAL_EXAM'; payload: { id: string } }
  | { type: 'SET_LAST_LOCATION'; payload: { locationId: string } }
  | { type: 'EQUIP_COSMETIC'; payload: { slot: CosmeticSlot; cosmeticId: string } }
  | { type: 'UNEQUIP_COSMETIC'; payload: { slot: CosmeticSlot } }
  | { type: 'UNEQUIP_ALL_COSMETICS' }
  | { type: 'EQUIP_GEAR'; payload: { characterId: string; slot: GearSlot; gearId: string } }
  | { type: 'UNEQUIP_GEAR'; payload: { characterId: string; slot: GearSlot } }
  | { type: 'UNEQUIP_ALL_GEAR'; payload: { characterId: string } }
  | { type: 'MARK_COSMETIC_SEEN'; payload: { id: string } }
  | { type: 'MARK_GEAR_SEEN'; payload: { id: string } }
  | { type: 'ADD_CUSTOM_GEAR_META'; payload: { item: CustomGearItem } }
  | { type: 'REMOVE_CUSTOM_GEAR_META'; payload: { id: string } }
  | { type: 'UPDATE_CUSTOM_GEAR_ADJUST'; payload: { id: string; scale: number; offsetX: number; offsetY: number; flipX: boolean } }
  | { type: 'ADD_TO_CART'; payload: { packageId: string } }
  | { type: 'REMOVE_FROM_CART'; payload: { packageId: string } }
  | { type: 'APPLY_COUPON'; payload: { coupon: string | null } }
  | { type: 'CONFIRM_CHECKOUT'; payload: { order: Order; newlyUnlockedPackageIds: string[]; nextUnlockedPackages: string[] } }
  | { type: 'SUBMIT_CONTACT_MESSAGE'; payload: { name: string; email: string; subject: string; message: string } }
  | { type: 'RESET_DATA' };

export interface ReducerResult {
  state: GameState;
  notificationsQueue: NotificationItem[];
}

export function gameReducer(
  state: GameState,
  action: Action,
  now: Date = new Date()
): ReducerResult {
  const prevTotalXp = state.completions.reduce((s, c) => s + c.xp, 0);
  const prevLevel = calculateLevelFromXp(prevTotalXp);
  const prevCosmeticIds = new Set(getUnlockedCosmetics(state, now).map(c => c.id));

  let nextState: GameState = { ...state };
  let newNotifications: NotificationItem[] = [];

  switch (action.type) {
    case 'SET_PROFILE': {
      nextState = {
        ...state,
        profile: {
          ...state.profile,
          ...action.payload,
        },
      };
      break;
    }

    case 'START_TASK': {
      const { questId, dueAfterDays } = action.payload;
      const startedAt = now.toISOString();
      let dueAt: string | undefined = undefined;
      if (dueAfterDays) {
        const d = new Date(now);
        d.setDate(d.getDate() + dueAfterDays);
        dueAt = d.toISOString();
      }

      nextState = {
        ...state,
        activeTasks: {
          ...state.activeTasks,
          [questId]: { startedAt, dueAt },
        },
      };
      break;
    }

    case 'COMPLETE_DAILY_QUEST': {
      const res = completeDailyQuest(state, action.payload.questId, action.payload.now || now);
      if (res.addedEntry) {
        // Remove from active tasks
        const nextActive = { ...state.activeTasks };
        delete nextActive[action.payload.questId];

        nextState = {
          ...state,
          completions: res.nextCompletions,
          activeTasks: nextActive,
          lastLocationId: res.addedEntry.locationId || state.lastLocationId,
        };
        if (res.notification) newNotifications.push(res.notification);
      }
      break;
    }

    case 'COMPLETE_PACKAGE_TASK': {
      const res = completePackageTask(
        state,
        action.payload.packageId,
        action.payload.taskId,
        action.payload.now || now
      );
      if (res.addedEntries.length > 0) {
        const nextActive = { ...state.activeTasks };
        delete nextActive[action.payload.taskId];

        nextState = {
          ...state,
          completions: res.nextCompletions,
          activeTasks: nextActive,
          lastLocationId: res.addedEntries[0].locationId || state.lastLocationId,
        };
        newNotifications.push(...res.notifications);
      }
      break;
    }

    case 'ABANDON_PACKAGE': {
      const pkgId = action.payload.packageId;
      if (!state.abandonedPackages.includes(pkgId)) {
        nextState = {
          ...state,
          abandonedPackages: [...state.abandonedPackages, pkgId],
        };
      }
      break;
    }

    case 'RESUME_PACKAGE': {
      const pkgId = action.payload.packageId;
      nextState = {
        ...state,
        abandonedPackages: state.abandonedPackages.filter(id => id !== pkgId),
      };
      break;
    }

    case 'COMPLETE_EVENT_TASK': {
      const res = completeEventTask(
        state,
        action.payload.eventId,
        action.payload.taskId,
        action.payload.now || now
      );
      if (res.addedEntries.length > 0) {
        nextState = {
          ...state,
          completions: res.nextCompletions,
          lastLocationId: res.addedEntries[0].locationId || state.lastLocationId,
        };
        newNotifications.push(...res.notifications);
      }
      break;
    }

    case 'RECORD_EXAM_RESULT': {
      const { historyEntry, addedCompletions, notifications } = action.payload;
      const nextHistory = [historyEntry, ...state.examHistory].slice(0, 20); // Keep last 20
      nextState = {
        ...state,
        completions: [...state.completions, ...addedCompletions],
        examHistory: nextHistory,
        lastLocationId: 'event-hall',
      };
      newNotifications.push(...notifications);
      break;
    }

    case 'ADD_PERSONAL_EXAM': {
      const newGoal = {
        id: `exam-goal-${Date.now()}`,
        title: action.payload.title,
        examDate: action.payload.examDate,
        createdAt: now.toISOString(),
      };
      nextState = {
        ...state,
        personalExams: [newGoal, ...state.personalExams].slice(0, 10),
      };
      break;
    }

    case 'REMOVE_PERSONAL_EXAM': {
      nextState = {
        ...state,
        personalExams: state.personalExams.filter(g => g.id !== action.payload.id),
      };
      break;
    }

    case 'SET_LAST_LOCATION': {
      nextState = {
        ...state,
        lastLocationId: action.payload.locationId,
      };
      break;
    }

    case 'EQUIP_COSMETIC': {
      nextState = {
        ...state,
        equippedCosmetics: {
          ...state.equippedCosmetics,
          [action.payload.slot]: action.payload.cosmeticId,
        },
      };
      break;
    }

    case 'UNEQUIP_COSMETIC': {
      const nextEquipped = { ...state.equippedCosmetics };
      delete nextEquipped[action.payload.slot];
      nextState = {
        ...state,
        equippedCosmetics: nextEquipped,
      };
      break;
    }

    case 'UNEQUIP_ALL_COSMETICS': {
      nextState = {
        ...state,
        equippedCosmetics: {},
      };
      break;
    }

    case 'EQUIP_GEAR': {
      const { characterId, slot, gearId } = action.payload;
      const charGear = { ...(state.equippedGear[characterId] || {}) };
      charGear[slot] = gearId;
      nextState = {
        ...state,
        equippedGear: {
          ...state.equippedGear,
          [characterId]: charGear,
        },
      };
      break;
    }

    case 'UNEQUIP_GEAR': {
      const { characterId, slot } = action.payload;
      const charGear = { ...(state.equippedGear[characterId] || {}) };
      delete charGear[slot];
      nextState = {
        ...state,
        equippedGear: {
          ...state.equippedGear,
          [characterId]: charGear,
        },
      };
      break;
    }

    case 'UNEQUIP_ALL_GEAR': {
      const { characterId } = action.payload;
      const nextGear = { ...state.equippedGear };
      delete nextGear[characterId];
      nextState = {
        ...state,
        equippedGear: nextGear,
      };
      break;
    }

    case 'MARK_COSMETIC_SEEN': {
      if (!state.seenCosmetics.includes(action.payload.id)) {
        nextState = {
          ...state,
          seenCosmetics: [...state.seenCosmetics, action.payload.id],
        };
      }
      break;
    }

    case 'MARK_GEAR_SEEN': {
      if (!state.seenGear.includes(action.payload.id)) {
        nextState = {
          ...state,
          seenGear: [...state.seenGear, action.payload.id],
        };
      }
      break;
    }

    case 'ADD_CUSTOM_GEAR_META': {
      nextState = {
        ...state,
        customGearMeta: [action.payload.item, ...state.customGearMeta].slice(0, 30),
      };
      break;
    }

    case 'REMOVE_CUSTOM_GEAR_META': {
      nextState = {
        ...state,
        customGearMeta: state.customGearMeta.filter(i => i.id !== action.payload.id),
      };
      break;
    }

    case 'UPDATE_CUSTOM_GEAR_ADJUST': {
      const { id, scale, offsetX, offsetY, flipX } = action.payload;
      nextState = {
        ...state,
        customGearMeta: state.customGearMeta.map(item =>
          item.id === id ? { ...item, scale, offsetX, offsetY, flipX } : item
        ),
      };
      break;
    }

    case 'ADD_TO_CART': {
      const id = action.payload.packageId;
      // If adding combo, remove other package IDs
      if (id === 'combo_full_party') {
        nextState = {
          ...state,
          cart: ['combo_full_party'],
        };
      } else {
        // If combo is already in cart, don't add individual package
        if (state.cart.includes('combo_full_party')) {
          break;
        }
        if (!state.cart.includes(id)) {
          nextState = {
            ...state,
            cart: [...state.cart, id],
          };
        }
      }
      break;
    }

    case 'REMOVE_FROM_CART': {
      nextState = {
        ...state,
        cart: state.cart.filter(id => id !== action.payload.packageId),
      };
      break;
    }

    case 'APPLY_COUPON': {
      nextState = {
        ...state,
        appliedCoupon: action.payload.coupon,
      };
      break;
    }

    case 'CONFIRM_CHECKOUT': {
      const { order, newlyUnlockedPackageIds, nextUnlockedPackages } = action.payload;
      nextState = {
        ...state,
        orders: [order, ...state.orders],
        unlockedPackages: nextUnlockedPackages,
        cart: [],
        appliedCoupon: null,
      };
      newNotifications.push({
        id: `notif-order-${order.id}`,
        type: 'packages_unlocked',
        title: 'MỞ KHÓA GÓI THÀNH CÔNG!',
        message: `Đã mở khóa ${newlyUnlockedPackageIds.length} gói nhiệm vụ mới. Hãy bắt đầu cày ngay!`,
        packageIds: newlyUnlockedPackageIds,
      });
      break;
    }

    case 'SUBMIT_CONTACT_MESSAGE': {
      const newMsg = {
        id: `msg-${Date.now()}`,
        ...action.payload,
        sentAt: now.toISOString(),
      };
      nextState = {
        ...state,
        contactMessages: [newMsg, ...state.contactMessages],
      };
      break;
    }

    case 'RESET_DATA': {
      nextState = getDefaultState();
      break;
    }

    default:
      return { state, notificationsQueue: [] };
  }

  // Check Level-Up
  const nextTotalXp = nextState.completions.reduce((s, c) => s + c.xp, 0);
  const nextLevel = calculateLevelFromXp(nextTotalXp);
  if (nextLevel > prevLevel) {
    newNotifications.push({
      id: `lvl-${nextLevel}-${Date.now()}`,
      type: 'level_up',
      title: 'LEVEL UP!',
      message: `Chúc mừng bạn đã thăng cấp lên Level ${nextLevel}!`,
      level: nextLevel,
    });
  }

  // Check Achievements
  const achEval = evaluateAchievements(nextState, now);
  if (achEval.newlyUnlockedIds.length > 0) {
    nextState = {
      ...nextState,
      unlockedAchievements: Array.from(
        new Set([...nextState.unlockedAchievements, ...achEval.newlyUnlockedIds])
      ),
    };
    newNotifications.push(...achEval.notifications);
  }

  // Check Cosmetics
  const cosEval = evaluateNewCosmetics(prevCosmeticIds, nextState, now);
  if (cosEval.newlyUnlocked.length > 0) {
    newNotifications.push(...cosEval.notifications);
  }

  return {
    state: nextState,
    notificationsQueue: newNotifications,
  };
}
