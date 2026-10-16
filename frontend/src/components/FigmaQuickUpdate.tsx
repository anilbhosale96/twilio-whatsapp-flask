import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';

interface FigmaQuickUpdateProps {
  onConfirm: () => void;
  onSendMessage: (msg: string) => Promise<boolean>;
  latestMessageText?: string;
  latestMessageTime?: string;
}

const PRESET_MESSAGES = [
  'Bhai 20 Parle G aur 10 Tata Salt aaya.',
  'Added 10kg sugar, 5L oil',
  '5 Amul Milk sold',
  'Aaj 12 Fortune Oil aur 15 Maggi aaya'
];

export const FigmaQuickUpdate: React.FC<FigmaQuickUpdateProps> = ({
  onConfirm,
  onSendMessage,
  latestMessageText,
  latestMessageTime
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeMessage, setActiveMessage] = useState(
    latestMessageText || 'Bhai 20 Parle G aur 10 Tata Salt aaya.'
  );

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;
    setIsSending(true);
    setActiveMessage(textToSend);
    try {
      await onSendMessage(textToSend);
      setCustomText('');
    } finally {
      setIsSending(false);
    }
  };

  const handleVoiceToggle = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        handleSend('15 packet Maggi aur 10 packet Surf Excel aaya');
      }, 2500);
    } else {
      setIsRecording(false);
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
            <h2>Update inventory with WhatsApp</h2>
            <p>Send a message naturally. SmartStock AI handles the rest.</p>
          </div>
        </div>
        <span className="connected">
          <i /> WhatsApp connected
        </span>
      </div>

      {/* Body: Incoming message & Identified updates */}
      <div className="qu-body">
        {/* Left: WhatsApp message */}
        <div className="message-side">
          <div className="source-label">
            <span>INCOMING MESSAGE</span>
            <small>{latestMessageTime || 'Today, 9:42 AM'}</small>
          </div>

          <div className="wa-message">
            {activeMessage}
            <span>
              9:42 AM <FigmaIcon name="check" size={12} />
            </span>
          </div>

          <div className="understanding">
            <span>
              <FigmaIcon name="sparkle" size={15} />
            </span>
            <div>
              <b>AI understood your message</b>
              <small>2 products · Stock In</small>
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

          <div className="identified-product">
            <span className="product-avatar amber">PG</span>
            <div>
              <b>Parle G 100g</b>
              <small>Current: 22 packets</small>
            </div>
            <strong>
              +20 <small>packets</small>
            </strong>
          </div>

          <div className="identified-product">
            <span className="product-avatar blue">TS</span>
            <div>
              <b>Tata Salt 1kg</b>
              <small>Current: 8 packets</small>
            </div>
            <strong>
              +10 <small>packets</small>
            </strong>
          </div>

          <button
            type="button"
            className="btn btn-primary confirm-button cursor-pointer w-full"
            onClick={onConfirm}
          >
            <FigmaIcon name="check" size={17} />
            <span>Confirm & Update Inventory</span>
          </button>
        </div>
      </div>

      {/* Voice and Quick Simulation Bar */}
      <div className="voice-option flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs text-[#58657d] dark:text-[#94a3b8]">
          <FigmaIcon name="mic" size={16} />
          <span>Send voice note or simulate live message:</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            aria-label={isRecording ? 'Stop recording' : 'Record voice note'}
            onClick={handleVoiceToggle}
            className={`btn btn-secondary cursor-pointer ${isRecording ? 'recording text-red-500 border-red-500 animate-pulse' : ''}`}
          >
            <FigmaIcon name="mic" size={16} />
            <span>{isRecording ? 'Listening (Hindi/Eng)...' : 'Record voice'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Message Simulator Input Bar */}
      <div className="p-4 border-t border-[#e5eaf2] dark:border-[#1e293b] bg-[#f8fafc]/50 dark:bg-[#0d1526]/50 rounded-b-2xl">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(customText)}
            placeholder="Type WhatsApp message e.g., '10 packet Tata Salt aaya'..."
            className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            disabled={isSending || !customText.trim()}
            onClick={() => handleSend(customText)}
            className="btn btn-primary text-xs px-4 py-2 cursor-pointer disabled:opacity-50"
          >
            <FigmaIcon name="send" size={14} />
            <span>{isSending ? 'Sending...' : 'Send Live'}</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[11px] text-[#58657d] dark:text-[#94a3b8]">Quick presets:</span>
          {PRESET_MESSAGES.map((msg) => (
            <button
              key={msg}
              type="button"
              onClick={() => handleSend(msg)}
              className="text-[11px] px-2 py-0.5 rounded-md border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              "{msg}"
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
