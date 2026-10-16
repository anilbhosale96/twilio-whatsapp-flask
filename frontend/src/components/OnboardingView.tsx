import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const OnboardingView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const sampleMessages = [
    {
      lang: 'English',
      text: 'Added 10kg rice, 5L oil',
      desc: 'Restock inventory with multiple items and units'
    },
    {
      lang: 'English (Sales)',
      text: 'sold 2 bread @20',
      desc: 'Log sales with quantity and unit price'
    },
    {
      lang: 'Hindi',
      text: '10 kg chawal aaya, 5 l tel',
      desc: 'Stock addition in everyday Hindi'
    },
    {
      lang: 'Marathi',
      text: '2 packet bread vikla @25',
      desc: 'Sales tracking in colloquial Marathi'
    },
    {
      lang: 'Hinglish',
      text: '10kg atta laya aur 2 packet milk becha @32',
      desc: 'Combined restock and sales message'
    },
    {
      lang: 'Commands',
      text: 'report',
      desc: 'Get today\'s instant sales & revenue summary'
    },
    {
      lang: 'Commands',
      text: 'undo',
      desc: 'Instantly reverse your previous message'
    }
  ];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Step by step card */}
      <div className="p-6 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
        <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F1F5F9] mb-4">
          Connect Your Phone in 3 Simple Steps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-semibold text-sm text-[#0F172A] dark:text-[#F1F5F9]">
              Save WhatsApp Number
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Save <span className="font-mono text-[#0F766E] dark:text-[#14B8A6] font-semibold">+1 (415) 523-8886</span> to your phone contacts.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-semibold text-sm text-[#0F172A] dark:text-[#F1F5F9]">
              Send Sandbox Join Code
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Send message <span className="font-mono font-semibold bg-[#F1F5F9] dark:bg-[#1E293B] px-1 py-0.5 rounded">join SmartStack</span> to initiate the session.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-semibold text-sm text-[#0F172A] dark:text-[#F1F5F9]">
              Send Stock or Voice Note
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Type or speak any inventory update naturally in Hindi, Marathi, or English.
            </p>
          </div>
        </div>
      </div>

      {/* Multilingual Examples */}
      <div className="p-6 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
            Multilingual Command Library
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Click to copy realistic test messages in four languages:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sampleMessages.map((sample, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#0B1220] flex items-center justify-between gap-3"
            >
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8]">
                  {sample.lang}
                </span>
                <p className="text-xs font-mono font-medium text-[#0F172A] dark:text-[#F1F5F9] mt-1">
                  "{sample.text}"
                </p>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  {sample.desc}
                </p>
              </div>

              <button
                onClick={() => handleCopy(sample.text, idx)}
                className="h-8 px-2.5 rounded border border-[#CBD5E1] dark:border-[#475569] text-xs font-medium text-[#0F172A] dark:text-[#F1F5F9] hover:bg-white dark:hover:bg-[#1E293B] flex items-center space-x-1 transition-colors cursor-pointer"
                title="Copy text"
              >
                {copiedIndex === idx ? (
                  <Check size={13} className="text-[#16A34A]" strokeWidth={2} />
                ) : (
                  <Copy size={13} strokeWidth={1.5} />
                )}
                <span className="text-[11px]">{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
