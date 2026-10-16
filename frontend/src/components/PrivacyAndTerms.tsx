import React from 'react';
import { Shield, FileText } from 'lucide-react';

interface LegalDocProps {
  type: 'privacy' | 'terms';
}

export const PrivacyAndTerms: React.FC<LegalDocProps> = ({ type }) => {
  if (type === 'privacy') {
    return (
      <div className="max-w-3xl p-6 sm:p-8 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-[#E2E8F0] dark:border-[#243041]">
          <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] dark:bg-[#134E48] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center">
            <Shield size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
              Privacy Policy
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Smart Stack AI Inventory Services. Last updated: October 2026
            </p>
          </div>
        </div>

        <section className="space-y-2 text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed">
          <h3 className="font-semibold text-[#0F766E] dark:text-[#14B8A6]">1. Data We Collect</h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            We only collect information directly necessary to manage your inventory and process WhatsApp updates. This includes your WhatsApp phone number, message timestamps, product names, quantities, and optional selling prices provided in your messages.
          </p>
        </section>

        <section className="space-y-2 text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed">
          <h3 className="font-semibold text-[#0F766E] dark:text-[#14B8A6]">2. Phone Number Masking & Security</h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Your WhatsApp contact number is masked across all public APIs and interface views (e.g., +91 98*** **210). We never sell, rent, or publicly disclose vendor contact information to third parties.
          </p>
        </section>

        <section className="space-y-2 text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed">
          <h3 className="font-semibold text-[#0F766E] dark:text-[#14B8A6]">3. Audio & Voice Note Processing</h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Voice notes received through WhatsApp are converted to text strictly for inventory transaction processing. Audio recordings are never retained permanently or used to train third-party public models.
          </p>
        </section>

        <section className="space-y-2 text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed">
          <h3 className="font-semibold text-[#0F766E] dark:text-[#14B8A6]">4. Data Retention and Deletion</h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Vendors retain full ownership of their inventory records and transaction logs. You can export your data at any time via CSV or request complete deletion of your vendor account.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-3xl p-6 sm:p-8 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-[#E2E8F0] dark:border-[#243041]">
        <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] dark:bg-[#134E48] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center">
          <FileText size={20} strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
            Terms & Conditions
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Smart Stack AI Operating Agreement. Effective October 2026
          </p>
        </div>
      </div>

      <section className="space-y-2 text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed">
        <h3 className="font-semibold text-[#0F766E] dark:text-[#14B8A6]">1. Nature of Service</h3>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Smart Stack AI is an operational inventory tracking and communication assistant. It is not an audited accounting suite, GST return filing tool, or bank payment gateway. All transactions and reports reflect vendor-submitted data.
        </p>
      </section>

      <section className="space-y-2 text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed">
        <h3 className="font-semibold text-[#0F766E] dark:text-[#14B8A6]">2. Permitted Use</h3>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Users agree not to transmit illegal, prohibited, or copyrighted materials, spam the WhatsApp webhook, or attempt unauthorized penetration testing against platform endpoints.
        </p>
      </section>

      <section className="space-y-2 text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed">
        <h3 className="font-semibold text-[#0F766E] dark:text-[#14B8A6]">3. Reversal and Undo Responsibility</h3>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          The platform provides an instant "undo" mechanism to reverse the previous message batch. Shopkeepers are encouraged to monitor confirmation replies to ensure stock numbers match physical counts.
        </p>
      </section>

      <section className="space-y-2 text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed">
        <h3 className="font-semibold text-[#0F766E] dark:text-[#14B8A6]">4. Availability and Service Continuity</h3>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Local SQLite databases are stored securely on vendor-designated infrastructure, ensuring operations continue uninterrupted even during internet connectivity disruptions.
        </p>
      </section>
    </div>
  );
};

