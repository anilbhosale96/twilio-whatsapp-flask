import React from 'react';
import { FigmaIcon } from './FigmaIcon';

interface FigmaLandingProps {
  onOpenApp: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const FigmaLanding: React.FC<FigmaLandingProps> = ({
  onOpenApp,
  onOpenLogin,
  onOpenRegister,
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

          <button className="login-link cursor-pointer" onClick={onOpenLogin}>
            Log in
          </button>
          <button className="btn btn-primary cursor-pointer" onClick={onOpenRegister}>
            Get Started
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero wrap">
          <div className="hero-copy">


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
              <button className="btn btn-secondary cursor-pointer" onClick={onOpenLogin}>
                Log in to Account
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
            {/* Left: Floating WhatsApp Conversation Phone Card */}
            <div className="phone-card">
              <div className="phone-head">
                <span className="wa-avatar">
                  <FigmaIcon name="whatsapp" size={18} />
                </span>
                <div className="flex flex-col">
                  <b>SmartStock AI</b>
                  <small>Online · Typically replies in seconds</small>
                </div>
                <FigmaIcon name="more" size={16} className="text-neutral-400 ml-auto" />
              </div>

              <div className="chat-area">
                <div className="chat-date">TODAY</div>

                <div className="chat-bubble">
                  Bhai 20 Parle G aur 10 Tata Salt aaya.
                  <span>
                    9:42 AM <FigmaIcon name="check" size={11} />
                  </span>
                </div>

                <div className="ai-reply">
                  <span className="tiny-logo">
                    <FigmaIcon name="sparkle" size={13} />
                  </span>
                  <div>
                    <b>Stock updated successfully!</b>
                    <p>
                      <span>Parle G (100g)</span>
                      <strong>+20 pkts (Total: 42)</strong>
                    </p>
                    <p>
                      <span>Tata Salt (1kg)</span>
                      <strong>+10 pkts (Total: 18)</strong>
                    </p>
                    <small>9:42 AM</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Floating Mini Store Dashboard Card */}
            <div className="float-dashboard">
              <div className="fd-head">
                <div className="logo flex items-center space-x-1.5">
                  <span className="logo-mark">
                    <FigmaIcon name="box" size={13} className="text-white" />
                  </span>
                  <span>Sharma General Store</span>
                </div>
                <span className="live-dot">Live SSE</span>
              </div>

              <div className="fd-row">
                <div>
                  <small>TOTAL STOCK</small>
                  <b>387</b>
                </div>
                <div>
                  <small>LOW STOCK</small>
                  <b className="text-amber-500">2 items</b>
                </div>
              </div>

              <div className="mini-bars">
                <i style={{ height: '35%' }}></i>
                <i style={{ height: '55%' }}></i>
                <i style={{ height: '40%' }}></i>
                <i style={{ height: '70%' }}></i>
                <i style={{ height: '90%' }}></i>
                <i style={{ height: '80%' }}></i>
                <i style={{ height: '100%' }}></i>
              </div>
              <div className="chart-labels">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
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

