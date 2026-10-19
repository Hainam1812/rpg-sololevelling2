import React from 'react';
import { useGame } from '../../store/GameContext.js';
import { Button } from './Button.js';
import { Sparkles, Trophy, Award, Shirt, ArrowUpRight } from 'lucide-react';
import { getCosmeticById } from '../../data/cosmetics.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';

export const NotificationModal: React.FC = () => {
  const { currentNotification, dismissNotification, dispatch } = useGame();

  if (!currentNotification) return null;

  const handleEquipCosmetic = (cosmeticId: string) => {
    const cos = getCosmeticById(cosmeticId);
    if (cos) {
      dispatch({ type: 'EQUIP_COSMETIC', payload: { slot: cos.slot, cosmeticId: cos.id } });
    }
    dismissNotification();
  };

  const renderContent = () => {
    switch (currentNotification.type) {
      case 'level_up':
        return (
          <div className="text-center py-4 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-amber-400 p-1 flex items-center justify-center animate-bounce">
              <div className="w-full h-full bg-[#0A0E27] rounded-full flex flex-col items-center justify-center border-2 border-amber-300">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Level</span>
                <span className="text-3xl font-black text-white font-pixel">{currentNotification.level}</span>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black font-heading text-amber-400 tracking-wider drop-shadow-md">
                LEVEL UP!
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Bạn đã nâng cấp sức mạnh và mở khóa thêm nhiều đặc quyền mới!
              </p>
            </div>

            <Button variant="gold" fullWidth onClick={dismissNotification}>
              Tuyệt Vời! Tiếp Tục Lên Cấp
            </Button>
          </div>
        );

      case 'achievement_unlocked': {
        const ach = ACHIEVEMENTS.find(a => a.id === currentNotification.achievementId);
        return (
          <div className="text-center py-4 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#1E1B4B] border-2 border-amber-400/80 p-2 flex items-center justify-center shadow-lg shadow-amber-900/40">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>Thành Tựu Mới</span>
              </div>
              <h2 className="text-xl font-bold font-heading text-slate-100">
                {ach ? ach.title : currentNotification.title}
              </h2>
              <p className="text-sm text-slate-300 mt-2">
                {ach ? ach.description : currentNotification.message}
              </p>
            </div>

            <Button variant="primary" fullWidth onClick={dismissNotification}>
              Đã Nhận Thành Tựu
            </Button>
          </div>
        );
      }

      case 'cosmetic_unlocked': {
        const cos = getCosmeticById(currentNotification.cosmeticId || '');
        return (
          <div className="text-center py-4 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-900/80 to-indigo-950 border border-violet-400/60 p-2 flex items-center justify-center shadow-lg shadow-violet-900/50">
              <Shirt className="w-10 h-10 text-violet-300" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ngoại Trang Mới</span>
              </div>
              <h2 className="text-xl font-bold font-heading text-slate-100">
                {cos ? cos.name : currentNotification.title}
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                {cos ? cos.description : currentNotification.message}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={dismissNotification}
              >
                Để sau
              </Button>
              {cos && (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => handleEquipCosmetic(cos.id)}
                >
                  Trang bị ngay
                </Button>
              )}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold font-heading text-slate-100">
                {currentNotification.title}
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                {currentNotification.message}
              </p>
              {currentNotification.xpEarned && (
                <div className="inline-block mt-3 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold font-pixel text-sm">
                  +{currentNotification.xpEarned} XP
                </div>
              )}
            </div>

            <Button variant="primary" fullWidth onClick={dismissNotification}>
              Tiếp tục
            </Button>
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-[#161B40] border border-violet-500/50 rounded-2xl shadow-2xl overflow-hidden p-6 relative">
        {/* Glow corner element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">{renderContent()}</div>
      </div>
    </div>
  );
};
