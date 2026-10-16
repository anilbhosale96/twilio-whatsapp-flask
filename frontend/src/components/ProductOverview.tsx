import React from 'react';
import {
  MessageSquare,
  Mic,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Zap
} from 'lucide-react';

interface ProductOverviewProps {
  onGoToDashboard: () => void;
  onOpenSimulator: () => void;
}

export const ProductOverview: React.FC<ProductOverviewProps> = ({
  onGoToDashboard,
  onOpenSimulator
}) => {
  return (
    <div className="space-y-12 max-w-5xl mx-auto py-2">
      {/* Hero Section matching Figma */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#CCFBF1] dark:bg-[#134E48] text-[#0F766E] dark:text-[#2DD4BF] text-xs font-semibold">
          <Zap size={14} strokeWidth={2} />
          <span>Built for Indian Kirana & Local Retail Stores</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F1F5F9] leading-tight">
          Turn WhatsApp Messages Into <span className="text-[#0F766E] dark:text-[#14B8A6]">Real-Time Inventory</span>
        </h1>

        <p className="text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
          No complex POS menus, barcodes, or training required. Simply text or send a voice note on WhatsApp like you already do, and SmartStock AI handles the rest.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <button
            onClick={onGoToDashboard}
            className="h-11 px-6 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-semibold flex items-center space-x-2 transition-colors cursor-pointer shadow-sm"
          >
            <span>Open Live Dashboard</span>
            <ArrowRight size={16} strokeWidth={2} />
          </button>
          <button
            onClick={onOpenSimulator}
            className="h-11 px-6 rounded-lg border border-[#CBD5E1] dark:border-[#475569] bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F1F5F9] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] text-sm font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <MessageSquare size={16} strokeWidth={1.5} />
            <span>Simulate Live WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Interactive Workflow Visualizer from Figma Site */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#1F2937]/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
              How It Works: Real-Time WhatsApp Workflow
            </h2>
          </div>
          <span className="text-xs font-mono text-[#0F766E] dark:text-[#14B8A6]">
            Under 2s Latency
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] dark:divide-[#243041]">
          {/* Left: WhatsApp Phone Simulation */}
          <div className="p-6 bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                <span>WhatsApp Message</span>
                <span className="font-mono">Today, 01:45 PM</span>
              </div>

              {/* Chat bubble */}
              <div className="p-4 rounded-2xl rounded-tr-sm bg-[#0F766E] text-white text-sm shadow-sm space-y-2">
                <p className="font-semibold text-base">
                  "Added 10kg rice, 5L oil & sold 2 bread @20"
                </p>
                <div className="flex items-center justify-between text-xs text-white/80 pt-1 border-t border-white/20">
                  <span className="flex items-center space-x-1">
                    <Mic size={13} strokeWidth={1.5} />
                    <span>Voice or Text</span>
                  </span>
                  <span className="font-mono">Delivered</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] flex items-center justify-between text-xs">
              <span className="text-[#64748B] dark:text-[#94A3B8]">AI Natural Language Parser</span>
              <span className="font-semibold text-[#16A34A] flex items-center space-x-1">
                <CheckCircle2 size={14} strokeWidth={2} />
                <span>98% Accuracy (English, Hindi, Marathi)</span>
              </span>
            </div>
          </div>

          {/* Right: Automated Dashboard Update */}
          <div className="p-6 space-y-4 bg-white dark:bg-[#111827]">
            <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span className="font-semibold uppercase tracking-wider">Identified Inventory Changes</span>
              <span className="text-[#16A34A] font-semibold">1 Transaction Committed</span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#0B1220] flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Rice</span>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Stock restock</p>
                </div>
                <span className="px-2.5 py-1 rounded font-mono font-bold text-[#16A34A] bg-[#DCFCE7] dark:bg-[#14532D]/40">
                  +10 kg (Now 85 kg)
                </span>
              </div>

              <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#0B1220] flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Cooking Oil</span>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Stock restock</p>
                </div>
                <span className="px-2.5 py-1 rounded font-mono font-bold text-[#16A34A] bg-[#DCFCE7] dark:bg-[#14532D]/40">
                  +5 L (Now 42 L)
                </span>
              </div>

              <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#0B1220] flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Bread</span>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Logged sale @ Rs. 20</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded font-mono font-bold text-[#2563EB] bg-[#E0E7FF] dark:bg-[#1E3A8A]/40">
                    -2 pcs (Revenue: Rs. 40)
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onGoToDashboard}
              className="w-full h-10 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <span>View Live In Real Dashboard</span>
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Value Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] dark:bg-[#134E48] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center">
            <MessageSquare size={20} strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-base text-[#0F172A] dark:text-[#F1F5F9]">
            Zero Learning Curve
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Shop owners don't need barcodes, complex menus, or typing drills. If you know how to send a WhatsApp text or voice note, you already know how to use SmartStock.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] dark:bg-[#134E48] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center">
            <TrendingUp size={20} strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-base text-[#0F172A] dark:text-[#F1F5F9]">
            Low-Stock Warnings & 1-Click Orders
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Never lose sales to stock-outs. SmartStock alerts you immediately when an item dips below its threshold, and drafts a ready-to-send purchase order for your distributor.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] dark:bg-[#134E48] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center">
            <ShieldCheck size={20} strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-base text-[#0F172A] dark:text-[#F1F5F9]">
            1-Click Undo & Reversals
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Made an accidental typo or error? Just send "undo" on WhatsApp. SmartStock reverses all quantities and keeps your audit ledger completely accurate.
          </p>
        </div>
      </div>
    </div>
  );
};
