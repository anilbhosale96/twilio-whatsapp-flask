import React from 'react';
import { RefreshCw, Sun, Moon, Send } from 'lucide-react';
import type { ConnectionStatus } from '../hooks/useLiveDashboard';
import type { ScreenType } from '../types';

interface NavbarProps {
  status: ConnectionStatus;
  shopName?: string | null;
  phoneMasked?: string;
  isDark: boolean;
  currentScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
  onToggleDark: () => void;
  onRefresh: () => void;
  onOpenSimModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  shopName,
  phoneMasked,
  isDark,
  currentScreen,
  onSelectScreen,
  onToggleDark,
  onRefresh,
  onOpenSimModal
}) => {
  return (
    <header className="sticky top-0 z-30 w-full h-16 border-b border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Brand & Vendor Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => onSelectScreen('dashboard')}
          className="flex items-center space-x-2.5 text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0B1220] font-bold text-lg shadow-sm">
            S
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">
                {shopName || "SmartStock AI"}
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] px-2 py-0.5 rounded font-semibold bg-[#CCFBF1] dark:bg-[#134E48] text-[#0F766E] dark:text-[#2DD4BF]">
                Live Store
              </span>
            </div>
            {phoneMasked && (
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                WhatsApp: {phoneMasked}
              </p>
            )}
          </div>
        </button>

        {/* View Switcher: Tour vs Dashboard */}
        <div className="hidden md:flex items-center space-x-1 ml-4 pl-4 border-l border-[#E2E8F0] dark:border-[#243041]">
          <button
            type="button"
            onClick={() => onSelectScreen('dashboard')}
            className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              currentScreen === 'dashboard'
                ? 'bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0B1220]'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => onSelectScreen('tour')}
            className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              currentScreen === 'tour'
                ? 'bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0B1220]'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            Figma Tour
          </button>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Status Indicator */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#0B1220] text-xs font-medium">
          {status === 'connected' && (
            <>
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="text-[#16A34A] font-semibold">Live SSE</span>
            </>
          )}
          {status === 'reconnecting' && (
            <>
              <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
              <span className="text-[#D97706]">Reconnecting...</span>
            </>
          )}
          {status === 'offline' && (
            <>
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
              <span className="text-[#DC2626]">Offline</span>
              <button
                type="button"
                onClick={onRefresh}
                className="ml-1 text-xs text-[#0F766E] dark:text-[#14B8A6] hover:underline"
              >
                Retry
              </button>
            </>
          )}
        </div>

        {/* WhatsApp Simulator Button */}
        <button
          type="button"
          onClick={onOpenSimModal}
          className="h-10 px-3 sm:px-3.5 rounded-lg border border-[#0F766E] text-[#0F766E] dark:border-[#14B8A6] dark:text-[#14B8A6] hover:bg-[#F0FDFA] dark:hover:bg-[#134E48]/20 flex items-center space-x-1.5 text-xs font-semibold transition-colors cursor-pointer"
          title="Simulate WhatsApp Message"
        >
          <Send size={14} strokeWidth={1.5} />
          <span className="hidden sm:inline">Simulate WhatsApp</span>
        </button>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          className="h-10 w-10 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] flex items-center justify-center transition-colors cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw size={15} strokeWidth={1.5} />
        </button>

        {/* Dark / Light Mode Toggle Button with visible icon and clear state */}
        <button
          type="button"
          onClick={onToggleDark}
          className="h-10 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#475569] bg-[#F8FAFC] dark:bg-[#1F2937] text-[#0F172A] dark:text-[#F1F5F9] hover:bg-white dark:hover:bg-[#334155] flex items-center space-x-1.5 text-xs font-medium transition-colors cursor-pointer shadow-xs"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <>
              <Sun size={16} strokeWidth={2} className="text-[#F59E0B]" />
              <span className="hidden md:inline">Light</span>
            </>
          ) : (
            <>
              <Moon size={16} strokeWidth={2} className="text-[#64748B]" />
              <span className="hidden md:inline">Dark</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
