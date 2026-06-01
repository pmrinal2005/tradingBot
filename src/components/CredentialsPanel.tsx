import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { testConnectivity, getServerTime } from '../utils/binanceClient';
import { logger } from '../utils/logger';

interface CredentialsPanelProps {
  apiKey: string;
  apiSecret: string;
  onUpdate: (key: string, secret: string) => void;
}

export default function CredentialsPanel({ apiKey, apiSecret, onUpdate }: CredentialsPanelProps) {
  const [localKey, setLocalKey] = useState(apiKey);
  const [localSecret, setLocalSecret] = useState(apiSecret);
  const [showSecret, setShowSecret] = useState(false);
  const [connStatus, setConnStatus] = useState<'idle' | 'ok' | 'error' | 'testing'>('idle');
  const [serverTime, setServerTime] = useState<string | null>(null);

  async function handleTest() {
    setConnStatus('testing');
    logger.info('Testing connection to Binance Futures Testnet…');
    try {
      const ok = await testConnectivity();
      if (ok) {
        const ts = await getServerTime();
        setServerTime(new Date(ts).toUTCString());
        setConnStatus('ok');
        logger.success('✅ Connected to Binance Futures Testnet!', { serverTime: ts });
      } else {
        setConnStatus('error');
        logger.error('❌ Connectivity check failed. Check your network.');
      }
    } catch (e) {
      setConnStatus('error');
      logger.error('Network error during connectivity test', e);
    }
  }

  function handleSave() {
    onUpdate(localKey.trim(), localSecret.trim());
    logger.info('API credentials updated (stored in memory only — never sent to any server).');
  }

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-gray-900/80 backdrop-blur-sm p-5 shadow-lg shadow-cyan-500/10">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
          <KeyRound className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-cyan-300 uppercase tracking-widest">
            API Credentials
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Binance Futures Testnet — stored in memory only</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {connStatus === 'ok' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Wifi className="w-3.5 h-3.5" /> Connected
            </span>
          )}
          {connStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <WifiOff className="w-3.5 h-3.5" /> Failed
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1 font-mono uppercase tracking-wider">
            API Key
          </label>
          <input
            type="text"
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            placeholder="Paste your testnet API key…"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1 font-mono uppercase tracking-wider">
            API Secret
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={localSecret}
              onChange={(e) => setLocalSecret(e.target.value)}
              placeholder="Paste your testnet API secret…"
              className="w-full px-3 py-2 pr-10 rounded-lg bg-gray-800 border border-gray-700 text-sm font-mono text-purple-300 placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
            />
            <button
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {serverTime && connStatus === 'ok' && (
          <p className="text-xs text-emerald-400/70 font-mono">
            ⏱ Server time: {serverTime}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-cyan-500/20"
          >
            Save Credentials
          </button>
          <button
            onClick={handleTest}
            disabled={connStatus === 'testing'}
            className="flex-1 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {connStatus === 'testing' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing…
              </>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
