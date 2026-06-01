/**
 * orderService.ts — mirrors the Python bot's orders.py
 * High-level order orchestration: validate → log → execute → log result
 */

import { placeOrder, getOpenOrders, getOrderHistory } from './binanceClient';
import { validateOrder } from './validators';
import { logger } from './logger';
import type { OrderHistoryItem, OrderRequest, OrderResponse } from '../types/trading';

export async function submitOrder(
  apiKey: string,
  apiSecret: string,
  req: OrderRequest
): Promise<OrderResponse> {
  // ── Step 1: Validate ──────────────────────────────────────────────────────
  logger.info('Validating order parameters…', req);
  const validation = validateOrder(req);
  if (!validation.valid) {
    const msg = `Validation failed: ${validation.errors.join('; ')}`;
    logger.error(msg, validation.errors);
    throw new Error(msg);
  }

  // ── Step 2: Log request summary ───────────────────────────────────────────
  logger.info(`📤 Submitting ${req.type} ${req.side} order`, {
    symbol: req.symbol,
    quantity: req.quantity,
    price: req.price,
    stopPrice: req.stopPrice,
  });

  // ── Step 3: Place order ───────────────────────────────────────────────────
  try {
    const response = await placeOrder(apiKey, apiSecret, req);

    // ── Step 4: Log success ─────────────────────────────────────────────────
    logger.success(`✅ Order placed successfully!`, {
      orderId: response.orderId,
      status: response.status,
      executedQty: response.executedQty,
      avgPrice: response.avgPrice,
    });

    return response;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`❌ Order placement failed: ${errMsg}`, err);
    throw err;
  }
}

export async function fetchOpenOrders(
  apiKey: string,
  apiSecret: string,
  symbol?: string
): Promise<OrderResponse[]> {
  logger.info(`Fetching open orders${symbol ? ` for ${symbol}` : ''}…`);
  try {
    const orders = await getOpenOrders(apiKey, apiSecret, symbol);
    logger.info(`Found ${orders.length} open order(s).`);
    return orders;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to fetch open orders: ${errMsg}`, err);
    throw err;
  }
}

export async function fetchOrderHistory(
  apiKey: string,
  apiSecret: string,
  symbol: string
): Promise<OrderResponse[]> {
  logger.info(`Fetching order history for ${symbol}…`);
  try {
    const orders = await getOrderHistory(apiKey, apiSecret, symbol);
    logger.info(`Retrieved ${orders.length} historical order(s).`);
    return orders;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to fetch order history: ${errMsg}`, err);
    throw err;
  }
}

export function buildHistoryItem(
  req: OrderRequest,
  res: OrderResponse
): OrderHistoryItem {
  return {
    ...res,
    submittedAt: new Date().toISOString(),
    requestSummary: req,
  };
}
