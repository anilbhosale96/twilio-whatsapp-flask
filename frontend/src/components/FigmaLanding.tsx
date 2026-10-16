import React from 'react';
import { FigmaIcon } from './FigmaIcon';

interface FigmaLandingProps {
  onOpenApp: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const FigmaLanding: React.FC<FigmaLandingProps> = ({
  onOpenApp,
  isDark,
  onToggleDark,
  onOpenPrivacy,
  onOpenTerms
}) => {
  return (
    <div className="landing">
      {/* Public Header */}
      <header className="public-nav wrap">
        <div className="logo cursor-pointer" onClick={onOpenApp}>
          <span className="logo-mark">
            <FigmaIcon name="box" size={20} className="text-white" />
          </span>
          <span>
            SmartStock <b>AI</b>
          </span>
        </div>

        <nav>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#benefits">For shopkeepers</a>
        </nav>

        <div className="nav-actions">
          {/* Dark / Light Toggle */}
          <button
            type="button"
            onClick={onToggleDark}
            className="theme-toggle-btn"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <FigmaIcon name="sun" size={16} className="text-amber-400" /> : <FigmaIcon name="moon" size={16} />}
            <span>{isDark ? "Light" : "Dark"}</span>
          </button>

          <button className="login-link cursor-pointer" onClick={onOpenApp}>
            Log in
          </button>
          <button className="btn btn-primary cursor-pointer" onClick={onOpenApp}>
            Open Store App
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow">
              <span>
                <FigmaIcon name="sparkle" size={14} />
              </span>
              AI-powered inventory for local shops
            </div>

            <h1>
              Just WhatsApp it.
              <br />
              <span>We manage your stock.</span>
            </h1>

            <p>
              Turn simple WhatsApp messages and voice notes into organized inventory automatically.
              No complicated software, no training needed.
            </p>

            <div className="hero-actions">
              <button className="btn btn-primary cursor-pointer" onClick={onOpenApp}>
                Open Live Store App
                <FigmaIcon name="arrow" size={16} />
              </button>
              <button
                className="btn btn-secondary cursor-pointer"
                onClick={() => document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </button>
            </div>

            <div className="trust-row">
              <span className="avatars">
                <i>RS</i>
                <i>MK</i>
                <i>AP</i>
              </span>
              <span>
                <b>Made simple for local kirana shopkeepers</b>
                <small>No card required · Setup in 2 minutes</small>
              </span>
            </div>
          </div>

          {/* Interactive Floating Visual */}
          <div className="hero-visual">
            <div className="phone-card">
              <div className="wa-head">
                <span className="wa-round">
                  <FigmaIcon name="whatsapp" size={18} />
                </span>
                <div>
                  <b>SmartStock AI</b>
                  <small>Online · Typically replies in seconds</small>
                </div>
              </div>

              <div className="wa-bubble incoming">
                <p>Bhai 20 Parle G aur 10 Tata Salt aaya.</p>
                <span>
                  9:42 AM <FigmaIcon name="check" size={12} />
                </span>
              </div>

              <div className="wa-bubble outgoing">
                <span className="ai-tag">
                  <FigmaIcon name="sparkle" size={12} /> SmartStock AI
                </span>
                <p>Stock updated successfully!</p>
                <div className="bubble-items">
                  <div>
                    <span>Parle G</span>
                    <b>+20 pkts (Total: 42)</b>
                  </div>
                  <div>
                    <span>Tata Salt</span>
                    <b>+10 pkts (Total: 18)</b>
                  </div>
                </div>
                <span>9:42 AM</span>
              </div>
            </div>

            <div className="mini-dash">
              <div className="mini-head">
                <div className="logo">
                  <span className="logo-mark">
                    <FigmaIcon name="box" size={14} className="text-white" />
                  </span>
                  <span>Sharma General Store</span>
                </div>
                <span className="live-dot">Live SSE</span>
              </div>

              <div className="mini-stats">
                <div>
                  <small>TOTAL STOCK</small>
                  <b>387 units</b>
                </div>
                <div>
                  <small>LOW STOCK</small>
                  <b className="text-amber-500">2 items</b>
                </div>
              </div>

              <div className="mini-item">
                <span>Parle G 100g</span>
                <span className="pill success">42 packets</span>
              </div>
              <div className="mini-item">
                <span>Tata Salt 1kg</span>
                <span className="pill success">18 packets</span>
              </div>
              <div className="mini-item">
                <span>Fortune Sunlite Oil</span>
                <span className="pill warning">8 L (Low)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Brand Strip */}
        <section className="brand-strip">
          <div className="wrap">
            <span>Built for everyday local businesses</span>
            <b>Kirana Stores</b>
            <b>Pharmacies</b>
            <b>Stationery</b>
            <b>General Stores</b>
          </div>
        </section>

        {/* How It Works */}
        <section id="how" className="section wrap">
          <div className="section-heading">
            <span className="kicker">HOW IT WORKS</span>
            <h2>Your words become organized inventory</h2>
            <p>Send a message like you normally would. SmartStock handles everything after that.</p>
          </div>

          <div className="workflow-grid">
            <div className="workflow-demo">
              <div className="demo-top">
                <span>
                  <FigmaIcon name="whatsapp" size={19} /> WhatsApp message
                </span>
                <small>just now</small>
              </div>
              <div className="demo-message">
                “Bhai 20 Parle G aur 10 Tata Salt aaya.”
              </div>
              <div className="mini-flow">
                <div className="flow-step done">
                  <span>1</span> Message received
                </div>
                <div className="flow-step active">
                  <span>2</span> AI parsing Hindi/English items
                </div>
                <div className="flow-step">
                  <span>3</span> Inventory updated
                </div>
              </div>
            </div>

            <div className="workflow-results">
              <div className="success-head">
                <span>
                  <FigmaIcon name="check" size={18} />
                </span>
                <div>
                  <h3>Stock updated successfully</h3>
                  <p>2 products updated from your message</p>
                </div>
              </div>

              <div className="result-product">
                <span className="product-avatar amber">PG</span>
                <div>
                  <b>Parle G</b>
                  <small>Packets · Biscuits</small>
                </div>
                <strong>+20</strong>
              </div>

              <div className="result-product">
                <span className="product-avatar blue">TS</span>
                <div>
                  <b>Tata Salt</b>
                  <small>Packets · Grocery</small>
                </div>
                <strong>+10</strong>
              </div>

              <div className="result-foot">
                <FigmaIcon name="clock" size={15} /> Dashboard synced instantly via SSE
              </div>
            </div>
          </div>

          <div className="step-row">
            <article>
              <span>
                <FigmaIcon name="message" size={20} />
              </span>
              <div>
                <h3>1. Send a message</h3>
                <p>Text or speak naturally in English, Hindi, or Marathi.</p>
              </div>
            </article>

            <article>
              <span>
                <FigmaIcon name="sparkle" size={20} />
              </span>
              <div>
                <h3>2. AI understands</h3>
                <p>Products, quantities, units, and add/sell actions are accurately extracted.</p>
              </div>
            </article>

            <article>
              <span>
                <FigmaIcon name="check" size={20} />
              </span>
              <div>
                <h3>3. Stock is updated</h3>
                <p>Review, confirm, and your live dashboard updates instantly without app restarts.</p>
              </div>
            </article>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="section feature-section">
          <div className="wrap">
            <div className="section-heading">
              <span className="kicker">SMART, NOT COMPLICATED</span>
              <h2>Everything your shop needs. Nothing it does not.</h2>
            </div>

            <div className="feature-grid">
              <article className="feature-large">
                <span className="feature-icon green">
                  <FigmaIcon name="whatsapp" size={22} />
                </span>
                <h3>WhatsApp-First Updates</h3>
                <p>
                  No clunky POS keyboards or complex spreadsheets. Send stock arrivals and daily sales directly from your phone.
                </p>
              </article>

              <article className="feature-large">
                <span className="feature-icon blue">
                  <FigmaIcon name="mic" size={22} />
                </span>
                <h3>Voice Notes in Local Languages</h3>
                <p>
                  Hands busy carrying boxes? Send a voice note in Hindi, Marathi, or English. SmartStock parses quantities accurately.
                </p>
              </article>

              <article className="feature-large">
                <span className="feature-icon amber">
                  <FigmaIcon name="warning" size={22} />
                </span>
                <h3>Low Stock & Reorder Alerts</h3>
                <p>
                  Never run out of high-demand items. Get real-time alerts with 1-click supplier purchase orders.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="section wrap">
          <div className="section-heading">
            <span className="kicker">DESIGNED FOR SHOPKEEPERS</span>
            <h2>Run your store with confidence</h2>
            <p>SmartStock removes the stress of registers, spreadsheets, and complex software.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="p-6 rounded-2xl border border-[#e5eaf2] dark:border-[#1e293b] bg-white dark:bg-[#111827]">
              <h3 className="font-bold text-base text-[#17213a] dark:text-[#f8fafc] mb-2">Zero Training Required</h3>
              <p className="text-sm text-[#58657d] dark:text-[#94a3b8]">
                If your staff knows how to send a WhatsApp message, they already know how to update the store inventory.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#e5eaf2] dark:border-[#1e293b] bg-white dark:bg-[#111827]">
              <h3 className="font-bold text-base text-[#17213a] dark:text-[#f8fafc] mb-2">Hardened Security</h3>
              <p className="text-sm text-[#58657d] dark:text-[#94a3b8]">
                Masked phone numbers, XSS sanitization, rate limiting, and cryptographic PBKDF2 hashing protect your store data.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#e5eaf2] dark:border-[#1e293b] bg-white dark:bg-[#111827]">
              <h3 className="font-bold text-base text-[#17213a] dark:text-[#f8fafc] mb-2">Custom Domain Ready</h3>
              <p className="text-sm text-[#58657d] dark:text-[#94a3b8]">
                Access your store anytime at <code>app.smartstack.in</code> with automated SSL and real-time SSE stream.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-[#e5eaf2] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#0d1526] py-10">
        <div className="wrap flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="logo cursor-pointer" onClick={onOpenApp}>
              <span className="logo-mark">
                <FigmaIcon name="box" size={18} className="text-white" />
              </span>
              <span>
                SmartStock <b>AI</b>
              </span>
            </div>
            <span className="text-xs text-[#58657d] dark:text-[#94a3b8]">
              © 2026 SmartStock AI · Custom Domain: <code>app.smartstack.in</code>
            </span>
          </div>

          <div className="flex items-center space-x-6 text-xs text-[#58657d] dark:text-[#94a3b8]">
            <button onClick={onOpenPrivacy} className="hover:text-[#1768e5] dark:hover:text-[#60a5fa] cursor-pointer">
              Privacy Policy
            </button>
            <button onClick={onOpenTerms} className="hover:text-[#1768e5] dark:hover:text-[#60a5fa] cursor-pointer">
              Terms & Conditions
            </button>
            <button onClick={onOpenApp} className="text-[#1768e5] dark:text-[#60a5fa] font-semibold cursor-pointer">
              Enter Live Store App →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
