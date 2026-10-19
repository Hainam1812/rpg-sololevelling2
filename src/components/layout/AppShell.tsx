import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { BottomNav } from './BottomNav.js';
import { NotificationModal } from '../ui/NotificationModal.js';
import { CharacterSelectModal } from '../game/CharacterSelectModal.js';
import { useGame } from '../../store/GameContext.js';
import charactersData from '../../data/characters.json' with { type: 'json' };

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const { state } = useGame();

  const isPlayArea = location.pathname.startsWith('/play');
  const hasNickname = Boolean(state.profile.nickname && state.profile.nickname.trim());

  // Check if character ID in profile is still in manifest
  const characters = Array.isArray(charactersData) ? charactersData : [];
  const charExists = characters.some((c: any) => c.id === state.profile.characterId);

  // If visiting play area for the first time without nickname OR character in profile changed
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isPlayArea && (!hasNickname || !charExists)) {
      setShowOnboarding(true);
    }
  }, [isPlayArea, hasNickname, charExists]);

  return (
    <div className="min-h-screen bg-[#0A0E27] text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-20 md:pb-6">
        <Header />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Notification Queue Modal (Level up, Achievements, etc.) */}
      <NotificationModal />

      {/* Character Select Onboarding Modal */}
      <CharacterSelectModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        title={!charExists && hasNickname ? 'Bộ nhân vật đã thay đổi' : 'Chào Mừng Thợ Săn Mới'}
        subtitle={
          !charExists && hasNickname
            ? 'Bộ nhân vật đã được cập nhật. Hãy chọn lại bạn đồng hành, mọi tiến trình và XP của bạn vẫn được giữ nguyên vẹn!'
            : 'Hãy chọn bạn đồng hành và đặt danh xưng để bắt đầu hành trình Solo Levelling!'
        }
      />
    </div>
  );
};
