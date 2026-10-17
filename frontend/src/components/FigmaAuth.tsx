import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';

interface FigmaAuthProps {
  mode: 'login' | 'register';
  setMode: (mode: 'login' | 'register') => void;
  onLogin: (phone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  onRegister: (data: {
    phone: string;
    password: string;
    owner_name: string;
    shop_name: string;
    category?: string;
    email?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  onDone: () => void;
  onBack: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export const FigmaAuth: React.FC<FigmaAuthProps> = ({
  mode,
  setMode,
  onLogin,
  onRegister,
  onDone,
  onBack,
  isDark,
  onToggleDark
}) => {
  const [mobileNumber, setMobileNumber] = useState('+91 98765 43210');
  const [password, setPassword] = useState('password123');
  const [ownerName, setOwnerName] = useState('Rajesh Sharma');
  const [shopName, setShopName] = useState('Sharma Kirana & General Store');
  const [email, setEmail] = useState('rajesh@example.com');
  const [category, setCategory] = useState('Grocery');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (mode === 'login') {
        const res = await onLogin(mobileNumber, password);
        if (res.success) {
          onDone();
        } else {
          setErrorMsg(res.message || 'Login failed. Please check phone and password.');
        }
      } else {
        const res = await onRegister({
          phone: mobileNumber,
          password,
          owner_name: ownerName,
          shop_name: shopName,
          category,
          email
        });
        if (res.success) {
          onDone();
        } else {
          setErrorMsg(res.message || 'Registration failed.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemoSharma = () => {
    setMode('login');
    setMobileNumber('+91 98765 43210');
    setPassword('password123');
    setErrorMsg(null);
  };

  const handleFillDemoNewShop = () => {
    setMode('register');
    setMobileNumber('+91 91234 56789');
    setPassword('password123');
    setOwnerName('Vikas Gupta');
    setShopName('Gupta Medical Store');
    setCategory('Pharmacy');
    setErrorMsg(null);
  };

  return (
    <div className="auth-page min-h-screen">
      {/* Brand & Top Bar */}
      <div className="auth-brand">
        <div className="logo cursor-pointer" onClick={onBack}>
          <span className="logo-mark">
            <FigmaIcon name="box" size={18} className="text-white" />
          </span>
          <span>
            SmartStock <b>AI</b>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleDark}
            className="theme-toggle-btn cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <FigmaIcon name="sun" size={15} className="text-amber-400" /> : <FigmaIcon name="moon" size={15} />}
            <span>{isDark ? "Light" : "Dark"}</span>
          </button>

          <button onClick={onBack} className="cursor-pointer text-xs font-semibold hover:underline">
            Back to home
          </button>
        </div>
      </div>

      {/* Auth Card + Visual Container */}
      <div className="auth-wrap">
        {/* Left: Interactive Form */}
        <section className="auth-card">
          <span className="auth-icon">
            <FigmaIcon name={mode === 'login' ? 'user' : 'bag'} size={22} />
          </span>

          <h1>{mode === 'login' ? 'Welcome back' : 'Create your shop'}</h1>
          <p>
            {mode === 'login'
              ? 'Log in to access your shop’s private inventory and WhatsApp stream.'
              : 'Register your own shop with separate, isolated inventory.'}
          </p>

          {/* Quick Demo Pre-sets */}
          <div className="mb-3 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs flex flex-wrap items-center justify-between gap-1.5">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">Quick Test:</span>
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleFillDemoSharma}
                className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border text-[11px] font-medium shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
              >
                Sharma Kirana Store
              </button>
              <button
                type="button"
                onClick={handleFillDemoNewShop}
                className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border text-[11px] font-medium shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
              >
                + Register New Shop
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div className="two-fields">
                <label>
                  <span>Shop Owner Name</span>
                  <input
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Your full name"
                  />
                </label>
                <label>
                  <span>Shop Name</span>
                  <input
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Sharma General Store"
                  />
                </label>
              </div>
            )}

            <label>
              <span>Mobile Number (WhatsApp)</span>
              <input
                required
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </label>

            {mode === 'register' && (
              <label>
                <span>
                  Email <small>(optional)</small>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
            )}

            <label>
              <span>Password</span>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </label>

            {mode === 'register' && (
              <label>
                <span>Shop Category</span>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Grocery">Grocery</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Stationery">Stationery</option>
                  <option value="General Store">General Store</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary auth-submit cursor-pointer"
            >
              <span>{isLoading ? 'Authenticating...' : mode === 'login' ? 'Login to My Shop' : 'Create My Shop'}</span>
              <FigmaIcon name="arrow" size={16} />
            </button>
          </form>

          <div className="auth-switch">
            <span>{mode === 'login' ? 'Need a new shop account?' : 'Already registered?'}</span>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMode(mode === 'login' ? 'register' : 'login');
              }}
              className="cursor-pointer ml-1 underline font-bold"
            >
              {mode === 'login' ? 'Create Shop Account' : 'Log in to Shop'}
            </button>
          </div>
        </section>

        {/* Right: Informational Visual */}
        <aside className="auth-visual">
          <h2>
            Secure Shop Isolation,
            <br />
            Powered by AI.
          </h2>
          <p>Each vendor's inventory is strictly private and password-protected.</p>

          <div className="auth-message">
            “20 Parle G aur 10 Tata Salt aaya.”
            <span>
              9:42 AM <FigmaIcon name="check" size={11} />
            </span>
          </div>

          <div className="mini-flow compact">
            <div className="flow-step done">
              <span>1</span> Login to your shop
            </div>
            <div className="flow-step active">
              <span>2</span> Isolated database
            </div>
            <div className="flow-step">
              <span>3</span> Live sync & privacy
            </div>
          </div>

          <div className="auth-success">
            <FigmaIcon name="check" size={18} className="text-emerald-400" />
            <div>
              <b>Shop Isolation Verified</b>
              <small>Protected with PBKDF2 & JWT Auth</small>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
