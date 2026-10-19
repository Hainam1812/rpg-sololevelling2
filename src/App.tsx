import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './store/GameContext.js';
import { AppShell } from './components/layout/AppShell.js';

// Code splitting via React.lazy as requested
const LandingPage = lazy(() => import('./pages/LandingPage.js').then(m => ({ default: m.LandingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage.js').then(m => ({ default: m.DashboardPage })));
const QuestsPage = lazy(() => import('./pages/QuestsPage.js').then(m => ({ default: m.QuestsPage })));
const CampusMapPage = lazy(() => import('./pages/CampusMapPage.js').then(m => ({ default: m.CampusMapPage })));
const EventsPage = lazy(() => import('./pages/EventsPage.js').then(m => ({ default: m.EventsPage })));
const WardrobePage = lazy(() => import('./pages/WardrobePage.js').then(m => ({ default: m.WardrobePage })));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage.js').then(m => ({ default: m.AchievementsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage.js').then(m => ({ default: m.ProfilePage })));
const PackagesPage = lazy(() => import('./pages/PackagesPage.js').then(m => ({ default: m.PackagesPage })));
const PackageDetailPage = lazy(() => import('./pages/PackageDetailPage.js').then(m => ({ default: m.PackageDetailPage })));
const CartPage = lazy(() => import('./pages/CartPage.js').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.js').then(m => ({ default: m.CheckoutPage })));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage.js').then(m => ({ default: m.OrderDetailPage })));
const AboutPage = lazy(() => import('./pages/AboutPage.js').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage.js').then(m => ({ default: m.ContactPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.js').then(m => ({ default: m.NotFoundPage })));

const LoadingSpinner: React.FC = () => (
  <div className="py-24 flex flex-col items-center justify-center space-y-3">
    <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
    <span className="text-xs font-pixel text-violet-300">Đang tải Dungeon...</span>
  </div>
);

export default function App() {
  return (
    <HashRouter>
      <GameProvider>
        <AppShell>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Area */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/packages" element={<PackagesPage />} />
              <Route path="/packages/:id" element={<PackageDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order/:id" element={<OrderDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* Game Area */}
              <Route path="/play" element={<DashboardPage />} />
              <Route path="/play/quests" element={<QuestsPage />} />
              <Route path="/play/map" element={<CampusMapPage />} />
              <Route path="/play/events" element={<EventsPage />} />
              <Route path="/play/wardrobe" element={<WardrobePage />} />
              <Route path="/play/achievements" element={<AchievementsPage />} />
              <Route path="/play/profile" element={<ProfilePage />} />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AppShell>
      </GameProvider>
    </HashRouter>
  );
}
