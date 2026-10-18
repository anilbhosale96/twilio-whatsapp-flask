import React, { useState, useRef, useEffect } from 'react';
import { FigmaIcon } from './FigmaIcon';

interface BillItem {
  name: string;
  qty: number;
  unit: string;
  price: number | null;
  action: 'ADD' | 'SELL';
}

interface FigmaQuickUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onSendMessage?: (msg: string, channel: 'whatsapp' | 'sms') => Promise<{ success: boolean; reply?: string } | boolean>;
  initialTab?: 'bill' | 'voice';
}

export const FigmaQuickUpdateModal: React.FC<FigmaQuickUpdateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSendMessage,
  initialTab = 'bill'
}) => {
  const [activeTab, setActiveTab] = useState<'bill' | 'voice'>(initialTab);

  // Bill Analyzer State
  const [billType, setBillType] = useState<'received' | 'sold'>('received');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [showPasteText, setShowPasteText] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [analyzedItems, setAnalyzedItems] = useState<BillItem[] | null>(null);
  const [billReference, setBillReference] = useState('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Voice & Text State
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Handle Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Works for Indian English and Hinglish phrases

        recognition.onstart = () => {
          setIsListening(true);
          setVoiceFeedback('Listening... Speak now (e.g., "20 Parle G aaya" or "Sold 5 Tata Salt")');
        };

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setVoiceText(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          setVoiceFeedback(`Microphone notice: ${event.error || 'Check microphone permissions'}`);
        };

        recognition.onend = () => {
          setIsListening(false);
          setVoiceFeedback(null);
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

  if (!isOpen) return null;

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      // Fallback if browser doesn't support Web Speech API
      setVoiceFeedback('Browser speech API not supported in this browser. Please type below.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      setVoiceText('');
      setVoiceFeedback('Starting microphone...');
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        setIsListening(false);
        setVoiceFeedback('Could not start microphone. Please check permissions.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisError(null);
      setAnalyzedItems(null);

      // Create image preview if image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleAnalyzeBill = async () => {
    if (!selectedFile && !pastedText.trim()) {
      setAnalysisError('Please choose a bill file or enter invoice text.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      let data: any;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('bill_type', billType);

        const res = await fetch('/api/analyze-bill', {
          method: 'POST',
          body: formData
        });
        data = await res.json();
      } else {
        const res = await fetch('/api/analyze-bill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: pastedText,
            bill_type: billType
          })
        });
        data = await res.json();
      }

      if (data.success && data.items && data.items.length > 0) {
        setAnalyzedItems(data.items);
        if (data.bill_type) {
          setBillType(data.bill_type);
        }
      } else {
        setAnalysisError(
          data.detail ||
            'Could not detect items automatically from this bill. Try pasting the item lines directly.'
        );
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Error communicating with bill analyzer.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyBill = async () => {
    if (!analyzedItems || analyzedItems.length === 0) return;

    setIsApplying(true);
    try {
      const res = await fetch('/api/apply-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_type: billType,
          bill_reference: billReference.trim() || undefined,
          items: analyzedItems
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(
          `Bill processed! ${data.applied_items.length} items ${
            billType === 'received' ? 'added to' : 'deducted from'
          } inventory.`
        );
        onClose();
      } else {
        setAnalysisError(data.detail || 'Failed to apply bill items to inventory.');
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Network error applying bill.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSendVoiceOrText = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    if (onSendMessage) {
      const res = await onSendMessage(text, 'whatsapp');
      const ok = typeof res === 'object' ? res.success : Boolean(res);
      if (ok) {
        onSuccess(`Inventory updated: "${text}"`);
        onClose();
      } else {
        setVoiceFeedback('Failed to update inventory. Please try again.');
      }
    } else {
      // Direct call to /api/message
      try {
        const res = await fetch('/api/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, channel: 'whatsapp' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          onSuccess(data.reply || `Inventory updated: "${text}"`);
          onClose();
        } else {
          setVoiceFeedback(data.detail || 'Could not parse message.');
        }
      } catch (err: any) {
        setVoiceFeedback(err.message || 'Error sending message.');
      }
    }
  };

  const updateItemField = (index: number, field: keyof BillItem, val: any) => {
    if (!analyzedItems) return;
    const next = [...analyzedItems];
    next[index] = { ...next[index], [field]: val };
    setAnalyzedItems(next);
  };

  const removeItem = (index: number) => {
    if (!analyzedItems) return;
    setAnalyzedItems(analyzedItems.filter((_, idx) => idx !== index));
  };

  const totalBillAmount = (analyzedItems || []).reduce(
    (acc, it) => acc + it.qty * (it.price || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-[#e5eaf2] dark:border-[#1e293b] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5eaf2] dark:border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FigmaIcon name="plus" size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#17213a] dark:text-[#f8fafc]">
                Quick Update & Bill Scanner
              </h2>
              <p className="text-xs text-[#58657d] dark:text-[#94a3b8]">
                Analyze purchase/sales bills or speak/type to update inventory instantly.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <FigmaIcon name="close" size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#e5eaf2] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#162032] px-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('bill')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'bill'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-[#58657d] dark:text-[#94a3b8] hover:text-[#17213a]'
            }`}
          >
            <FigmaIcon name="receipt" size={15} />
            Upload Bill / Invoice
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'voice'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-[#58657d] dark:text-[#94a3b8] hover:text-[#17213a]'
            }`}
          >
            <FigmaIcon name="mic" size={15} />
            Speak / Type Message
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'bill' ? (
            <div className="space-y-4">
              {/* Step 1: Select Bill Category (Received vs Sold) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#f8fafc] dark:bg-[#162032] border border-[#e5eaf2] dark:border-[#1e293b]">
                <div>
                  <span className="text-xs font-bold text-[#17213a] dark:text-[#f8fafc] block">
                    Bill Type (Inventory Action)
                  </span>
                  <span className="text-[11px] text-[#58657d] dark:text-[#94a3b8]">
                    {billType === 'received'
                      ? '📥 Goods Received from Wholesaler/Supplier (Adds to inventory)'
                      : '📤 Goods Sold to Customer (Deducts from inventory)'}
                  </span>
                </div>

                <div className="flex items-center bg-white dark:bg-[#111827] p-1 rounded-xl border border-[#dce3ee] dark:border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setBillType('received')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      billType === 'received'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-[#58657d] dark:text-[#94a3b8]'
                    }`}
                  >
                    <span>+ Stock In (Received)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillType('sold')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      billType === 'sold'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-[#58657d] dark:text-[#94a3b8]'
                    }`}
                  >
                    <span>− Stock Out (Sold)</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Bill Upload Dropzone */}
              {!analyzedItems ? (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#cbd5e1] dark:border-[#334155] rounded-2xl p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-[#111827] cursor-pointer transition-colors space-y-2 group"
                  >
                    {filePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={filePreview}
                          alt="Bill preview"
                          className="max-h-36 rounded-lg object-contain shadow-xs border border-slate-200 dark:border-slate-700"
                        />
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                          Click to change file: {selectedFile?.name}
                        </span>
                      </div>
                    ) : selectedFile ? (
                      <div className="space-y-1">
                        <FigmaIcon name="receipt" size={32} className="mx-auto text-blue-600" />
                        <p className="text-xs font-bold text-[#17213a] dark:text-[#f8fafc]">
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </p>
                        <span className="text-[11px] text-slate-400">Click to choose a different file</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <FigmaIcon name="upload" size={24} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#17213a] dark:text-[#f8fafc]">
                            Click to upload bill photo or PDF / CSV
                          </p>
                          <p className="text-xs text-[#58657d] dark:text-[#94a3b8]">
                            Supports invoice photos, receipts, PDFs, TXT, CSV files
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Optional: Paste Text Toggle */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowPasteText(!showPasteText)}
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                    >
                      {showPasteText ? 'Hide paste text area' : 'Or paste bill text manually ▾'}
                    </button>
                  </div>

                  {showPasteText && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc]">
                        Paste Bill / Invoice Lines:
                      </label>
                      <textarea
                        rows={4}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={`e.g.:\nTata Salt 10 pkt 28.00\nParle G 25 pcs 10.00\nFortune Oil 12 pcs 140.00`}
                        className="w-full p-3 text-xs font-mono rounded-xl border border-[#dce3ee] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {analysisError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs flex items-center gap-2">
                      <FigmaIcon name="warning" size={16} />
                      <span>{analysisError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isAnalyzing || (!selectedFile && !pastedText.trim())}
                    onClick={handleAnalyzeBill}
                    className="btn btn-primary w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FigmaIcon name="sparkle" size={16} />
                    <span>{isAnalyzing ? 'Analyzing Bill with AI...' : 'Analyze & Extract Items'}</span>
                  </button>
                </div>
              ) : (
                /* Step 3: Review Detected Bill Items Table */
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-900">
                    <div>
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-100">
                        Detected {analyzedItems.length} Products
                      </span>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">
                        Review quantities and prices below before applying to your inventory.
                      </p>
                    </div>
                    {totalBillAmount > 0 && (
                      <div className="text-right">
                        <small className="text-[10px] text-blue-600 dark:text-blue-400 block uppercase font-bold">
                          Total Value
                        </small>
                        <b className="text-sm font-bold text-blue-900 dark:text-blue-100">
                          ₹{totalBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </b>
                      </div>
                    )}
                  </div>

                  {/* Bill Reference Input */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-[#58657d] dark:text-[#94a3b8] whitespace-nowrap">
                      Bill / Invoice Ref:
                    </label>
                    <input
                      type="text"
                      value={billReference}
                      onChange={(e) => setBillReference(e.target.value)}
                      placeholder="e.g. Inv #104 / Shree Ganesh Wholesalers"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                    />
                  </div>

                  {/* Items Table */}
                  <div className="border border-[#e5eaf2] dark:border-[#1e293b] rounded-xl overflow-hidden">
                    <div className="max-h-56 overflow-y-auto divide-y divide-[#e5eaf2] dark:divide-[#1e293b]">
                      <div className="grid grid-cols-12 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-[#58657d] dark:text-[#94a3b8]">
                        <span className="col-span-5">PRODUCT NAME</span>
                        <span className="col-span-3">QUANTITY & UNIT</span>
                        <span className="col-span-3">RATE (₹)</span>
                        <span className="col-span-1 text-center">DEL</span>
                      </div>

                      {analyzedItems.map((item, idx) => (
                        <div
                          key={`bill-item-${idx}`}
                          className="grid grid-cols-12 gap-2 p-2 items-center text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        >
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItemField(idx, 'name', e.target.value)}
                            className="col-span-5 px-2 py-1 text-xs rounded border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                          />
                          <div className="col-span-3 flex items-center gap-1">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={item.qty}
                              onChange={(e) => updateItemField(idx, 'qty', parseFloat(e.target.value) || 0)}
                              className="w-14 px-1.5 py-1 text-xs rounded border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                            />
                            <span className="text-[11px] text-slate-500">{item.unit}</span>
                          </div>
                          <div className="col-span-3 flex items-center gap-1">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.price ?? ''}
                              onChange={(e) =>
                                updateItemField(
                                  idx,
                                  'price',
                                  e.target.value ? parseFloat(e.target.value) : null
                                )
                              }
                              placeholder="0.00"
                              className="w-20 px-1.5 py-1 text-xs rounded border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="col-span-1 text-center text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {analysisError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs flex items-center gap-2">
                      <FigmaIcon name="warning" size={16} />
                      <span>{analysisError}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setAnalyzedItems(null)}
                      className="btn btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
                    >
                      ← Re-scan / Upload Again
                    </button>

                    <button
                      type="button"
                      disabled={isApplying || analyzedItems.length === 0}
                      onClick={handleApplyBill}
                      className="btn btn-primary px-6 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                      <FigmaIcon name="check" size={16} />
                      <span>
                        {isApplying
                          ? 'Updating Inventory...'
                          : `Confirm & Add ${analyzedItems.length} Products`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Speak / Type Natural Message */
            <div className="space-y-4">
              {/* Voice recognition section */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[#162032] dark:to-[#0f172a] border border-[#d6e5fb] dark:border-[#1e3458] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-600 text-white">
                      <FigmaIcon name="mic" size={16} />
                    </span>
                    <div>
                      <b className="text-xs text-[#17213a] dark:text-[#f8fafc]">Live Voice Recording</b>
                      <p className="text-[11px] text-[#58657d] dark:text-[#94a3b8]">
                        Speak in Hindi, English, or Hinglish into your device microphone.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 shadow-xs ${
                      isListening
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-white dark:bg-[#111827] text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <FigmaIcon name="mic" size={14} />
                    <span>{isListening ? 'Stop Recording' : 'Start Speaking'}</span>
                  </button>
                </div>

                {voiceFeedback && (
                  <p className="text-xs text-blue-800 dark:text-blue-300 font-medium bg-white/70 dark:bg-black/30 p-2 rounded-lg">
                    {voiceFeedback}
                  </p>
                )}
              </div>

              {/* Message text input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#17213a] dark:text-[#f8fafc]">
                  Message Content (What you spoke or want to type):
                </label>
                <textarea
                  rows={3}
                  value={voiceText}
                  onChange={(e) => setVoiceText(e.target.value)}
                  placeholder="e.g. 25 Parle G aaya, 10 Tata Salt sold, or Bhai 12 Fortune Oil aur 15 Maggi aaya..."
                  className="w-full p-3.5 text-sm rounded-xl border border-[#dce3ee] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-[#58657d] dark:text-[#94a3b8] font-medium">
                  Tap to use quick preset:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '20 Parle G aaya',
                    '10 Tata Salt add @ 28',
                    'Sold 5 Amul milk',
                    '12 Fortune Oil aur 15 Maggi aaya'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setVoiceText(preset)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#cbd5e1] hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors"
                    >
                      &quot;{preset}&quot;
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={!voiceText.trim()}
                onClick={() => handleSendVoiceOrText(voiceText)}
                className="btn btn-primary w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
              >
                <FigmaIcon name="send" size={15} />
                <span>Apply & Update Inventory Directly</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
