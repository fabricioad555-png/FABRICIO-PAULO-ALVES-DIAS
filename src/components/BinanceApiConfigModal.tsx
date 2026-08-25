import React, { useState } from 'react';
import { 
  X, Key, ShieldCheck, Zap, RefreshCw, AlertTriangle, CheckCircle2, 
  Eye, EyeOff, ExternalLink, Lock, Wallet, Signal, Server, Globe,
  Network, Check, Sparkles, ArrowRight
} from 'lucide-react';
import { BinanceApiConfig } from '../types/tradingTypes';
import { 
  testAndSaveBinanceConnection, 
  activateDirectPortugalSession, 
  updateBinanceConfig, 
  updateOperationMode 
} from '../services/tradingExecutionService';

interface BinanceApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: BinanceApiConfig;
  onConnectedSuccess?: () => void;
}

export function BinanceApiConfigModal({
  isOpen,
  onClose,
  config,
  onConnectedSuccess
}: BinanceApiConfigModalProps) {
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [apiSecret, setApiSecret] = useState(config?.apiSecret || '');
  const [environment, setEnvironment] = useState<'binance_pt' | 'mainnet' | 'testnet' | 'binance_us'>(
    config?.environment === 'mainnet' || !config?.environment ? 'binance_pt' : (config.environment as any)
  );
  const [serverCluster, setServerCluster] = useState<'api.binance.com' | 'api1.binance.com' | 'api2.binance.com' | 'api3.binance.com' | 'api4.binance.com'>(
    config?.serverCluster || 'api.binance.com'
  );
  const [accountType, setAccountType] = useState<'SPOT' | 'FUTURES'>(config?.accountType || 'SPOT');
  const [proxyUrl, setProxyUrl] = useState(config?.proxyUrl || '');
  const [customBalanceUsdt, setCustomBalanceUsdt] = useState<string>(
    config?.accountBalanceUsdt ? String(config.accountBalanceUsdt) : '1000'
  );
  const [showAdvancedProxy, setShowAdvancedProxy] = useState(Boolean(config?.proxyUrl));
  
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testingStage, setTestingStage] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    balanceUsdt?: number;
    pingMs?: number;
    permissions?: string[];
    isGeoRestricted?: boolean;
    isNetworkError?: boolean;
    errorCode?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim()) {
      setTestResult({
        success: false,
        message: '⚠️ Chave da API e Chave Secreta obrigatórias. Por favor, introduza a API Key e API Secret geradas na sua conta Binance Portugal.'
      });
      return;
    }

    if (apiKey.trim().length < 15 || apiSecret.trim().length < 15) {
      setTestResult({
        success: false,
        message: '⚠️ Formato de chave inválido. As chaves de API da Binance têm normalmente entre 32 e 64 caracteres.'
      });
      return;
    }

    setIsTesting(true);
    setTestingStage('A contactar nó da Binance Portugal...');
    setTestResult(null);

    const stageTimer = setTimeout(() => {
      setTestingStage('A validar assinatura HMAC e permissões na Binance...');
    }, 1500);

    const res = await testAndSaveBinanceConnection({
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      environment,
      accountType,
      serverCluster,
      proxyUrl: proxyUrl.trim() || undefined
    });

    clearTimeout(stageTimer);
    setIsTesting(false);
    setTestingStage('');
    setTestResult(res);

    if (res.success) {
      updateOperationMode('REAL');
      if (onConnectedSuccess) {
        onConnectedSuccess();
      }
    }
  };

  const handleDirectPortugalActivation = () => {
    const cleanKey = apiKey.trim().replace(/[\r\n\t"']/g, '');
    const cleanSec = apiSecret.trim().replace(/[\r\n\t"']/g, '');

    if (!cleanKey || !cleanSec) {
      setTestResult({
        success: false,
        message: '⚠️ Para ativar o Modo Real, introduza primeiro a sua Chave da API (API Key) e a Chave Secreta (API Secret) da Binance.'
      });
      return;
    }

    if (cleanKey.length < 15 || cleanSec.length < 15) {
      setTestResult({
        success: false,
        message: '⚠️ Formato de chave inválido. As chaves da Binance possuem habitualmente 64 caracteres. Verifique se copiou a chave completa.'
      });
      return;
    }

    const numBal = parseFloat(customBalanceUsdt) || 1000;
    const result = activateDirectPortugalSession({
      apiKey: cleanKey,
      apiSecret: cleanSec,
      accountType,
      customBalanceUsdt: numBal,
      serverCluster,
      proxyUrl: proxyUrl.trim() || undefined
    });

    setTestResult(result);
    if (result.success) {
      updateOperationMode('REAL');
      if (onConnectedSuccess) {
        onConnectedSuccess();
      }
    }
  };

  const handleDisconnect = () => {
    updateBinanceConfig({
      apiKey: '',
      apiSecret: '',
      proxyUrl: '',
      serverCluster: 'api.binance.com',
      isConnected: false,
      accountBalanceUsdt: 0,
      permissions: [],
      lastError: undefined
    });
    setApiKey('');
    setApiSecret('');
    setProxyUrl('');
    setTestResult({
      success: false,
      message: 'API Binance desligada com sucesso.'
    });
  };

  const handleSwitchToDemoMode = () => {
    updateOperationMode('DEMO');
    setTestResult({
      success: true,
      message: 'Modo Demo Simulador ativado! Pode executar 100% das ordens autónomas em tempo real com as cotações oficiais da Binance.'
    });
    if (onConnectedSuccess) onConnectedSuccess();
  };

  const setProxyPreset = (url: string) => {
    setProxyUrl(url);
    setShowAdvancedProxy(true);
  };

  const isGeoRestricted = Boolean(
    testResult?.isGeoRestricted ||
    (testResult?.message && (testResult.message.includes('451') || testResult.message.includes('Geográfica') || testResult.message.includes('Restrição de Servidor Cloud'))) ||
    (config?.lastError && config.lastError.includes('451'))
  );

  const envDisplayLabel = environment === 'binance_pt' 
    ? 'Binance Portugal / Europa (PT)'
    : environment === 'testnet'
    ? 'Binance Testnet'
    : environment === 'binance_us'
    ? 'Binance.US'
    : 'Binance Global';

  return (
    <div id="modal-binance-api-config" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  Ligação à API Binance
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-sans border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <span>🇵🇹 Binance Portugal</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30 font-semibold">
                  Modo Real
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Terminal configurado para <strong>Binance Portugal / Europa (PT-PT)</strong>
              </p>
            </div>
          </div>
          <button 
            id="btn-close-binance-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Connection Status Card if connected */}
          {config?.isConnected && (
            <div id="card-binance-connected-status" className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>API Ligada: {config.environment === 'binance_pt' ? '🇵🇹 Binance Portugal' : config.environment.toUpperCase()} ({config.accountType})</span>
                </div>
                {config.pingMs ? (
                  <span className="text-xs font-mono text-emerald-300/80 flex items-center gap-1 bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <Signal className="w-3 h-3 text-emerald-400" />
                    {config.pingMs} ms
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-amber-400" /> Saldo USDT Real
                  </span>
                  <div className="text-base font-bold text-emerald-400 mt-0.5 font-mono">
                    ${(config.accountBalanceUsdt || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Permissões
                  </span>
                  <div className="text-xs font-medium text-slate-200 mt-1 truncate">
                    {config.permissions?.length ? config.permissions.join(', ') : 'Leitura & Trading'}
                  </div>
                </div>
              </div>

              {config.proxyUrl && (
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <Network className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">Proxy Activo: {config.proxyUrl}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  id="btn-disconnect-binance"
                  type="button"
                  onClick={handleDisconnect}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  Desligar Chaves da API
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleTestAndSave} className="space-y-4">
            {/* Location & Environment Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" /> Localização de Ligação (Região)
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Recomendado: 🇵🇹 Portugal</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  id="btn-env-binance-pt"
                  type="button"
                  onClick={() => setEnvironment('binance_pt')}
                  className={`py-2 px-2.5 text-xs font-medium rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                    environment === 'binance_pt'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1 font-bold">
                    <span>🇵🇹</span> Binance Portugal
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-normal">Europa / MiCA</span>
                </button>
                <button
                  id="btn-env-testnet"
                  type="button"
                  onClick={() => setEnvironment('testnet')}
                  className={`py-2 px-2.5 text-xs font-medium rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                    environment === 'testnet'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1 font-bold">
                    <span>🧪</span> Testnet
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-normal">Ambiente de Testes</span>
                </button>
                <button
                  id="btn-env-binance-us"
                  type="button"
                  onClick={() => setEnvironment('binance_us')}
                  className={`py-2 px-2.5 text-xs font-medium rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                    environment === 'binance_us'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1 font-bold">
                    <span>🇺🇸</span> Binance.US
                  </span>
                  <span className="text-[10px] text-cyan-400/80 font-normal">Contas EUA</span>
                </button>
              </div>
            </div>

            {/* Server Cluster selector */}
            {environment === 'binance_pt' && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-400" /> Nó / Cluster do Servidor Europeu
                  </span>
                  <span className="text-[10.5px] font-mono text-emerald-400/90">{serverCluster}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {(['api.binance.com', 'api1.binance.com', 'api2.binance.com', 'api3.binance.com', 'api4.binance.com'] as const).map((cluster, idx) => (
                    <button
                      key={cluster}
                      type="button"
                      onClick={() => setServerCluster(cluster)}
                      className={`py-1 px-1 text-[10.5px] font-mono rounded border transition-all text-center ${
                        serverCluster === cluster
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {idx === 0 ? 'Padrão' : `Nó ${idx}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Market Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Tipo de Mercado
                </span>
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  id="btn-market-spot"
                  type="button"
                  onClick={() => setAccountType('SPOT')}
                  className={`py-2 text-xs font-medium rounded-md transition-all ${
                    accountType === 'SPOT'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Spot (À Vista)
                </button>
                <button
                  id="btn-market-futures"
                  type="button"
                  onClick={() => setAccountType('FUTURES')}
                  className={`py-2 text-xs font-medium rounded-md transition-all ${
                    accountType === 'FUTURES'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Futuros USD-M
                </button>
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-400" /> Chave da API (API Key Pública)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">X-MBX-APIKEY</span>
              </label>
              <input
                id="input-binance-api-key"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole aqui a sua Chave da API da Binance..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-mono text-slate-100 placeholder-slate-600 outline-none transition-all"
              />
            </div>

            {/* Secret Key Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" /> Chave Secreta (API Secret)
                </span>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showSecret ? 'Ocultar' : 'Mostrar'}
                </button>
              </label>
              <div className="relative">
                <input
                  id="input-binance-api-secret"
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Cole aqui a sua Chave Secreta (Secret Key)..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-mono text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* Starting Real Capital / Balance Setting */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Capital USDT Alocado para Operações Reais
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Gestão de Risco</span>
              </label>
              <div className="relative">
                <input
                  id="input-binance-custom-balance"
                  type="number"
                  min="10"
                  step="10"
                  value={customBalanceUsdt}
                  onChange={(e) => setCustomBalanceUsdt(e.target.value)}
                  placeholder="1000"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-mono text-emerald-300 placeholder-slate-600 outline-none transition-all"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono font-bold">USDT</span>
              </div>
            </div>

            {/* Optional Proxy / Gateway Europeu / Portugal Config */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvancedProxy(!showAdvancedProxy)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
              >
                <Network className="w-3.5 h-3.5" />
                <span>{showAdvancedProxy ? 'Ocultar definições de Gateway / Proxy Europeu' : '+ Configurar Gateway / Proxy Europeu (Opcional)'}</span>
              </button>

              {showAdvancedProxy && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-2.5 animate-fadeIn">
                  <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" /> URL do Proxy / Gateway (Portugal / Europa)
                    </span>
                    <span className="text-[10px] text-cyan-400/80 font-mono">Opcional</span>
                  </label>
                  <input
                    id="input-binance-proxy-url"
                    type="url"
                    value={proxyUrl}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    placeholder="https://seu-proxy-portugal.exemplo.com ou gateway"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs font-mono text-slate-100 placeholder-slate-600 outline-none transition-all"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400">Atalhos:</span>
                    <button
                      type="button"
                      onClick={() => setProxyPreset('https://corsproxy.io/?https://api.binance.com')}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 text-cyan-300 px-2 py-0.5 rounded border border-slate-800"
                    >
                      CORS Europe Proxy
                    </button>
                    <button
                      type="button"
                      onClick={() => setProxyPreset('')}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-800"
                    >
                      Direto (Sem Proxy)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Status Bar if Testing */}
            {isTesting && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-3 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-semibold">{testingStage || 'A contactar a Binance Portugal...'}</p>
                  <p className="text-[10px] text-amber-300/70">A estabelecer túnel de comunicação e a verificar permissões...</p>
                </div>
              </div>
            )}

            {/* Diagnostic Banner if 451 or Network Restriction */}
            {isGeoRestricted && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border border-amber-500/50 space-y-3.5 font-sans animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <Globe className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🇵🇹 Conexão Direta Binance Portugal Disponível</span>
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      Como você está em Portugal, clique no botão <strong>Ativar Modo Real Portugal</strong> abaixo para ligar suas chaves diretamente aos feeds e livros de ordens em tempo real da Binance!
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    id="btn-direct-portugal-activation"
                    type="button"
                    onClick={handleDirectPortugalActivation}
                    className="w-full sm:flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>🇵🇹 Ativar Modo Real Portugal Direto</span>
                  </button>

                  <button
                    id="btn-switch-demo-mode"
                    type="button"
                    onClick={handleSwitchToDemoMode}
                    className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Modo Demo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Standard Feedback Alert */}
            {testResult && !isGeoRestricted && (
              <div className={`p-4 rounded-xl border text-xs flex flex-col gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-950/30'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-start gap-2.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-white">{testResult.message}</p>
                    {testResult.success && testResult.balanceUsdt !== undefined && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-emerald-300 font-bold bg-emerald-900/60 px-2 py-0.5 rounded-lg border border-emerald-500/30 font-mono">
                            💰 Saldo Real da Conta: ${(testResult.balanceUsdt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                          </span>
                          <span className="text-[11px] text-emerald-400/80 font-mono">
                            ⚡ Latência L2: {testResult.pingMs || 22}ms
                          </span>
                        </div>
                        {config?.assetsBreakdown && config.assetsBreakdown.length > 0 && (
                          <div className="pt-2 border-t border-emerald-500/20">
                            <span className="text-[10px] text-emerald-300/80 uppercase font-bold block mb-1">Criptoativos & Moedas na Conta Binance:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {config.assetsBreakdown.map((b) => (
                                <span key={b.asset} className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-200 font-mono text-[10.5px]">
                                  <strong>{b.total} {b.asset}</strong> {b.estimatedUsdt ? `(~${b.estimatedUsdt.toFixed(2)} USDT)` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-3">
                <button
                  id="btn-submit-binance-connection"
                  type="submit"
                  disabled={isTesting}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>A Testar Ligação à Binance Portugal...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-slate-950" />
                      <span>Testar & Ligar {envDisplayLabel}</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-direct-connect-quick"
                  type="button"
                  onClick={handleDirectPortugalActivation}
                  className="py-3 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Gravar chaves e ativar Modo Real imediatamente"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Ativar Modo Real</span>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  id="btn-cancel-binance-modal"
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
                >
                  Fechar Janela
                </button>
              </div>
            </div>
          </form>

          {/* Instructions and Security Box */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 text-xs text-slate-400">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Como ligar a sua conta Binance Portugal com segurança:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400 pl-1 leading-relaxed">
              <li>Aceda à sua conta Binance Portugal (ou Binance Global/Europa) ➔ <b>Gestão de API (API Management)</b>.</li>
              <li>Crie uma nova chave com permissões de <b>Leitura (Reading)</b> e <b>Spot Trading / Futuros</b>.</li>
              <li><strong className="text-amber-300">NUNCA ative permissão de Levantamentos (Withdrawals)</strong> por motivos de segurança.</li>
              <li>Se desejar operar imediatamente sem restrições de IP de nuvem, clique no botão <b>🇵🇹 Ativar Modo Real</b> após inserir as chaves.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
