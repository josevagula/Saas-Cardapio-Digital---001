import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import PlanRenewalOverlay from './components/PlanRenewalOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import { Menu, Loader2 } from 'lucide-react';
import { SushiLogoEmblem } from './components/SushiIcons';

// Every one of these used to be a plain import, so visiting any single
// screen (even the public cardápio a customer opens on their phone) pulled
// down the whole app in one ~1.2MB bundle — the admin dashboard's charts,
// Stripe/AI screens, and the landing page's animation library included.
// Lazy-loading splits each into its own chunk that only loads when that
// screen is actually shown.
const DashboardOverview = lazy(() => import('./components/DashboardOverview'));
const DigitalMenuManager = lazy(() => import('./components/DigitalMenuManager'));
const OrdersManager = lazy(() => import('./components/OrdersManager'));
const CustomersLoyalty = lazy(() => import('./components/CustomersLoyalty'));
const FinancialManager = lazy(() => import('./components/FinancialManager'));
const AdvancedAnalytics = lazy(() => import('./components/analytics/AdvancedAnalytics'));
const PrintingManager = lazy(() => import('./components/PrintingManager'));
const AISmartAssistant = lazy(() => import('./components/AISmartAssistant'));
const VisualCustomizer = lazy(() => import('./components/VisualCustomizer'));
const PublicMenuPage = lazy(() => import('./components/PublicMenuPage'));
const MenuNotFoundPage = lazy(() => import('./components/MenuNotFoundPage'));
const LandingPages = lazy(() => import('./components/LandingPages'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const TrialSignupPage = lazy(() => import('./components/TrialSignupPage'));

function LoadingScreen() {
  return (
    <div className="min-h-screen w-full bg-[#0C0A08] flex flex-col items-center justify-center gap-4">
      <SushiLogoEmblem size={48} />
      <Loader2 className="w-6 h-6 text-[#FB923C] animate-spin" />
    </div>
  );
}

export default function App() {
  const { loggedIn, isAdmin, currentView, visualConfig, publicView, planStatus, workspaceReady, authLoading, publicMenuNotFound } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Dashboard/PublicMenuPage are lazy chunks that would otherwise only start
  // downloading once workspaceReady flips true (they're not referenced by
  // any JSX before that), stacking their fetch time *after* the data fetch
  // instead of overlapping it. Both are the very first screen shown after
  // login/opening a menu link, so kick off their download the moment we
  // know which branch applies — in parallel with fetchWorkspace/
  // fetchPublicMenuBySlug — so the chunk is usually already cached by the
  // time Suspense would need it. Must run before any early return below, per
  // the Rules of Hooks.
  useEffect(() => {
    if (loggedIn && isAdmin) import('./components/DashboardOverview');
  }, [loggedIn, isAdmin]);
  useEffect(() => {
    if (loggedIn && !isAdmin) import('./components/PublicMenuPage');
  }, [loggedIn, isAdmin]);

  // 0. A dashboard URL (e.g. reloading /dashboard/pedidos) whose Supabase
  // session is still being verified: keep showing the loading screen instead
  // of flashing the login screen first, only to swap to the dashboard a
  // moment later once the session is confirmed.
  const isDashboardPath = isAdmin && currentView !== 'home' && currentView !== 'public_menu';
  if (authLoading && isDashboardPath) {
    return <LoadingScreen />;
  }

  // 1. Landing Marketing & Pricing page (or Login / Trial signup) if not signed in yet
  if (!loggedIn) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          {publicView === 'login' && <LoginPage />}
          {publicView === 'trial' && <TrialSignupPage />}
          {publicView === 'landing' && <LandingPages />}
        </Suspense>
      </ErrorBoundary>
    );
  }

  // 2. Customer Public Digital Menu Cardápio Screen
  if (!isAdmin) {
    // While the real menu data for this link is still loading, show a plain
    // loading screen instead of this browser's previously-cached data — a
    // customer opening a restaurant's link must never see a flash of a
    // different (stale/cached) menu before the correct one appears.
    if (!workspaceReady) {
      return <LoadingScreen />;
    }
    // The ?menu=<slug> link didn't match any restaurant — show an error
    // screen instead of an empty/blank cardápio.
    if (publicMenuNotFound) {
      return (
        <ErrorBoundary>
          <Suspense fallback={<LoadingScreen />}>
            <MenuNotFoundPage />
          </Suspense>
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <PublicMenuPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // 3. Admin Workspace SaaS Control Center
  // While the account's workspace data (visual config, catalog, orders, etc.)
  // is still being fetched/synced from Supabase after login, show the same
  // loading screen as the public cardápio instead of mounting the dashboard
  // with stale/empty local state that would flash before the real data lands.
  if (!workspaceReady) {
    return <LoadingScreen />;
  }

  // TEMPORARILY DISABLED: the "Finalize sua assinatura para começar" /
  // "Seu plano precisa ser renovado" paywall lock (PlanRenewalOverlay) is
  // switched off on purpose — every logged-in account gets full dashboard
  // access regardless of real Stripe subscription status. To re-enable,
  // restore: `const planCancelled = planStatus === 'cancelled';`
  const planCancelled = false;

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
          <div className="md:hidden bg-[#141210] border-b border-[#2A211A] p-3.5 flex items-center gap-3 shrink-0 z-30 shadow-md">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-[#181512] border border-[#2A211A] text-[#F5F0EA] hover:text-[#FB923C] cursor-pointer transition-colors"
              title="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <SushiLogoEmblem size={28} />
              <span className="font-display font-extrabold text-[#F5F0EA] tracking-tight text-sm truncate">
                {visualConfig.establishmentName || 'Zushy'}
              </span>
            </div>
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
            <Suspense fallback={<LoadingScreen />}>
              {currentView === 'dashboard' && <DashboardOverview />}
              {currentView === 'menu_manager' && <DigitalMenuManager />}
              {currentView === 'orders' && <OrdersManager />}
              {currentView === 'customers' && <CustomersLoyalty />}
              {currentView === 'financial' && <FinancialManager />}
              {currentView === 'analytics_advanced' && <AdvancedAnalytics />}
              {currentView === 'printing' && <PrintingManager />}
              {currentView === 'ai_assistant' && <AISmartAssistant />}
              {currentView === 'customizer' && <VisualCustomizer />}
            </Suspense>
          </main>
        </div>

        {planCancelled && <PlanRenewalOverlay />}
      </div>
    </ErrorBoundary>
  );
}


