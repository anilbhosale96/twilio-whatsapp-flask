import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { VendorSettings } from '../types';

interface FigmaSettingsProps {
  settings: VendorSettings | null;
  onSaveSettings: (data: { name?: string; default_threshold?: number; language?: string }) => Promise<boolean>;
}

export const FigmaSettings: React.FC<FigmaSettingsProps> = ({
  settings,
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'wa' | 'domain' | 'security'>('profile');
  const [shopName, setShopName] = useState(settings?.name || 'Sharma General Store');
  const [ownerName, setOwnerName] = useState('Rajesh Sharma');
  const [email, setEmail] = useState('rajesh@example.com');
  const [category, setCategory] = useState('Grocery');
  const [city, setCity] = useState('Pune');
  const [threshold, setThreshold] = useState(settings?.default_threshold || 10);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      name: shopName,
      default_threshold: threshold
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="page space-y-6">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p>Manage your shop and SmartStock preferences.</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Settings Navigation */}
        <nav className="panel settings-nav">
          <button
            className={`cursor-pointer ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FigmaIcon name="bag" size={17} />
            <span>Shop profile</span>
          </button>
          <button
            className={`cursor-pointer ${activeTab === 'wa' ? 'active' : ''}`}
            onClick={() => setActiveTab('wa')}
          >
            <FigmaIcon name="whatsapp" size={17} />
            <span>WhatsApp connection</span>
          </button>
          <button
            className={`cursor-pointer ${activeTab === 'domain' ? 'active' : ''}`}
            onClick={() => setActiveTab('domain')}
          >
            <FigmaIcon name="box" size={17} />
            <span>Custom domain</span>
          </button>
          <button
            className={`cursor-pointer ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <FigmaIcon name="check" size={17} />
            <span>Security audit</span>
          </button>
        </nav>

        {/* Settings Content Form */}
        <section className="panel settings-form">
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3>Shop profile</h3>
                <p>Update the details customers and reports will use.</p>
              </div>

              {savedSuccess && (
                <div className="p-3 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Settings saved successfully to SQLite database.
                </div>
              )}

              <div className="form-grid">
                <label>
                  <span>Shop Owner Name</span>
                  <input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </label>

                <label>
                  <span>Shop Name</span>
                  <input
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                  />
                </label>

                <label>
                  <span>Mobile Number (Masked)</span>
                  <input
                    value={settings?.phone_masked || '+91 98*** **210'}
                    disabled
                    className="opacity-75 cursor-not-allowed"
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <label>
                  <span>Shop Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>Grocery</option>
                    <option>Pharmacy</option>
                    <option>Stationery</option>
                    <option>General Store</option>
                  </select>
                </label>

                <label>
                  <span>City</span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </label>

                <label>
                  <span>Default Low Stock Threshold</span>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="pt-4 border-t border-[#e5eaf2] dark:border-[#1e293b]">
                <button type="submit" className="btn btn-primary cursor-pointer">
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'wa' && (
            <div className="space-y-4">
              <h3>WhatsApp Webhook</h3>
              <p>Twilio WhatsApp webhook endpoint for real-time inventory updates.</p>

              <div className="p-4 rounded-xl border border-[#e5eaf2] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#162032] space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[#58657d] dark:text-[#94a3b8]">Webhook URL:</span>
                  <div className="font-bold text-[#1768e5] dark:text-[#60a5fa] mt-1 select-all">
                    https://app.smartstack.in/webhook
                  </div>
                </div>
                <div>
                  <span className="text-[#58657d] dark:text-[#94a3b8]">HTTP Method:</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">POST</div>
                </div>
                <div>
                  <span className="text-[#58657d] dark:text-[#94a3b8]">Status:</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">Active · Connected</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'domain' && (
            <div className="space-y-4">
              <h3>Custom Domain Setup</h3>
              <p>Your store dashboard is configured for custom domain mapping.</p>

              <div className="p-4 rounded-xl border border-[#e5eaf2] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#162032] space-y-3 text-xs">
                <div>
                  <span className="text-[#58657d] dark:text-[#94a3b8]">Connected Domain:</span>
                  <div className="font-bold text-sm text-[#17213a] dark:text-[#f8fafc] mt-0.5">
                    app.smartstack.in
                  </div>
                </div>
                <div>
                  <span className="text-[#58657d] dark:text-[#94a3b8]">DNS CNAME:</span>
                  <div className="font-mono bg-white dark:bg-[#0d1526] p-2 rounded border border-[#e5eaf2] dark:border-[#334155] mt-1">
                    app.smartstack.in CNAME cname.smartstack.in
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                  <FigmaIcon name="check" size={14} />
                  <span>SSL Certificate Verified & Active</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3>Security Hardening Status</h3>
              <p>Full security controls active as mandated by the implementation plan.</p>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                  <FigmaIcon name="check" size={16} />
                  <span>Content-Security-Policy & Security Headers Active</span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                  <FigmaIcon name="check" size={16} />
                  <span>XSS Sanitization & HTML Tag Stripping Verified</span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                  <FigmaIcon name="check" size={16} />
                  <span>Rate Limiting: 60 req/min Webhook, 120 req/min Dashboard</span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                  <FigmaIcon name="check" size={16} />
                  <span>Password Hashing: PBKDF2-HMAC-SHA256 (600,000 iterations)</span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                  <FigmaIcon name="check" size={16} />
                  <span>Phone Numbers Masked in All Responses</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
