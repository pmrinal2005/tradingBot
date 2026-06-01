/**
 * Binance Futures Testnet REST Client
 * Mirrors the Python bot's client.py — direct HMAC-SHA256 signed REST calls
 * Base URL: https://testnet.binancefuture.com
 */

import type { AccountBalance, OrderRequest, OrderResponse } from '../types/trading';

const TESTNET_BASE_URL = 'https://testnet.binancefuture.com';

// ─── HMAC-SHA256 Signing (Web Crypto API) ────────────────────────────────────
async function signQueryString(secret: string, queryString: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(queryString);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

// ─── Core HTTP helpers ────────────────────────────────────────────────────────
async function signedGet<T>(
  apiKey: string,
  apiSecret: string,
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const timestamp = Date.now();
  const allParams = { ...params, timestamp };
  const queryString = buildQueryString(allParams);
  const signature = await signQueryString(apiSecret, queryString);
  const url = `${TESTNET_BASE_URL}${path}?${queryString}&signature=${signature}`;

  const res = await fetch(url, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new BinanceAPIError(data.code ?? res.status, data.msg ?? 'Unknown error', data);
  }
  return data as T;
}

async function signedPost<T>(
  apiKey: string,
  apiSecret: string,
  path: string,
  params: Record<string, string | number | undefined>
): Promise<T> {
  const timestamp = Date.now();
  const allParams = { ...params, timestamp };
  const queryString = buildQueryString(allParams);
  const signature = await signQueryString(apiSecret, queryString);

  const res = await fetch(`${TESTNET_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `${queryString}&signature=${signature}`,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new BinanceAPIError(data.code ?? res.status, data.msg ?? 'Unknown error', data);
  }
  return data as T;
}

// ─── Custom Error ─────────────────────────────────────────────────────────────
export class BinanceAPIError extends Error {
  constructor(
    public readonly code: number | string,
    message: string,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = 'BinanceAPIError';
  }
}

// ─── Public Endpoints ─────────────────────────────────────────────────────────
export async function testConnectivity(): Promise<boolean> {
  try {
    const res = await fetch(`${TESTNET_BASE_URL}/fapi/v1/ping`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getServerTime(): Promise<number> {
  const res = await fetch(`${TESTNET_BASE_URL}/fapi/v1/time`);
  const data = await res.json();
  return data.serverTime as number;
}

export interface TickerPrice {
  symbol: string;
  price: string;
}

export async function getTickerPrice(symbol: string): Promise<TickerPrice> {
  const res = await fetch(
    `${TESTNET_BASE_URL}/fapi/v1/ticker/price?symbol=${symbol}`
  );
  if (!res.ok) throw new Error('Failed to fetch ticker');
  return res.json() as Promise<TickerPrice>;
}

export interface Kline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

export async function getKlines(symbol: string, interval = '1m', limit = 60): Promise<Kline[]> {
  const res = await fetch(
    `${TESTNET_BASE_URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
  if (!res.ok) throw new Error('Failed to fetch klines');
  const raw = (await res.json()) as unknown[][];
  return raw.map((k) => ({
    openTime: k[0] as number,
    open: k[1] as string,
    high: k[2] as string,
    low: k[3] as string,
    close: k[4] as string,
    volume: k[5] as string,
    closeTime: k[6] as number,
  }));
}

// ─── Private Endpoints ────────────────────────────────────────────────────────
export async function getAccountBalance(
  apiKey: string,
  apiSecret: string
): Promise<AccountBalance[]> {
  const data = await signedGet<{ assets: AccountBalance[] }>(
    apiKey,
    apiSecret,
    '/fapi/v2/account'
  );
  // v2/account returns assets array; filter to USDT
  if (Array.isArray(data)) {
    return (data as AccountBalance[]).filter((a) => a.asset === 'USDT');
  }
  const account = data as { assets?: AccountBalance[] };
  return (account.assets ?? []).filter((a: AccountBalance) => a.asset === 'USDT');
}

export async function placeOrder(
  apiKey: string,
  apiSecret: string,
  order: OrderRequest
): Promise<OrderResponse> {
  const params: Record<string, string | number | undefined> = {
    symbol: order.symbol.toUpperCase(),
    side: order.side,
    type: order.type,
    quantity: order.quantity,
  };

  if (order.type === 'LIMIT') {
    params.price = order.price;
    params.timeInForce = order.timeInForce ?? 'GTC';
  }

  if (order.type === 'STOP') {
    params.price = order.price;        // Limit price
    params.stopPrice = order.stopPrice; // Trigger price
    params.timeInForce = order.timeInForce ?? 'GTC';
  }

  return signedPost<OrderResponse>(apiKey, apiSecret, '/fapi/v1/order', params);
}

export async function getOpenOrders(
  apiKey: string,
  apiSecret: string,
  symbol?: string
): Promise<OrderResponse[]> {
  return signedGet<OrderResponse[]>(apiKey, apiSecret, '/fapi/v1/openOrders', {
    symbol,
  });
}

export async function getOrderHistory(
  apiKey: string,
  apiSecret: string,
  symbol: string
): Promise<OrderResponse[]> {
  return signedGet<OrderResponse[]>(apiKey, apiSecret, '/fapi/v1/allOrders', {
    symbol,
    limit: 20,
  });
}
