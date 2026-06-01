import { Clock, TrendingUp, TrendingDown, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { OrderHistoryItem } from '../types/trading';

interface OrderHistoryProps {
  orders: OrderHistoryItem[];
}

const STATUS_STYLE: Record<string, string> = {
  FILLED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  NEW: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  PARTIALLY_FILLED: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  CANCELED: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  REJECTED: 'text-red-400 bg-red-500/10 border-red-500/30',
  EXPIRED: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
};

const TYPE_COLOR: Record<string, string> = {
  MARKET: 'text-cyan-400',
  LIMIT: 'text-purple-400',
  STOP: 'text-yellow-400',
};

export default function OrderHistory({ orders }: OrderHistoryProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700/60 bg-gray-900/80 p-6 text-center">
        <Clock className="w-8 h-8 mx-auto mb-3 text-gray-700" />
        <p className="text-gray-600 text-sm">No orders placed yet this session.</p>
        <p className="text-gray-700 text-xs mt-1">Use the form to place your first order.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-900/80 backdrop-blur-sm overflow-hidden shadow-lg">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800">
        <Clock className="w-4 h-4 text-purple-400" />
        <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-widest">
          Session Order History
        </h3>
        <span className="ml-auto text-xs text-gray-600 font-mono">{orders.length} order(s)</span>
      </div>

      <div className="divide-y divide-gray-800/60">
        {orders.map((order) => (
          <div key={order.orderId} className="px-5 py-4 hover:bg-gray-800/30 transition-colors">
            {/* Top row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {order.side === 'BUY' ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-sm font-bold ${order.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {order.side}
                </span>
                <span className="text-white font-mono text-sm">{order.symbol}</span>
                <span className={`text-xs font-mono ${TYPE_COLOR[order.type] ?? 'text-gray-400'}`}>
                  [{order.type}]
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${
                    STATUS_STYLE[order.status] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30'
                  }`}
                >
                  {order.status === 'FILLED' ? (
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{order.status}</span>
                  ) : order.status === 'REJECTED' || order.status === 'CANCELED' ? (
                    <span className="flex items-center gap-1"><XCircle className="w-3 h-3" />{order.status}</span>
                  ) : (
                    <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{order.status}</span>
                  )}
                </span>
              </div>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <div className="text-gray-600 uppercase text-[10px] tracking-wider">Order ID</div>
                <div className="text-gray-300">{order.orderId}</div>
              </div>
              <div>
                <div className="text-gray-600 uppercase text-[10px] tracking-wider">Qty</div>
                <div className="text-white">{order.origQty}</div>
              </div>
              <div>
                <div className="text-gray-600 uppercase text-[10px] tracking-wider">Executed</div>
                <div className="text-white">{order.executedQty}</div>
              </div>
              <div>
                <div className="text-gray-600 uppercase text-[10px] tracking-wider">Avg Price</div>
                <div className="text-cyan-300">
                  {order.avgPrice && parseFloat(order.avgPrice) > 0
                    ? `$${parseFloat(order.avgPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : '—'}
                </div>
              </div>
              {order.price && parseFloat(order.price) > 0 && (
                <div>
                  <div className="text-gray-600 uppercase text-[10px] tracking-wider">Limit Price</div>
                  <div className="text-purple-300">${parseFloat(order.price).toLocaleString()}</div>
                </div>
              )}
              {order.stopPrice && parseFloat(order.stopPrice) > 0 && (
                <div>
                  <div className="text-gray-600 uppercase text-[10px] tracking-wider">Stop Price</div>
                  <div className="text-yellow-300">${parseFloat(order.stopPrice).toLocaleString()}</div>
                </div>
              )}
              <div className="col-span-2">
                <div className="text-gray-600 uppercase text-[10px] tracking-wider">Submitted At</div>
                <div className="text-gray-400">{new Date(order.submittedAt).toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
