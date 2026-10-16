import React, { useState, useEffect } from 'react';
import { useLiveDashboard } from './hooks/useLiveDashboard';
import { FigmaLanding } from './components/FigmaLanding';
import { FigmaAuth } from './components/FigmaAuth';
import { FigmaSidebar } from './components/FigmaSidebar';
import type { FigmaPage } from './components/FigmaSidebar';
import { FigmaTopbar } from './components/FigmaTopbar';
import { FigmaDashboard } from './components/FigmaDashboard';
import { FigmaInventory } from './components/FigmaInventory';
import { FigmaProductDetail } from './components/FigmaProductDetail';
import { FigmaWhatsAppActivity } from './components/FigmaWhatsAppActivity';
import { FigmaTransactions } from './components/FigmaTransactions';
import { FigmaAlerts } from './components/FigmaAlerts';
import { FigmaAnalytics } from './components/FigmaAnalytics';
import { FigmaReports } from './components/FigmaReports';
import { FigmaAIAssistant } from './components/FigmaAIAssistant';
import { FigmaSettings } from './components/FigmaSettings';
import { FigmaConfirmModal } from './components/FigmaConfirmModal';
import { FigmaBottomNav } from './components/FigmaBottomNav';
import { PrivacyAndTerms } from './components/PrivacyAndTerms';
import { FigmaIcon } from './components/FigmaIcon';
import type { InventoryItem } from './types';

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
    patchItem,
    updateVendorSettings,
    sendSimulationMessage
  } = useLiveDashboard();

  // Mode: Landing Showcase vs Auth (Login / Register) vs Live Store App
  const [viewMode, setViewMode] = useState<'app' | 'landing' | 'auth'>('app');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activePage, setActivePage] = useState<FigmaPage>('Dashboard');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dark Mode with localStorage persistence and system theme detection
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogout = () => {
    setViewMode('auth');
    setAuthMode('login');
    showToast('You have been logged out.');
  };

  const handleLoginSuccess = () => {
    setViewMode('app');
    showToast('Welcome back, Rajesh! Live dashboard ready.');
  };

  const [activeUpdateMessage, setActiveUpdateMessage] = useState<string>(
    'Added 20 Parle G and 10 Tata Salt'
  );

  const handleOpenConfirmModal = (msg?: string) => {
    if (msg) setActiveUpdateMessage(msg);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmUpdate = async () => {
    setIsConfirmModalOpen(false);
    const ok = await sendSimulationMessage(activeUpdateMessage);
    if (ok) {
      showToast('Stock updated successfully! Synced via SSE.');
    } else {
      showToast('Update failed. Please check connection.');
    }
  };

  const handleSendMessage = async (msg: string): Promise<boolean> => {
    const ok = await sendSimulationMessage(msg);
    if (ok) {
      showToast('WhatsApp update processed! Inventory updated.');
    }
    return ok;
  };

  // Find active product from latest inventory data so updates reflect immediately
  const activeProduct = selectedProduct
    ? inventory.find((i) => i.id === selectedProduct.id) || selectedProduct
    : null;

  // 1. Public Landing page view
  if (viewMode === 'landing') {
    return (
      <FigmaLanding
        onOpenApp={() => setViewMode('app')}
        onOpenLogin={() => {
          setAuthMode('login');
          setViewMode('auth');
        }}
        onOpenRegister={() => {
          setAuthMode('register');
          setViewMode('auth');
        }}
        isDark={isDark}
        onToggleDark={toggleDarkMode}
        onOpenPrivacy={() => {
          setViewMode('app');
          setActivePage('Privacy');
        }}
        onOpenTerms={() => {
          setViewMode('app');
          setActivePage('Terms');
        }}
      />
    );
  }

  // 2. Authentication view (Login / Register)
  if (viewMode === 'auth') {
    return (
      <FigmaAuth
        mode={authMode}
        setMode={(m) => setAuthMode(m)}
        onDone={handleLoginSuccess}
        onBack={() => setViewMode('landing')}
        isDark={isDark}
        onToggleDark={toggleDarkMode}
      />
    );
  }

  // 3. Live App Shell View (Matching Figma https://flash-fruit-47779733.figma.site)
  return (
    <div className="app-shell min-h-screen">
      {/* Sidebar with Log Out Action */}
      <FigmaSidebar
        page={activePage}
        setPage={(page) => {
          setActivePage(page);
          setSelectedProduct(null);
        }}
        open={isMobileMenuOpen}
        close={() => setIsMobileMenuOpen(false)}
        alertsCount={alerts?.count || summary?.alerts_count || 0}
        shopName={settings?.name}
        onGoToLanding={() => setViewMode('landing')}
        onLogout={handleLogout}
      />

      {/* Main Layout Area */}
      <div className="app-main">
        {/* Top Header with Dark/Light Toggle & Log Out */}
        <FigmaTopbar
          pageTitle={selectedProduct ? selectedProduct.name : activePage}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onQuickUpdate={() => {
            setActivePage('Dashboard');
            setSelectedProduct(null);
          }}
          isDark={isDark}
          onToggleDark={toggleDarkMode}
          status={status}
          alertsCount={alerts?.count || summary?.alerts_count || 0}
          shopName={settings?.name}
          onAlertsClick={() => {
            setActivePage('Alerts');
            setSelectedProduct(null);
          }}
          onLogout={handleLogout}
        />

        {/* Content Body */}
        <main className="pb-24 lg:pb-8">
          {activeProduct ? (
            <FigmaProductDetail
              item={activeProduct}
              onBack={() => setSelectedProduct(null)}
              onPatchItem={patchItem}
            />
          ) : activePage === 'Dashboard' ? (
            <FigmaDashboard
              summary={summary}
              inventory={inventory}
              transactions={transactions}
              shopName={settings?.name}
              onGoToPage={(p) => setActivePage(p)}
              onSelectProduct={(item) => setSelectedProduct(item)}
              onConfirmUpdate={handleOpenConfirmModal}
              onSendMessage={handleSendMessage}
              latestMessageText={chatPreview.latest?.incoming_text}
            />
          ) : activePage === 'Inventory' ? (
            <FigmaInventory
              items={inventory}
              onSelectProduct={(item) => setSelectedProduct(item)}
              onPatchItem={patchItem}
            />
          ) : activePage === 'WhatsApp Activity' ? (
            <FigmaWhatsAppActivity transactions={transactions} />
          ) : activePage === 'Transactions' ? (
            <FigmaTransactions transactions={transactions} />
          ) : activePage === 'Alerts' ? (
            <FigmaAlerts
              alerts={alerts?.items || []}
              onMarkReordered={async (id, cur) => {
                const ok = await patchItem(id, { reordered: !cur });
                if (ok) showToast('Reorder status updated.');
                return ok;
              }}
            />
          ) : activePage === 'Analytics' ? (
            <FigmaAnalytics inventory={inventory} />
          ) : activePage === 'Reports' ? (
            <FigmaReports
              reports={reports}
              currentRange={reportRange}
              onSelectRange={(r) => setReportRange(r)}
            />
          ) : activePage === 'AI Assistant' ? (
            <FigmaAIAssistant inventory={inventory} shopName={settings?.name} />
          ) : activePage === 'Settings' ? (
            <FigmaSettings settings={settings} onSaveSettings={updateVendorSettings} />
          ) : activePage === 'Privacy' ? (
            <div className="page space-y-4">
              <button
                className="back-link cursor-pointer"
                onClick={() => setActivePage('Dashboard')}
              >
                ‹ Back to Dashboard
              </button>
              <PrivacyAndTerms type="privacy" />
            </div>
          ) : (
            <div className="page space-y-4">
              <button
                className="back-link cursor-pointer"
                onClick={() => setActivePage('Dashboard')}
              >
                ‹ Back to Dashboard
              </button>
              <PrivacyAndTerms type="terms" />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <FigmaBottomNav
        page={activePage}
        setPage={(p) => {
          setActivePage(p);
          setSelectedProduct(null);
        }}
        alertsCount={alerts?.count || summary?.alerts_count || 0}
      />

      {/* Confirmation Modal */}
      <FigmaConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmUpdate}
        productName={activeUpdateMessage}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast">
          <span>
            <FigmaIcon name="check" size={16} />
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
