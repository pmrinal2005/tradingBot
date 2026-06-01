import { useState, useEffect } from 'react';
import {
  Zap, BookOpen, ChevronRight, Activity,
  Shield, Code2, FileText,
} from 'lucide-react';
import CredentialsPanel from './components/CredentialsPanel';
import OrderForm from './components/OrderForm';
import OrderHistory from './components/OrderHistory';
import LogConsole from './components/LogConsole';
import PriceChart from './components/PriceChart';
import MarketStats from './components/MarketStats';
import ReadmeModal from './components/ReadmeModal';
import PythonCodeViewer from './components/PythonCodeViewer';
import SampleLogs from './components/SampleLogs';
import { logger } from './utils/logger';
import type { OrderHistoryItem } from './types/trading';

type Tab = 'trading' | 'code' | 'logs';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [showReadme, setShowReadme] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('trading');
  const [chartSymbol, setChartSymbol] = useState('BTCUSDT');

  useEffect(() => {
    logger.info('🚀 NeonTrader initialized — Binance Futures Testnet (USDT-M)');
    logger.info('Base URL: https://testnet.binancefuture.com');
    logger.info('Set your API credentials in the panel to start trading.');
    logger.debug('All API calls use HMAC-SHA256 signing via Web Crypto API');
  }, []);

  function handleOrderPlaced(item: OrderHistoryItem) {
    setOrderHistory((prev) => [item, ...prev]);
    setChartSymbol(item.symbol);
  }

  function handleCredentialsUpdate(key: string, secret: string) {
    setApiKey(key);
    setApiSecret(secret);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'trading', label: 'Trading Terminal', icon: <Activity className="w-4 h-4" /> },
    { id: 'code', label: 'Python Source', icon: <Code2 className="w-4 h-4" /> },
    { id: 'logs', label: 'Sample Logs', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(6,182,212,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(168,85,247,0.06) 0%, transparent 50%), #030712',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Animated grid background ─────────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Top glows ─────────────────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.12) 0%, transparent 70%)',
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-gray-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <span className="text-cyan-400">Neon</span>
                  <span className="text-white">Trader</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono font-bold">
                  v1.0
                </span>
              </div>
              <div className="text-[10px] text-gray-600 font-mono">
                Binance USDT-M Futures Testnet
              </div>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-1 ml-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-600 font-mono bg-gray-800/60 border border-gray-700/40 rounded-lg px-2.5 py-1.5">
              <Shield className="w-3 h-3 text-emerald-500" />
              Testnet Only — No Real Funds
            </span>
            <button
              onClick={() => setShowReadme(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/20 transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              README
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-400 text-xs hover:text-white hover:border-gray-500 transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">

        {/* ── TRADING TERMINAL TAB ─────────────────────────────────────────── */}
        {activeTab === 'trading' && (
          <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr_280px] gap-5">

            {/* Left column — Credentials + Order Form */}
            <div className="space-y-4">
              <CredentialsPanel
                apiKey={apiKey}
                apiSecret={apiSecret}
                onUpdate={handleCredentialsUpdate}
              />
              <OrderForm
                apiKey={apiKey}
                apiSecret={apiSecret}
                onOrderPlaced={handleOrderPlaced}
              />
            </div>

            {/* Center column — Chart + Order History + Log */}
            <div className="space-y-4">
              <PriceChart symbol={chartSymbol} />

              {/* Order History */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    Session Orders
                  </span>
                </div>
                <OrderHistory orders={orderHistory} />
              </div>

              {/* Log Console */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    Live Log Output
                  </span>
                </div>
                <LogConsole />
              </div>
            </div>

            {/* Right column — Market Stats */}
            <div className="space-y-4">
              <MarketStats />

              {/* Info box */}
              <div className="rounded-xl border border-gray-700/40 bg-gray-900/60 p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Order Types
                </div>
                {[
                  {
                    type: 'MARKET',
                    color: 'text-cyan-400',
                    dot: 'bg-cyan-400',
                    desc: 'Executes instantly at best available price. No price field needed.',
                  },
                  {
                    type: 'LIMIT',
                    color: 'text-purple-400',
                    dot: 'bg-purple-400',
                    desc: 'Placed in order book at your price. Executes when market reaches it.',
                  },
                  {
                    type: 'STOP-LIMIT',
                    color: 'text-yellow-400',
                    dot: 'bg-yellow-400',
                    desc: 'Dormant until stopPrice triggers. Then converts to a Limit order.',
                  },
                ].map((item) => (
                  <div key={item.type} className="flex gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.dot} mt-1.5 shrink-0`} />
                    <div>
                      <div className={`text-xs font-mono font-bold ${item.color}`}>{item.type}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-gray-800">
                  <div className="text-[10px] text-gray-700 font-mono space-y-1">
                    <div className="text-gray-600 font-semibold uppercase text-[9px] tracking-widest mb-1.5">Stop-Limit Rules</div>
                    <div>SELL: stopPrice <span className="text-yellow-500">&gt;</span> limitPrice</div>
                    <div>BUY: stopPrice <span className="text-yellow-500">&lt;</span> limitPrice</div>
                  </div>
                </div>
              </div>

              {/* Architecture note */}
              <div className="rounded-xl border border-gray-700/40 bg-gray-900/60 p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Architecture
                </div>
                {[
                  { file: 'client.py', label: 'REST + HMAC signing', color: 'text-cyan-400' },
                  { file: 'validators.py', label: 'Input validation', color: 'text-yellow-400' },
                  { file: 'orders.py', label: 'Order orchestration', color: 'text-emerald-400' },
                  { file: 'logging_config.py', label: 'Structured logging', color: 'text-purple-400' },
                  { file: 'cli.py', label: 'CLI entry point', color: 'text-pink-400' },
                ].map((item) => (
                  <div key={item.file} className="flex items-center gap-2 py-1.5 border-b border-gray-800/60 last:border-0">
                    <span className={`text-[10px] font-mono ${item.color}`}>{item.file}</span>
                    <span className="ml-auto text-[10px] text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PYTHON SOURCE CODE TAB ───────────────────────────────────────── */}
        {activeTab === 'code' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white mb-1">Python Source Code</h2>
              <p className="text-sm text-gray-500">
                Complete, production-ready Python bot with CLI, HMAC signing, structured logging, and validation.
                Copy each file into the project structure shown below.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-xs font-mono text-cyan-400/70">
                trading_bot/ &nbsp;→&nbsp; bot/__init__.py &nbsp;|&nbsp; bot/client.py &nbsp;|&nbsp; bot/orders.py &nbsp;|&nbsp; bot/validators.py &nbsp;|&nbsp; bot/logging_config.py &nbsp;|&nbsp; cli.py
              </div>
            </div>
            <PythonCodeViewer />
          </div>
        )}

        {/* ── SAMPLE LOGS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'logs' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white mb-1">Log Files</h2>
              <p className="text-sm text-gray-500">
                Sample log output from <code className="text-cyan-400 font-mono">logs/trading_bot.log</code> for each order type.
                In the live Python bot, logs are written using Python's <code className="text-purple-400 font-mono">RotatingFileHandler</code> (5 MB max, 3 backups).
              </p>
            </div>
            <SampleLogs />

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'MARKET', color: 'border-cyan-500/30 bg-cyan-500/5', badge: 'text-cyan-400', desc: 'Executes instantly. Status → FILLED immediately.' },
                { label: 'LIMIT', color: 'border-purple-500/30 bg-purple-500/5', badge: 'text-purple-400', desc: 'Placed in order book. Status → NEW until filled.' },
                { label: 'STOP-LIMIT', color: 'border-yellow-500/30 bg-yellow-500/5', badge: 'text-yellow-400', desc: 'Dormant until trigger. Status → NEW while waiting.' },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl border ${item.color} p-4`}>
                  <div className={`text-xs font-mono font-bold ${item.badge} mb-2`}>{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-gray-800/60 mt-8 py-4 px-6">
        <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-gray-700">
          <div className="flex items-center gap-4">
            <span className="text-cyan-800">NeonTrader v1.0</span>
            <span>Base URL: https://testnet.binancefuture.com</span>
            <span>USDT-M Perpetual Futures</span>
          </div>
          <div className="flex items-center gap-4">
            <span>MARKET · LIMIT · STOP-LIMIT</span>
            <span>HMAC-SHA256 · Rotating Logs</span>
            <span className="text-gray-800">⚡ Testnet Only</span>
          </div>
        </div>
      </footer>

      {/* ── README Modal ────────────────────────────────────────────────────── */}
      {showReadme && <ReadmeModal onClose={() => setShowReadme(false)} />}
    </div>
  );
}
