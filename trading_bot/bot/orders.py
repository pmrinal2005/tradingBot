"""
orders.py — High-level order orchestration layer.

This module provides the clean public API for placing orders.
It orchestrates: Validate → Log → Execute → Log Result

Three order types supported:
  1. MARKET     — Executes immediately at best price
  2. LIMIT      — Executes at your specified price or better
  3. STOP       — Stop-Limit: trigger price activates a limit order

Mirrors the UI's orderService.ts module.
"""

from typing import Dict, Optional
from bot.client import place_order, get_open_orders, get_order_history, BinanceAPIError
from bot.validators import validate_order
from bot.logging_config import setup_logger

log = setup_logger()


# ── Internal helpers ───────────────────────────────────────────────────────────

def _validate_or_raise(
    order_type: str,
    side: str,
    symbol: str,
    quantity: str,
    price: Optional[str] = None,
    stop_price: Optional[str] = None,
) -> None:
    """Run validation and raise ValueError if any check fails."""
    result = validate_order(order_type, side, symbol, quantity, price, stop_price)
    if not result.valid:
        msg = "; ".join(result.errors)
        log.error(f"[VALIDATION FAILED] {msg}")
        raise ValueError(f"Validation failed: {msg}")
    log.debug("[VALIDATION PASSED] All parameters are valid.")


def _log_order_request(order_type: str, side: str, symbol: str, quantity: str,
                        price: Optional[str], stop_price: Optional[str]) -> None:
    """Log the order request summary."""
    log.info("=" * 52)
    log.info("  📋 ORDER REQUEST SUMMARY")
    log.info("=" * 52)
    log.info(f"  Symbol      : {symbol.upper()}")
    log.info(f"  Side        : {side.upper()}")
    log.info(f"  Type        : {order_type.upper()}")
    log.info(f"  Quantity    : {quantity}")
    if price:
        log.info(f"  Price       : {price} USDT")
    if stop_price:
        log.info(f"  Stop Price  : {stop_price} USDT")
    log.info("=" * 52)


def _log_order_response(response: Dict) -> None:
    """Log the order response details."""
    log.info("=" * 52)
    log.info("  ✅ ORDER RESPONSE DETAILS")
    log.info("=" * 52)
    log.info(f"  orderId     : {response.get('orderId')}")
    log.info(f"  status      : {response.get('status')}")
    log.info(f"  executedQty : {response.get('executedQty')}")
    log.info(f"  avgPrice    : {response.get('avgPrice')} USDT")
    log.info(f"  type        : {response.get('type')}")
    log.info(f"  side        : {response.get('side')}")
    if response.get('price') and float(response.get('price', 0)) > 0:
        log.info(f"  limitPrice  : {response.get('price')} USDT")
    if response.get('stopPrice') and float(response.get('stopPrice', 0)) > 0:
        log.info(f"  stopPrice   : {response.get('stopPrice')} USDT")
    log.info("=" * 52)


def _execute(api_key: str, api_secret: str, params: Dict) -> Dict:
    """Execute the order via the client and handle errors."""
    try:
        response = place_order(api_key, api_secret, params)
        _log_order_response(response)
        log.info("✅ Order placed successfully!")
        return response

    except BinanceAPIError as e:
        log.error(f"❌ API Error [code={e.code}]: {e}")
        raise
    except Exception as e:
        log.error(f"❌ Unexpected error: {e}")
        raise


# ── Public order functions ─────────────────────────────────────────────────────

def submit_market_order(
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,
    quantity: str,
) -> Dict:
    """
    Place a MARKET order.

    A market order executes immediately at the best available price.
    No price parameter is needed or accepted by Binance for market orders.

    Args:
        api_key    : Binance Testnet API key
        api_secret : Binance Testnet API secret
        symbol     : Trading pair (e.g., "BTCUSDT")
        side       : "BUY" or "SELL"
        quantity   : Amount of the base asset to trade

    Returns:
        Order response dict from Binance (includes orderId, status, avgPrice)

    Example:
        >>> result = submit_market_order(key, secret, "BTCUSDT", "BUY", "0.001")
        >>> print(result['status'])  # → 'FILLED'
    """
    _validate_or_raise("MARKET", side, symbol, quantity)
    _log_order_request("MARKET", side, symbol, quantity, None, None)

    params = {
        "symbol": symbol.upper(),
        "side": side.upper(),
        "type": "MARKET",
        "quantity": str(quantity),
    }
    return _execute(api_key, api_secret, params)


def submit_limit_order(
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,
    quantity: str,
    price: str,
    time_in_force: str = "GTC",
) -> Dict:
    """
    Place a LIMIT order.

    A limit order is placed in the order book and only executes when
    the market reaches your specified price (or better).

    Args:
        api_key        : Binance Testnet API key
        api_secret     : Binance Testnet API secret
        symbol         : Trading pair (e.g., "ETHUSDT")
        side           : "BUY" or "SELL"
        quantity       : Amount to trade
        price          : Desired execution price (in USDT)
        time_in_force  : "GTC" (Good Till Cancel), "IOC", or "FOK"
                         Default: "GTC"

    Returns:
        Order response dict (status will be "NEW" until filled)

    Example:
        >>> result = submit_limit_order(key, secret, "ETHUSDT", "SELL", "0.01", "3200")
        >>> print(result['status'])  # → 'NEW'
    """
    _validate_or_raise("LIMIT", side, symbol, quantity, price=price)
    _log_order_request("LIMIT", side, symbol, quantity, price, None)

    params = {
        "symbol": symbol.upper(),
        "side": side.upper(),
        "type": "LIMIT",
        "quantity": str(quantity),
        "price": str(price),
        "timeInForce": time_in_force.upper(),
    }
    return _execute(api_key, api_secret, params)


def submit_stop_limit_order(
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,
    quantity: str,
    price: str,
    stop_price: str,
    time_in_force: str = "GTC",
) -> Dict:
    """
    Place a STOP-LIMIT order (third order type).

    How it works:
      1. DORMANT STATE: The order sits hidden until the market reaches `stop_price`.
      2. TRIGGER: When the market hits `stop_price`, the order activates.
      3. EXECUTION: Binance submits a limit order at `price` to the order book.

    Price relationship rules:
      SELL Stop-Limit: stop_price > price
        (Trigger is above limit; you accept a slightly worse fill than trigger)
        Example: stopPrice=60000, price=59950  → Sells if BTC drops to $60K

      BUY Stop-Limit: stop_price < price
        (Trigger is below limit; you're willing to buy slightly above trigger)
        Example: stopPrice=60000, price=60050  → Buys if BTC rises to $60K

    Args:
        api_key        : Binance Testnet API key
        api_secret     : Binance Testnet API secret
        symbol         : Trading pair (e.g., "BTCUSDT")
        side           : "BUY" or "SELL"
        quantity       : Amount to trade
        price          : Limit price — worst acceptable execution price
        stop_price     : Trigger price — activates the order when hit
        time_in_force  : "GTC", "IOC", or "FOK" (default: "GTC")

    Returns:
        Order response dict (status will be "NEW" while waiting for trigger)

    Example (from provided code):
        >>> result = submit_stop_limit_order(
        ...     key, secret, "BTCUSDT", "SELL", "0.001",
        ...     price="59950", stop_price="60000"
        ... )
        >>> print(result['status'])  # → 'NEW'
    """
    _validate_or_raise(
        "STOP", side, symbol, quantity,
        price=price, stop_price=stop_price,
    )
    _log_order_request("STOP", side, symbol, quantity, price, stop_price)

    params = {
        "symbol": symbol.upper(),
        "side": side.upper(),
        "type": "STOP",            # Binance futures Stop-Limit type
        "quantity": str(quantity),
        "price": str(price),       # Limit price (worst acceptable fill)
        "stopPrice": str(stop_price),  # Trigger price (activates the order)
        "timeInForce": time_in_force.upper(),
    }
    return _execute(api_key, api_secret, params)


# ── Query functions ────────────────────────────────────────────────────────────

def fetch_open_orders(
    api_key: str,
    api_secret: str,
    symbol: Optional[str] = None,
) -> list:
    """
    Fetch currently open (unfilled) orders.

    Args:
        symbol: Optional filter by trading pair. None returns all open orders.

    Returns:
        List of open order dicts.
    """
    log.info(f"Fetching open orders{f' for {symbol}' if symbol else ''}…")
    try:
        orders = get_open_orders(api_key, api_secret, symbol)
        log.info(f"Found {len(orders)} open order(s).")
        return orders
    except Exception as e:
        log.error(f"Failed to fetch open orders: {e}")
        raise


def fetch_order_history(
    api_key: str,
    api_secret: str,
    symbol: str,
    limit: int = 20,
) -> list:
    """
    Fetch historical orders for a symbol.

    Args:
        symbol : Trading pair (e.g., "BTCUSDT")
        limit  : Max records to return (default: 20)

    Returns:
        List of historical order dicts.
    """
    log.info(f"Fetching order history for {symbol} (limit={limit})…")
    try:
        orders = get_order_history(api_key, api_secret, symbol, limit)
        log.info(f"Retrieved {len(orders)} historical order(s).")
        return orders
    except Exception as e:
        log.error(f"Failed to fetch order history: {e}")
        raise
