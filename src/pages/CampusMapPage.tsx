import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useGame } from '../store/GameContext.js';
import { CAMPUS_LOCATIONS, LocationDef } from '../data/locations.js';
import { getAllLocationsMastery, getCampusHotspot } from '../domain/locations.js';
import { CharacterSprite } from '../components/game/CharacterSprite.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { QuestCard } from '../components/game/QuestCard.js';
import { QuestDetailModal } from '../components/game/QuestDetailModal.js';
import { DAILY_QUESTS } from '../data/dailyQuests.js';
import { QUEST_PACKAGES } from '../data/questPackages.js';
import { isDailyQuestCompleted } from '../domain/quests.js';
import { isTaskCompleted, canAttemptTask } from '../domain/packages.js';
import { getDateKey } from '../domain/dates.js';
import {
  Map as MapIcon,
  List,
  Sparkles,
  MapPin,
  Clock,
  ChevronRight,
  X,
  Compass,
} from 'lucide-react';

export const CampusMapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch, now } = useGame();

  const urlLocId = searchParams.get('loc');
  const [selectedLocId, setSelectedLocId] = useState<string>(
    urlLocId || state.lastLocationId || 'classroom'
  );
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedQuest, setSelectedQuest] = useState<any | null>(null);

  // Sync URL param
  useEffect(() => {
    if (urlLocId && urlLocId !== selectedLocId) {
      setSelectedLocId(urlLocId);
    }
  }, [urlLocId]);

  const selectLocation = (locId: string) => {
    setSelectedLocId(locId);
    searchParams.set('loc', locId);
    setSearchParams(searchParams);
    dispatch({ type: 'SET_LAST_LOCATION', payload: { locationId: locId } });
  };

  const locationsMastery = getAllLocationsMastery(state, now);
  const hotspot = getCampusHotspot(state, now);
  const selectedLocation =
    CAMPUS_LOCATIONS.find(l => l.id === selectedLocId) || CAMPUS_LOCATIONS[0];
  const selectedMastery = locationsMastery.find(m => m.location.id === selectedLocId);

  const dateKey = getDateKey(now);

  // Gather all quests available at the selected location
  const locationDailies = DAILY_QUESTS.filter(q => q.locationId === selectedLocId).map(q => {
    const isCompleted = isDailyQuestCompleted(state.completions, q.id, dateKey);
    const activeState = state.activeTasks[q.id];
    return {
      id: q.id,
      name: q.name,
      description: q.description,
      condition: q.condition,
      category: q.category,
      difficulty: q.difficulty,
      xp: q.xp,
      locationId: q.locationId,
      status: (isCompleted ? 'completed' : activeState ? 'in_progress' : 'todo') as any,
      startedAt: activeState?.startedAt,
      source: 'daily' as const,
    };
  });

  const locationPackageTasks: any[] = [];
  for (const pkg of QUEST_PACKAGES) {
    for (const t of pkg.tasks) {
      if (t.locationId === selectedLocId) {
        const check = canAttemptTask(state, pkg, t);
        const isDone = isTaskCompleted(state.completions, t.id);
        const activeState = state.activeTasks[t.id];
        locationPackageTasks.push({
          id: t.id,
          name: `${pkg.title}: ${t.title}`,
          description: t.description,
          condition: t.condition,
          category: t.category,
          difficulty: t.difficulty,
          xp: t.xp,
          locationId: t.locationId,
          status: isDone ? 'completed' : activeState ? 'in_progress' : check.canAttempt ? 'todo' : 'locked',
          startedAt: activeState?.startedAt,
          packageId: pkg.id,
          isBoss: t.isBoss,
          lockReason: check.reason,
          source: 'package' as const,
        });
      }
    }
  }

  const allLocationQuests = [...locationDailies, ...locationPackageTasks];

  return (
    <div className="space-y-6">
      {/* Top Header & Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-100 flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-cyan-400" />
            <span>Bản Đồ Campus (Campus Map)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Khám phá 9 địa điểm rèn luyện, cày nhiệm vụ và nâng cao độ thân quen khuôn viên trường
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#161B40] border border-slate-700/60 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'map' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Bản Đồ</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Danh Sách</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'map' ? (
        <div className="relative rounded-3xl bg-[#0A0D22] border border-slate-700/80 shadow-2xl overflow-hidden p-2 sm:p-4">
          {/* Top-down SVG Campus Visual */}
          <div className="relative w-full aspect-[16/10] min-h-[360px] sm:min-h-[480px]">
            <svg
              viewBox="0 0 800 480"
              className="w-full h-full select-none"
              aria-label="Sơ đồ tương tác khuôn viên trường"
            >
              <defs>
                {/* Grass Background Pattern */}
                <pattern id="campusGrass" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="#0A0E27" />
                  <circle cx="10" cy="10" r="1.5" fill="#14244D" />
                  <circle cx="30" cy="30" r="1.5" fill="#14244D" />
                </pattern>
                {/* Pathway texture */}
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E2656" />
                  <stop offset="100%" stopColor="#161B40" />
                </linearGradient>
              </defs>

              {/* Background */}
              <rect width="800" height="480" fill="url(#campusGrass)" />

              {/* Campus Walkways */}
              <path
                d="M 400 45 L 400 180 L 230 130 L 150 320 L 280 400 L 390 310 L 510 400 L 650 300 L 580 140 L 400 180 L 390 310"
                stroke="url(#pathGradient)"
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M 400 45 L 400 180 L 230 130 L 150 320 L 280 400 L 390 310 L 510 400 L 650 300 L 580 140 L 400 180 L 390 310"
                stroke="#334155"
                strokeWidth="2"
                strokeDasharray="6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.6"
              />

              {/* Campus Trees and Decorations */}
              <g opacity="0.4" fill="#065F46">
                <circle cx="320" cy="220" r="14" />
                <circle cx="480" cy="240" r="16" />
                <circle cx="180" cy="220" r="12" />
                <circle cx="620" cy="220" r="13" />
                <circle cx="320" cy="110" r="12" />
                <circle cx="490" cy="100" r="12" />
              </g>

              {/* Interactive Location Nodes */}
              {locationsMastery.map(({ location: loc, dailyQuestsToday, dailyQuestsDoneToday, level }) => {
                const isSelected = selectedLocId === loc.id;
                const isHot = hotspot.id === loc.id;
                const unfinished = dailyQuestsToday - dailyQuestsDoneToday;

                return (
                  <g
                    key={loc.id}
                    transform={`translate(${loc.x}, ${loc.y})`}
                    onClick={() => selectLocation(loc.id)}
                    className="cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    aria-label={`${loc.name}, cấp thân quen ${level}, ${unfinished} nhiệm vụ chưa làm`}
                    onKeyDown={e => e.key === 'Enter' && selectLocation(loc.id)}
                  >
                    {/* Hotspot Pulse */}
                    {isHot && (
                      <circle
                        cx="0"
                        cy="0"
                        r="34"
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="2"
                        className="animate-ping opacity-60"
                      />
                    )}

                    {/* Building Base Outline */}
                    <rect
                      x="-26"
                      y="-26"
                      width="52"
                      height="52"
                      rx="16"
                      fill={isSelected ? '#1E1B4B' : '#161B40'}
                      stroke={isSelected ? '#06B6D4' : loc.accentColor}
                      strokeWidth={isSelected ? '3.5' : '2'}
                      className="transition-all duration-200 drop-shadow-lg"
                    />

                    {/* Building Icon / Initial */}
                    <text
                      x="0"
                      y="6"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="14"
                      fontWeight="bold"
                      className="font-pixel pointer-events-none select-none"
                    >
                      {loc.name.charAt(0)}
                    </text>

                    {/* Quest Badge on top right */}
                    {unfinished > 0 && (
                      <g transform="translate(18, -18)">
                        <circle cx="0" cy="0" r="10" fill="#EF4444" stroke="#0A0E27" strokeWidth="2" />
                        <text
                          x="0"
                          y="3.5"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="10"
                          fontWeight="bold"
                          className="font-pixel pointer-events-none"
                        >
                          {unfinished}
                        </text>
                      </g>
                    )}

                    {/* Label underneath */}
                    <rect
                      x="-55"
                      y="32"
                      width="110"
                      height="20"
                      rx="6"
                      fill="#0F132E"
                      opacity="0.9"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="46"
                      textAnchor="middle"
                      fill={isSelected ? '#38BDF8' : '#E2E8F0'}
                      fontSize="10"
                      fontWeight="600"
                      className="pointer-events-none select-none"
                    >
                      {loc.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Character Sprite standing at selected location with 0.8s CSS transition! */}
            <div
              className="absolute pointer-events-none transition-all duration-700 ease-out z-20 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(selectedLocation.x / 800) * 100}%`,
                top: `${(selectedLocation.y / 480) * 100}%`,
              }}
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_8px_12px_rgba(0,0,0,0.8)] animate-bounce">
                <CharacterSprite characterId={state.profile.characterId} scale={0.7} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Accessible List View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locationsMastery.map(({ location: loc, level, xpEarned, dailyQuestsToday, dailyQuestsDoneToday }) => {
            const isSelected = selectedLocId === loc.id;
            const unfinished = dailyQuestsToday - dailyQuestsDoneToday;

            return (
              <Card
                key={loc.id}
                variant={isSelected ? 'glow' : 'interactive'}
                onClick={() => selectLocation(loc.id)}
                className={`p-4 border-l-4 cursor-pointer`}
                style={{ borderLeftColor: loc.accentColor }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold font-heading text-sm text-slate-100 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" style={{ color: loc.accentColor }} />
                    <span>{loc.name}</span>
                  </h3>
                  <span className="text-xs font-bold text-cyan-400 font-pixel">
                    Cấp {level}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {loc.lore}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-700/60 mt-2">
                  <span>{loc.recommendedTime}</span>
                  <span className="font-semibold text-violet-300">
                    {unfinished > 0 ? `${unfinished} nhiệm vụ chưa làm` : 'Đã xong hôm nay'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Location Details Sheet / Card */}
      <Card variant="surface" className="p-5 sm:p-6 space-y-4 border-t-4 border-t-cyan-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-cyan-400 uppercase font-pixel tracking-wider">
                {selectedLocation.category}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold font-pixel">
                Độ Thân Quen: Cấp {selectedMastery?.level || 1}/5 ({selectedMastery?.xpEarned || 0} XP)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-heading text-slate-100 mt-1">
              {selectedLocation.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              {selectedLocation.lore}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Khung giờ gợi ý: <strong>{selectedLocation.recommendedTime}</strong></span>
            </span>
          </div>
        </div>

        {/* Quests Available at this Location */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold font-heading text-slate-200 flex items-center gap-2">
            <Compass className="w-4 h-4 text-violet-400" />
            <span>Nhiệm Vụ Có Mặt Tại Địa Điểm Này ({allLocationQuests.length})</span>
          </h3>

          {allLocationQuests.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Hiện chưa có nhiệm vụ nào gắn riêng với khu vực này.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allLocationQuests.map(q => (
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
                  activeTaskState={state.activeTasks[q.id]}
                  isBoss={q.isBoss}
                  lockReason={q.lockReason}
                  onClickDetail={() => setSelectedQuest(q)}
                  onStart={
                    q.status === 'todo'
                      ? () => dispatch({ type: 'START_TASK', payload: { questId: q.id } })
                      : undefined
                  }
                  onPause={
                    q.status === 'in_progress' && !state.activeTasks[q.id]?.isPaused
                      ? (elapsed) => dispatch({ type: 'PAUSE_TASK', payload: { questId: q.id, elapsedSeconds: elapsed } })
                      : undefined
                  }
                  onResume={
                    q.status === 'in_progress' && state.activeTasks[q.id]?.isPaused
                      ? () => dispatch({ type: 'RESUME_TASK', payload: { questId: q.id } })
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
        </div>
      </Card>

      {/* Quest Detail Modal */}
      {(() => {
        const activeTaskState = selectedQuest ? state.activeTasks[selectedQuest.id] : undefined;
        const isCompleted = selectedQuest ? state.completions.some(c => c.questId === selectedQuest.id) : false;
        let status = selectedQuest?.status;
        if (isCompleted) {
          status = 'completed';
        } else if (activeTaskState) {
          status = 'in_progress';
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
