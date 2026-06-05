# ⚡ NeonTrader — The Binance Futures Testnet Bot

A clean, production-quality Python trading bot for **Binance USDT-M Futures Testnet** with a stunning dark neon UI dashboard.

- **Base URL**: `https://testnet.binancefuture.com`
- **Market**: USDT-M Perpetual Futures
- **Authentication**: HMAC-SHA256 signed REST API (no third-party SDK required)
- **Logging**: Rotating file handler (5 MB, 3 backups) + console output

---

## 📂 Project Structure

```
trading_bot/
  bot/
    __init__.py          # Package init
    client.py            # Binance REST client (HMAC-SHA256 signing)
    orders.py            # Order orchestration (validate → log → execute)
    validators.py        # Input validation for all order parameters
    logging_config.py    # Structured logging — file rotation + console
  cli.py                 # CLI entry point (argparse)
  logs/
    trading_bot.log      # All API requests, responses & errors
  README.md
  requirements.txt
```

---

## 🚀 Setup Steps

### 1. Register on Binance Futures Testnet

Go to → **https://testnet.binancefuture.com**  
Click **"Login"** → Use GitHub/Google to sign in  
Navigate to **API Management** → Generate a new API Key + Secret

> ⚠️ **Important**: Use `https://testnet.binancefuture.com` for API keys, NOT `testnet.binance.vision` (that's for Spot, not Futures).

### 2. Clone / download the project

```bash
git clone https://github.com/your-repo/neontrader.git
cd neontrader/trading_bot
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set API credentials

**Option A — Environment variables:**
```bash
export BINANCE_API_KEY="your_testnet_api_key_here"
export BINANCE_API_SECRET="your_testnet_api_secret_here"
```

**Option B — .env file (recommended):**
```bash
# Create .env file in trading_bot/ directory
echo "BINANCE_API_KEY=your_testnet_api_key_here" > .env
echo "BINANCE_API_SECRET=your_testnet_api_secret_here" >> .env
```

---

## 📋 How to Run — CLI Examples

### Test connectivity
```bash
python cli.py --ping
```

### Check USDT balance
```bash
python cli.py --balance
```

### Place a MARKET order
```bash
# Buy 0.001 BTC immediately at best market price
python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.001

# Sell 0.01 ETH immediately
python cli.py --symbol ETHUSDT --side SELL --type MARKET --quantity 0.01
```

### Place a LIMIT order
```bash
# Sell 0.01 ETH when price reaches $3,200
python cli.py --symbol ETHUSDT --side SELL --type LIMIT --quantity 0.01 --price 3200

# Buy 0.001 BTC if price drops to $90,000
python cli.py --symbol BTCUSDT --side BUY --type LIMIT --quantity 0.001 --price 90000
```

### Place a STOP-LIMIT order (3rd order type)
```bash
# SELL Stop-Limit:
# Trigger when BTC hits $60,000, then sell at $59,950
# (stop > limit for SELL)
python cli.py --symbol BTCUSDT --side SELL --type STOP \
              --quantity 0.001 --price 59950 --stop-price 60000

# BUY Stop-Limit:
# Trigger when BTC rises to $96,000, then buy at $96,050
# (stop < limit for BUY)
python cli.py --symbol BTCUSDT --side BUY --type STOP \
              --quantity 0.001 --price 96050 --stop-price 96000
```

### List open orders
```bash
python cli.py --symbol BTCUSDT --list-open
```

### Show help
```bash
python cli.py --help
```

---

## 🔐 How HMAC Signing Actually Works

Every private API request requires a cryptographic signature:

```python
import hmac, hashlib, time

timestamp = int(time.time() * 1000)
query_string = f"symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.001&timestamp={timestamp}"

# Sign the query string with your secret key
signature = hmac.new(
    api_secret.encode('utf-8'),
    query_string.encode('utf-8'),
    hashlib.sha256
).hexdigest()

# Append signature and send with API key header
url = f"{BASE_URL}/fapi/v1/order?{query_string}&signature={signature}"
headers = {"X-MBX-APIKEY": api_key}
response = requests.post(url, headers=headers)
```

---

## 📊 Order Types Explained

| Type | Binance `type` param | Description |
|------|---------------------|-------------|
| Market | `MARKET` | Executes immediately at best available price |
| Limit | `LIMIT` | Placed in order book; executes at your price or better |
| Stop-Limit | `STOP` | Dormant until `stopPrice` triggers; then becomes a limit order |

### Stop-Limit Price Rules

```
SELL Stop-Limit:  stopPrice > price (limit)
  → Example: stopPrice=60000, price=59950
  → "Sell if BTC drops to $60K, but no worse than $59,950"

BUY Stop-Limit:   stopPrice < price (limit)
  → Example: stopPrice=60000, price=60050
  → "Buy if BTC rises to $60K, but no worse than $60,050"
```

---

## 📄 Log File Format

Logs are written to `logs/trading_bot.log`:

```
[2025-01-15T09:23:45] [INFO   ] trading_bot — 📤 Placing order → MARKET BUY 0.001 BTCUSDT
[2025-01-15T09:23:45] [DEBUG  ] trading_bot — → POST /fapi/v1/order | body=symbol=BTCUSDT&...&signature=***
[2025-01-15T09:23:46] [DEBUG  ] trading_bot — ← POST /fapi/v1/order | status=200
[2025-01-15T09:23:46] [INFO   ] trading_bot — 📥 Order response — orderId=4091342857 status=FILLED executedQty=0.001 avgPrice=94832.50
[2025-01-15T09:23:46] [INFO   ] trading_bot — ✅ Order placed successfully!
```

**Log rotation**: Files rotate at 5 MB, keeping 3 backups (`trading_bot.log.1`, `.2`, `.3`)

---

## ⚠️ Assumptions

1. **Testnet only** — Base URL is `https://testnet.binancefuture.com`
2. **USDT-M Perpetual Futures** — Uses `/fapi/` endpoints, not `/dapi/` (COIN-M)
3. **`STOP` type = Stop-Limit** — Binance Futures uses `type=STOP` for stop-limit orders
4. **SELL Stop-Limit**: `stopPrice > price` (trigger above limit)
5. **BUY Stop-Limit**: `stopPrice < price` (trigger below limit)
6. Credentials stored in env vars — **never hardcoded**
7. Log signatures are masked (`***`) in log output for security
8. `python-dotenv` is optional; you can use `export` instead

---

## 🏗️ Architecture

```
CLI (cli.py)
    │
    ▼
orders.py          ← validate + orchestrate
    │
    ├── validators.py   ← type/range/relationship checks
    └── client.py       ← HMAC signing + HTTP + error handling
            │
            └── logging_config.py  ← rotating file + console logs
```

---

## 🌐 Web UI Dashboard

The project also includes a **dark neon React dashboard** (`src/`) with:
- Live price chart (recharts)
- Order form (Market / Limit / Stop-Limit)
- Real-time log console
- Live market ticker (5 symbols)
- Python source code viewer
- Sample log file viewer

Run the web UI:
```bash
npm install && npm run dev
```
