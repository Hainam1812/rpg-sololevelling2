import React, { useState } from 'react';
import { useGame } from '../../store/GameContext.js';
import charactersData from '../../data/characters.json' with { type: 'json' };
import { Button } from '../ui/Button.js';
import { Sparkles, Check, User, Upload, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { saveCharBlob, deleteCharBlob } from '../../store/indexedDb.js';

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
  subtitle = 'Chào mừng bạn đến với SOLO LEVELLING! Chọn nhân vật sinh viên 2D Pixel hoặc tải lên file GIF riêng để bắt đầu hành trình!',
}) => {
  const { state, dispatch } = useGame();
  const [selectedId, setSelectedId] = useState<string>(
    state.profile.characterId || charactersData[0]?.id || 'hero'
  );
  const [nickname, setNickname] = useState<string>(state.profile.nickname || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [charName, setCharName] = useState('');
  const [charTagline, setCharTagline] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [charToDelete, setCharToDelete] = useState<{ id: string; displayName: string } | null>(null);

  if (!isOpen) return null;

  const builtInCharacters = Array.isArray(charactersData) ? charactersData : [];
  const customCharacters = state.customCharacters || [];
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File quá lớn! Dung lượng tối đa là 2 MB.');
      return;
    }

    if (!['image/gif', 'image/png', 'image/webp', 'image/apng'].includes(file.type)) {
      setUploadError('Vui lòng chọn file GIF, PNG hoặc WebP 2D Pixel.');
      return;
    }

    setUploadError(null);
    setUploadFile(file);
    const url = URL.createObjectURL(file);
    setUploadPreviewUrl(url);
  };

  const handleSaveCustomChar = async () => {
    if (!uploadFile || !charName.trim()) {
      setUploadError('Vui lòng chọn file ảnh GIF/PNG và đặt tên cho nhân vật.');
      return;
    }

    const newId = `custom-char-${Date.now()}`;
    await saveCharBlob(newId, uploadFile);

    const newChar = {
      id: newId,
      displayName: charName.trim(),
      tagline: charTagline.trim() || 'Sinh viên 2D Pixel',
      idleSrc: uploadPreviewUrl || '',
      pixelArt: true,
      createdAt: new Date().toISOString(),
    };

    dispatch({
      type: 'ADD_CUSTOM_CHARACTER',
      payload: { character: newChar },
    });

    setSelectedId(newId);
    setIsUploading(false);
    setUploadFile(null);
    setUploadPreviewUrl(null);
    setCharName('');
    setCharTagline('');
  };

  const handleConfirm = () => {
    let cleanNick = nickname.trim();
    if (!cleanNick) {
      cleanNick = 'Sinh Viên';
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
      <div className="w-full max-w-xl bg-[#161B40] border border-violet-500/50 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="text-center pb-4 border-b border-slate-700/60 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>2D Pixel RPG Sinh Viên</span>
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
              placeholder="VD: Nam, Mai, Minh, Hoàng, Lan..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-[#0F132E] border border-slate-700 focus:border-violet-500 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
            />
            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
            )}
          </div>

          {/* Character selection header */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Chọn nhân vật đại diện (2D Pixel GIF):
            </label>
            <button
              type="button"
              onClick={() => setIsUploading(!isUploading)}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Đóng tải lên' : 'Tải lên GIF riêng'}</span>
            </button>
          </div>

          {/* Custom Upload Section */}
          {isUploading && (
            <div className="p-4 rounded-2xl bg-[#0F132E] border border-cyan-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-heading">
                <Upload className="w-4 h-4" />
                <span>Tải Lên Nhân Vật 2D Pixel (GIF / PNG)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Hỗ trợ ảnh động GIF 2D Pixel hoặc PNG sprite. Hệ thống tự động áp dụng hiệu ứng hiển thị pixelated sắc nét!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="w-20 h-20 shrink-0 rounded-xl bg-[#161B40] border border-slate-700 flex items-center justify-center overflow-hidden">
                  {uploadPreviewUrl ? (
                    <img
                      src={uploadPreviewUrl}
                      alt="Preview"
                      className="max-h-full max-w-full object-contain pixelated"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 w-full space-y-2">
                  <input
                    type="file"
                    accept="image/gif,image/png,image/webp,image/apng"
                    onChange={handleFileSelect}
                    className="w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={charName}
                    onChange={e => setCharName(e.target.value)}
                    placeholder="Tên nhân vật (VD: Coder Tân Binh...)"
                    maxLength={20}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#161B40] border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    value={charTagline}
                    onChange={e => setCharTagline(e.target.value)}
                    placeholder="Khẩu hiệu ngắn..."
                    maxLength={40}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#161B40] border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={() => setIsUploading(false)}>
                  Hủy
                </Button>
                <Button size="sm" variant="cyan" onClick={handleSaveCustomChar}>
                  Lưu & Chọn Nhân Vật Này
                </Button>
              </div>
            </div>
          )}

          {/* Built-in and Custom Characters Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Built-in characters */}
            {builtInCharacters.map((char: any) => {
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
                  <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center relative my-1">
                    <img
                      src={imgSrc}
                      alt={char.displayName}
                      className="max-w-full max-h-full object-contain pointer-events-none pixelated"
                      draggable={false}
                    />
                  </div>

                  <div className="font-bold text-sm text-slate-100 mt-1 font-heading">
                    {char.displayName}
                  </div>
                  <div className="text-[11px] text-violet-300 line-clamp-1 mt-0.5">
                    {char.tagline || 'Chiến binh sinh viên'}
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Custom user uploaded characters */}
            {customCharacters.map(char => {
              const isSelected = selectedId === char.id;

              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedId(char.id)}
                  className={`relative p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center select-none ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-900/40 scale-[1.02]'
                      : 'bg-[#0F132E] border-slate-700/60 hover:border-slate-500 hover:bg-[#121738]'
                  }`}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center relative my-1">
                    {char.idleSrc ? (
                      <img
                        src={char.idleSrc}
                        alt={char.displayName}
                        className="max-w-full max-h-full object-contain pointer-events-none pixelated"
                        draggable={false}
                      />
                    ) : (
                      <span className="text-xs text-slate-500 font-pixel">Custom GIF</span>
                    )}
                  </div>

                  <div className="font-bold text-sm text-cyan-300 mt-1 font-heading">
                    {char.displayName}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {char.tagline || 'Nhân vật tải lên'}
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-600 flex items-center justify-center text-white shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setCharToDelete({ id: char.id, displayName: char.displayName });
                    }}
                    className="absolute top-2 left-2 p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    title="Xóa nhân vật"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-700/60 shrink-0">
          <Button variant="primary" fullWidth size="lg" onClick={handleConfirm}>
            Xác Nhận & Bắt Đầu
          </Button>
        </div>
      </div>

      {/* In-app Character Deletion Modal */}
      {charToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#161B40] border border-rose-500/50 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold font-heading">
              <Trash2 className="w-5 h-5" />
              <span>Xóa Nhân Vật 2D Pixel</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc muốn xóa nhân vật <strong className="text-white font-bold">"{charToDelete.displayName}"</strong>? Ảnh GIF/PNG của nhân vật sẽ được xóa vĩnh viễn khỏi thiết bị này.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <Button size="sm" variant="secondary" onClick={() => setCharToDelete(null)}>
                Hủy
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={async () => {
                  const targetId = charToDelete.id;
                  setCharToDelete(null);
                  await deleteCharBlob(targetId);
                  dispatch({ type: 'REMOVE_CUSTOM_CHARACTER', payload: { id: targetId } });
                  if (selectedId === targetId) {
                    setSelectedId('hero');
                  }
                }}
              >
                Xóa Vĩnh Viễn
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
