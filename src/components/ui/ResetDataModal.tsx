import React, { useState } from 'react';
import { Button } from './Button.js';
import { AlertTriangle, Trash2, Flame, ShieldAlert, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { useGame } from '../../store/GameContext.js';
import { clearAllCustomBlobs } from '../../store/indexedDb.js';
import { STORAGE_KEY, getDefaultState, saveStateToStorageImmediate } from '../../store/persistence.js';

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ResetDataModal: React.FC<ResetDataModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { dispatch } = useGame();
  const [isResetting, setIsResetting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      // 1. Xóa toàn bộ file blob custom nhân vật & gear trong IndexedDB
      await clearAllCustomBlobs();

      // 2. Xóa localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }

      // 3. Đưa state reducer về mặc định
      dispatch({ type: 'RESET_DATA' });

      // 4. Lưu ngay lập tức default state
      saveStateToStorageImmediate(getDefaultState());

      setSuccessNotice(true);
      setTimeout(() => {
        setIsResetting(false);
        setSuccessNotice(false);
        onClose();
        onSuccess?.();
      }, 1200);
    } catch (err) {
      console.error('Lỗi khi reset data:', err);
      setIsResetting(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-[#161B40] border-2 border-rose-500/60 rounded-3xl shadow-[0_0_40px_rgba(244,63,94,0.3)] p-6 overflow-hidden flex flex-col space-y-5">
        {/* Close Button */}
        {!isResetting && !successNotice && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header with warning icon */}
        <div className="flex items-center gap-3.5 pb-3 border-b border-rose-900/40">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-900/40">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-pixel">
              Vùng Nguy Hiểm • Danger Zone
            </span>
            <h3 className="text-xl font-black font-heading text-slate-100">
              Đặt Lại Toàn Bộ Dữ Liệu
            </h3>
          </div>
        </div>

        {successNotice ? (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="text-lg font-bold text-slate-100 font-heading">
              Đặt lại thành công!
            </h4>
            <p className="text-xs text-slate-300">
              Toàn bộ dữ liệu đã được làm mới. Đang chuẩn bị nhân vật cho hành trình mới...
            </p>
          </div>
        ) : (
          <>
            {/* Warning details */}
            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#0F132E]/80 p-4 rounded-2xl border border-rose-900/40">
              <p className="font-semibold text-rose-300">
                Thao tác này là <strong className="text-white underline">không thể hoàn tác</strong>. Mọi dữ liệu sau đây trên thiết bị sẽ được xóa sạch về mặc định:
              </p>
              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                <li><strong className="text-slate-100">Cấp độ & XP:</strong> Đặt lại về Level 1 (0 XP)</li>
                <li><strong className="text-slate-100">Chuỗi ngày (Streak):</strong> Đặt lại về 0 ngày</li>
                <li><strong className="text-slate-100">Bộ đếm thời gian nhiệm vụ:</strong> Toàn bộ timer đang chạy hoặc tạm dừng sẽ bị hủy</li>
                <li><strong className="text-slate-100">Tiến độ nhiệm vụ:</strong> Daily quests & gói nhiệm vụ trở về trạng thái chưa làm</li>
                <li><strong className="text-slate-100">Tủ đồ & Ngoại trang:</strong> Trả về các món đồ sơ cấp mặc định</li>
                <li><strong className="text-slate-100">Avatar & GIF tự tải lên:</strong> Xóa vĩnh viễn khỏi bộ nhớ trình duyệt</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={isResetting}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                size="md"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handleConfirmReset}
                disabled={isResetting}
              >
                {isResetting ? 'Đang đặt lại...' : 'Xác Nhận Reset Data'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
