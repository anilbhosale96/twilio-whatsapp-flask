import React from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { InventoryItem } from '../types';

interface FigmaAnalyticsProps {
  inventory: InventoryItem[];
}

export const FigmaAnalytics: React.FC<FigmaAnalyticsProps> = ({ inventory }) => {
  const lowCount = inventory.filter((i) => i.qty <= i.threshold).length;
  const normalCount = Math.max(0, inventory.length - lowCount);

  return (
    <div className="page space-y-6">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Analytics</h1>
          <p>Simple insights to help you make better stock decisions.</p>
        </div>
        <select aria-label="Analytics range" defaultValue="Last 30 days">
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>This year</option>
        </select>
      </div>

      {/* Analytics Stats */}
      <div className="analytics-stats">
        <article className="stat-card">
          <div className="stat-icon tone-green">
            <FigmaIcon name="download" size={20} />
          </div>
          <div className="stat-label">Products Received</div>
          <div className="stat-value">1,284</div>
          <div className="stat-note">+12.4% vs last month</div>
        </article>

        <article className="stat-card">
          <div className="stat-icon tone-blue">
            <FigmaIcon name="arrow" size={20} />
          </div>
          <div className="stat-label">Products Removed</div>
          <div className="stat-value">946</div>
          <div className="stat-note">+8.2% vs last month</div>
        </article>

        <article className="stat-card">
          <div className="stat-icon tone-green">
            <FigmaIcon name="whatsapp" size={20} />
          </div>
          <div className="stat-label">WhatsApp Updates</div>
          <div className="stat-value">412</div>
          <div className="stat-note">87% of all updates</div>
        </article>
      </div>

      {/* Analytics Grid */}
      <div className="analytics-grid">
        {/* Inventory Movement Panel */}
        <section className="panel analytics-movement">
          <div className="panel-head">
            <div>
              <h3>Inventory movement</h3>
              <p>Stock flow over the last 30 days</p>
            </div>
            <span className="chart-legend">
              <span>
                <i className="blue-dot" /> Stock In
              </span>
              <span>
                <i className="gray-dot" /> Stock Out
              </span>
            </span>
          </div>

          <div className="line-chart">
            <div className="y-labels">
              <span>500</span>
              <span>375</span>
              <span>250</span>
              <span>125</span>
              <span>0</span>
            </div>
            <svg viewBox="0 0 700 190" preserveAspectRatio="none" role="img" aria-label="Inventory movement trend">
              <defs>
                <linearGradient id="areaAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2563eb" stopOpacity="0.18" />
                  <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 145 C60 130 75 110 125 119 S205 70 260 91 S340 112 390 72 S470 52 520 71 S605 25 700 42 L700 190 L0 190Z"
                fill="url(#areaAnalytics)"
              />
              <path
                d="M0 145 C60 130 75 110 125 119 S205 70 260 91 S340 112 390 72 S470 52 520 71 S605 25 700 42"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="x-labels">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
            </div>
          </div>
        </section>

        {/* Stock Status Donut Panel */}
        <section className="panel donut-panel">
          <div className="panel-head">
            <div>
              <h3>Stock status</h3>
              <p>Across {inventory.length || 16} products</p>
            </div>
          </div>
          <div className="donut-wrap">
            <div className="donut">
              <span>
                <b>{inventory.length || 16}</b>
                <small>products</small>
              </span>
            </div>
            <div className="donut-legend">
              <span>
                <i className="normal" /> Normal <b>{normalCount}</b>
              </span>
              <span>
                <i className="low" /> Low Stock <b>{lowCount}</b>
              </span>
              <span>
                <i className="critical" /> Critical <b>2</b>
              </span>
            </div>
          </div>
        </section>

        {/* Top Products Panel */}
        <section className="panel top-products">
          <div className="panel-head">
            <div>
              <h3>Top products</h3>
              <p>By inventory movement</p>
            </div>
          </div>
          {inventory.slice(0, 5).map((item, idx) => {
            const initials = item.name
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase();
            const units = [182, 156, 132, 118, 94][idx] || 50;

            return (
              <div key={item.id} className="top-product">
                <span>{idx + 1}</span>
                <i className={`product-avatar ${idx % 2 === 0 ? 'amber' : 'blue'}`}>{initials}</i>
                <div>
                  <b>{item.name}</b>
                  <small>General Grocery</small>
                </div>
                <strong>
                  {units} <small>units</small>
                </strong>
              </div>
            );
          })}
        </section>

        {/* WhatsApp Usage Panel */}
        <section className="panel usage-panel">
          <div className="panel-head">
            <div>
              <h3>WhatsApp usage</h3>
              <p>Updates by source</p>
            </div>
          </div>
          <div className="usage-number">
            <span>
              <FigmaIcon name="whatsapp" size={20} />
            </span>
            <b>87%</b>
            <small>of updates via WhatsApp</small>
          </div>
          <div className="usage-bar">
            <i style={{ width: '87%' }} />
          </div>
          <div className="usage-labels">
            <span>
              WhatsApp <b>412</b>
            </span>
            <span>
              Manual / POS <b>63</b>
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
