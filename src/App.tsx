import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import DigitalMenuManager from './components/DigitalMenuManager';
import OrdersManager from './components/OrdersManager';
import CustomersLoyalty from './components/CustomersLoyalty';
import FinancialManager from './components/FinancialManager';
import AISmartAssistant from './components/AISmartAssistant';
import VisualCustomizer from './components/VisualCustomizer';
import PublicMenuPage from './components/PublicMenuPage';
import LandingPages from './components/LandingPages';
import LoginPage from './components/LoginPage';
import TrialSignupPage from './components/TrialSignupPage';
import PlanRenewalOverlay from './components/PlanRenewalOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import { Menu } from 'lucide-react';
import { SushiLogoEmblem } from './components/SushiIcons';

export default function App() {
  const { loggedIn, isAdmin, currentView, visualConfig, publicView, planStatus } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 1. Landing Marketing & Pricing page (or Login / Trial signup) if not signed in yet
  if (!loggedIn) {
    return (
      <ErrorBoundary>
        {publicView === 'login' && <LoginPage />}
        {publicView === 'trial' && <TrialSignupPage />}
        {publicView === 'landing' && <LandingPages />}
      </ErrorBoundary>
    );
  }

  // 2. Customer Public Digital Menu Cardápio Screen
  if (!isAdmin) {
    return (
      <ErrorBoundary>
        <PublicMenuPage />
      </ErrorBoundary>
    );
  }

  // 3. Admin Workspace SaaS Control Center
  const planCancelled = planStatus === 'cancelled';

  return (
    <ErrorBoundary>
      <div className="relative h-screen w-screen overflow-hidden">
        <div
          className={`flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#0A0F0D] text-slate-100 font-sans transition-all duration-300 ${planCancelled ? 'blur-md pointer-events-none select-none' : ''}`}
          id="sushi-admin-workspace"
          aria-hidden={planCancelled}
        >
          {/* Desktop Sidebar (hidden on mobile) */}
          <Sidebar />

          {/* Mobile Top Header (only on mobile) */}
          <div className="md:hidden bg-[#141210] border-b border-[#2A211A] p-3.5 flex items-center justify-between shrink-0 z-30 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <SushiLogoEmblem size={28} />
              <span className="font-display font-extrabold text-[#F5F0EA] tracking-tight text-sm truncate">
                {visualConfig.establishmentName || 'Ponto japa'}
              </span>
            </div>

            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-[#181512] border border-[#2A211A] text-[#F5F0EA] hover:text-[#FB923C] cursor-pointer transition-colors"
              title="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Drawer Overlay */}
          {mobileSidebarOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              {/* Dark Backdrop */}
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
                onClick={() => setMobileSidebarOpen(false)}
              />

              {/* Sliding Sidebar Drawer */}
              <div className="relative z-10 h-full max-w-[280px] w-full bg-[#141210] shadow-2xl animate-in slide-in-from-left duration-200">
                <Sidebar isMobile onCloseMobile={() => setMobileSidebarOpen(false)} />
              </div>
            </div>
          )}

          {/* Main Panel views */}
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
            {currentView === 'dashboard' && <DashboardOverview />}
            {currentView === 'menu_manager' && <DigitalMenuManager />}
            {currentView === 'orders' && <OrdersManager />}
            {currentView === 'customers' && <CustomersLoyalty />}
            {currentView === 'financial' && <FinancialManager />}
            {currentView === 'ai_assistant' && <AISmartAssistant />}
            {currentView === 'customizer' && <VisualCustomizer />}
          </main>
        </div>

        {planCancelled && <PlanRenewalOverlay />}
      </div>
    </ErrorBoundary>
  );
}


