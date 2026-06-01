import { useState } from 'react';
import { Code2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface FileSection {
  filename: string;
  description: string;
  color: string;
  code: string;
}

const FILES: FileSection[] = [
  {
    filename: 'bot/logging_config.py',
    description: 'Structured logging — mirrors logger.ts',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
    code: `"""
logging_config.py — Structured logging with file rotation and console output.
Mirrors the UI's logger.ts module.
"""
import logging
import logging.handlers
import os
from pathlib import Path

LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_FILE = LOG_DIR / "trading_bot.log"
LOG_FORMAT = "[%(asctime)s] [%(levelname)-7s] %(name)s — %(message)s"
DATE_FORMAT = "%Y-%m-%dT%H:%M:%S"


def setup_logger(name: str = "trading_bot") -> logging.Logger:
    """Configure and return a logger with file rotation + console output."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # Avoid duplicate handlers on reimport

    logger.setLevel(logging.DEBUG)

    # ── Rotating file handler (5 MB, 3 backups) ──────────────────────────────
    file_handler = logging.handlers.RotatingFileHandler(
        LOG_FILE,
        maxBytes=5 * 1024 * 1024,  # 5 MB
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))

    # ── Console (stdout) handler ──────────────────────────────────────────────
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    return logger`,
  },
  {
    filename: 'bot/client.py',
    description: 'Binance REST client with HMAC-SHA256 signing',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
    code: `"""
client.py — Low-level Binance Futures Testnet REST client.
Direct REST calls with HMAC-SHA256 signing — no third-party SDK required.
Mirrors the UI's binanceClient.ts module.
"""
import hmac
import hashlib
import time
import requests
from typing import Any, Dict, Optional
from urllib.parse import urlencode
from bot.logging_config import setup_logger

log = setup_logger()

TESTNET_BASE_URL = "https://testnet.binancefuture.com"
DEFAULT_TIMEOUT = 10  # seconds


class BinanceAPIError(Exception):
    """Raised when the Binance API returns a non-2xx response."""
    def __init__(self, code: Any, message: str, raw: Any = None):
        super().__init__(message)
        self.code = code
        self.raw = raw


def _sign(api_secret: str, query_string: str) -> str:
    """HMAC-SHA256 signature — identical algorithm to the UI's signQueryString()."""
    return hmac.new(
        api_secret.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _get(api_key: str, api_secret: str, path: str,
         params: Optional[Dict] = None) -> Any:
    params = params or {}
    params["timestamp"] = int(time.time() * 1000)
    query_string = urlencode({k: v for k, v in params.items() if v is not None})
    signature = _sign(api_secret, query_string)
    url = f"{TESTNET_BASE_URL}{path}?{query_string}&signature={signature}"
    headers = {"X-MBX-APIKEY": api_key}

    log.debug(f"GET {path} params={params}")
    resp = requests.get(url, headers=headers, timeout=DEFAULT_TIMEOUT)
    data = resp.json()
    if not resp.ok:
        raise BinanceAPIError(data.get("code", resp.status_code), data.get("msg", "Unknown"), data)
    log.debug(f"GET {path} → {resp.status_code}")
    return data


def _post(api_key: str, api_secret: str, path: str,
          params: Dict) -> Any:
    params["timestamp"] = int(time.time() * 1000)
    query_string = urlencode({k: v for k, v in params.items() if v is not None})
    signature = _sign(api_secret, query_string)
    body = f"{query_string}&signature={signature}"
    headers = {
        "X-MBX-APIKEY": api_key,
        "Content-Type": "application/x-www-form-urlencoded",
    }

    log.debug(f"POST {path} body={body}")
    resp = requests.post(
        f"{TESTNET_BASE_URL}{path}", headers=headers,
        data=body, timeout=DEFAULT_TIMEOUT
    )
    data = resp.json()
    if not resp.ok:
        raise BinanceAPIError(data.get("code", resp.status_code), data.get("msg", "Unknown"), data)
    log.debug(f"POST {path} → {resp.status_code}")
    return data


def test_connectivity() -> bool:
    try:
        resp = requests.get(f"{TESTNET_BASE_URL}/fapi/v1/ping", timeout=5)
        return resp.ok
    except Exception:
        return False


def get_account_balance(api_key: str, api_secret: str) -> list:
    data = _get(api_key, api_secret, "/fapi/v2/account")
    assets = data.get("assets", []) if isinstance(data, dict) else data
    return [a for a in assets if a.get("asset") == "USDT"]


def place_order(api_key: str, api_secret: str, params: Dict) -> Dict:
    log.info(f"📤 Sending order to /fapi/v1/order — params: {params}")
    result = _post(api_key, api_secret, "/fapi/v1/order", params)
    log.info(f"📥 Order response: {result}")
    return result`,
  },
  {
    filename: 'bot/validators.py',
    description: 'Input validation — mirrors validators.ts',
    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
    code: `"""
validators.py — Validate all order parameters before sending to Binance.
Mirrors the UI's validators.ts module.
"""
from dataclasses import dataclass, field
from typing import List


@dataclass
class ValidationResult:
    valid: bool
    errors: List[str] = field(default_factory=list)


def validate_symbol(symbol: str) -> List[str]:
    errors = []
    if not symbol or not symbol.strip():
        return ["Symbol is required."]
    s = symbol.upper().strip()
    if not s.endswith("USDT"):
        errors.append("Symbol must end with USDT (e.g., BTCUSDT).")
    if len(s) < 6:
        errors.append("Symbol is too short.")
    return errors


def validate_quantity(quantity: str) -> List[str]:
    errors = []
    if not quantity:
        return ["Quantity is required."]
    try:
        val = float(quantity)
        if val <= 0:
            errors.append("Quantity must be greater than 0.")
        if val > 1000:
            errors.append("Quantity exceeds maximum (1000).")
    except ValueError:
        errors.append("Quantity must be a valid number.")
    return errors


def validate_price(price: str, field_name: str = "Price") -> List[str]:
    errors = []
    if not price:
        return [f"{field_name} is required for this order type."]
    try:
        val = float(price)
        if val <= 0:
            errors.append(f"{field_name} must be greater than 0.")
    except ValueError:
        errors.append(f"{field_name} must be a valid number.")
    return errors


def validate_order(order_type: str, side: str, symbol: str,
                   quantity: str, price: str = None,
                   stop_price: str = None) -> ValidationResult:
    errors = [*validate_symbol(symbol), *validate_quantity(quantity)]

    if order_type == "LIMIT":
        if not price:
            errors.append("Price is required for LIMIT orders.")
        else:
            errors.extend(validate_price(price, "Limit Price"))

    if order_type == "STOP":
        if not price:
            errors.append("Limit price required for Stop-Limit orders.")
        else:
            errors.extend(validate_price(price, "Limit Price"))
        if not stop_price:
            errors.append("Stop/trigger price required for STOP orders.")
        else:
            errors.extend(validate_price(stop_price, "Stop Price"))
            if price and stop_price:
                try:
                    p, sp = float(price), float(stop_price)
                    if side == "SELL" and p >= sp:
                        errors.append(
                            "SELL Stop-Limit: Limit price must be BELOW the stop price."
                        )
                    if side == "BUY" and p <= sp:
                        errors.append(
                            "BUY Stop-Limit: Limit price must be ABOVE the stop price."
                        )
                except ValueError:
                    pass

    return ValidationResult(valid=len(errors) == 0, errors=errors)`,
  },
  {
    filename: 'bot/orders.py',
    description: 'Order orchestration — mirrors orderService.ts',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    code: `"""
orders.py — High-level order orchestration layer.
Validate → Log → Execute → Log result.
Mirrors the UI's orderService.ts module.
"""
from typing import Optional
from bot.client import place_order, BinanceAPIError
from bot.validators import validate_order
from bot.logging_config import setup_logger

log = setup_logger()


def submit_market_order(api_key: str, api_secret: str,
                        symbol: str, side: str, quantity: str) -> dict:
    """Place a MARKET order. Executes immediately at best available price."""
    _validate_or_raise("MARKET", side, symbol, quantity)
    params = {
        "symbol": symbol.upper(),
        "side": side.upper(),
        "type": "MARKET",
        "quantity": quantity,
    }
    log.info(f"[ORDER REQUEST] MARKET {side} {quantity} {symbol}")
    return _execute(api_key, api_secret, params)


def submit_limit_order(api_key: str, api_secret: str,
                       symbol: str, side: str, quantity: str,
                       price: str, time_in_force: str = "GTC") -> dict:
    """Place a LIMIT order. Executes only at the specified price or better."""
    _validate_or_raise("LIMIT", side, symbol, quantity, price=price)
    params = {
        "symbol": symbol.upper(),
        "side": side.upper(),
        "type": "LIMIT",
        "quantity": quantity,
        "price": price,
        "timeInForce": time_in_force,
    }
    log.info(f"[ORDER REQUEST] LIMIT {side} {quantity} {symbol} @ {price}")
    return _execute(api_key, api_secret, params)


def submit_stop_limit_order(api_key: str, api_secret: str,
                            symbol: str, side: str, quantity: str,
                            price: str, stop_price: str,
                            time_in_force: str = "GTC") -> dict:
    """
    Place a STOP-LIMIT order (3rd order type).
    stop_price = the market trigger price that activates the order.
    price      = the limit price for execution once triggered.

    SELL Stop-Limit: stop_price > price (stop triggers, then sells at limit)
    BUY  Stop-Limit: stop_price < price (stop triggers, then buys at limit)
    """
    _validate_or_raise("STOP", side, symbol, quantity,
                       price=price, stop_price=stop_price)
    params = {
        "symbol": symbol.upper(),
        "side": side.upper(),
        "type": "STOP",              # Binance futures stop-limit type
        "quantity": quantity,
        "price": price,              # Limit price (worst acceptable fill)
        "stopPrice": stop_price,     # Trigger price
        "timeInForce": time_in_force,
    }
    log.info(
        f"[ORDER REQUEST] STOP-LIMIT {side} {quantity} {symbol} "
        f"trigger={stop_price} limit={price}"
    )
    return _execute(api_key, api_secret, params)


def _validate_or_raise(order_type, side, symbol, quantity,
                       price=None, stop_price=None):
    result = validate_order(order_type, side, symbol, quantity, price, stop_price)
    if not result.valid:
        msg = "; ".join(result.errors)
        log.error(f"[VALIDATION FAILED] {msg}")
        raise ValueError(f"Validation failed: {msg}")


def _execute(api_key: str, api_secret: str, params: dict) -> dict:
    try:
        response = place_order(api_key, api_secret, params)
        log.info(
            f"[ORDER SUCCESS] orderId={response.get('orderId')} "
            f"status={response.get('status')} "
            f"executedQty={response.get('executedQty')} "
            f"avgPrice={response.get('avgPrice')}"
        )
        return response
    except BinanceAPIError as e:
        log.error(f"[API ERROR] code={e.code} message={e}")
        raise
    except Exception as e:
        log.error(f"[NETWORK ERROR] {e}")
        raise`,
  },
  {
    filename: 'cli.py',
    description: 'CLI entry point (argparse)',
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/5',
    code: `"""
cli.py — Command-line interface for NeonTrader.
Accepts and validates user input, delegates to bot/orders.py.

Usage examples:
  python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.001
  python cli.py --symbol ETHUSDT --side SELL --type LIMIT --quantity 0.01 --price 3200
  python cli.py --symbol BTCUSDT --side SELL --type STOP --quantity 0.001 --price 59950 --stop-price 60000
"""
import argparse
import json
import os
import sys
from dotenv import load_dotenv

load_dotenv()  # Load .env file if present

from bot.orders import submit_market_order, submit_limit_order, submit_stop_limit_order
from bot.logging_config import setup_logger

log = setup_logger()


def get_credentials():
    api_key = os.environ.get("BINANCE_API_KEY", "").strip()
    api_secret = os.environ.get("BINANCE_API_SECRET", "").strip()
    if not api_key or not api_secret:
        print("❌ Error: BINANCE_API_KEY and BINANCE_API_SECRET must be set.")
        print("   Export them as environment variables or add to a .env file.")
        sys.exit(1)
    return api_key, api_secret


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="neontrader",
        description="NeonTrader — Binance Futures Testnet Order CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Market order:
    python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.001

  Limit order:
    python cli.py --symbol ETHUSDT --side SELL --type LIMIT --quantity 0.01 --price 3200

  Stop-Limit order:
    python cli.py --symbol BTCUSDT --side SELL --type STOP --quantity 0.001 --price 59950 --stop-price 60000
        """,
    )
    parser.add_argument("--symbol", required=True, help="Trading pair (e.g., BTCUSDT)")
    parser.add_argument("--side", required=True, choices=["BUY", "SELL"], help="Order direction")
    parser.add_argument("--type", required=True, dest="order_type",
                        choices=["MARKET", "LIMIT", "STOP"], help="Order type")
    parser.add_argument("--quantity", required=True, help="Amount of asset to trade")
    parser.add_argument("--price", help="Limit price (required for LIMIT and STOP orders)")
    parser.add_argument("--stop-price", dest="stop_price",
                        help="Stop/trigger price (required for STOP orders)")
    parser.add_argument("--time-in-force", default="GTC",
                        choices=["GTC", "IOC", "FOK"],
                        help="Time-in-force for limit orders (default: GTC)")
    return parser


def print_order_summary(args):
    print("\\n" + "═" * 52)
    print("  📋 ORDER REQUEST SUMMARY")
    print("═" * 52)
    print(f"  Symbol     : {args.symbol.upper()}")
    print(f"  Side       : {args.side}")
    print(f"  Type       : {args.order_type}")
    print(f"  Quantity   : {args.quantity}")
    if args.price:
        print(f"  Price      : {args.price} USDT")
    if args.stop_price:
        print(f"  Stop Price : {args.stop_price} USDT")
    if args.order_type != "MARKET":
        print(f"  TIF        : {args.time_in_force}")
    print("═" * 52 + "\\n")


def print_order_response(response: dict):
    print("\\n" + "═" * 52)
    print("  ✅ ORDER RESPONSE")
    print("═" * 52)
    for key, value in response.items():
        print(f"  {key:<18}: {value}")
    print("═" * 52)
    print(f"  Status  : {response.get('status')}")
    exec_qty = response.get('executedQty', '0')
    avg_price = response.get('avgPrice', '0')
    print(f"  Filled  : {exec_qty} @ avg {avg_price} USDT")
    print("  ✅ Order placed successfully!")
    print("═" * 52 + "\\n")


def main():
    parser = build_parser()
    args = parser.parse_args()
    api_key, api_secret = get_credentials()

    log.info(f"CLI invoked: {vars(args)}")
    print_order_summary(args)

    try:
        if args.order_type == "MARKET":
            response = submit_market_order(
                api_key, api_secret, args.symbol, args.side, args.quantity
            )
        elif args.order_type == "LIMIT":
            if not args.price:
                parser.error("--price is required for LIMIT orders")
            response = submit_limit_order(
                api_key, api_secret, args.symbol, args.side,
                args.quantity, args.price, args.time_in_force
            )
        elif args.order_type == "STOP":
            if not args.price or not args.stop_price:
                parser.error("--price and --stop-price are required for STOP orders")
            response = submit_stop_limit_order(
                api_key, api_secret, args.symbol, args.side,
                args.quantity, args.price, args.stop_price, args.time_in_force
            )

        print_order_response(response)

    except ValueError as e:
        print(f"\\n❌ Validation Error: {e}\\n")
        sys.exit(1)
    except Exception as e:
        print(f"\\n❌ Error: {e}\\n")
        log.error(f"Unhandled error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()`,
  },
];

export default function PythonCodeViewer() {
  const [activeFile, setActiveFile] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(FILES[activeFile].code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-900/80 backdrop-blur-sm overflow-hidden shadow-lg">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <Code2 className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-widest">
          Python Source Code
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
          {/* File tabs */}
          <div className="flex gap-1 px-3 pt-3 pb-0 overflow-x-auto">
            {FILES.map((f, i) => (
              <button
                key={f.filename}
                onClick={() => setActiveFile(i)}
                className={`shrink-0 px-3 py-1.5 rounded-t-lg text-[10px] font-mono transition-all border-b-2 ${
                  activeFile === i
                    ? `${f.color} border-current`
                    : 'text-gray-600 border-transparent hover:text-gray-400'
                }`}
              >
                {f.filename}
              </button>
            ))}
          </div>

          {/* Code area */}
          <div className="relative bg-gray-950 border-t border-gray-800">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/60">
              <span className="text-[10px] text-gray-600 font-mono">
                {FILES[activeFile].description}
              </span>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-cyan-400 transition-colors font-mono"
              >
                {copied ? (
                  <><Check className="w-3 h-3 text-emerald-400" /> Copied!</>
                ) : (
                  <><Copy className="w-3 h-3" /> Copy</>
                )}
              </button>
            </div>
            <pre
              className="p-5 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed"
              style={{ maxHeight: 480, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}
            >
              <code>{FILES[activeFile].code}</code>
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
