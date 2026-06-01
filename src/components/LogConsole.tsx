import { useEffect, useState, useRef } from 'react';
import { Terminal, Trash2, Download, ChevronDown } from 'lucide-react';
import { subscribeToLogs, downloadLogs, logger } from '../utils/logger';
import type { LogEntry } from '../types/trading';

const LEVEL_STYLES: Record<LogEntry['level'], string> = {
  INFO: 'text-cyan-400',
  SUCCESS: 'text-emerald-400',
  ERROR: 'text-red-400',
  WARNING: 'text-yellow-400',
  DEBUG: 'text-gray-500',
};

const LEVEL_BADGE: Record<LogEntry['level'], string> = {
  INFO: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  SUCCESS: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  ERROR: 'bg-red-500/15 text-red-400 border-red-500/30',
  WARNING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  DEBUG: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

export default function LogConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogEntry['level'] | 'ALL'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToLogs(setLogs);
    return unsub;
  }, []);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filtered = filter === 'ALL' ? logs : logs.filter((l) => l.level === filter);

  function handleScroll() {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  }

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-950/90 backdrop-blur-sm flex flex-col shadow-lg" style={{ height: 360 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
        </div>
        <Terminal className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono font-semibold text-cyan-300 uppercase tracking-wider">
          System Log
        </span>
        <span className="ml-2 text-[10px] text-gray-600 font-mono">{logs.length} entries</span>

        {/* Filter pills */}
        <div className="flex gap-1 ml-auto">
          {(['ALL', 'INFO', 'SUCCESS', 'ERROR', 'WARNING', 'DEBUG'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-all ${
                filter === lvl
                  ? lvl === 'ALL'
                    ? 'bg-white/10 text-white border-white/20'
                    : LEVEL_BADGE[lvl as LogEntry['level']]
                  : 'text-gray-600 border-gray-700/50 hover:text-gray-400'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 ml-3">
          <button
            onClick={() => downloadLogs()}
            title="Download log file"
            className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => logger.clear()}
            title="Clear logs"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 font-mono text-xs"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}
      >
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-700">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No log entries yet.</p>
          </div>
        ) : (
          [...filtered].reverse().map((entry) => (
            <div key={entry.id} className="flex gap-3 items-start group hover:bg-gray-800/30 rounded px-1 py-0.5 transition-colors">
              <span className="text-gray-700 shrink-0 pt-0.5 text-[10px]">
                {entry.timestamp.split('T')[1].split('.')[0]}
              </span>
              <span
                className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${LEVEL_BADGE[entry.level]}`}
              >
                {entry.level}
              </span>
              <span className={`${LEVEL_STYLES[entry.level]} flex-1 leading-relaxed`}>
                {entry.message}
              </span>
              {entry.data !== undefined && (
                <span className="text-gray-700 text-[10px] max-w-[120px] truncate">
                  {JSON.stringify(entry.data).slice(0, 80)}
                </span>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-16 right-6 bg-gray-800 border border-gray-600 rounded-full p-1.5 text-gray-400 hover:text-white transition-colors shadow-lg"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
