import React, { useState } from 'react';
import { Mic, CheckCheck, CornerDownLeft } from 'lucide-react';
import type { ChatMessage } from '../types';

interface LiveChatPreviewProps {
  latestMessage: ChatMessage | null;
  onSendMessage: (msg: string) => Promise<boolean>;
}

export const LiveChatPreview: React.FC<LiveChatPreviewProps> = ({
  latestMessage,
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await onSendMessage(inputText.trim());
    setInputText('');
    setIsSubmitting(false);
  };

  const sampleCommands = [
    'Added 10kg rice, 5L oil',
    'sold 2 bread @20',
    '10 kg chawal aaya',
    'report',
    'undo'
  ];

  return (
    <div className="rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
          <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
            Live Messaging Stream
          </h2>
        </div>
        <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Twilio WhatsApp Sandbox
        </span>
      </div>

      {/* Chat Messages Body */}
      <div className="p-5 flex-1 space-y-4 max-h-[380px] overflow-y-auto">
        {latestMessage ? (
          <>
            {/* Incoming User Message */}
            <div className="flex flex-col items-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#0F766E] text-white p-3.5 shadow-sm text-sm">
                {latestMessage.is_voice && (
                  <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-white/20 text-xs text-white/90">
                    <Mic size={14} strokeWidth={1.5} />
                    <span>Voice Note ({latestMessage.transcript || 'Transcribed audio'})</span>
                  </div>
                )}
                <p className="font-medium">{latestMessage.incoming_text}</p>
                <div className="flex items-center justify-end space-x-1 mt-1 text-[11px] text-white/80">
                  <span>{new Date(latestMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <CheckCheck size={14} strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Parsed Chips */}
            {latestMessage.parsed_items && latestMessage.parsed_items.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-start">
                {latestMessage.parsed_items.map((it, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-xs px-2.5 py-1 rounded-md font-mono bg-[#F1F5F9] dark:bg-[#1E293B] text-[#0F766E] dark:text-[#2DD4BF] border border-[#E2E8F0] dark:border-[#334155]"
                  >
                    {it.action === 'ADD' ? '+' : '-'} {it.qty} {it.unit} {it.item}
                    {it.price ? ` @ Rs.${it.price}` : ''}
                  </span>
                ))}
              </div>
            )}

            {/* Bot Response Bubble */}
            <div className="flex flex-col items-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F1F5F9] p-3.5 shadow-sm text-sm">
                <p className="whitespace-pre-line leading-relaxed">{latestMessage.reply_text}</p>
                <div className="mt-1 text-right text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Smart Stack AI Bot
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-[#64748B] dark:text-[#94A3B8] text-sm">
            <p>No messages received yet.</p>
            <p className="text-xs mt-1">Try sending a message below or via WhatsApp!</p>
          </div>
        )}
      </div>

      {/* Quick Action Commands */}
      <div className="px-5 py-2.5 border-t border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#1F2937]/50 flex items-center gap-1.5 overflow-x-auto text-xs">
        <span className="text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">Examples:</span>
        {sampleCommands.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => onSendMessage(cmd)}
            className="px-2.5 py-1 rounded border border-[#CBD5E1] dark:border-[#475569] bg-white dark:bg-[#1E293B] hover:border-[#0F766E] dark:hover:border-[#14B8A6] text-[#0F172A] dark:text-[#F1F5F9] whitespace-nowrap transition-colors cursor-pointer text-xs"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Input Sender Bar */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#E2E8F0] dark:border-[#243041] flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send test WhatsApp message (e.g., Added 10kg rice, sold 2 bread @20)..."
          className="flex-1 h-10 px-3.5 rounded-lg border border-[#CBD5E1] dark:border-[#475569] bg-[#F8FAFC] dark:bg-[#0B1220] text-sm text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSubmitting}
          className="h-10 px-4 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white disabled:opacity-50 text-sm font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <span>Send</span>
          <CornerDownLeft size={15} strokeWidth={1.5} />
        </button>
      </form>
    </div>
  );
};

