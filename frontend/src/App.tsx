import React, { useState, useEffect, useCallback } from 'react';
import { useLiveDashboard } from './hooks/useLiveDashboard';
import { FigmaLanding } from './components/FigmaLanding';
import { FigmaAuth } from './components/FigmaAuth';
import { CustomerDashboard } from './components/CustomerDashboard';
import { FigmaSidebar } from './components/FigmaSidebar';
import type { FigmaPage } from './components/FigmaSidebar';
import { FigmaTopbar } from './components/FigmaTopbar';
import { FigmaDashboard } from './components/FigmaDashboard';
import { FigmaOrders } from './components/FigmaOrders';
import { FigmaBilling } from './components/FigmaBilling';
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
import { FigmaQuickUpdateModal } from './components/FigmaQuickUpdateModal';
import { FigmaBottomNav } from './components/FigmaBottomNav';
import { PrivacyAndTerms } from './components/PrivacyAndTerms';
import { FigmaIcon } from './components/FigmaIcon';
import type { InventoryItem, OrderData } from './types';

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
    currentUser,
    isLoggedIn,
    login,
    register,
    loginCustomer,
    registerCustomer,
    fetchPublicProducts,
    fetchCategories,
    logout,
    addItem,
    deleteItem,
    patchItem,
    updateVendorSettings,
    sendSimulationMessage,
    sendDirectMessage,
    refreshAll,
    placeCustomerOrder,
    fetchCustomerOrders,
    approveCustomerQuote,
    cancelCustomerOrder,
    fetchVendorOrders,
    updateVendorOrderItems,
    sendVendorQuote,
    generateVendorBill,
    updateVendorOrderStatus,
    markVendorOrderPaid,
    fetchVendorCustomers,
    createVendorCustomer,
    fetchVendorBills,
    fetchVendorBillDetail,
    createVendorBill,
    finalizeVendorBill,
    sendVendorBill,
    recordBillPayment,
    cancelVendorBill,
    decodeBarcodeImage,
    searchProductByBarcode,
    quickAddInventoryProduct,
    fetchCustomerBills,
    fetchCustomerBillDetail
  } = useLiveDashboard();

  // Mode: Landing Showcase vs Auth (Login / Register) vs Live Store App
  const [viewMode, setViewMode] = useState<'app' | 'landing' | 'auth'>(() => {
    try {
      return localStorage.getItem('smartstock_token') ? 'app' : 'auth';
    } catch {
      return 'auth';
    }
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authAccountType, setAuthAccountType] = useState<'vendor' | 'customer'>('vendor');
  const [activePage, setActivePage] = useState<FigmaPage>('Dashboard');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isQuickUpdateModalOpen, setIsQuickUpdateModalOpen] = useState(false);
  const [quickUpdateInitialTab, setQuickUpdateInitialTab] = useState<'bill' | 'voice'>('bill');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [vendorOrders, setVendorOrders] = useState<OrderData[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const loadVendorOrders = useCallback(async () => {
    if (!isLoggedIn || currentUser?.role === 'customer') return;
    setOrdersLoading(true);
    try {
      const data = await fetchVendorOrders();
      setVendorOrders(data.orders || []);
    } catch (e) {
      console.error('Failed to fetch vendor orders:', e);
    } finally {
      setOrdersLoading(false);
    }
  }, [isLoggedIn, currentUser?.role, fetchVendorOrders]);

  useEffect(() => {
    if (isLoggedIn && currentUser?.role !== 'customer') {
      loadVendorOrders();
    }
  }, [isLoggedIn, currentUser?.role, loadVendorOrders]);

  useEffect(() => {
    if (activePage === 'Orders' && isLoggedIn && currentUser?.role !== 'customer') {
      loadVendorOrders();
    }
  }, [activePage, isLoggedIn, currentUser?.role, loadVendorOrders]);

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
    logout();
    setViewMode('auth');
    setAuthMode('login');
    showToast('You have been logged out.');
  };

  const handleLoginSuccess = () => {
    setViewMode('app');
    showToast('Login successful!');
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

  const handleSendMessage = async (msg: string, channel: 'whatsapp' | 'sms' = 'whatsapp'): Promise<boolean> => {
    const res = await sendDirectMessage(msg, channel);
    if (res.success) {
      showToast(`${channel === 'sms' ? 'SMS' : 'WhatsApp'} message processed! Inventory updated.`);
      return true;
    }
    showToast('Failed to process message.');
    return false;
  };

  // Find active product from latest inventory data so updates reflect immediately
  const activeProduct = selectedProduct
    ? inventory.find((i) => i.id === selectedProduct.id) || selectedProduct
    : null;

  // 1. Public Landing page view
  if (viewMode === 'landing') {
    return (
      <FigmaLanding
        onOpenApp={() => {
          setAuthAccountType('vendor');
          setViewMode(isLoggedIn ? 'app' : 'auth');
        }}
        onOpenCustomerPortal={() => {
          if (isLoggedIn && currentUser?.role === 'customer') {
            setViewMode('app');
          } else {
            setAuthAccountType('customer');
            setAuthMode('login');
            setViewMode('auth');
          }
        }}
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
        accountType={authAccountType}
        setAccountType={setAuthAccountType}
        onLogin={login}
        onRegister={register}
        onCustomerLogin={loginCustomer}
        onCustomerRegister={registerCustomer}
        onDone={handleLoginSuccess}
        onBack={() => setViewMode('landing')}
        isDark={isDark}
        onToggleDark={toggleDarkMode}
      />
    );
  }

  // 3. Customer Dashboard View (Role = Customer)
  if (currentUser?.role === 'customer') {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1120]">
        <CustomerDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          isDark={isDark}
          onToggleDark={toggleDarkMode}
          fetchPublicProducts={fetchPublicProducts}
          fetchCategories={fetchCategories}
          onPlaceOrder={placeCustomerOrder}
          onFetchOrders={fetchCustomerOrders}
          onApproveQuote={approveCustomerQuote}
          onCancelOrder={cancelCustomerOrder}
          onFetchCustomerBills={fetchCustomerBills}
          onFetchCustomerBillDetail={fetchCustomerBillDetail}
          onShowToast={showToast}
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
  }

  // 4. Live App Shell View (Role = Vendor / Admin, Matching Figma https://flash-fruit-47779733.figma.site)
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
        ordersCount={vendorOrders.filter((o) => o.status === 'New').length}
        shopName={currentUser?.shop_name || settings?.shop_name || settings?.name}
        ownerName={currentUser?.name || settings?.name}
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
            setQuickUpdateInitialTab('bill');
            setIsQuickUpdateModalOpen(true);
          }}
          isDark={isDark}
          onToggleDark={toggleDarkMode}
          status={status}
          alertsCount={alerts?.count || summary?.alerts_count || 0}
          shopName={currentUser?.shop_name || settings?.shop_name || settings?.name}
          ownerName={currentUser?.name || settings?.name}
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
              shopName={currentUser?.shop_name || settings?.shop_name || settings?.name}
              ownerName={currentUser?.name || settings?.name}
              onGoToPage={(p) => setActivePage(p)}
              onSelectProduct={(item) => setSelectedProduct(item)}
              onConfirmUpdate={handleOpenConfirmModal}
              onSendMessage={handleSendMessage}
              latestMessageText={chatPreview.latest?.incoming_text}
              onOpenBillModal={() => {
                setQuickUpdateInitialTab('bill');
                setIsQuickUpdateModalOpen(true);
              }}
            />
          ) : activePage === 'Billing' ? (
            <FigmaBilling
              inventory={inventory}
              shopName={currentUser?.shop_name || settings?.shop_name || settings?.name}
              ownerName={currentUser?.name || settings?.name}
              onFetchCustomers={fetchVendorCustomers}
              onCreateCustomer={createVendorCustomer}
              onFetchBills={fetchVendorBills}
              onFetchBillDetail={fetchVendorBillDetail}
              onCreateBill={createVendorBill}
              onFinalizeBill={finalizeVendorBill}
              onSendBill={sendVendorBill}
              onRecordPayment={recordBillPayment}
              onCancelBill={cancelVendorBill}
              onSearchBarcode={searchProductByBarcode}
              onQuickAddProduct={quickAddInventoryProduct}
              onDecodeBarcodeImage={decodeBarcodeImage}
              onShowToast={showToast}
            />
          ) : activePage === 'Orders' ? (
            <FigmaOrders
              orders={vendorOrders}
              inventory={inventory}
              isLoading={ordersLoading}
              onRefresh={loadVendorOrders}
              onUpdateItems={updateVendorOrderItems}
              onSendQuote={sendVendorQuote}
              onGenerateBill={generateVendorBill}
              onUpdateStatus={updateVendorOrderStatus}
              onMarkPaid={markVendorOrderPaid}
              onShowToast={showToast}
            />
          ) : activePage === 'Inventory' ? (
            <FigmaInventory
              items={inventory}
              onSelectProduct={(item) => setSelectedProduct(item)}
              onDecodeBarcodeImage={decodeBarcodeImage}
              onPatchItem={async (id, data) => {
                const ok = await patchItem(id, data);
                if (ok) {
                  if (data.qty !== undefined && Object.keys(data).length === 1) {
                    showToast(`Stock updated to ${data.qty}`);
                  } else {
                    showToast('Product details updated successfully!');
                  }
                } else {
                  showToast('Failed to update product.');
                }
                return ok;
              }}
              onAddItem={async (data) => {
                const res = await addItem(data);
                if (res.success) {
                  showToast(`Product "${data.name}" added successfully!`);
                } else {
                  showToast(res.message || 'Failed to add product.');
                }
                return res;
              }}
              onDeleteItem={async (id) => {
                const ok = await deleteItem(id);
                if (ok) showToast('Product deleted from inventory.');
                return ok;
              }}
            />
          ) : activePage === 'WhatsApp Activity' ? (
            <FigmaWhatsAppActivity
              transactions={transactions}
              inventory={inventory}
              onSendMessage={async (msg, ch) => {
                const res = await sendDirectMessage(msg, ch);
                if (res.success) {
                  showToast(`${ch === 'sms' ? 'SMS' : 'WhatsApp'} message processed! Inventory updated.`);
                }
                return res;
              }}
            />
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
            <FigmaAnalytics
              inventory={inventory}
              transactions={transactions}
              reports={reports}
              summary={summary}
            />
          ) : activePage === 'Reports' ? (
            <FigmaReports
              reports={reports}
              currentRange={reportRange}
              onSelectRange={(r) => setReportRange(r)}
            />
          ) : activePage === 'AI Assistant' ? (
            <FigmaAIAssistant
              inventory={inventory}
              shopName={currentUser?.shop_name || settings?.shop_name || settings?.name}
              ownerName={currentUser?.name || settings?.name}
            />
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
        message={activeUpdateMessage}
        inventory={inventory}
        productName={activeUpdateMessage}
      />

      {/* Bill Scanner & Quick Voice Update Modal */}
      <FigmaQuickUpdateModal
        isOpen={isQuickUpdateModalOpen}
        initialTab={quickUpdateInitialTab}
        onClose={() => setIsQuickUpdateModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          refreshAll();
        }}
        onSendMessage={async (msg, ch) => {
          const res = await sendDirectMessage(msg, ch);
          if (res.success) {
            showToast(`${ch === 'sms' ? 'SMS' : 'WhatsApp'} message processed! Inventory updated.`);
          }
          return res;
        }}
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
