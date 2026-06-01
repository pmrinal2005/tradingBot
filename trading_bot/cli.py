"""
cli.py — NeonTrader CLI Entry Point

Command-line interface for placing orders on Binance Futures Testnet (USDT-M).
Uses argparse for input handling with full validation and structured logging.

Usage:
    python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.001
    python cli.py --symbol ETHUSDT --side SELL --type LIMIT --quantity 0.01 --price 3200
    python cli.py --symbol BTCUSDT --side SELL --type STOP --quantity 0.001 \\
                  --price 59950 --stop-price 60000
    python cli.py --help

Environment variables required:
    BINANCE_API_KEY     : Your Binance Futures Testnet API key
    BINANCE_API_SECRET  : Your Binance Futures Testnet API secret

    Set via environment:
        export BINANCE_API_KEY="your_key_here"
        export BINANCE_API_SECRET="your_secret_here"

    Or via .env file (auto-loaded by python-dotenv):
        BINANCE_API_KEY=your_key_here
        BINANCE_API_SECRET=your_secret_here
"""

import argparse
import json
import os
import sys
from datetime import datetime

# Load .env file if present (requires python-dotenv)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv optional; use export instead

from bot.orders import (
    submit_market_order,
    submit_limit_order,
    submit_stop_limit_order,
    fetch_open_orders,
)
from bot.client import test_connectivity, get_account_balance
from bot.logging_config import setup_logger

log = setup_logger()

# ── ANSI colour codes for terminal output ─────────────────────────────────────
CYAN = "\033[96m"
PURPLE = "\033[95m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"


# ── Credentials ───────────────────────────────────────────────────────────────
def get_credentials():
    """Load API credentials from environment variables."""
    api_key = os.environ.get("BINANCE_API_KEY", "").strip()
    api_secret = os.environ.get("BINANCE_API_SECRET", "").strip()

    if not api_key or not api_secret:
        print(f"\n{RED}❌ Missing API credentials!{RESET}")
        print(f"   {DIM}Set BINANCE_API_KEY and BINANCE_API_SECRET as environment variables.{RESET}")
        print(f"   {DIM}Or create a .env file in the project root.{RESET}\n")
        sys.exit(1)

    return api_key, api_secret


# ── Argument parser ────────────────────────────────────────────────────────────
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="neontrader",
        description=(
            f"{BOLD}{CYAN}⚡ NeonTrader{RESET} — Binance Futures Testnet Order CLI\n"
            f"{DIM}Base URL: https://testnet.binancefuture.com{RESET}"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
{BOLD}Examples:{RESET}
  {DIM}# Market order — executes immediately{RESET}
  python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.001

  {DIM}# Limit order — waits for your price{RESET}
  python cli.py --symbol ETHUSDT --side SELL --type LIMIT --quantity 0.01 --price 3200

  {DIM}# Stop-Limit order — triggers at stopPrice, fills at price{RESET}
  python cli.py --symbol BTCUSDT --side SELL --type STOP --quantity 0.001 \\\\
                --price 59950 --stop-price 60000

  {DIM}# Show open orders{RESET}
  python cli.py --symbol BTCUSDT --list-open

  {DIM}# Test connectivity{RESET}
  python cli.py --ping

{BOLD}Stop-Limit Rules:{RESET}
  SELL: stopPrice > price   {DIM}(trigger above limit){RESET}
  BUY:  stopPrice < price   {DIM}(trigger below limit){RESET}
        """,
    )

    # Order parameters
    order_group = parser.add_argument_group("Order Parameters")
    order_group.add_argument(
        "--symbol", "-s",
        help="Trading pair (e.g., BTCUSDT, ETHUSDT)",
    )
    order_group.add_argument(
        "--side",
        choices=["BUY", "SELL"],
        help="Order direction: BUY or SELL",
    )
    order_group.add_argument(
        "--type", "-t",
        dest="order_type",
        choices=["MARKET", "LIMIT", "STOP"],
        help="Order type: MARKET | LIMIT | STOP (Stop-Limit)",
    )
    order_group.add_argument(
        "--quantity", "-q",
        help="Amount of the base asset to trade (e.g., 0.001 for BTC)",
    )
    order_group.add_argument(
        "--price", "-p",
        help="Limit price in USDT (required for LIMIT and STOP orders)",
    )
    order_group.add_argument(
        "--stop-price",
        dest="stop_price",
        help="Stop/trigger price in USDT (required for STOP orders only)",
    )
    order_group.add_argument(
        "--time-in-force",
        dest="time_in_force",
        default="GTC",
        choices=["GTC", "IOC", "FOK"],
        help="Time-in-force for limit orders (default: GTC = Good Till Cancel)",
    )

    # Utility commands
    util_group = parser.add_argument_group("Utility Commands")
    util_group.add_argument(
        "--ping",
        action="store_true",
        help="Test connectivity to Binance Testnet",
    )
    util_group.add_argument(
        "--balance",
        action="store_true",
        help="Show USDT account balance",
    )
    util_group.add_argument(
        "--list-open",
        dest="list_open",
        action="store_true",
        help="List open orders (requires --symbol)",
    )

    return parser


# ── Output helpers ─────────────────────────────────────────────────────────────
def print_banner():
    print(f"\n{CYAN}{BOLD}{'═' * 56}{RESET}")
    print(f"{CYAN}{BOLD}  ⚡ NeonTrader — Binance Futures Testnet{RESET}")
    print(f"{DIM}  https://testnet.binancefuture.com{RESET}")
    print(f"{CYAN}{BOLD}{'═' * 56}{RESET}\n")


def print_order_summary(args: argparse.Namespace):
    print(f"\n{BOLD}{'─' * 52}{RESET}")
    print(f"{CYAN}{BOLD}  📋 ORDER REQUEST SUMMARY{RESET}")
    print(f"{BOLD}{'─' * 52}{RESET}")
    print(f"  {DIM}symbol    {RESET}: {BOLD}{args.symbol.upper()}{RESET}")
    print(f"  {DIM}side      {RESET}: {GREEN if args.side == 'BUY' else RED}{BOLD}{args.side}{RESET}")
    print(f"  {DIM}type      {RESET}: {CYAN}{args.order_type}{RESET}")
    print(f"  {DIM}quantity  {RESET}: {args.quantity}")
    if args.price:
        print(f"  {DIM}price     {RESET}: {PURPLE}{args.price} USDT{RESET}")
    if args.stop_price:
        print(f"  {DIM}stopPrice {RESET}: {YELLOW}{args.stop_price} USDT{RESET}")
    if args.order_type != "MARKET":
        print(f"  {DIM}TIF       {RESET}: {args.time_in_force}")
    print(f"  {DIM}timestamp {RESET}: {datetime.utcnow().isoformat()}Z")
    print(f"{BOLD}{'─' * 52}{RESET}\n")


def print_order_response(response: dict):
    print(f"\n{GREEN}{BOLD}{'─' * 52}{RESET}")
    print(f"{GREEN}{BOLD}  ✅ ORDER PLACED SUCCESSFULLY{RESET}")
    print(f"{GREEN}{BOLD}{'─' * 52}{RESET}")
    print(f"  {DIM}orderId     {RESET}: {BOLD}{response.get('orderId')}{RESET}")
    print(f"  {DIM}status      {RESET}: {GREEN}{BOLD}{response.get('status')}{RESET}")
    print(f"  {DIM}executedQty {RESET}: {response.get('executedQty')}")
    avg = response.get('avgPrice', '0')
    if avg and float(avg) > 0:
        print(f"  {DIM}avgPrice    {RESET}: {CYAN}{avg} USDT{RESET}")
    print(f"  {DIM}side        {RESET}: {response.get('side')}")
    print(f"  {DIM}type        {RESET}: {response.get('type')}")
    if response.get('stopPrice') and float(response.get('stopPrice', 0)) > 0:
        print(f"  {DIM}stopPrice   {RESET}: {YELLOW}{response.get('stopPrice')} USDT{RESET}")
    print(f"\n  {GREEN}✅ Success! Order ID: {BOLD}{response.get('orderId')}{RESET}")
    print(f"{GREEN}{BOLD}{'─' * 52}{RESET}\n")


def print_error(msg: str):
    print(f"\n{RED}{BOLD}❌ Error: {msg}{RESET}\n")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = build_parser()
    args = parser.parse_args()

    print_banner()

    # ── Ping ─────────────────────────────────────────────────────────────
    if args.ping:
        print("Testing connectivity to Binance Futures Testnet…")
        ok = test_connectivity()
        if ok:
            print(f"{GREEN}✅ Connected successfully!{RESET}")
        else:
            print(f"{RED}❌ Connection failed. Check your network.{RESET}")
        return

    # ── Balance ───────────────────────────────────────────────────────────
    if args.balance:
        api_key, api_secret = get_credentials()
        balances = get_account_balance(api_key, api_secret)
        if balances:
            b = balances[0]
            print(f"{CYAN}💰 USDT Balance:{RESET}")
            print(f"   Wallet Balance   : {b.get('walletBalance', 'N/A')} USDT")
            print(f"   Available Balance: {b.get('availableBalance', 'N/A')} USDT")
        else:
            print("No USDT balance found.")
        return

    # ── List open orders ──────────────────────────────────────────────────
    if args.list_open:
        api_key, api_secret = get_credentials()
        symbol = args.symbol if args.symbol else None
        orders = fetch_open_orders(api_key, api_secret, symbol)
        if not orders:
            print("No open orders found.")
        else:
            print(f"\n{CYAN}{BOLD}Open Orders:{RESET}")
            for o in orders:
                print(f"  [{o.get('orderId')}] {o.get('type')} {o.get('side')} "
                      f"{o.get('origQty')} {o.get('symbol')} @ {o.get('price')} "
                      f"| status={o.get('status')}")
        return

    # ── Order placement ───────────────────────────────────────────────────
    # Ensure all required order params are present
    required = ["symbol", "side", "order_type", "quantity"]
    missing = [r for r in required if not getattr(args, r, None)]
    if missing:
        parser.print_help()
        print_error(
            f"Missing required argument(s): {', '.join('--' + m.replace('_', '-') for m in missing)}"
        )
        sys.exit(1)

    api_key, api_secret = get_credentials()
    log.info(f"Order requested: {vars(args)}")
    print_order_summary(args)

    try:
        if args.order_type == "MARKET":
            response = submit_market_order(
                api_key, api_secret,
                args.symbol, args.side, args.quantity,
            )

        elif args.order_type == "LIMIT":
            if not args.price:
                print_error("--price is required for LIMIT orders.")
                sys.exit(1)
            response = submit_limit_order(
                api_key, api_secret,
                args.symbol, args.side, args.quantity,
                args.price, args.time_in_force,
            )

        elif args.order_type == "STOP":
            if not args.price or not args.stop_price:
                print_error("Both --price (limit) and --stop-price (trigger) are required for STOP orders.")
                sys.exit(1)
            response = submit_stop_limit_order(
                api_key, api_secret,
                args.symbol, args.side, args.quantity,
                args.price, args.stop_price, args.time_in_force,
            )

        print_order_response(response)

        # Also print raw JSON for programmatic use
        if os.environ.get("NEONTRADER_JSON"):
            print(json.dumps(response, indent=2))

    except ValueError as e:
        log.error(f"Validation error: {e}")
        print_error(str(e))
        sys.exit(1)

    except Exception as e:
        log.error(f"Order failed: {e}")
        print_error(str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
