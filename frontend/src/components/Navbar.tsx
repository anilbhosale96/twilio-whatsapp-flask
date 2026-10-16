import React from 'react';
import { RefreshCw, Sun, Moon, Send } from 'lucide-react';
import type { ConnectionStatus } from '../hooks/useLiveDashboard';

interface NavbarProps {
  status: ConnectionStatus;
  shopName?: string | null;
  phoneMasked?: string;
  isDark: boolean;
  onToggleDark: () => void;
  onRefresh: () => void;
  onOpenSimModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  shopName,
  phoneMasked,
  isDark,
  onToggleDark,
  onRefresh,
  onOpenSimModal
}) => {
  return (
    <header className="sticky top-0 z-30 w-full h-16 border-b border-[#E2E8F0] dark:border-[#243041] bg-white/95 dark:bg-[#111827]/95 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between">
      {/* Brand & Vendor Title */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-semibold text-lg">
          S
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">
              {shopName || "Smart Stack AI"}
            </h1>
            <span className="hidden md:inline-flex items-center text-xs px-2 py-0.5 rounded font-medium bg-[#CCFBF1] dark:bg-[#134E48] text-[#0F766E] dark:text-[#2DD4BF]">
              Kirana Edition
            </span>
          </div>
          {phoneMasked && (
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Owner: {phoneMasked}
            </p>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Status Indicator */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#0B1220] text-xs font-medium">
          {status === 'connected' && (
            <>
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="text-[#16A34A] font-semibold">Live</span>
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
                onClick={onRefresh}
                className="ml-1 text-xs text-[#0F766E] dark:text-[#14B8A6] hover:underline"
              >
                Retry
              </button>
            </>
          )}
        </div>

        {/* Simulator Button */}
        <button
          onClick={onOpenSimModal}
          className="h-10 px-3.5 rounded-lg border border-[#0F766E] text-[#0F766E] dark:border-[#14B8A6] dark:text-[#14B8A6] hover:bg-[#F0FDFA] dark:hover:bg-[#134E48]/20 flex items-center space-x-1.5 text-xs font-medium transition-colors cursor-pointer"
          title="Simulate WhatsApp Message"
        >
          <Send size={15} strokeWidth={1.5} />
          <span className="hidden sm:inline">Simulate WhatsApp</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="h-10 w-10 rounded-lg border border-[#E2E8F0] dark:border-[#243041] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] flex items-center justify-center transition-colors cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw size={16} strokeWidth={1.5} />
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDark}
          className="h-10 w-10 rounded-lg border border-[#E2E8F0] dark:border-[#243041] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] flex items-center justify-center transition-colors cursor-pointer"
          title="Toggle Theme"
        >
          {isDark ? <Sun size={17} strokeWidth={1.5} /> : <Moon size={17} strokeWidth={1.5} />}
        </button>
      </div>
    </header>
  );
};
