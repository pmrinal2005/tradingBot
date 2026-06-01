export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP';
export type OrderStatus =
  | 'NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'REJECTED'
  | 'EXPIRED';

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface OrderResponse {
  orderId: number;
  symbol: string;
  status: OrderStatus;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  type: OrderType;
  side: OrderSide;
  stopPrice?: string;
  timeInForce?: string;
  updateTime: number;
  cumQuote?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'SUCCESS' | 'WARNING' | 'DEBUG';
  message: string;
  data?: unknown;
}

export interface OrderHistoryItem extends OrderResponse {
  submittedAt: string;
  requestSummary: OrderRequest;
}

export interface AccountBalance {
  asset: string;
  balance: string;
  availableBalance: string;
}
