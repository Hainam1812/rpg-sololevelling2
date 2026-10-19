import React from 'react';
import { Modal } from '../ui/Modal.js';
import { DifficultyBadge, StatusBadge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { DifficultyLevel } from '../../config/progression.js';
import { Check, Play, MapPin, AlertCircle, Sparkles } from 'lucide-react';
import { getLocationById } from '../../data/locations.js';

interface QuestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quest: {
    id: string;
    name: string;
    description: string;
    condition: string;
    category: string;
    difficulty: DifficultyLevel;
    xp: number;
    locationId?: string;
    status: 'todo' | 'in_progress' | 'completed' | 'locked' | 'overdue';
    isBoss?: boolean;
    lockReason?: string;
  } | null;
  onStart?: () => void;
  onComplete?: () => void;
}

export const QuestDetailModal: React.FC<QuestDetailModalProps> = ({
  isOpen,
  onClose,
  quest,
  onStart,
  onComplete,
}) => {
  if (!quest) return null;

  const loc = quest.locationId ? getLocationById(quest.locationId) : undefined;
  const isCompleted = quest.status === 'completed';
  const isLocked = quest.status === 'locked';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={quest.name} maxWidth="md">
      <div className="space-y-5">
        {/* Badges & Meta */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">
              {quest.category}
            </span>
            <DifficultyBadge difficulty={quest.difficulty} />
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-violet-950 border border-violet-500/50 text-violet-200 text-xs font-bold font-pixel">
              +{quest.xp} XP
            </span>
            <StatusBadge status={quest.status} />
          </div>
        </div>

        {/* Quest Description */}
        <div className="space-y-1.5">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Nội dung nhiệm vụ:
          </h5>
          <p className="text-sm text-slate-200 leading-relaxed bg-[#0F132E]/70 p-3 rounded-xl border border-slate-800">
            {quest.description}
          </p>
        </div>

        {/* Specific Completion Condition */}
        <div className="space-y-1.5">
          <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Điều kiện hoàn thành xác thực:</span>
          </h5>
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs sm:text-sm text-amber-200 leading-relaxed font-medium">
            {quest.condition}
          </div>
        </div>

        {/* Location Lore info */}
        {loc && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#161B40] border border-slate-700/60 text-xs text-slate-300">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-100">{loc.name}</span>: {loc.lore}
            </div>
          </div>
        )}

        {/* Lock warning */}
        {isLocked && quest.lockReason && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{quest.lockReason}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-700/60">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>

          {quest.status === 'todo' && onStart && (
            <Button
              variant="secondary"
              icon={<Play className="w-4 h-4" />}
              onClick={() => {
                onStart();
                onClose();
              }}
            >
              Bắt đầu ngay
            </Button>
          )}

          {(quest.status === 'todo' || quest.status === 'in_progress') && onComplete && (
            <Button
              variant={quest.isBoss ? 'gold' : 'primary'}
              icon={<Check className="w-4 h-4" />}
              onClick={() => {
                onComplete();
                onClose();
              }}
            >
              Xác nhận hoàn thành (+{quest.xp} XP)
            </Button>
          )}

          {isCompleted && (
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" />
              <span>Đã hoàn thành</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
