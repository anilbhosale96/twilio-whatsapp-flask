import React from 'react';
import {
  LayoutDashboard,
  Package,
  ListOrdered,
  AlertTriangle,
  BarChart3,
  QrCode,
  Settings,
  Shield,
  FileText,
  Sparkles
} from 'lucide-react';
import type { ScreenType } from '../types';

interface SidebarProps {
  currentScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
  alertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
  alertsCount = 0
}) => {
  const navItems = [
    { id: 'dashboard' as ScreenType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tour' as ScreenType, label: 'Product Tour (Figma)', icon: Sparkles },
    { id: 'inventory' as ScreenType, label: 'Inventory Ledger', icon: Package },
    { id: 'transactions' as ScreenType, label: 'Transactions', icon: ListOrdered },
    {
      id: 'alerts' as ScreenType,
      label: 'Alerts',
      icon: AlertTriangle,
      badge: alertsCount > 0 ? alertsCount : null,
      badgeColor: 'bg-[#DC2626] text-white'
    },
    { id: 'reports' as ScreenType, label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'onboarding' as ScreenType, label: 'WhatsApp Connect', icon: QrCode },
    { id: 'settings' as ScreenType, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-2">
            Store Operations
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectScreen(item.id)}
                  className={`w-full h-10 px-3 rounded-lg flex items-center justify-between text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0B1220]'
                      : 'text-[#0F172A] dark:text-[#F1F5F9] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={18} strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Compliance & Custom Domain Info */}
      <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#243041] space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
          Compliance & Legal
        </p>
        <button
          onClick={() => onSelectScreen('privacy')}
          className={`w-full h-9 px-3 rounded-lg flex items-center space-x-2.5 text-xs font-medium transition-colors cursor-pointer ${
            currentScreen === 'privacy'
              ? 'bg-[#F0FDFA] text-[#0F766E] dark:bg-[#134E48]/30 dark:text-[#2DD4BF]'
              : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <Shield size={15} strokeWidth={1.5} />
          <span>Privacy Policy</span>
        </button>
        <button
          onClick={() => onSelectScreen('terms')}
          className={`w-full h-9 px-3 rounded-lg flex items-center space-x-2.5 text-xs font-medium transition-colors cursor-pointer ${
            currentScreen === 'terms'
              ? 'bg-[#F0FDFA] text-[#0F766E] dark:bg-[#134E48]/30 dark:text-[#2DD4BF]'
              : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <FileText size={15} strokeWidth={1.5} />
          <span>Terms & Conditions</span>
        </button>
        <div className="px-3 pt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
          Custom Domain: <span className="font-mono text-xs text-[#0F766E] dark:text-[#14B8A6]">app.smartstack.in</span>
        </div>
      </div>
    </aside>
  );
};

