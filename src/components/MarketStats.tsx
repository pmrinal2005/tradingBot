import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { getTickerPrice } from '../utils/binanceClient';

const TRACKED = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT'];

interface TickerData {
  symbol: string;
  price: string;
  prevPrice: string | null;
}

export default function MarketStats() {
  const [tickers, setTickers] = useState<TickerData[]>(
    TRACKED.map((s) => ({ symbol: s, price: '…', prevPrice: null }))
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      const results = await Promise.allSettled(
        TRACKED.map((s) => getTickerPrice(s))
      );
      if (cancelled) return;

      setTickers((prev) =>
        TRACKED.map((symbol, i) => {
          const result = results[i];
          const prevEntry = prev.find((t) => t.symbol === symbol);
          if (result.status === 'fulfilled') {
            return {
              symbol,
              price: result.value.price,
              prevPrice: prevEntry?.price ?? null,
            };
          }
          return prevEntry ?? { symbol, price: '—', prevPrice: null };
        })
      );
    }

    fetchAll();
    const id = window.setInterval(fetchAll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-900/80 backdrop-blur-sm p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-semibold text-purple-300 uppercase tracking-widest">
          Live Market
        </span>
        <span className="ml-auto">
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </span>
      </div>

      <div className="space-y-2">
        {tickers.map((ticker) => {
          const price = parseFloat(ticker.price);
          const prevPrice = ticker.prevPrice ? parseFloat(ticker.prevPrice) : null;
          const isUp = prevPrice !== null && price > prevPrice;
          const isDown = prevPrice !== null && price < prevPrice;
          const isValid = !isNaN(price);

          return (
            <div
              key={ticker.symbol}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/80 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  isUp ? 'bg-emerald-400' : isDown ? 'bg-red-400' : 'bg-gray-600'
                }`} />
                <span className="text-xs font-mono font-semibold text-gray-300">
                  {ticker.symbol.replace('USDT', '')}
                  <span className="text-gray-600">/USDT</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isUp && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                {isDown && <TrendingDown className="w-3 h-3 text-red-400" />}
                <span
                  className={`text-xs font-mono font-bold transition-colors ${
                    isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-gray-300'
                  }`}
                >
                  {isValid
                    ? `$${price.toLocaleString('en-US', {
                        minimumFractionDigits: price > 100 ? 2 : 4,
                        maximumFractionDigits: price > 100 ? 2 : 6,
                      })}`
                    : ticker.price}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
