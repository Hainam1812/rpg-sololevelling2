import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card.js';
import { DifficultyBadge, StatusBadge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { DifficultyLevel } from '../../config/progression.js';
import { Check, Clock, Play, Lock, Sparkles, ChevronRight } from 'lucide-react';

export interface QuestCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: DifficultyLevel;
  xp: number;
  status: 'todo' | 'in_progress' | 'completed' | 'locked' | 'overdue';
  startedAt?: string;
  dueAt?: string;
  isBoss?: boolean;
  lockReason?: string;
  onStart?: () => void;
  onComplete?: () => void;
  onClickDetail?: () => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({
  id,
  name,
  description,
  category,
  difficulty,
  xp,
  status,
  startedAt,
  dueAt,
  isBoss = false,
  lockReason,
  onStart,
  onComplete,
  onClickDetail,
}) => {
  const [elapsedSec, setElapsedSec] = useState(0);

  // Timer for in-progress quests
  useEffect(() => {
    if (status === 'in_progress' && startedAt) {
      const startMs = new Date(startedAt).getTime();
      const updateTimer = () => {
        const nowMs = Date.now();
        setElapsedSec(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [status, startedAt]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isCompleted = status === 'completed';
  const isLocked = status === 'locked';

  return (
    <Card
      variant={isBoss ? 'gold' : isCompleted ? 'surface' : 'interactive'}
      className={`p-4 transition-all duration-200 border-l-4 ${
        isBoss
          ? 'border-l-amber-400'
          : isCompleted
          ? 'border-l-emerald-500 opacity-80'
          : status === 'in_progress'
          ? 'border-l-amber-500'
          : 'border-l-violet-500'
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Header row: Category & Difficulty & XP Badge */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">
              {category}
            </span>
            <DifficultyBadge difficulty={difficulty} />
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-violet-950/80 border border-violet-500/40 text-violet-200 text-xs font-bold font-pixel">
              +{xp} XP
            </span>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Quest Title & Description */}
        <div
          onClick={onClickDetail}
          className="cursor-pointer group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onClickDetail?.()}
        >
          <div className="flex items-center justify-between">
            <h4
              className={`font-bold font-heading text-base group-hover:text-violet-300 transition-colors flex items-center gap-1.5 ${
                isCompleted ? 'line-through text-slate-400' : 'text-slate-100'
              }`}
            >
              {isBoss && <span className="text-amber-400">👑</span>}
              <span>{name}</span>
            </h4>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-300 transition-transform group-hover:translate-x-0.5 shrink-0" />
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Real-time timer or Lock Notice */}
        {status === 'in_progress' && (
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-pixel bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/30 w-fit">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>Thời gian đã chạy: {formatTimer(elapsedSec)}</span>
          </div>
        )}

        {isLocked && lockReason && (
          <div className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-800/60">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>{lockReason}</span>
          </div>
        )}

        {/* Action Button Row */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-700/40">
          {onClickDetail && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClickDetail}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Xem chi tiết
            </Button>
          )}

          {status === 'todo' && onStart && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={onStart}
            >
              Bắt đầu
            </Button>
          )}

          {(status === 'todo' || status === 'in_progress') && onComplete && (
            <Button
              variant={isBoss ? 'gold' : 'primary'}
              size="sm"
              icon={<Check className="w-4 h-4" />}
              onClick={onComplete}
            >
              Hoàn thành
            </Button>
          )}

          {isCompleted && (
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 py-1 px-2 rounded-lg bg-emerald-950/40">
              <Check className="w-4 h-4" />
              <span>Đã nhận +{xp} XP</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
