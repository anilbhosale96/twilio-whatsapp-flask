import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { FigmaIcon } from './FigmaIcon';
import type { BarcodeDecodeResult } from '../types';

interface FigmaBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string, format?: string) => void;
  onDecodeImage?: (file: File) => Promise<{
    success: boolean;
    message: string;
    barcodes: BarcodeDecodeResult[];
    primary_barcode?: string;
  }>;
}

export const FigmaBarcodeScanner: React.FC<FigmaBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onBarcodeScanned,
  onDecodeImage
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');

  // Upload image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [detectedBarcodes, setDetectedBarcodes] = useState<BarcodeDecodeResult[]>([]);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'smartstock-camera-viewfinder';

  // Play short confirmation beep on successful scan
  const playScanBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  // Start live camera scanner
  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.333
        },
        (decodedText, decodedResult) => {
          playScanBeep();
          const formatName = decodedResult?.result?.format?.formatName || 'BARCODE';
          html5QrCode.stop().catch(() => {});
          setIsScanning(false);
          onBarcodeScanned(decodedText.trim(), formatName);
        },
        () => {
          // ignore scan frame misses
        }
      );
    } catch (err: any) {
      setIsScanning(false);
      setCameraError(
        err.message || 'Camera permission denied or camera device not accessible on this device.'
      );
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      // Short delay to ensure DOM element is mounted
      const timer = setTimeout(() => {
        startCamera();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Hardware scanner listener: physical USB/Bluetooth scanners send keystrokes ending in Enter
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      const now = Date.now();
      const elapsed = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          playScanBeep();
          const scanned = buffer.trim();
          buffer = '';
          onBarcodeScanned(scanned, 'USB_HARDWARE');
        }
        buffer = '';
      } else if (e.key.length === 1) {
        // Hardware scanners output characters with very short delay (< 50ms)
        if (elapsed > 120) {
          buffer = '';
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onBarcodeScanned]);

  // Handle uploaded barcode image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setImagePreview(URL.createObjectURL(file));
    setDecodeError(null);
    setDetectedBarcodes([]);
    setIsDecoding(true);

    try {
      // 1. Try server-side ZXing-CPP decoder first
      if (onDecodeImage) {
        const res = await onDecodeImage(file);
        if (res.success && res.barcodes && res.barcodes.length > 0) {
          setDetectedBarcodes(res.barcodes);
          setIsDecoding(false);
          return;
        }
      }

      // 2. Fallback to client-side HTML5-QRCode file scanner
      const html5QrCode = new Html5Qrcode('smartstock-file-decode-temp', false);
      try {
        const result = await html5QrCode.scanFile(file, true);
        if (result) {
          setDetectedBarcodes([{ text: result, format: 'BARCODE', is_valid: true }]);
          setIsDecoding(false);
          return;
        }
      } catch (localErr) {
        // Fallback failed
      } finally {
        html5QrCode.clear();
      }

      setDecodeError(
        'No clear barcode detected. Ensure the image is well-lit and not blurry, or crop closer to the barcode.'
      );
    } catch (err: any) {
      setDecodeError(err.message || 'Error processing barcode image.');
    } finally {
      setIsDecoding(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      playScanBeep();
      onBarcodeScanned(manualInput.trim(), 'MANUAL');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Hidden container for file scan fallback */}
      <div id="smartstock-file-decode-temp" style={{ display: 'none' }} />

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <FigmaIcon name="search" size={17} />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Scan or Upload Barcode
              </h3>
              <p className="text-[11px] text-slate-500">Fast retail barcode lookup & entry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 font-bold flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'camera'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FigmaIcon name="camera" size={14} />
            <span>Live Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FigmaIcon name="upload" size={14} />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FigmaIcon name="edit" size={14} />
            <span>Manual / USB</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: LIVE CAMERA VIEW */}
        {/* ========================================================================= */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-200 dark:border-slate-800">
              <div id={readerElementId} className="w-full h-full" />

              {/* Viewfinder Target Reticle */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-56 h-36 border-2 border-emerald-400 rounded-2xl relative shadow-lg">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
                    <div className="w-full h-0.5 bg-emerald-400/80 absolute top-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <span className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full mt-3 font-semibold backdrop-blur-xs">
                    Align barcode inside frame
                  </span>
                </div>
              )}

              {cameraError && (
                <div className="p-4 text-center text-xs text-rose-300 space-y-2 max-w-xs">
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs"
                  >
                    Enter Barcode Manually
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>Supports EAN-13, EAN-8, UPC, Code 128</span>
              <button
                type="button"
                onClick={startCamera}
                className="text-blue-600 hover:underline font-bold"
              >
                Restart Camera
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: UPLOAD BARCODE IMAGE */}
        {/* ========================================================================= */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-2">
                <FigmaIcon name="upload" size={22} />
              </span>
              <b className="text-xs text-slate-900 dark:text-white">
                Choose photo or take picture
              </b>
              <span className="text-[11px] text-slate-500 mt-1">
                PNG, JPEG, WEBP up to 10MB
              </span>
            </label>

            {imagePreview && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-44 bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                <img src={imagePreview} alt="Preview" className="max-h-44 object-contain" />
                {isDecoding && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2">
                    <span className="animate-spin text-blue-400">●</span>
                    <span>Analyzing barcode...</span>
                  </div>
                )}
              </div>
            )}

            {decodeError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
                {decodeError}
              </div>
            )}

            {detectedBarcodes.length > 0 && (
              <div className="space-y-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                  ✓ Barcode Detected:
                </span>
                {detectedBarcodes.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900"
                  >
                    <div>
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white block">
                        {b.text}
                      </span>
                      <small className="text-[10px] text-slate-500">Format: {b.format}</small>
                    </div>
                    <button
                      type="button"
                      onClick={() => onBarcodeScanned(b.text, b.format)}
                      className="btn btn-primary px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                    >
                      Use Barcode
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MANUAL INPUT OR USB SCANNER */}
        {/* ========================================================================= */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Enter Barcode or SKU Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. 8901030383458 or SKU-101"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
                <span className="absolute left-3.5 top-2.5 text-slate-400">
                  <FigmaIcon name="search" size={16} />
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <b>USB / Bluetooth Barcode Scanners Supported:</b>
              <p className="text-[11px] text-blue-600 dark:text-blue-400">
                Plug in any standard retail handheld scanner and press the trigger to auto-scan instantly.
              </p>
            </div>

            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="w-full btn btn-primary py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              Lookup Barcode
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
