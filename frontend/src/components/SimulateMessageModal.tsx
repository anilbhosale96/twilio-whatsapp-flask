import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface SimulateMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (msg: string) => Promise<boolean>;
}

export const SimulateMessageModal: React.FC<SimulateMessageModalProps> = ({
  isOpen,
  onClose,
  onSendMessage
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const quickPresets = [
    { label: 'Add 10kg Rice & 5L Oil', text: 'Added 10kg rice, 5L oil' },
    { label: 'Sell 2 Bread @ Rs. 20', text: 'sold 2 bread @20' },
    { label: 'Hindi Add (10kg Chawal)', text: '10 kg chawal aaya' },
    { label: 'Marathi Sell (2 Bread Vikla)', text: '2 packet bread vikla @25' },
    { label: 'Get Sales Report', text: 'report' },
    { label: 'Undo Previous Message', text: 'undo' },
    { label: 'Trigger Low Stock Alert', text: 'sold 50kg rice @60' },
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;
    setIsSending(true);
    await onSendMessage(textToSend.trim());
    setIsSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#243041] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] dark:bg-[#14B8A6]" />
            <h3 className="font-semibold text-sm text-[#0F172A] dark:text-[#F1F5F9]">
              Simulate Live WhatsApp Message
            </h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded text-[#64748B] hover:text-[#0F172A] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Sends a real payload to the <code className="text-[#0F766E] dark:text-[#14B8A6]">POST /webhook</code> endpoint as if received from Twilio WhatsApp. The dashboard updates live automatically without page refresh.
          </p>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
              Quick Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(preset.text)}
                  className="p-2.5 text-left rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#0B1220] hover:border-[#0F766E] dark:hover:border-[#14B8A6] text-xs transition-colors cursor-pointer"
                >
                  <p className="font-medium text-[#0F172A] dark:text-[#F1F5F9]">
                    {preset.label}
                  </p>
                  <p className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                    "{preset.text}"
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message Input */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
              Or Type Custom Message
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Added 50kg atta @42, 10 dozen eggs @80"
              className="w-full p-3 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#0B1220] text-sm text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#1F2937]/50 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#CBD5E1] dark:border-[#475569] text-xs font-medium text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!message.trim() || isSending}
            onClick={() => handleSend(message)}
            className="h-9 px-4 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-medium flex items-center space-x-1.5 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Send size={13} strokeWidth={1.5} />
            <span>{isSending ? 'Sending...' : 'Send Message'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
