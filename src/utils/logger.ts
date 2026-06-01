/**
 * logger.ts — mirrors the Python bot's logging_config.py
 * Structured in-browser logging with downloadable log export.
 */

import type { LogEntry } from '../types/trading';

type LogLevel = LogEntry['level'];

let logStore: LogEntry[] = [];
const subscribers: Array<(logs: LogEntry[]) => void> = [];

function notify() {
  subscribers.forEach((fn) => fn([...logStore]));
}

export function subscribeToLogs(fn: (logs: LogEntry[]) => void): () => void {
  subscribers.push(fn);
  fn([...logStore]);
  return () => {
    const idx = subscribers.indexOf(fn);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

function createEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };
}

function log(level: LogLevel, message: string, data?: unknown): LogEntry {
  const entry = createEntry(level, message, data);
  logStore = [entry, ...logStore].slice(0, 500); // keep last 500
  notify();

  // Mirror to browser console
  const prefix = `[NeonTrader][${level}]`;
  if (level === 'ERROR') {
    console.error(prefix, message, data ?? '');
  } else if (level === 'WARNING') {
    console.warn(prefix, message, data ?? '');
  } else {
    console.log(prefix, message, data ?? '');
  }

  return entry;
}

export const logger = {
  info: (msg: string, data?: unknown) => log('INFO', msg, data),
  debug: (msg: string, data?: unknown) => log('DEBUG', msg, data),
  success: (msg: string, data?: unknown) => log('SUCCESS', msg, data),
  warn: (msg: string, data?: unknown) => log('WARNING', msg, data),
  error: (msg: string, data?: unknown) => log('ERROR', msg, data),
  clear: () => {
    logStore = [];
    notify();
  },
};

// ─── Export logs as downloadable .log file ────────────────────────────────────
export function downloadLogs(filename = 'neontrader.log'): void {
  const content = [...logStore]
    .reverse()
    .map((e) => {
      const dataStr = e.data ? `\n  DATA: ${JSON.stringify(e.data, null, 2)}` : '';
      return `[${e.timestamp}] [${e.level.padEnd(7)}] ${e.message}${dataStr}`;
    })
    .join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getLogs(): LogEntry[] {
  return [...logStore];
}
