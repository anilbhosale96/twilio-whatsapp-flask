import React, { useState, useEffect } from 'react';
import { Save, Globe, Check } from 'lucide-react';
import type { VendorSettings } from '../types';

interface SettingsViewProps {
  settings: VendorSettings | null;
  onSaveSettings: (data: { name?: string; default_threshold?: number; language?: string }) => Promise<boolean>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
  const [shopName, setShopName] = useState('');
  const [defaultThreshold, setDefaultThreshold] = useState('5');
  const [language, setLanguage] = useState('en');
  const [customDomain, setCustomDomain] = useState('inventory.sharmakirana.in');
  const [savedToast, setSavedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setShopName(settings.name || '');
      setDefaultThreshold(settings.default_threshold.toString());
      setLanguage(settings.language || 'en');
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await onSaveSettings({
      name: shopName.trim(),
      default_threshold: parseFloat(defaultThreshold),
      language: language
    });
    setIsSaving(false);
    if (success) {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {savedToast && (
        <div className="p-3.5 rounded-lg bg-[#DCFCE7] text-[#16A34A] dark:bg-[#14532D]/40 dark:text-[#22C55E] text-sm flex items-center space-x-2 border border-[#86EFAC] dark:border-[#15803D]">
          <Check size={16} strokeWidth={2} />
          <span>Vendor configuration updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
            Store Profile & Preferences
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Configure your kirana store identity and automated alert defaults.
          </p>
        </div>

        {/* Shop Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
            Store Name
          </label>
          <input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="e.g. Sharma Kirana & General Store"
            className="w-full h-10 px-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#0B1220] text-sm text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          />
        </div>

        {/* Phone number (Masked) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
            Registered WhatsApp Number
          </label>
          <input
            type="text"
            disabled
            value={settings?.phone_masked || 'whatsapp:+91 98*** **210'}
            className="w-full h-10 px-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-[#F1F5F9] dark:bg-[#1E293B] text-sm font-mono text-[#64748B] dark:text-[#94A3B8] cursor-not-allowed"
          />
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            Phone numbers are strictly masked on all client views for privacy.
          </p>
        </div>

        {/* Default Threshold */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
            Default Low-Stock Alert Threshold
          </label>
          <input
            type="number"
            min="1"
            value={defaultThreshold}
            onChange={(e) => setDefaultThreshold(e.target.value)}
            className="w-full h-10 px-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#0B1220] text-sm text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          />
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            Applied automatically when new products are added without an explicit alert level.
          </p>
        </div>

        {/* Preferred Language */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
            Preferred WhatsApp Reply Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#0B1220] text-sm text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          >
            <option value="en">English</option>
            <option value="hi">Hindi (हिंदी)</option>
            <option value="mr">Marathi (मराठी)</option>
          </select>
        </div>

        {/* Custom Domain Configuration */}
        <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#243041] space-y-3">
          <div className="flex items-center space-x-2">
            <Globe size={16} strokeWidth={1.5} className="text-[#0F766E] dark:text-[#14B8A6]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#F1F5F9]">
              Custom Production Domain
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="e.g. inventory.yourstore.com"
              className="flex-1 h-10 px-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#0B1220] text-sm font-mono text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
            <span className="px-3 py-2 rounded-lg bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold flex items-center space-x-1">
              <Check size={14} strokeWidth={2} />
              <span>Connected</span>
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            CNAME points to <span className="font-mono text-[#0F766E] dark:text-[#14B8A6]">cname.smartstack.app</span>. SSL certificate active.
          </p>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="h-10 px-5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-medium flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Save size={16} strokeWidth={1.5} />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

