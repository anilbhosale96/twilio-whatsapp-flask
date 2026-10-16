import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ListOrdered,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useLiveDashboard } from './hooks/useLiveDashboard';
import type { ScreenType } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SummaryCards } from './components/SummaryCards';
import { LiveChatPreview } from './components/LiveChatPreview';
import { InventoryTable } from './components/InventoryTable';
import { TransactionsLog } from './components/TransactionsLog';
import { AlertsView } from './components/AlertsView';
import { ReportsView } from './components/ReportsView';
import { OnboardingView } from './components/OnboardingView';
import { SettingsView } from './components/SettingsView';
import { PrivacyAndTerms } from './components/PrivacyAndTerms';
import { SimulateMessageModal } from './components/SimulateMessageModal';
import { ProductOverview } from './components/ProductOverview';

export const App: React.FC = () => {
  const {
    status,
    summary,
    inventory,
    transactions,
    alerts,
    reports,
    reportRange,
    setReportRange,
    settings,
    chatPreview,
    refreshAll,
    patchItem,
    updateVendorSettings,
    sendSimulationMessage
  } = useLiveDashboard();

  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');

  // Robust Dark Mode with localStorage persistence and system fallback
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('smartstock_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('smartstock_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDark) {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [isDark]);

  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] text-[#0F172A] dark:text-[#F1F5F9] flex flex-col transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        status={status}
        shopName={settings?.name}
        phoneMasked={settings?.phone_masked}
        isDark={isDark}
        currentScreen={currentScreen}
        onSelectScreen={(screen) => setCurrentScreen(screen)}
        onToggleDark={toggleDarkMode}
        onRefresh={refreshAll}
        onOpenSimModal={() => setIsSimModalOpen(true)}
      />

      {/* Backend Offline Banner */}
      {status === 'offline' && (
        <div className="w-full bg-[#DC2626] text-white px-4 py-2.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle size={15} strokeWidth={2} />
            <span>Cannot reach the backend server. Reconnecting automatically...</span>
          </div>
          <button
            onClick={refreshAll}
            className="px-2.5 py-1 rounded bg-white text-[#DC2626] font-semibold text-xs hover:bg-white/90 flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw size={12} strokeWidth={2} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            currentScreen={currentScreen}
            onSelectScreen={(screen) => setCurrentScreen(screen)}
            alertsCount={summary?.alerts_count || 0}
          />
        </div>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden pb-20 lg:pb-8">
          {/* Figma Product Tour / Overview View */}
          {currentScreen === 'tour' && (
            <ProductOverview
              onGoToDashboard={() => setCurrentScreen('dashboard')}
              onOpenSimulator={() => setIsSimModalOpen(true)}
            />
          )}

          {/* Live Store Dashboard View */}
          {currentScreen === 'dashboard' && (
            <div className="space-y-6">
              <SummaryCards
                summary={summary}
                onAlertsClick={() => setCurrentScreen('alerts')}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Live WhatsApp Messaging Stream */}
                <div className="lg:col-span-5">
                  <LiveChatPreview
                    latestMessage={chatPreview.latest}
                    onSendMessage={sendSimulationMessage}
                  />
                </div>

                {/* Stock Overview Table */}
                <div className="lg:col-span-7">
                  <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                          Current Stock Overview
                        </h2>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                          Showing items tracked in {settings?.name || "Sharma Kirana Store"}
                        </p>
                      </div>
                      <button
                        onClick={() => setCurrentScreen('inventory')}
                        className="text-xs text-[#0F766E] dark:text-[#14B8A6] font-semibold hover:underline"
                      >
                        View Full Table →
                      </button>
                    </div>

                    <InventoryTable
                      items={inventory.slice(0, 6)}
                      onPatchItem={patchItem}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory View */}
          {currentScreen === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                    Inventory Ledger
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    View all items, current quantities, threshold levels, and selling prices.
                  </p>
                </div>
              </div>
              <InventoryTable
                items={inventory}
                onPatchItem={patchItem}
              />
            </div>
          )}

          {/* Transactions View */}
          {currentScreen === 'transactions' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Transaction Audit Trail
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Complete log of stock updates received via WhatsApp and SMS messages.
                </p>
              </div>
              <TransactionsLog transactions={transactions} />
            </div>
          )}

          {/* Alerts View */}
          {currentScreen === 'alerts' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Low Stock & Reorder Alerts
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Items below alert thresholds with 1-click supplier purchase order draft.
                </p>
              </div>
              <AlertsView
                alerts={alerts}
                onMarkReordered={async (id, current) => {
                  return await patchItem(id, { reordered: !current });
                }}
              />
            </div>
          )}

          {/* Reports View */}
          {currentScreen === 'reports' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Sales & Velocity Reports
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Track daily and multi-day revenue and inventory movement.
                </p>
              </div>
              <ReportsView
                reports={reports}
                currentRange={reportRange}
                onSelectRange={(r) => setReportRange(r)}
              />
            </div>
          )}

          {/* Onboarding View */}
          {currentScreen === 'onboarding' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Connect WhatsApp / SMS
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Join instructions and multilingual command samples for English, Hindi, and Marathi.
                </p>
              </div>
              <OnboardingView />
            </div>
          )}

          {/* Settings View */}
          {currentScreen === 'settings' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Settings & Configurations
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Manage store name, default alert thresholds, language, and custom domain.
                </p>
              </div>
              <SettingsView
                settings={settings}
                onSaveSettings={updateVendorSettings}
              />
            </div>
          )}

          {/* Privacy Policy */}
          {currentScreen === 'privacy' && (
            <PrivacyAndTerms type="privacy" />
          )}

          {/* Terms & Conditions */}
          {currentScreen === 'terms' && (
            <PrivacyAndTerms type="terms" />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#243041] px-2 py-1 flex items-center justify-around text-xs">
        <button
          onClick={() => setCurrentScreen('dashboard')}
          className={`flex flex-col items-center py-1 px-3 ${
            currentScreen === 'dashboard' ? 'text-[#0F766E] dark:text-[#14B8A6] font-semibold' : 'text-[#64748B] dark:text-[#94A3B8]'
          }`}
        >
          <LayoutDashboard size={18} strokeWidth={1.5} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>
        <button
          onClick={() => setCurrentScreen('tour')}
          className={`flex flex-col items-center py-1 px-3 ${
            currentScreen === 'tour' ? 'text-[#0F766E] dark:text-[#14B8A6] font-semibold' : 'text-[#64748B] dark:text-[#94A3B8]'
          }`}
        >
          <Sparkles size={18} strokeWidth={1.5} />
          <span className="text-[10px] mt-0.5">Tour</span>
        </button>
        <button
          onClick={() => setCurrentScreen('inventory')}
          className={`flex flex-col items-center py-1 px-3 ${
            currentScreen === 'inventory' ? 'text-[#0F766E] dark:text-[#14B8A6] font-semibold' : 'text-[#64748B] dark:text-[#94A3B8]'
          }`}
        >
          <Package size={18} strokeWidth={1.5} />
          <span className="text-[10px] mt-0.5">Inventory</span>
        </button>
        <button
          onClick={() => setCurrentScreen('transactions')}
          className={`flex flex-col items-center py-1 px-3 ${
            currentScreen === 'transactions' ? 'text-[#0F766E] dark:text-[#14B8A6] font-semibold' : 'text-[#64748B] dark:text-[#94A3B8]'
          }`}
        >
          <ListOrdered size={18} strokeWidth={1.5} />
          <span className="text-[10px] mt-0.5">Activity</span>
        </button>
        <button
          onClick={() => setCurrentScreen('alerts')}
          className={`flex flex-col items-center py-1 px-3 ${
            currentScreen === 'alerts' ? 'text-[#0F766E] dark:text-[#14B8A6] font-semibold' : 'text-[#64748B] dark:text-[#94A3B8]'
          }`}
        >
          <AlertTriangle size={18} strokeWidth={1.5} />
          <span className="text-[10px] mt-0.5">Alerts</span>
        </button>
      </nav>

      {/* Simulate WhatsApp Modal */}
      <SimulateMessageModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onSendMessage={sendSimulationMessage}
      />
    </div>
  );
};

export default App;
