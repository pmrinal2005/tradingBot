import { X, BookOpen, Terminal, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ReadmeModalProps {
  onClose: () => void;
}

interface CodeBlockProps {
  code: string;
  lang?: string;
}

function CodeBlock({ code, lang = 'bash' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative rounded-lg bg-gray-950 border border-gray-700/60 my-3 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <span className="text-[10px] font-mono text-gray-600 uppercase">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-cyan-400 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ReadmeModal({ onClose }: ReadmeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl border border-cyan-500/30 bg-gray-900 shadow-2xl shadow-cyan-500/10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 bg-gray-900/90">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <BookOpen className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">README.md</h2>
            <p className="text-xs text-gray-500">NeonTrader — Binance Futures Bot Setup Guide</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
          {/* Project Structure */}
          <section>
            <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" /> Project Structure
            </h3>
            <CodeBlock lang="text" code={`trading_bot/
  bot/
    __init__.py
    client.py          # Binance REST client (HMAC-SHA256 signing)
    orders.py          # Order placement logic
    validators.py      # Input validation
    logging_config.py  # Structured logging to file + console
  cli.py               # CLI entry point (argparse)
  logs/
    trading_bot.log    # All API requests, responses & errors
  README.md
  requirements.txt`} />
          </section>

          {/* Setup */}
          <section>
            <h3 className="text-purple-400 font-bold text-xs uppercase tracking-widest mb-3">
              🚀 Setup Steps
            </h3>
            <ol className="space-y-2 text-gray-400 text-xs list-decimal list-inside">
              <li>Register at <a href="https://testnet.binancefuture.com" target="_blank" className="text-cyan-400 hover:underline">testnet.binancefuture.com</a></li>
              <li>Generate API Key &amp; Secret from the testnet dashboard</li>
              <li>Clone this repository</li>
              <li>Install dependencies:</li>
            </ol>
            <CodeBlock lang="bash" code={`pip install -r requirements.txt`} />
            <ol start={5} className="space-y-2 text-gray-400 text-xs list-decimal list-inside">
              <li>Set environment variables:</li>
            </ol>
            <CodeBlock lang="bash" code={`export BINANCE_API_KEY="your_testnet_api_key"
export BINANCE_API_SECRET="your_testnet_api_secret"

# Or create a .env file:
echo "BINANCE_API_KEY=your_key" > .env
echo "BINANCE_API_SECRET=your_secret" >> .env`} />
          </section>

          {/* Usage */}
          <section>
            <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-3">
              📋 CLI Usage Examples
            </h3>

            <p className="text-gray-500 text-xs mb-2">Place a MARKET order:</p>
            <CodeBlock lang="bash" code={`python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.001`} />

            <p className="text-gray-500 text-xs mb-2">Place a LIMIT order:</p>
            <CodeBlock lang="bash" code={`python cli.py --symbol ETHUSDT --side SELL --type LIMIT --quantity 0.01 --price 3200`} />

            <p className="text-gray-500 text-xs mb-2">Place a Stop-Limit (3rd order type):</p>
            <CodeBlock lang="bash" code={`python cli.py --symbol BTCUSDT --side SELL --type STOP --quantity 0.001 --price 59950 --stop-price 60000`} />

            <p className="text-gray-500 text-xs mb-2">Show help:</p>
            <CodeBlock lang="bash" code={`python cli.py --help`} />
          </section>

          {/* requirements.txt */}
          <section>
            <h3 className="text-yellow-400 font-bold text-xs uppercase tracking-widest mb-3">
              📦 requirements.txt
            </h3>
            <CodeBlock lang="text" code={`requests>=2.31.0
python-dotenv>=1.0.0`} />
          </section>

          {/* Assumptions */}
          <section>
            <h3 className="text-pink-400 font-bold text-xs uppercase tracking-widest mb-3">
              📝 Assumptions
            </h3>
            <ul className="space-y-1.5 text-gray-400 text-xs list-disc list-inside">
              <li>Testnet base URL: <code className="text-cyan-400">https://testnet.binancefuture.com</code></li>
              <li>USDT-M Perpetual Futures only (fapi endpoints)</li>
              <li>STOP type maps to Binance's Stop-Limit order (<code className="text-yellow-400">type=STOP</code>)</li>
              <li>For SELL Stop-Limit: stopPrice (trigger) &gt; price (limit)</li>
              <li>For BUY Stop-Limit: stopPrice (trigger) &lt; price (limit)</li>
              <li>Credentials stored in env vars only — never hardcoded</li>
              <li>Log file rotates at 5 MB, keeps 3 backups</li>
              <li>All API requests and responses are logged to <code className="text-gray-300">logs/trading_bot.log</code></li>
            </ul>
          </section>

          {/* How the signing works */}
          <section>
            <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-3">
              🔐 How HMAC Signing Works
            </h3>
            <CodeBlock lang="python" code={`# 1. Build query string from order parameters
query_string = "symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.001&timestamp=1234567890"

# 2. Sign with your secret key using HMAC-SHA256
signature = hmac.new(
    api_secret.encode('utf-8'),
    query_string.encode('utf-8'),
    hashlib.sha256
).hexdigest()

# 3. Append signature and send with API key header
url = f"{BASE_URL}/fapi/v1/order?{query_string}&signature={signature}"
headers = {"X-MBX-APIKEY": api_key}
response = requests.post(url, headers=headers)`} />
          </section>
        </div>
      </div>
    </div>
  );
}
