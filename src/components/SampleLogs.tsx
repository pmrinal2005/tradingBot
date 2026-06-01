import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

const MARKET_LOG = `[2025-01-15T09:23:45] [INFO   ] trading_bot — CLI invoked: {'symbol': 'BTCUSDT', 'side': 'BUY', 'type': 'MARKET', 'quantity': '0.001', 'price': None, 'stop_price': None}
[2025-01-15T09:23:45] [INFO   ] trading_bot — Validating order parameters…
[2025-01-15T09:23:45] [DEBUG  ] trading_bot — POST /fapi/v1/order body=symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.001&timestamp=1736933025412&signature=a3f...
[2025-01-15T09:23:45] [INFO   ] trading_bot — 📤 Sending order to /fapi/v1/order — params: {'symbol': 'BTCUSDT', 'side': 'BUY', 'type': 'MARKET', 'quantity': '0.001'}
[2025-01-15T09:23:46] [DEBUG  ] trading_bot — POST /fapi/v1/order → 200
[2025-01-15T09:23:46] [INFO   ] trading_bot — 📥 Order response: {'orderId': 4091342857, 'symbol': 'BTCUSDT', 'status': 'FILLED', 'clientOrderId': 'testnet_xyz', 'price': '0', 'avgPrice': '94832.50', 'origQty': '0.001', 'executedQty': '0.001', 'type': 'MARKET', 'side': 'BUY', 'updateTime': 1736933026187}
[2025-01-15T09:23:46] [INFO   ] trading_bot — [ORDER SUCCESS] orderId=4091342857 status=FILLED executedQty=0.001 avgPrice=94832.50`;

const LIMIT_LOG = `[2025-01-15T09:31:17] [INFO   ] trading_bot — CLI invoked: {'symbol': 'ETHUSDT', 'side': 'SELL', 'type': 'LIMIT', 'quantity': '0.01', 'price': '3200', 'stop_price': None}
[2025-01-15T09:31:17] [INFO   ] trading_bot — Validating order parameters…
[2025-01-15T09:31:17] [DEBUG  ] trading_bot — POST /fapi/v1/order body=symbol=ETHUSDT&side=SELL&type=LIMIT&quantity=0.01&price=3200&timeInForce=GTC&timestamp=1736933477321&signature=b8c...
[2025-01-15T09:31:17] [INFO   ] trading_bot — 📤 Sending order to /fapi/v1/order — params: {'symbol': 'ETHUSDT', 'side': 'SELL', 'type': 'LIMIT', 'quantity': '0.01', 'price': '3200', 'timeInForce': 'GTC'}
[2025-01-15T09:31:18] [DEBUG  ] trading_bot — POST /fapi/v1/order → 200
[2025-01-15T09:31:18] [INFO   ] trading_bot — 📥 Order response: {'orderId': 4091358291, 'symbol': 'ETHUSDT', 'status': 'NEW', 'clientOrderId': 'testnet_abc', 'price': '3200', 'avgPrice': '0', 'origQty': '0.01', 'executedQty': '0', 'type': 'LIMIT', 'side': 'SELL', 'timeInForce': 'GTC', 'updateTime': 1736933478054}
[2025-01-15T09:31:18] [INFO   ] trading_bot — [ORDER SUCCESS] orderId=4091358291 status=NEW executedQty=0 avgPrice=0`;

const STOP_LIMIT_LOG = `[2025-01-15T09:45:02] [INFO   ] trading_bot — CLI invoked: {'symbol': 'BTCUSDT', 'side': 'SELL', 'type': 'STOP', 'quantity': '0.001', 'price': '59950', 'stop_price': '60000'}
[2025-01-15T09:45:02] [INFO   ] trading_bot — Validating order parameters…
[2025-01-15T09:45:02] [DEBUG  ] trading_bot — Stop-Limit validation: side=SELL price=59950 stopPrice=60000 — PASSED (stop > limit ✓)
[2025-01-15T09:45:02] [INFO   ] trading_bot — 📤 Sending order to /fapi/v1/order — params: {'symbol': 'BTCUSDT', 'side': 'SELL', 'type': 'STOP', 'quantity': '0.001', 'price': '59950', 'stopPrice': '60000', 'timeInForce': 'GTC'}
[2025-01-15T09:45:02] [DEBUG  ] trading_bot — POST /fapi/v1/order body=symbol=BTCUSDT&side=SELL&type=STOP&quantity=0.001&price=59950&stopPrice=60000&timeInForce=GTC&timestamp=1736934302100&signature=d7e...
[2025-01-15T09:45:03] [DEBUG  ] trading_bot — POST /fapi/v1/order → 200
[2025-01-15T09:45:03] [INFO   ] trading_bot — 📥 Order response: {'orderId': 4091399012, 'symbol': 'BTCUSDT', 'status': 'NEW', 'clientOrderId': 'testnet_stop_001', 'price': '59950', 'avgPrice': '0', 'origQty': '0.001', 'executedQty': '0', 'type': 'STOP', 'side': 'SELL', 'stopPrice': '60000', 'timeInForce': 'GTC', 'updateTime': 1736934303712}
[2025-01-15T09:45:03] [INFO   ] trading_bot — [ORDER SUCCESS] orderId=4091399012 status=NEW executedQty=0 avgPrice=0`;

const LOGS = [
  { label: 'MARKET Order Log', color: 'text-cyan-400 border-cyan-500/30', content: MARKET_LOG },
  { label: 'LIMIT Order Log', color: 'text-purple-400 border-purple-500/30', content: LIMIT_LOG },
  { label: 'STOP-LIMIT Order Log', color: 'text-yellow-400 border-yellow-500/30', content: STOP_LIMIT_LOG },
];

export default function SampleLogs() {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-900/80 backdrop-blur-sm overflow-hidden shadow-lg">
      <div
        className="flex items-center gap-3 px-5 py-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <FileText className="w-4 h-4 text-yellow-400" />
        <h3 className="text-xs font-semibold text-yellow-300 uppercase tracking-widest">
          Sample Log Files (logs/trading_bot.log)
        </h3>
        <span className="ml-auto">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </span>
      </div>

      {expanded && (
        <>
          <div className="flex gap-2 px-4 pt-3">
            {LOGS.map((l, i) => (
              <button
                key={l.label}
                onClick={() => setActive(i)}
                className={`text-[10px] px-3 py-1.5 rounded-lg border font-mono transition-all ${
                  active === i
                    ? l.color + ' bg-white/5'
                    : 'text-gray-600 border-gray-700/50 hover:text-gray-400'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            <pre
              className="text-[10px] font-mono text-gray-400 leading-relaxed overflow-x-auto bg-gray-950 rounded-lg p-4 border border-gray-800"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}
            >
              {LOGS[active].content}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
