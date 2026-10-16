import React from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { ConnectionStatus } from '../hooks/useLiveDashboard';

interface FigmaTopbarProps {
  pageTitle: string;
  onOpenMobileMenu: () => void;
  onQuickUpdate: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  status: ConnectionStatus;
  alertsCount: number;
  shopName?: string | null;
  onAlertsClick: () => void;
  onSearchChange?: (q: string) => void;
}

export const FigmaTopbar: React.FC<FigmaTopbarProps> = ({
  pageTitle,
  onOpenMobileMenu,
  onQuickUpdate,
  isDark,
  onToggleDark,
  status,
  alertsCount,
  shopName,
  onAlertsClick,
  onSearchChange
}) => {
  return (
    <header className="topbar">
      {/* Mobile Menu Toggle */}
      <button className="mobile-menu" aria-label="Open menu" onClick={onOpenMobileMenu}>
        <FigmaIcon name="menu" size={20} />
      </button>

      {/* Mobile Logo */}
      <div className="mobile-logo">
        <div className="logo">
          <span className="logo-mark">
            <FigmaIcon name="box" size={16} className="text-white" />
          </span>
          <span>
            SmartStock <b>AI</b>
          </span>
        </div>
      </div>

      {/* Live Global Search Bar */}
      <div className="top-search">
        <FigmaIcon name="search" size={17} />
        <input
          aria-label="Search"
          placeholder="Search products, messages..."
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
        <kbd>⌘ K</kbd>
      </div>

      {/* Top Actions */}
      <div className="top-actions">
        {/* Real-time SSE Connection Status */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-[#e5eaf2] dark:border-[#1e293b] text-xs font-semibold">
          {status === 'connected' && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400">Live SSE</span>
            </>
          )}
          {status === 'reconnecting' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-600 dark:text-amber-400">Reconnecting</span>
            </>
          )}
          {status === 'offline' && (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-600 dark:text-red-400">Offline</span>
            </>
          )}
        </div>

        {/* Quick Update Button */}
        <button className="quick-add cursor-pointer" onClick={onQuickUpdate}>
          <FigmaIcon name="plus" size={16} />
          <span>Quick update</span>
        </button>

        {/* Dark / Light Mode Toggle Button */}
        <button
          type="button"
          onClick={onToggleDark}
          className="theme-toggle-btn cursor-pointer"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <FigmaIcon name="sun" size={17} className="text-amber-400" />
          ) : (
            <FigmaIcon name="moon" size={17} className="text-slate-600 dark:text-slate-300" />
          )}
          <span className="hidden md:inline">{isDark ? "Light" : "Dark"}</span>
        </button>

        {/* Notifications Bell */}
        <button
          className="icon-button cursor-pointer relative"
          aria-label="Notifications"
          onClick={onAlertsClick}
          title={`${alertsCount} low stock alerts`}
        >
          <FigmaIcon name="bell" size={18} />
          {alertsCount > 0 && (
            <i className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
          )}
        </button>

        {/* Profile Card */}
        <button className="profile cursor-pointer" title="Store Owner Profile">
          <span>RS</span>
          <div>
            <b>Rajesh Sharma</b>
            <small>{shopName || "Sharma General Store"}</small>
          </div>
          <FigmaIcon name="chevron" size={14} />
        </button>
      </div>

      <span className="mobile-title">{pageTitle}</span>
    </header>
  );
};
