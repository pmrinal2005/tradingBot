/**
 * validators.ts — mirrors the Python bot's validators.py
 * Input validation for all order parameters.
 */

import type { OrderRequest } from '../types/trading';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const SUPPORTED_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT',
  'DOGEUSDT', 'XRPUSDT', 'AVAXUSDT', 'LINKUSDT', 'LTCUSDT',
];

export function validateSymbol(symbol: string): string[] {
  const errors: string[] = [];
  if (!symbol || symbol.trim() === '') {
    errors.push('Symbol is required.');
    return errors;
  }
  const upper = symbol.toUpperCase().trim();
  if (!upper.endsWith('USDT')) {
    errors.push('Symbol must end with USDT (e.g., BTCUSDT).');
  }
  if (upper.length < 6) {
    errors.push('Symbol is too short.');
  }
  return errors;
}

export function validateQuantity(quantity: string): string[] {
  const errors: string[] = [];
  if (!quantity || quantity.trim() === '') {
    errors.push('Quantity is required.');
    return errors;
  }
  const num = parseFloat(quantity);
  if (isNaN(num)) {
    errors.push('Quantity must be a valid number.');
  } else if (num <= 0) {
    errors.push('Quantity must be greater than 0.');
  } else if (num > 1000) {
    errors.push('Quantity exceeds maximum allowed (1000).');
  }
  return errors;
}

export function validatePrice(price: string, fieldName = 'Price'): string[] {
  const errors: string[] = [];
  if (!price || price.trim() === '') {
    errors.push(`${fieldName} is required for this order type.`);
    return errors;
  }
  const num = parseFloat(price);
  if (isNaN(num)) {
    errors.push(`${fieldName} must be a valid number.`);
  } else if (num <= 0) {
    errors.push(`${fieldName} must be greater than 0.`);
  }
  return errors;
}

export function validateOrder(req: OrderRequest): ValidationResult {
  const errors: string[] = [
    ...validateSymbol(req.symbol),
    ...validateQuantity(req.quantity),
  ];

  if (req.type === 'LIMIT') {
    if (!req.price) {
      errors.push('Price is required for LIMIT orders.');
    } else {
      errors.push(...validatePrice(req.price, 'Limit Price'));
    }
  }

  if (req.type === 'STOP') {
    if (!req.price) {
      errors.push('Limit price is required for STOP (Stop-Limit) orders.');
    } else {
      errors.push(...validatePrice(req.price, 'Limit Price'));
    }
    if (!req.stopPrice) {
      errors.push('Stop/trigger price is required for STOP orders.');
    } else {
      errors.push(...validatePrice(req.stopPrice, 'Stop Price'));
      if (req.price && !isNaN(parseFloat(req.price)) && !isNaN(parseFloat(req.stopPrice))) {
        if (req.side === 'SELL' && parseFloat(req.price) >= parseFloat(req.stopPrice)) {
          errors.push(
            'For SELL Stop-Limit: Limit price must be BELOW the stop/trigger price.'
          );
        }
        if (req.side === 'BUY' && parseFloat(req.price) <= parseFloat(req.stopPrice)) {
          errors.push(
            'For BUY Stop-Limit: Limit price must be ABOVE the stop/trigger price.'
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export { SUPPORTED_SYMBOLS };
