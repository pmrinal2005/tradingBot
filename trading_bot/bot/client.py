"""
client.py — Low-level Binance Futures Testnet REST client.

Uses direct REST calls with HMAC-SHA256 request signing.
No third-party Binance SDK required — only the standard `requests` library.

Mirrors the provided code example exactly:
  - timestamp appended to every signed request
  - HMAC-SHA256 via hmac + hashlib
  - API key sent in X-MBX-APIKEY header
  - Base URL: https://testnet.binancefuture.com

API Endpoints:
  GET  /fapi/v1/ping         → connectivity test
  GET  /fapi/v1/time         → server time
  GET  /fapi/v1/ticker/price → live price for a symbol
  GET  /fapi/v2/account      → account balances (signed)
  POST /fapi/v1/order        → place new order (signed)
  GET  /fapi/v1/openOrders   → list open orders (signed)
  GET  /fapi/v1/allOrders    → order history (signed)
"""

import hmac
import hashlib
import time
import requests
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

from bot.logging_config import setup_logger

log = setup_logger()

# ── Constants ──────────────────────────────────────────────────────────────────
TESTNET_BASE_URL = "https://testnet.binancefuture.com"
DEFAULT_TIMEOUT = 10  # seconds


# ── Custom Exception ───────────────────────────────────────────────────────────
class BinanceAPIError(Exception):
    """
    Raised when Binance API returns a non-2xx response.

    Attributes:
        code    : Binance internal error code (e.g., -1102) or HTTP status
        message : Human-readable error description from Binance
        raw     : Full raw response dict for debugging
    """

    def __init__(self, code: Any, message: str, raw: Any = None):
        super().__init__(message)
        self.code = code
        self.raw = raw

    def __str__(self):
        return f"[Binance Error {self.code}] {super().__str__()}"


# ── HMAC-SHA256 Signing ────────────────────────────────────────────────────────
def _sign(api_secret: str, query_string: str) -> str:
    """
    Create an HMAC-SHA256 signature for Binance API authentication.

    Exactly mirrors the provided code example:
        signature = hmac.new(
            api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    Args:
        api_secret   : Your Binance Testnet API secret key
        query_string : The URL-encoded parameter string to sign

    Returns:
        Lowercase hex digest string (64 characters)
    """
    return hmac.new(
        api_secret.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


# ── Internal HTTP helpers ──────────────────────────────────────────────────────
def _build_query(params: Dict) -> str:
    """Build URL query string, filtering out None values."""
    return urlencode({k: v for k, v in params.items() if v is not None})


def _signed_get(
    api_key: str,
    api_secret: str,
    path: str,
    params: Optional[Dict] = None,
) -> Any:
    """
    Send an authenticated GET request to the Binance Testnet.

    Steps (mirrors the provided example):
      1. Add current timestamp to params
      2. Build query string
      3. Sign with HMAC-SHA256
      4. Send request with X-MBX-APIKEY header
    """
    params = params or {}
    params["timestamp"] = int(time.time() * 1000)  # milliseconds
    query_string = _build_query(params)
    signature = _sign(api_secret, query_string)

    url = f"{TESTNET_BASE_URL}{path}?{query_string}&signature={signature}"
    headers = {"X-MBX-APIKEY": api_key}

    log.debug(f"→ GET {path} | params={params}")

    try:
        resp = requests.get(url, headers=headers, timeout=DEFAULT_TIMEOUT)
    except requests.exceptions.Timeout:
        log.error(f"Request timed out: GET {path}")
        raise
    except requests.exceptions.RequestException as e:
        log.error(f"Network error: GET {path} → {e}")
        raise

    data = resp.json()
    log.debug(f"← GET {path} | status={resp.status_code}")

    if not resp.ok:
        raise BinanceAPIError(
            data.get("code", resp.status_code),
            data.get("msg", "Unknown API error"),
            data,
        )
    return data


def _signed_post(
    api_key: str,
    api_secret: str,
    path: str,
    params: Dict,
) -> Any:
    """
    Send an authenticated POST request to the Binance Testnet.

    The body is sent as application/x-www-form-urlencoded (standard for Binance).
    """
    params["timestamp"] = int(time.time() * 1000)
    query_string = _build_query(params)
    signature = _sign(api_secret, query_string)
    body = f"{query_string}&signature={signature}"

    headers = {
        "X-MBX-APIKEY": api_key,
        "Content-Type": "application/x-www-form-urlencoded",
    }

    # Log the request (mask signature in logs for security hygiene)
    safe_body = body.split("&signature=")[0] + "&signature=***"
    log.debug(f"→ POST {path} | body={safe_body}")

    try:
        resp = requests.post(
            f"{TESTNET_BASE_URL}{path}",
            headers=headers,
            data=body,
            timeout=DEFAULT_TIMEOUT,
        )
    except requests.exceptions.Timeout:
        log.error(f"Request timed out: POST {path}")
        raise
    except requests.exceptions.RequestException as e:
        log.error(f"Network error: POST {path} → {e}")
        raise

    data = resp.json()
    log.debug(f"← POST {path} | status={resp.status_code}")

    if not resp.ok:
        raise BinanceAPIError(
            data.get("code", resp.status_code),
            data.get("msg", "Unknown API error"),
            data,
        )
    return data


# ── Public (unauthenticated) endpoints ────────────────────────────────────────
def test_connectivity() -> bool:
    """
    Ping the Binance Testnet server.

    Returns:
        True if reachable, False otherwise.
    """
    try:
        resp = requests.get(
            f"{TESTNET_BASE_URL}/fapi/v1/ping",
            timeout=5,
        )
        if resp.ok:
            log.info("✅ Connectivity check passed — Testnet is reachable.")
        return resp.ok
    except Exception as e:
        log.error(f"Connectivity check failed: {e}")
        return False


def get_server_time() -> int:
    """
    Fetch the Binance server's current Unix timestamp in milliseconds.
    Useful for diagnosing timestamp sync issues.
    """
    resp = requests.get(
        f"{TESTNET_BASE_URL}/fapi/v1/time",
        timeout=5,
    )
    resp.raise_for_status()
    data = resp.json()
    server_time = data["serverTime"]
    log.debug(f"Server time: {server_time}")
    return server_time


def get_ticker_price(symbol: str) -> Dict:
    """
    Get the latest market price for a symbol.

    Args:
        symbol: Trading pair, e.g., "BTCUSDT"

    Returns:
        {"symbol": "BTCUSDT", "price": "94831.20", "time": 1234567890}
    """
    resp = requests.get(
        f"{TESTNET_BASE_URL}/fapi/v1/ticker/price",
        params={"symbol": symbol.upper()},
        timeout=5,
    )
    resp.raise_for_status()
    return resp.json()


# ── Private (authenticated) endpoints ─────────────────────────────────────────
def get_account_balance(api_key: str, api_secret: str) -> List[Dict]:
    """
    Fetch account asset balances.

    Returns:
        List of asset dicts filtered to USDT balance.
    """
    log.info("Fetching account balance…")
    data = _signed_get(api_key, api_secret, "/fapi/v2/account")

    # v2/account returns a nested 'assets' list
    assets = data.get("assets", []) if isinstance(data, dict) else data
    usdt = [a for a in assets if a.get("asset") == "USDT"]
    log.info(f"USDT balance: {usdt[0].get('availableBalance', '?') if usdt else 'N/A'}")
    return usdt


def place_order(api_key: str, api_secret: str, params: Dict) -> Dict:
    """
    Place a new order on Binance Futures Testnet.

    Supported params:
        symbol       : e.g., "BTCUSDT"
        side         : "BUY" or "SELL"
        type         : "MARKET", "LIMIT", or "STOP"
        quantity     : Asset quantity to trade
        price        : Limit price (LIMIT and STOP orders only)
        stopPrice    : Trigger price (STOP orders only)
        timeInForce  : "GTC", "IOC", or "FOK" (limit orders only)

    Returns:
        Order response dict from Binance API.

    Raises:
        BinanceAPIError: On API-level rejection.
        requests.RequestException: On network failure.
    """
    log.info(f"📤 Placing order → {params.get('type')} {params.get('side')} "
             f"{params.get('quantity')} {params.get('symbol')} "
             f"@ price={params.get('price', 'MARKET')} "
             f"stopPrice={params.get('stopPrice', 'N/A')}")

    response = _signed_post(api_key, api_secret, "/fapi/v1/order", params)

    log.info(
        f"📥 Order response — orderId={response.get('orderId')} "
        f"status={response.get('status')} "
        f"executedQty={response.get('executedQty')} "
        f"avgPrice={response.get('avgPrice')}"
    )
    return response


def get_open_orders(api_key: str, api_secret: str, symbol: Optional[str] = None) -> List[Dict]:
    """
    Fetch currently open orders.

    Args:
        symbol: Optional filter by trading pair.

    Returns:
        List of open order dicts.
    """
    params = {}
    if symbol:
        params["symbol"] = symbol.upper()
    return _signed_get(api_key, api_secret, "/fapi/v1/openOrders", params)


def get_order_history(
    api_key: str,
    api_secret: str,
    symbol: str,
    limit: int = 20,
) -> List[Dict]:
    """
    Fetch historical orders for a symbol.

    Args:
        symbol : Trading pair
        limit  : Number of records to return (max 1000)

    Returns:
        List of historical order dicts.
    """
    return _signed_get(api_key, api_secret, "/fapi/v1/allOrders", {
        "symbol": symbol.upper(),
        "limit": limit,
    })
