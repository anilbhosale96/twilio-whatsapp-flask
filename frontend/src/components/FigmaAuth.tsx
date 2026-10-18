import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';

interface FigmaAuthProps {
  mode: 'login' | 'register';
  setMode: (mode: 'login' | 'register') => void;
  accountType?: 'vendor' | 'customer';
  setAccountType?: (type: 'vendor' | 'customer') => void;
  onLogin: (phone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  onRegister: (data: {
    phone: string;
    password: string;
    owner_name: string;
    shop_name: string;
    category?: string;
    email?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  onCustomerLogin?: (phone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  onCustomerRegister?: (data: {
    phone: string;
    password: string;
    name: string;
    city?: string;
    email?: string;
    address?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  onDone: () => void;
  onBack: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export const FigmaAuth: React.FC<FigmaAuthProps> = ({
  mode,
  setMode,
  accountType: initialAccountType = 'vendor',
  setAccountType: externalSetAccountType,
  onLogin,
  onRegister,
  onCustomerLogin,
  onCustomerRegister,
  onDone,
  onBack,
  isDark,
  onToggleDark
}) => {
  const [accountType, setInternalAccountType] = useState<'vendor' | 'customer'>(initialAccountType);

  const handleAccountTypeChange = (type: 'vendor' | 'customer') => {
    setInternalAccountType(type);
    if (externalSetAccountType) externalSetAccountType(type);
    setErrorMsg(null);
  };

  // Vendor state
  const [mobileNumber, setMobileNumber] = useState('+91 98765 43210');
  const [password, setPassword] = useState('password123');
  const [ownerName, setOwnerName] = useState('Rajesh Sharma');
  const [shopName, setShopName] = useState('Sharma Kirana & General Store');
  const [email, setEmail] = useState('rajesh@example.com');
  const [category, setCategory] = useState('Grocery');

  // Customer state
  const [customerPhone, setCustomerPhone] = useState('+91 99999 88888');
  const [customerPassword, setCustomerPassword] = useState('password123');
  const [customerName, setCustomerName] = useState('Amit Verma');
  const [customerCity, setCustomerCity] = useState('Pune');
  const [customerEmail, setCustomerEmail] = useState('amit.verma@example.com');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (accountType === 'vendor') {
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
      } else {
        // Customer submission
        if (mode === 'login') {
          if (!onCustomerLogin) {
            setErrorMsg('Customer login handler is not available.');
            return;
          }
          const res = await onCustomerLogin(customerPhone, customerPassword);
          if (res.success) {
            onDone();
          } else {
            setErrorMsg(res.message || 'Customer login failed. Please check phone and password.');
          }
        } else {
          if (!onCustomerRegister) {
            setErrorMsg('Customer register handler is not available.');
            return;
          }
          const res = await onCustomerRegister({
            phone: customerPhone,
            password: customerPassword,
            name: customerName,
            city: customerCity,
            email: customerEmail
          });
          if (res.success) {
            onDone();
          } else {
            setErrorMsg(res.message || 'Customer registration failed.');
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Vendor demo presets
  const handleFillDemoSharma = () => {
    handleAccountTypeChange('vendor');
    setMode('login');
    setMobileNumber('+91 98765 43210');
    setPassword('password123');
    setErrorMsg(null);
  };

  const handleFillDemoNewShop = () => {
    handleAccountTypeChange('vendor');
    setMode('register');
    setMobileNumber('+91 91234 56789');
    setPassword('password123');
    setOwnerName('Vikas Gupta');
    setShopName('Gupta Medical Store');
    setCategory('Pharmacy');
    setErrorMsg(null);
  };

  // Customer demo presets
  const handleFillDemoCustomer = () => {
    handleAccountTypeChange('customer');
    setMode('login');
    setCustomerPhone('+91 99999 88888');
    setCustomerPassword('password123');
    setErrorMsg(null);
  };

  const handleFillDemoNewCustomer = () => {
    handleAccountTypeChange('customer');
    setMode('register');
    setCustomerPhone('+91 98888 77777');
    setCustomerPassword('password123');
    setCustomerName('Pooja Deshmukh');
    setCustomerCity('Mumbai');
    setCustomerEmail('pooja.d@example.com');
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
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleAccountTypeChange('vendor')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                accountType === 'vendor'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FigmaIcon name="bag" size={14} />
              <span>Shopkeeper (Vendor)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAccountTypeChange('customer')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                accountType === 'customer'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FigmaIcon name="user" size={14} />
              <span>Customer / Shopper</span>
            </button>
          </div>

          <span className="auth-icon">
            <FigmaIcon
              name={accountType === 'customer' ? 'search' : mode === 'login' ? 'user' : 'bag'}
              size={22}
            />
          </span>

          <h1>
            {accountType === 'vendor'
              ? mode === 'login'
                ? 'Shopkeeper Login'
                : 'Create Your Shop'
              : mode === 'login'
              ? 'Customer Sign In'
              : 'Create Customer Account'}
          </h1>
          <p>
            {accountType === 'vendor'
              ? mode === 'login'
                ? 'Log in to manage your private inventory, bills, and WhatsApp sync.'
                : 'Register your retail store with isolated catalog and instant OCR bill updates.'
              : mode === 'login'
              ? 'Sign in to discover products, live stock and prices across local shops.'
              : 'Register to search local store catalogs and see available inventory in real-time.'}
          </p>

          {/* Quick Demo Pre-sets */}
          <div className="mb-3 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs flex flex-wrap items-center justify-between gap-1.5">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">
              Quick Test ({accountType === 'vendor' ? 'Vendor' : 'Customer'}):
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {accountType === 'vendor' ? (
                <>
                  <button
                    type="button"
                    onClick={handleFillDemoSharma}
                    className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border text-[11px] font-medium shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    Sharma Kirana
                  </button>
                  <button
                    type="button"
                    onClick={handleFillDemoNewShop}
                    className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border text-[11px] font-medium shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    + Register New Shop
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleFillDemoCustomer}
                    className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border text-[11px] font-medium shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    Amit Verma (Customer)
                  </button>
                  <button
                    type="button"
                    onClick={handleFillDemoNewCustomer}
                    className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border text-[11px] font-medium shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    + New Customer
                  </button>
                </>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {accountType === 'vendor' ? (
              /* VENDOR FIELDS */
              <>
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
              </>
            ) : (
              /* CUSTOMER FIELDS */
              <>
                {mode === 'register' && (
                  <div className="two-fields">
                    <label>
                      <span>Your Full Name</span>
                      <input
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Amit Verma"
                      />
                    </label>
                    <label>
                      <span>City / Area</span>
                      <input
                        required
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        placeholder="e.g. Pune, Kothrud"
                      />
                    </label>
                  </div>
                )}

                <label>
                  <span>Customer Mobile Number</span>
                  <input
                    required
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 99999 88888"
                  />
                </label>

                {mode === 'register' && (
                  <label>
                    <span>
                      Email Address <small>(optional)</small>
                    </span>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="amit@example.com"
                    />
                  </label>
                )}

                <label>
                  <span>Password</span>
                  <input
                    required
                    type="password"
                    value={customerPassword}
                    onChange={(e) => setCustomerPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary auth-submit cursor-pointer"
            >
              <span>
                {isLoading
                  ? 'Authenticating...'
                  : accountType === 'vendor'
                  ? mode === 'login'
                    ? 'Login to My Shop'
                    : 'Create My Shop'
                  : mode === 'login'
                  ? 'Sign In as Customer'
                  : 'Create Customer Account'}
              </span>
              <FigmaIcon name="arrow" size={16} />
            </button>
          </form>

          <div className="auth-switch">
            <span>
              {mode === 'login'
                ? accountType === 'vendor'
                  ? 'Need a new shop account?'
                  : 'New customer?'
                : 'Already registered?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMode(mode === 'login' ? 'register' : 'login');
              }}
              className="cursor-pointer ml-1 underline font-bold"
            >
              {mode === 'login'
                ? accountType === 'vendor'
                  ? 'Create Shop Account'
                  : 'Create Customer Account'
                : accountType === 'vendor'
                ? 'Log in to Shop'
                : 'Sign in to Account'}
            </button>
          </div>
        </section>

        {/* Right: Informational Visual */}
        <aside className="auth-visual">
          {accountType === 'vendor' ? (
            <>
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
            </>
          ) : (
            <>
              <h2>
                Find Any Item Near You,
                <br />
                In Real-Time.
              </h2>
              <p>Search verified grocery, pharmacy, stationery and general stores around you.</p>

              <div className="auth-message">
                “Maggi 4-Pack · In Stock at Sharma Kirana (₹56)”
                <span>
                  Live Stock <FigmaIcon name="check" size={11} />
                </span>
              </div>

              <div className="mini-flow compact">
                <div className="flow-step done">
                  <span>1</span> Search products
                </div>
                <div className="flow-step active">
                  <span>2</span> Filter by location & category
                </div>
                <div className="flow-step">
                  <span>3</span> Check live shop availability
                </div>
              </div>

              <div className="auth-success">
                <FigmaIcon name="check" size={18} className="text-emerald-400" />
                <div>
                  <b>Live Multi-Vendor Stock Discovery</b>
                  <small>Directly connected to real shopkeeper inventories</small>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
