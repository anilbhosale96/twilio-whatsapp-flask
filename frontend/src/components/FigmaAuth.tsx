import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';

interface FigmaAuthProps {
  mode: 'login' | 'register';
  setMode: (mode: 'login' | 'register') => void;
  onDone: () => void;
  onBack: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export const FigmaAuth: React.FC<FigmaAuthProps> = ({
  mode,
  setMode,
  onDone,
  onBack,
  isDark,
  onToggleDark
}) => {
  const [mobileNumber, setMobileNumber] = useState('+91 98765 43210');
  const [password, setPassword] = useState('password123');
  const [ownerName, setOwnerName] = useState('Rajesh Sharma');
  const [shopName, setShopName] = useState('Sharma General Store');
  const [email, setEmail] = useState('rajesh@example.com');
  const [category, setCategory] = useState('Grocery');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onDone();
    }, 400);
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
              ? 'Log in to manage your inventory and WhatsApp stream.'
              : 'Start managing stock the simple way with SmartStock AI.'}
          </p>

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
                placeholder="Minimum 8 characters"
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
              <span>{isLoading ? 'Verifying...' : mode === 'login' ? 'Login' : 'Create My Shop'}</span>
              <FigmaIcon name="arrow" size={16} />
            </button>
          </form>

          <div className="auth-switch">
            <span>{mode === 'login' ? 'New to SmartStock?' : 'Already have an account?'}</span>
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="cursor-pointer ml-1 underline font-bold"
            >
              {mode === 'login' ? 'Create Shop Account' : 'Log in'}
            </button>
          </div>
        </section>

        {/* Right: Informational Visual */}
        <aside className="auth-visual">
          <h2>
            Inventory updates,
            <br />
            as simple as a message.
          </h2>
          <p>Use WhatsApp in the language that feels natural.</p>

          <div className="auth-message">
            “20 Parle G aur 10 Tata Salt aaya.”
            <span>
              9:42 AM <FigmaIcon name="check" size={11} />
            </span>
          </div>

          <div className="mini-flow compact">
            <div className="flow-step done">
              <span>1</span> Message received
            </div>
            <div className="flow-step active">
              <span>2</span> AI extracts items
            </div>
            <div className="flow-step">
              <span>3</span> Stock synced
            </div>
          </div>

          <div className="auth-success">
            <FigmaIcon name="check" size={18} className="text-emerald-400" />
            <div>
              <b>Inventory updated</b>
              <small>2 products · just now</small>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
