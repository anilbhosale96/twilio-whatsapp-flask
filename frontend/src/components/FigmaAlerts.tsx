import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { AlertItem } from '../types';

interface FigmaAlertsProps {
  alerts: AlertItem[];
  onMarkReordered: (id: number, current: boolean) => Promise<boolean>;
}

export const FigmaAlerts: React.FC<FigmaAlertsProps> = ({ alerts, onMarkReordered }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'critical' | 'ai'>('all');
  const [dismissed, setDismissed] = useState<number[]>([]);

  const criticalCount = alerts.filter((a) => a.qty <= Math.max(1, Math.floor(a.threshold / 2))).length;
  const lowCount = alerts.length;

  const visibleAlerts = alerts.filter((a) => !dismissed.includes(a.id));

  return (
    <div className="page space-y-6">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Alerts</h1>
          <p>Important updates that need your attention.</p>
        </div>
        <button
          className="btn btn-secondary cursor-pointer"
          onClick={() => setDismissed(alerts.map((a) => a.id))}
        >
          Mark all as read
        </button>
      </div>

      {/* Alert Tabs */}
      <div className="alert-tabs">
        <button
          className={`cursor-pointer ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All <span>{visibleAlerts.length}</span>
        </button>
        <button
          className={`cursor-pointer ${activeTab === 'low' ? 'active' : ''}`}
          onClick={() => setActiveTab('low')}
        >
          Low stock <span>{lowCount}</span>
        </button>
        <button
          className={`cursor-pointer ${activeTab === 'critical' ? 'active' : ''}`}
          onClick={() => setActiveTab('critical')}
        >
          Critical <span>{criticalCount}</span>
        </button>
        <button
          className={`cursor-pointer ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Clarification <span>1</span>
        </button>
      </div>

      {/* Alerts List */}
      <div className="alerts-list space-y-3">
        {visibleAlerts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#58657d] dark:text-[#94a3b8] panel">
            No active alerts! All inventory items are above their reorder thresholds.
          </div>
        ) : (
          visibleAlerts.map((a) => {
            const isCrit = a.qty <= Math.max(1, Math.floor(a.threshold / 2));
            const tone = isCrit ? 'danger' : 'warning';

            return (
              <article key={a.id} className={`alert-card alert-${tone}`}>
                <span>
                  <FigmaIcon name="warning" size={20} />
                </span>
                <div>
                  <div className="alert-title">
                    <b>{isCrit ? 'Critical Stock Level' : 'Low Stock Alert'}</b>
                    <small>Today</small>
                  </div>
                  <p>
                    {a.name} has only <strong>{a.qty} {a.unit}</strong> remaining.
                  </p>
                  <small>Minimum reorder threshold: {a.threshold} {a.unit}</small>
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => onMarkReordered(a.id, a.reordered)}
                      className="btn btn-secondary text-xs px-3 py-1 cursor-pointer"
                    >
                      {a.reordered ? '✓ Reorder Marked' : 'Draft Supplier PO'}
                    </button>
                  </div>
                </div>

                <button
                  aria-label="Dismiss alert"
                  onClick={() => setDismissed([...dismissed, a.id])}
                  className="cursor-pointer text-[#58657d] hover:text-[#17213a] dark:hover:text-[#f8fafc]"
                >
                  <FigmaIcon name="close" size={17} />
                </button>
              </article>
            );
          })
        )}

        {/* AI Clarification Sample Alert matching Figma */}
        {(activeTab === 'all' || activeTab === 'ai') && (
          <article className="alert-card alert-blue">
            <span>
              <FigmaIcon name="bot" size={20} />
            </span>
            <div>
              <div className="alert-title">
                <b>AI Clarification</b>
                <small>Message received today at 9:16 AM</small>
              </div>
              <p>We need more detail for incoming message: “Add 20 Parle”.</p>
              <small>Suggested matches: Parle G (100g), Parle Monaco, or Hide & Seek</small>
              <div className="mt-2.5">
                <button
                  type="button"
                  className="btn btn-secondary text-xs px-3 py-1 cursor-pointer"
                  onClick={() => alert('Reply sent to WhatsApp: Parle G 100g confirmed.')}
                >
                  Confirm Parle G 100g
                </button>
              </div>
            </div>
            <button aria-label="Dismiss alert" className="cursor-pointer">
              <FigmaIcon name="close" size={17} />
            </button>
          </article>
        )}
      </div>
    </div>
  );
};
