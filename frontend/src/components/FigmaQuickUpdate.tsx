import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { InventoryItem } from '../types';
import { parseInventoryMessage } from '../utils/messageParser';

interface FigmaQuickUpdateProps {
  inventory?: InventoryItem[];
  onConfirm: (message?: string) => void;
  onSendMessage: (msg: string) => Promise<boolean>;
  latestMessageText?: string;
  latestMessageTime?: string;
  onOpenBillModal?: () => void;
}

const PRESET_MESSAGES = [
  'Bhai 20 Parle G aur 10 Tata Salt aaya.',
  'Added 10kg sugar, 5L oil',
  '5 Amul Milk sold',
  'Aaj 12 Fortune Oil aur 15 Maggi aaya'
];

export const FigmaQuickUpdate: React.FC<FigmaQuickUpdateProps> = ({
  inventory = [],
  onConfirm: _onConfirm,
  onSendMessage,
  latestMessageText,
  latestMessageTime,
  onOpenBillModal
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState<string | null>(null);
  const [activeMessage, setActiveMessage] = useState(
    latestMessageText || 'Bhai 20 Parle G aur 10 Tata Salt aaya.'
  );

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (latestMessageText) {
      setActiveMessage(latestMessageText);
    }
  }, [latestMessageText]);

  // Setup Web Speech API for real microphone listening
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Indian English / Hinglish

        recognition.onstart = () => {
          setIsRecording(true);
          setFeedbackNote('Listening... Speak now (Hindi or English)');
        };

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setCustomText(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          setIsRecording(false);
          setFeedbackNote(`Mic error: ${event.error || 'Check microphone'}`);
          setTimeout(() => setFeedbackNote(null), 3500);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } catch {
        recognitionRef.current = null;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Dynamically parse the active message against current shop inventory
  const { items: parsedItems } = useMemo(() => {
    return parseInventoryMessage(activeMessage, inventory);
  }, [activeMessage, inventory]);

  const actionLabel = useMemo(() => {
    if (parsedItems.length === 0) return 'Inventory Update';
    const allAdd = parsedItems.every((i) => i.action === 'ADD');
    const allSell = parsedItems.every((i) => i.action === 'SELL');
    if (allAdd) return 'Stock In';
    if (allSell) return 'Stock Out';
    return 'Inventory Update';
  }, [parsedItems]);

  const handleSend = async (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean || isSending) return;
    setIsSending(true);
    setActiveMessage(clean);
    setFeedbackNote('Processing update into inventory...');
    try {
      const ok = await onSendMessage(clean);
      if (ok) {
        setCustomText('');
        setFeedbackNote(`Inventory updated with: "${clean}"`);
        setTimeout(() => setFeedbackNote(null), 4000);
      } else {
        setFeedbackNote('Could not update inventory.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      // Fallback if browser doesn't have Web Speech API
      setFeedbackNote('Microphone speech API not supported in this browser. Please type below.');
      setTimeout(() => setFeedbackNote(null), 4000);
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsRecording(false);
    } else {
      setCustomText('');
      setFeedbackNote('Initializing microphone...');
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        setIsRecording(false);
        setFeedbackNote('Could not access microphone. Please allow permissions.');
        setTimeout(() => setFeedbackNote(null), 4000);
      }
    }
  };

  return (
    <section className="quick-update">
      {/* Header */}
      <div className="qu-head">
        <div>
          <span className="wa-round">
            <FigmaIcon name="whatsapp" size={20} />
          </span>
          <div>
            <h2>Update inventory with WhatsApp & Bill Scanner</h2>
            <p>Type, speak, or upload a bill. SmartStock AI updates your inventory automatically.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="connected">
            <i /> WhatsApp connected
          </span>
        </div>
      </div>

      {/* Body: Incoming message & Identified updates */}
      <div className="qu-body">
        {/* Left: WhatsApp message */}
        <div className="message-side">
          <div className="source-label">
            <span>INCOMING MESSAGE</span>
            <small>{latestMessageTime || 'Today, 11:42 AM'}</small>
          </div>

          <div className="wa-message">
            {activeMessage}
            <span>
              11:42 AM <FigmaIcon name="check" size={12} />
            </span>
          </div>

          <div className="understanding">
            <span>
              <FigmaIcon name="sparkle" size={15} />
            </span>
            <div>
              <b>AI understood your message</b>
              <small>
                {parsedItems.length} product{parsedItems.length !== 1 ? 's' : ''} · {actionLabel}
              </small>
            </div>
            <FigmaIcon name="check" size={17} className="text-emerald-500" />
          </div>
        </div>

        {/* Right: Identified Updates */}
        <div className="identified-side">
          <div className="identified-head">
            <span>IDENTIFIED UPDATES</span>
            <span className="accuracy">
              <FigmaIcon name="sparkle" size={13} /> 98% confident
            </span>
          </div>

          {parsedItems.length > 0 ? (
            parsedItems.map((item, idx) => (
              <div key={`${item.name}-${idx}`} className="identified-product">
                <span className={`product-avatar ${item.avatarColor}`}>{item.initials}</span>
                <div>
                  <b>{item.name}</b>
                  <small>
                    Current: {item.currentStock} {item.unit}
                  </small>
                </div>
                <strong className={item.action === 'ADD' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                  {item.action === 'ADD' ? '+' : '−'}{item.qty} <small>{item.unit}</small>
                </strong>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-[#58657d] dark:text-[#94a3b8] bg-[#f8fafc] dark:bg-[#162032] rounded-xl border border-dashed border-[#e5eaf2] dark:border-[#334155]">
              Type an inventory update or pick a preset below.
            </div>
          )}

          <button
            type="button"
            disabled={isSending}
            className="btn btn-primary confirm-button cursor-pointer w-full disabled:opacity-50"
            onClick={() => handleSend(activeMessage)}
          >
            <FigmaIcon name="check" size={17} />
            <span>{isSending ? 'Updating Stock...' : 'Confirm & Apply to Inventory'}</span>
          </button>
        </div>
      </div>

      {/* Voice, Bill Scanner, and Quick Action Bar */}
      <div className="voice-option flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-slate-50/70 dark:bg-slate-900/40 border-t border-[#e5eaf2] dark:border-[#1e293b]">
        <div className="flex items-center space-x-2 text-xs text-[#58657d] dark:text-[#94a3b8]">
          <FigmaIcon name="sparkle" size={16} className="text-blue-500" />
          <span>Speak, type message, or scan bill:</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Bill Scanner Button */}
          {onOpenBillModal && (
            <button
              type="button"
              onClick={onOpenBillModal}
              className="btn btn-secondary text-xs px-3 py-1.5 cursor-pointer flex items-center gap-1.5 bg-white dark:bg-[#162032] border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              <FigmaIcon name="receipt" size={15} />
              <span>Upload Bill / Invoice</span>
            </button>
          )}

          {/* Voice Microphone Button */}
          <button
            type="button"
            aria-label={isRecording ? 'Stop recording' : 'Record voice note'}
            onClick={handleVoiceToggle}
            className={`btn btn-secondary cursor-pointer ${
              isRecording ? 'recording text-red-500 border-red-500 animate-pulse bg-red-50 dark:bg-red-950/40' : ''
            }`}
          >
            <FigmaIcon name="mic" size={16} />
            <span>{isRecording ? 'Listening (Speak now)...' : 'Record voice'}</span>
          </button>
        </div>
      </div>

      {feedbackNote && (
        <div className="px-4 py-2 text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-t border-blue-200 dark:border-blue-900 flex items-center gap-2">
          <FigmaIcon name="sparkle" size={14} />
          <span>{feedbackNote}</span>
        </div>
      )}

      {/* Interactive Message Input Bar */}
      <div className="p-4 border-t border-[#e5eaf2] dark:border-[#1e293b] bg-[#f8fafc]/50 dark:bg-[#0d1526]/50 rounded-b-2xl">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(customText)}
            placeholder="Type WhatsApp message e.g., '10 packet Tata Salt aaya' or 'Sold 5 Parle G'..."
            className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            disabled={isSending || !customText.trim()}
            onClick={() => handleSend(customText)}
            className="btn btn-primary text-xs px-4 py-2 cursor-pointer disabled:opacity-50"
          >
            <FigmaIcon name="send" size={14} />
            <span>{isSending ? 'Updating...' : 'Send & Update'}</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[11px] text-[#58657d] dark:text-[#94a3b8]">Quick presets:</span>
          {PRESET_MESSAGES.map((msg) => (
            <button
              key={msg}
              type="button"
              onClick={() => {
                setActiveMessage(msg);
                handleSend(msg);
              }}
              className="text-[11px] px-2 py-0.5 rounded-md border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              &quot;{msg}&quot;
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
