import React from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { FigmaPage } from './FigmaSidebar';

interface FigmaBottomNavProps {
  page: FigmaPage;
  setPage: (page: FigmaPage) => void;
  alertsCount: number;
}

export const FigmaBottomNav: React.FC<FigmaBottomNavProps> = ({ page, setPage, alertsCount }) => {
  return (
    <nav className="bottom-nav">
      <button
        className={`cursor-pointer ${page === 'Dashboard' ? 'active' : ''}`}
        onClick={() => setPage('Dashboard')}
      >
        <FigmaIcon name="box" size={19} />
        <span>Dashboard</span>
      </button>

      <button
        className={`cursor-pointer ${page === 'Inventory' ? 'active' : ''}`}
        onClick={() => setPage('Inventory')}
      >
        <FigmaIcon name="inventory" size={19} />
        <span>Inventory</span>
      </button>

      <button
        className={`cursor-pointer ${page === 'WhatsApp Activity' ? 'active' : ''}`}
        onClick={() => setPage('WhatsApp Activity')}
      >
        <FigmaIcon name="whatsapp" size={19} />
        <span>WhatsApp</span>
      </button>

      <button
        className={`cursor-pointer ${page === 'Alerts' ? 'active' : ''} relative`}
        onClick={() => setPage('Alerts')}
      >
        <FigmaIcon name="warning" size={19} />
        <span>Alerts</span>
        {alertsCount > 0 && (
          <span className="absolute top-1 right-4 w-2 h-2 bg-amber-500 rounded-full" />
        )}
      </button>

      <button
        className={`cursor-pointer ${page === 'Settings' ? 'active' : ''}`}
        onClick={() => setPage('Settings')}
      >
        <FigmaIcon name="bag" size={19} />
        <span>Settings</span>
      </button>
    </nav>
  );
};
