import React, { useState } from 'react';
import { useGame } from '../../store/GameContext.js';
import charactersData from '../../data/characters.json' with { type: 'json' };
import { Button } from '../ui/Button.js';
import { Sparkles, Check, User } from 'lucide-react';

interface CharacterSelectModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  isOpen,
  onClose,
  title = 'Chọn Nhân Vật & Biệt Danh',
  subtitle = 'Chào mừng bạn đến với SOLO LEVELLING! Hãy tạo danh xưng và chọn bạn đồng hành để bắt đầu chuỗi ngày lên cấp!',
}) => {
  const { state, dispatch } = useGame();
  const [selectedId, setSelectedId] = useState<string>(
    state.profile.characterId || charactersData[0]?.id || 'hero'
  );
  const [nickname, setNickname] = useState<string>(state.profile.nickname || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const characters = Array.isArray(charactersData) ? charactersData : [];
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');

  const handleConfirm = () => {
    let cleanNick = nickname.trim();
    if (!cleanNick) {
      cleanNick = 'Adventurer';
    } else if (cleanNick.length < 2 || cleanNick.length > 20) {
      setErrorMsg('Biệt danh cần dài từ 2 đến 20 ký tự.');
      return;
    }

    dispatch({
      type: 'SET_PROFILE',
      payload: {
        characterId: selectedId,
        nickname: cleanNick,
      },
    });

    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-[#161B40] border border-violet-500/50 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="text-center pb-4 border-b border-slate-700/60 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Khởi Đầu Hành Trình</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-slate-100">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-md mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="py-5 overflow-y-auto space-y-5 flex-1 pr-1">
          {/* Nickname Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-violet-400" />
              <span>Biệt danh của bạn (2 - 20 ký tự):</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => {
                setNickname(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Nhập tên thợ săn (VD: Jinwoo, Minh, Lan...)"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-[#0F132E] border border-slate-700 focus:border-violet-500 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
            />
            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
            )}
          </div>

          {/* Character selection grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Chọn nhân vật đại diện:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {characters.map((char: any) => {
                const isSelected = selectedId === char.id;
                const imgSrc = `${baseUrl}/${char.idle.src.replace(/^\//, '')}`;

                return (
                  <div
                    key={char.id}
                    onClick={() => setSelectedId(char.id)}
                    className={`relative p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center select-none ${
                      isSelected
                        ? 'bg-violet-950/40 border-violet-400 shadow-lg shadow-violet-900/40 scale-[1.02]'
                        : 'bg-[#0F132E] border-slate-700/60 hover:border-slate-500 hover:bg-[#121738]'
                    }`}
                  >
                    {/* Character Sprite Stage */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center relative my-1">
                      <img
                        src={imgSrc}
                        alt={char.displayName}
                        className={`max-w-full max-h-full object-contain pointer-events-none ${
                          char.pixelArt ? 'pixelated' : ''
                        }`}
                        draggable={false}
                      />
                    </div>

                    <div className="font-bold text-sm text-slate-100 mt-1">
                      {char.displayName}
                    </div>
                    <div className="text-[11px] text-violet-300 line-clamp-1 mt-0.5">
                      {char.tagline || 'Chiến binh sẵn sàng'}
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-700/60 shrink-0">
          <Button variant="primary" fullWidth size="lg" onClick={handleConfirm}>
            Xác Nhận & Bắt Đầu
          </Button>
        </div>
      </div>
    </div>
  );
};
