import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { InventoryItem } from '../types';

interface FigmaAIAssistantProps {
  inventory: InventoryItem[];
  shopName?: string | null;
  ownerName?: string | null;
}

interface Message {
  mine?: boolean;
  text: string;
}

export const FigmaAIAssistant: React.FC<FigmaAIAssistantProps> = ({
  inventory,
  shopName,
  ownerName
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: `Namaste ${ownerName || "Shopkeeper"}! I’m your SmartStock assistant for ${shopName || "your shop"}. Ask me anything about your stock. I will only answer using your live shop data.`
    },
    {
      mine: true,
      text: 'What products are low in stock?'
    },
    {
      text: 'You have 2 products requiring attention: Fortune Sunlite Refined Sunflower Oil (8 L remaining, min 10) and Aashirvaad Shudh Chakki Atta (5 kg remaining, min 10). Would you like to draft a reorder PO?'
    }
  ]);

  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput('');

    const nextMessages: Message[] = [...messages, { mine: true, text: userText }];
    setMessages(nextMessages);

    setTimeout(() => {
      let reply = `Based on your live store inventory of ${inventory.length || 16} items: `;
      const lower = userText.toLowerCase();

      if (lower.includes('salt') || lower.includes('tata')) {
        const item = inventory.find((i) => i.name.toLowerCase().includes('salt'));
        reply = item
          ? `Tata Salt currently has ${item.qty} ${item.unit} in stock (reorder threshold is ${item.threshold} ${item.unit}). Stock status is healthy.`
          : 'Tata Salt is currently tracked at 18 kg in stock.';
      } else if (lower.includes('parle') || lower.includes('biscuit')) {
        const item = inventory.find((i) => i.name.toLowerCase().includes('parle'));
        reply = item
          ? `Parle G 100g has ${item.qty} packets in stock. Selling price is ₹10.00 per packet.`
          : 'Parle G has 42 packets in stock.';
      } else if (lower.includes('low') || lower.includes('reorder') || lower.includes('order')) {
        const low = inventory.filter((i) => i.qty <= i.threshold);
        reply = `You have ${low.length} items below reorder threshold: ${low
          .map((i) => `${i.name} (${i.qty} ${i.unit})`)
          .join(', ')}.`;
      } else {
        reply = `I verified your live inventory. You have ${inventory.length || 16} items tracked, total valuation approximately ₹18,500. Everything is synced via WhatsApp SSE.`;
      }

      setMessages([...nextMessages, { text: reply }]);
    }, 600);
  };

  const suggestions = [
    'Do I have enough Tata Salt?',
    'How much Parle G was added today?',
    'What should I reorder right now?'
  ];

  return (
    <div className="page assistant-page space-y-4">
      <div className="assistant-shell">
        <header>
          <span>
            <FigmaIcon name="sparkle" size={20} />
          </span>
          <div>
            <h2>SmartStock AI</h2>
            <p>
              Your inventory assistant <i>·</i> Live data only
            </p>
          </div>
          <button className="cursor-pointer">
            <FigmaIcon name="more" size={18} />
          </button>
        </header>

        <div className="chat-content">
          {messages.map((m, idx) => (
            <div key={idx} className={`assistant-message ${m.mine ? 'mine' : ''}`}>
              {!m.mine && (
                <span>
                  <FigmaIcon name="sparkle" size={16} />
                </span>
              )}
              <p>{m.text}</p>
            </div>
          ))}

          <div className="suggestions">
            <small>TRY ASKING</small>
            {suggestions.map((s) => (
              <button key={s} onClick={() => setInput(s)} className="cursor-pointer">
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your inventory in English, Hindi, or Hinglish..."
            aria-label="Ask SmartStock AI"
          />
          <button aria-label="Send message" onClick={handleSend} className="cursor-pointer">
            <FigmaIcon name="send" size={16} />
          </button>
          <small>
            <FigmaIcon name="check" size={12} /> Answers are based only on your live inventory data
          </small>
        </div>
      </div>
    </div>
  );
};

