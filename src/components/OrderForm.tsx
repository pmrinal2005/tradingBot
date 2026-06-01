import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Zap, BarChart2, AlertTriangle,
  Send, ChevronDown, Loader2,
} from 'lucide-react';
import { submitOrder, buildHistoryItem } from '../utils/orderService';
import { validateOrder } from '../utils/validators';
import { getTickerPrice } from '../utils/binanceClient';
import { logger } from '../utils/logger';
import type { OrderHistoryItem, OrderRequest, OrderSide, OrderType } from '../types/trading';

interface OrderFormProps {
  apiKey: string;
  apiSecret: string;
  onOrderPlaced: (item: OrderHistoryItem) => void;
}

const ORDER_TYPES: { value: OrderType; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  {
    value: 'MARKET',
    label: 'Market',
    icon: <Zap className="w-4 h-4" />,
    color: 'cyan',
    desc: 'Execute immediately at best available price',
  },
  {
    value: 'LIMIT',
    label: 'Limit',
    icon: <BarChart2 className="w-4 h-4" />,
    color: 'purple',
    desc: 'Execute only at your specified price or better',
  },
  {
    value: 'STOP',
    label: 'Stop-Limit',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'yellow',
    desc: 'Trigger price activates a limit order',
  },
];

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT', 'AVAXUSDT'];

export default function OrderForm({ apiKey, apiSecret, onOrderPlaced }: OrderFormProps) {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState('0.001');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [timeInForce] = useState<'GTC'>('GTC');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastResponse, setLastResponse] = useState<Record<string, unknown> | null>(null);
  const [tickerPrice, setTickerPrice] = useState<string | null>(null);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch live ticker price
  useEffect(() => {
    let cancelled = false;
    async function fetchPrice() {
      try {
        const t = await getTickerPrice(symbol);
        if (!cancelled) setTickerPrice(t.price);
      } catch {
        if (!cancelled) setTickerPrice(null);
      }
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbol]);

  function buildRequest(): OrderRequest {
    return {
      symbol,
      side,
      type,
      quantity,
      price: type !== 'MARKET' ? price : undefined,
      stopPrice: type === 'STOP' ? stopPrice : undefined,
      timeInForce: type !== 'MARKET' ? timeInForce : undefined,
    };
  }

  function handleValidate() {
    const req = buildRequest();
    const result = validateOrder(req);
    setErrors(result.errors);
    return result.valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setLastResponse(null);

    if (!apiKey || !apiSecret) {
      setErrors(['API Key and Secret are required. Please set them in the Credentials panel.']);
      return;
    }

    if (!handleValidate()) return;

    setSubmitting(true);
    setErrors([]);

    const req = buildRequest();

    try {
      const response = await submitOrder(apiKey, apiSecret, req);
      setLastResponse(response as unknown as Record<string, unknown>);
      setSuccess(true);
      const historyItem = buildHistoryItem(req, response);
      onOrderPlaced(historyItem);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors([msg]);
      logger.error('Order submission error in form', err);
    } finally {
      setSubmitting(false);
    }
  }

  const activeType = ORDER_TYPES.find((t) => t.value === type)!;

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-900/80 backdrop-blur-sm p-5 shadow-lg">
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`p-2 rounded-lg border ${
            type === 'MARKET'
              ? 'bg-cyan-500/10 border-cyan-500/30'
              : type === 'LIMIT'
              ? 'bg-purple-500/10 border-purple-500/30'
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}
        >
          {activeType.icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Place Order</h2>
          <p className="text-xs text-gray-500 mt-0.5">{activeType.desc}</p>
        </div>

        {tickerPrice && (
          <div className="ml-auto text-right">
            <div className="text-xs text-gray-500 font-mono">{symbol}</div>
            <div className="text-sm font-bold font-mono text-cyan-300">
              ${parseFloat(tickerPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Type Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-gray-800/50 border border-gray-700/40">
          {ORDER_TYPES.map((ot) => (
            <button
              key={ot.value}
              type="button"
              onClick={() => {
                setType(ot.value);
                setErrors([]);
                setSuccess(false);
                setLastResponse(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-all ${
                type === ot.value
                  ? ot.color === 'cyan'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                    : ot.color === 'purple'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm shadow-yellow-500/20'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {ot.icon}
              {ot.label}
            </button>
          ))}
        </div>

        {/* Symbol + Side Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Symbol */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono uppercase tracking-wider">
              Symbol
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSymbolDropdown((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-white hover:border-gray-500 transition-all"
              >
                {symbol}
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {showSymbolDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-gray-800 border border-gray-600 z-50 overflow-hidden shadow-xl">
                  {SYMBOLS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSymbol(s);
                        setShowSymbolDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm font-mono transition-colors ${
                        s === symbol
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Side */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono uppercase tracking-wider">
              Side
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-gray-800/50 border border-gray-700/40 h-[42px]">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`flex items-center justify-center gap-1 rounded-md text-xs font-bold transition-all ${
                  side === 'BUY'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                    : 'text-gray-500 hover:text-emerald-400'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`flex items-center justify-center gap-1 rounded-md text-xs font-bold transition-all ${
                  side === 'SELL'
                    ? 'bg-red-500/25 text-red-300 border border-red-500/50 shadow-sm shadow-red-500/20'
                    : 'text-gray-500 hover:text-red-400'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" /> SELL
              </button>
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1 font-mono uppercase tracking-wider">
            Quantity
          </label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 0.001"
            className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </div>

        {/* Limit Price (LIMIT + STOP) */}
        {(type === 'LIMIT' || type === 'STOP') && (
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono uppercase tracking-wider">
              Limit Price <span className="text-gray-600">(USDT)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={
                type === 'STOP'
                  ? 'Worst acceptable fill price'
                  : 'e.g. 65000'
              }
              className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-purple-700/40 text-sm font-mono text-purple-300 placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
            />
          </div>
        )}

        {/* Stop/Trigger Price (STOP only) */}
        {type === 'STOP' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono uppercase tracking-wider">
              Stop / Trigger Price <span className="text-gray-600">(USDT)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder="Market price that activates the order"
              className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-yellow-700/40 text-sm font-mono text-yellow-300 placeholder-gray-600 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
            />
            <p className="mt-1.5 text-xs text-yellow-500/70 font-mono">
              ⚡ SELL: stop &gt; limit&nbsp;&nbsp;|&nbsp;&nbsp;BUY: stop &lt; limit
            </p>
          </div>
        )}

        {/* Order Summary Box */}
        <div className="rounded-lg bg-gray-800/60 border border-gray-700/40 p-3 text-xs font-mono space-y-1">
          <div className="text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Order Request Preview</div>
          <div className="flex justify-between">
            <span className="text-gray-500">symbol</span>
            <span className="text-white">{symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">side</span>
            <span className={side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{side}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">type</span>
            <span className="text-cyan-400">{type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">quantity</span>
            <span className="text-white">{quantity}</span>
          </div>
          {price && type !== 'MARKET' && (
            <div className="flex justify-between">
              <span className="text-gray-500">price</span>
              <span className="text-purple-400">{price}</span>
            </div>
          )}
          {stopPrice && type === 'STOP' && (
            <div className="flex justify-between">
              <span className="text-gray-500">stopPrice</span>
              <span className="text-yellow-400">{stopPrice}</span>
            </div>
          )}
          {type !== 'MARKET' && (
            <div className="flex justify-between">
              <span className="text-gray-500">timeInForce</span>
              <span className="text-gray-300">GTC</span>
            </div>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-red-400 font-mono">
                ⚠ {e}
              </p>
            ))}
          </div>
        )}

        {/* Success response */}
        {success && lastResponse && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 space-y-1">
            <div className="text-xs text-emerald-400 font-semibold mb-2">✅ Order Placed Successfully</div>
            {Object.entries(lastResponse).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs font-mono">
                <span className="text-gray-500">{k}</span>
                <span className="text-emerald-300">{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
            side === 'BUY'
              ? 'bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 hover:shadow-lg hover:shadow-emerald-500/20'
              : 'bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-300 hover:shadow-lg hover:shadow-red-500/20'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {side} {type === 'MARKET' ? 'at Market' : type === 'LIMIT' ? 'Limit Order' : 'Stop-Limit'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
