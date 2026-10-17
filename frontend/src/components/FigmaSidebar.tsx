import React from 'react';
import { FigmaIcon } from './FigmaIcon';

export type FigmaPage =
  | 'Dashboard'
  | 'Inventory'
  | 'WhatsApp Activity'
  | 'Transactions'
  | 'Alerts'
  | 'Analytics'
  | 'Reports'
  | 'AI Assistant'
  | 'Settings'
  | 'Privacy'
  | 'Terms';

interface FigmaSidebarProps {
  page: FigmaPage;
  setPage: (page: FigmaPage) => void;
  open: boolean;
  close: () => void;
  alertsCount: number;
  shopName?: string | null;
  ownerName?: string | null;
  onGoToLanding: () => void;
  onLogout: () => void;
}

const WORKSPACE_NAV: Array<[FigmaPage, string]> = [
  ['Dashboard', 'box'],
  ['Inventory', 'inventory'],
  ['WhatsApp Activity', 'whatsapp'],
  ['Transactions', 'arrow'],
  ['Alerts', 'warning'],
  ['Analytics', 'analytics'],
  ['Reports', 'report'],
  ['AI Assistant', 'sparkle']
];

const ACCOUNT_NAV: Array<[FigmaPage, string]> = [
  ['Settings', 'bag'],
  ['Privacy', 'message'],
  ['Terms', 'message']
];

export const FigmaSidebar: React.FC<FigmaSidebarProps> = ({
  page,
  setPage,
  open,
  close,
  alertsCount,
  shopName,
  ownerName,
  onGoToLanding,
  onLogout
}) => {
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Brand Logo */}
        <div className="side-logo cursor-pointer" onClick={() => { setPage('Dashboard'); close(); }}>
          <div className="logo">
            <span className="logo-mark">
              <FigmaIcon name="box" size={18} className="text-white" />
            </span>
            <span>
              SmartStock <b>AI</b>
            </span>
          </div>
        </div>

        {/* Store Chip */}
        <div className="shop-chip">
          <span>SG</span>
          <div>
            <b>{shopName || "Sharma General Store"}</b>
            <small>Grocery · Pune</small>
          </div>
          <FigmaIcon name="chevron" size={14} />
        </div>

        {/* Navigation Items */}
        <nav>
          <small>WORKSPACE</small>
          {WORKSPACE_NAV.map(([name, iconName]) => (
            <button
              key={name}
              className={`cursor-pointer ${page === name ? 'active' : ''}`}
              onClick={() => {
                setPage(name);
                close();
              }}
            >
              <FigmaIcon name={iconName} size={17} />
              <span>{name}</span>
              {name === 'Alerts' && alertsCount > 0 && <em>{alertsCount}</em>}
            </button>
          ))}

          <small>ACCOUNT</small>
          {ACCOUNT_NAV.map(([name, iconName]) => (
            <button
              key={name}
              className={`cursor-pointer ${page === name ? 'active' : ''}`}
              onClick={() => {
                setPage(name);
                close();
              }}
            >
              <FigmaIcon name={iconName} size={17} />
              <span>{name === 'Privacy' ? 'Privacy Policy' : name === 'Terms' ? 'Terms of Service' : name}</span>
            </button>
          ))}

          <button
            type="button"
            className="cursor-pointer text-xs text-[#58657d] dark:text-[#94a3b8] hover:text-[#1768e5] dark:hover:text-[#60a5fa] mt-2 flex items-center space-x-1.5"
            onClick={() => {
              onGoToLanding();
              close();
            }}
          >
            <FigmaIcon name="arrow" size={14} className="rotate-180" />
            <span>Product Showcase</span>
          </button>

          {/* Explicit Logout Nav Item */}
          <button
            type="button"
            className="cursor-pointer text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-1 flex items-center space-x-1.5 font-semibold"
            onClick={() => {
              onLogout();
              close();
            }}
          >
            <FigmaIcon name="logout" size={14} />
            <span>Log Out</span>
          </button>
        </nav>

        {/* Sidebar Help */}
        <div className="sidebar-help">
          <span>
            <FigmaIcon name="message" size={16} />
          </span>
          <b>Need help?</b>
          <p>WhatsApp our Kirana support team 24/7.</p>
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1"
          >
            <span>Get support</span>
            <FigmaIcon name="arrow" size={12} />
          </a>
        </div>

        {/* Shopkeeper User Info with Clear Logout Action */}
        {(() => {
          const displayName = ownerName || shopName || "Shop Owner";
          const initials = displayName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((w: string) => w[0].toUpperCase())
            .join('') || 'SO';
          return (
            <button
              className="side-user cursor-pointer group"
              onClick={onLogout}
              title="Click to Log Out of Store"
            >
              <span>{initials}</span>
              <div>
                <b>{displayName}</b>
                <small className="text-red-500 group-hover:underline">Click to Log out</small>
              </div>
              <FigmaIcon name="logout" size={16} className="text-red-500" />
            </button>
          );
        })()}
      </aside>

      {/* Mobile Backdrop Overlay */}
      {open && (
        <button
          aria-label="Close menu"
          className="side-overlay"
          onClick={close}
        />
      )}
    </>
  );
};

