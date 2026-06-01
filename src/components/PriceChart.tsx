import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Activity, RefreshCw } from 'lucide-react';
import { getKlines } from '../utils/binanceClient';
import type { Kline } from '../utils/binanceClient';

interface PriceChartProps {
  symbol: string;
}

interface ChartPoint {
  time: string;
  price: number;
  high: number;
  low: number;
  volume: number;
}

const INTERVALS = ['1m', '5m', '15m', '1h', '4h'];

export default function PriceChart({ symbol }: PriceChartProps) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [interval, setInterval2] = useState('5m');
  const [loading, setLoading] = useState(true);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePct, setPriceChangePct] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const klines: Kline[] = await getKlines(symbol, interval, 60);
      const points: ChartPoint[] = klines.map((k) => ({
        time: new Date(k.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: parseFloat(k.close),
        high: parseFloat(k.high),
        low: parseFloat(k.low),
        volume: parseFloat(k.volume),
      }));
      setData(points);

      if (points.length > 1) {
        const first = points[0].price;
        const last = points[points.length - 1].price;
        setPriceChange(last - first);
        setPriceChangePct(((last - first) / first) * 100);
        const prices = points.map((p) => p.price);
        setMinPrice(Math.min(...prices));
        setMaxPrice(Math.max(...prices));
      }
    } catch (e) {
      console.error('Failed to load chart data', e);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => {
    fetchData();
    const timer = window.setInterval(fetchData, 30_000);
    return () => window.clearInterval(timer);
  }, [fetchData]);

  const isPositive = priceChange >= 0;
  const latestPrice = data.length ? data[data.length - 1].price : 0;

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
          <div className="text-white font-bold">
            ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-900/80 backdrop-blur-sm p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
          <Activity className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono text-white">
              ${latestPrice ? latestPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
            </span>
            {priceChange !== 0 && (
              <span className={`text-xs font-mono font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePct.toFixed(2)}%)
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 font-mono">{symbol} • Futures Testnet</div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Interval selector */}
          <div className="flex gap-1">
            {INTERVALS.map((i) => (
              <button
                key={i}
                 onClick={() => setInterval2(i)}
                 className={`text-[10px] px-2 py-1 rounded font-mono transition-all ${
                   interval === i
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Price range */}
      {!loading && data.length > 0 && (
        <div className="flex gap-4 mb-3 text-xs font-mono">
          <span className="text-gray-600">L: <span className="text-red-400">${minPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
          <span className="text-gray-600">H: <span className="text-emerald-400">${maxPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="text-xs text-gray-600 font-mono">Loading chart…</span>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-700 text-sm">
          No chart data available
        </div>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? '#10b981' : '#ef4444'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? '#10b981' : '#ef4444'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={false}
                width={70}
                tickFormatter={(v: number) => `$${v.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={1.5}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? '#10b981' : '#ef4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
