import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '../store/GameContext.js';
import { selectDailyQuestsStatus, selectPackagesStatus } from '../store/selectors.js';
import { QuestCard } from '../components/game/QuestCard.js';
import { QuestDetailModal } from '../components/game/QuestDetailModal.js';
import { Button } from '../components/ui/Button.js';
import { Search, Filter, SlidersHorizontal, CheckCircle2, Compass, Layers, Check } from 'lucide-react';
import { canAttemptTask, isTaskCompleted } from '../domain/packages.js';

export const QuestsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch, now } = useGame();

  const currentTab = searchParams.get('tab') || 'daily';
  const searchQuery = searchParams.get('q') || '';
  const filterCategory = searchParams.get('cat') || 'all';
  const filterDifficulty = searchParams.get('diff') || 'all';

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<any | null>(null);

  const setTab = (tab: string) => {
    searchParams.set('tab', tab);
    setSearchParams(searchParams);
  };

  const setQuery = (q: string) => {
    if (q) searchParams.set('q', q);
    else searchParams.delete('q');
    setSearchParams(searchParams);
  };

  const setCategory = (cat: string) => {
    if (cat !== 'all') searchParams.set('cat', cat);
    else searchParams.delete('cat');
    setSearchParams(searchParams);
  };

  const setDifficulty = (diff: string) => {
    if (diff !== 'all') searchParams.set('diff', diff);
    else searchParams.delete('diff');
    setSearchParams(searchParams);
  };

  const dailyStatus = selectDailyQuestsStatus(state, now);
  const packagesStatus = selectPackagesStatus(state);

  // Compile list of quests according to active tab
  const displayedQuests = useMemo(() => {
    let list: Array<{
      id: string;
      name: string;
      description: string;
      condition: string;
      category: string;
      difficulty: any;
      xp: number;
      locationId: string;
      status: 'todo' | 'in_progress' | 'completed' | 'locked' | 'overdue';
      startedAt?: string;
      dueAt?: string;
      activeTaskState?: any;
      packageId?: string;
      isBoss?: boolean;
      lockReason?: string;
      source: 'daily' | 'package';
    }> = [];

    if (currentTab === 'daily') {
      list = dailyStatus.items.map(item => ({
        id: item.quest.id,
        name: item.quest.name,
        description: item.quest.description,
        condition: item.quest.condition,
        category: item.quest.category,
        difficulty: item.quest.difficulty,
        xp: item.quest.xp,
        locationId: item.quest.locationId,
        status: item.activeState ? 'in_progress' : item.isCompleted ? 'completed' : 'todo',
        startedAt: item.activeState?.startedAt,
        dueAt: item.activeState?.dueAt,
        activeTaskState: item.activeState,
        source: 'daily',
      }));
    } else if (currentTab === 'active') {
      // In progress daily quests + in progress package tasks
      const activeDailies = dailyStatus.items
        .filter(item => Boolean(item.activeState))
        .map(item => ({
          id: item.quest.id,
          name: item.quest.name,
          description: item.quest.description,
          condition: item.quest.condition,
          category: item.quest.category,
          difficulty: item.quest.difficulty,
          xp: item.quest.xp,
          locationId: item.quest.locationId,
          status: 'in_progress' as const,
          startedAt: item.activeState?.startedAt,
          dueAt: item.activeState?.dueAt,
          activeTaskState: item.activeState,
          source: 'daily' as const,
        }));

      const activePkgTasks: any[] = [];
      for (const p of packagesStatus) {
        if (p.isOwned && !p.isAbandoned) {
          for (const task of p.pkg.tasks) {
            const activeState = state.activeTasks[task.id];
            if (activeState) {
              activePkgTasks.push({
                id: task.id,
                name: task.title,
                description: task.description,
                condition: task.condition,
                category: task.category,
                difficulty: task.difficulty,
                xp: task.xp,
                locationId: task.locationId,
                status: 'in_progress' as const,
                startedAt: activeState.startedAt,
                dueAt: activeState.dueAt,
                activeTaskState: activeState,
                packageId: p.pkg.id,
                isBoss: task.isBoss,
                source: 'package' as const,
              });
            }
          }
        }
      }
      list = [...activeDailies, ...activePkgTasks];
    } else if (currentTab === 'packages') {
      // All tasks from packages
      for (const p of packagesStatus) {
        for (const task of p.pkg.tasks) {
          const check = canAttemptTask(state, p.pkg, task);
          const isDone = isTaskCompleted(state.completions, task.id);
          const activeState = state.activeTasks[task.id];

          const status = activeState
            ? 'in_progress'
            : isDone
            ? 'completed'
            : check.canAttempt
            ? 'todo'
            : 'locked';

          list.push({
            id: task.id,
            name: `${p.pkg.title}: ${task.title}`,
            description: task.description,
            condition: task.condition,
            category: task.category,
            difficulty: task.difficulty,
            xp: task.xp,
            locationId: task.locationId,
            status,
            startedAt: activeState?.startedAt,
            dueAt: activeState?.dueAt,
            activeTaskState: activeState,
            packageId: p.pkg.id,
            isBoss: task.isBoss,
            lockReason: check.reason,
            source: 'package',
          });
        }
      }
    } else if (currentTab === 'completed') {
      // Direct from ledger completions
      list = state.completions.map(c => ({
        id: c.key,
        name: c.questId,
        description: `Hoàn thành lúc ${new Date(c.completedAt).toLocaleString('vi-VN')}`,
        condition: 'Đã hoàn thành xác nhận',
        category: c.category,
        difficulty: c.difficulty,
        xp: c.xp,
        locationId: c.locationId || 'classroom',
        status: 'completed',
        source: c.kind === 'daily' ? 'daily' : 'package',
      }));
    }

    // Apply Search Filter
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      list = list.filter(
        item =>
          item.name.toLowerCase().includes(qLower) ||
          item.description.toLowerCase().includes(qLower) ||
          item.category.toLowerCase().includes(qLower)
      );
    }

    // Apply Category Filter
    if (filterCategory !== 'all') {
      list = list.filter(item => item.category.toLowerCase() === filterCategory.toLowerCase());
    }

    // Apply Difficulty Filter
    if (filterDifficulty !== 'all') {
      list = list.filter(item => item.difficulty === filterDifficulty);
    }

    return list;
  }, [currentTab, dailyStatus, packagesStatus, state, searchQuery, filterCategory, filterDifficulty]);

  return (
    <div className="space-y-6">
      {/* Title & Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-100 flex items-center gap-2">
            <Compass className="w-6 h-6 text-violet-400" />
            <span>Nhiệm Vụ (Quests)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Chinh phục thử thách, tích lũy XP và nâng cấp bản thân mỗi ngày
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#161B40] border border-slate-700/60 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'daily', label: 'Daily' },
            { id: 'active', label: 'Đang làm' },
            { id: 'packages', label: 'Gói Quest' },
            { id: 'completed', label: 'Lịch sử' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                currentTab === t.id
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm kiếm nhiệm vụ, danh mục, từ khóa..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#161B40] border border-slate-700/60 focus:border-violet-500 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        {/* Desktop Quick Category Select */}
        <div className="hidden sm:flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={e => setCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#161B40] border border-slate-700/60 text-xs text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="all">Tất cả danh mục</option>
            <option value="academic">Academic</option>
            <option value="daily life">Daily Life</option>
            <option value="health">Health & Habits</option>
            <option value="personal growth">Personal Growth</option>
            <option value="code & technology">Code & Technology</option>
            <option value="productivity & planning">Productivity</option>
          </select>

          <select
            value={filterDifficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#161B40] border border-slate-700/60 text-xs text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="all">Tất cả độ khó</option>
            <option value="Easy">Easy (10 XP)</option>
            <option value="Normal">Normal (25 XP)</option>
            <option value="Hard">Hard (50 XP)</option>
            <option value="Boss">Boss (100 XP)</option>
          </select>
        </div>

        {/* Mobile Filter Button */}
        <button
          type="button"
          onClick={() => setIsFilterSheetOpen(true)}
          className="sm:hidden p-2.5 rounded-xl bg-[#161B40] border border-slate-700 text-slate-300 hover:text-white"
          aria-label="Mở bộ lọc"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Quest Cards Grid */}
      {displayedQuests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#161B40]/50 border border-dashed border-slate-700 space-y-3">
          <Compass className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">Không tìm thấy nhiệm vụ phù hợp</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy thử xóa bộ lọc tìm kiếm hoặc chuyển sang tab khác để tiếp tục cày nhiệm vụ.
          </p>
          {(searchQuery || filterCategory !== 'all' || filterDifficulty !== 'all') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery('');
                setCategory('all');
                setDifficulty('all');
              }}
            >
              Đặt lại bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedQuests.map(q => (
            <QuestCard
              key={q.id}
              id={q.id}
              name={q.name}
              description={q.description}
              category={q.category}
              difficulty={q.difficulty}
              xp={q.xp}
              status={q.status}
              startedAt={q.startedAt}
              dueAt={q.dueAt}
              activeTaskState={q.activeTaskState}
              isBoss={q.isBoss}
              lockReason={q.lockReason}
              onClickDetail={() => setSelectedQuest(q)}
              onStart={
                q.status === 'todo'
                  ? () => dispatch({ type: 'START_TASK', payload: { questId: q.id } })
                  : undefined
              }
              onReplay={
                q.status === 'completed'
                  ? () => dispatch({ type: 'START_TASK', payload: { questId: q.id } })
                  : undefined
              }
              onPause={
                q.status === 'in_progress' && !q.activeTaskState?.isPaused
                  ? (elapsed) => dispatch({ type: 'PAUSE_TASK', payload: { questId: q.id, elapsedSeconds: elapsed } })
                  : undefined
              }
              onResume={
                q.status === 'in_progress' && q.activeTaskState?.isPaused
                  ? () => dispatch({ type: 'RESUME_TASK', payload: { questId: q.id } })
                  : undefined
              }
              onResetTimer={
                q.status === 'in_progress'
                  ? () => dispatch({ type: 'RESET_TASK_TIMER', payload: { questId: q.id } })
                  : undefined
              }
              onAbandon={
                q.status === 'in_progress'
                  ? () => dispatch({ type: 'ABANDON_TASK', payload: { questId: q.id } })
                  : undefined
              }
              onComplete={
                q.status === 'todo' || q.status === 'in_progress'
                  ? () => {
                      if (q.source === 'daily') {
                        dispatch({ type: 'COMPLETE_DAILY_QUEST', payload: { questId: q.id } });
                      } else if (q.packageId) {
                        dispatch({
                          type: 'COMPLETE_PACKAGE_TASK',
                          payload: { packageId: q.packageId, taskId: q.id },
                        });
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Mobile Filter Sheet Modal */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full bg-[#161B40] border-t border-slate-700 rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="font-bold text-base text-slate-100">Bộ Lọc Nhiệm Vụ</h3>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="text-xs text-violet-400 font-bold"
              >
                Xong
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400">Danh mục:</label>
              <select
                value={filterCategory}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0F132E] border border-slate-700 text-xs text-slate-200"
              >
                <option value="all">Tất cả danh mục</option>
                <option value="academic">Academic</option>
                <option value="daily life">Daily Life</option>
                <option value="health">Health & Habits</option>
                <option value="personal growth">Personal Growth</option>
                <option value="code & technology">Code & Technology</option>
                <option value="productivity & planning">Productivity</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400">Độ khó:</label>
              <select
                value={filterDifficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0F132E] border border-slate-700 text-xs text-slate-200"
              >
                <option value="all">Tất cả độ khó</option>
                <option value="Easy">Easy (10 XP)</option>
                <option value="Normal">Normal (25 XP)</option>
                <option value="Hard">Hard (50 XP)</option>
                <option value="Boss">Boss (100 XP)</option>
              </select>
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={() => setIsFilterSheetOpen(false)}
            >
              Áp Dụng Bộ Lọc
            </Button>
          </div>
        </div>
      )}

      {/* Quest Detail Modal */}
      {(() => {
        const activeTaskState = selectedQuest ? state.activeTasks[selectedQuest.id] : undefined;
        const isCompleted = selectedQuest ? state.completions.some(c => c.questId === selectedQuest.id) : false;
        let status = selectedQuest?.status;
        if (activeTaskState) {
          status = 'in_progress';
        } else if (isCompleted) {
          status = 'completed';
        } else if (status === 'in_progress') {
          status = 'todo';
        }

        const liveQuest = selectedQuest ? {
          ...selectedQuest,
          status,
          activeTaskState,
        } : null;

        return (
          <QuestDetailModal
            isOpen={Boolean(selectedQuest)}
            onClose={() => setSelectedQuest(null)}
            quest={liveQuest}
            onStart={() => {
              if (selectedQuest) {
                dispatch({ type: 'START_TASK', payload: { questId: selectedQuest.id } });
              }
            }}
            onPause={(elapsed) => {
              if (selectedQuest) {
                dispatch({ type: 'PAUSE_TASK', payload: { questId: selectedQuest.id, elapsedSeconds: elapsed } });
              }
            }}
            onResume={() => {
              if (selectedQuest) {
                dispatch({ type: 'RESUME_TASK', payload: { questId: selectedQuest.id } });
              }
            }}
            onAbandon={() => {
              if (selectedQuest) {
                dispatch({ type: 'ABANDON_TASK', payload: { questId: selectedQuest.id } });
              }
            }}
            onComplete={() => {
              if (selectedQuest) {
                if (selectedQuest.source === 'daily') {
                  dispatch({ type: 'COMPLETE_DAILY_QUEST', payload: { questId: selectedQuest.id } });
                } else if (selectedQuest.packageId) {
                  dispatch({
                    type: 'COMPLETE_PACKAGE_TASK',
                    payload: { packageId: selectedQuest.packageId, taskId: selectedQuest.id },
                  });
                }
              }
            }}
          />
        );
      })()}
    </div>
  );
};
