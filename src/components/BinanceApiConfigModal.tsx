import React, { useState } from 'react';
import { Key, ShieldCheck, RefreshCw, X, AlertCircle, CheckCircle2, Server, HelpCircle, Globe } from 'lucide-react';
import { BinanceApiConfig } from '../types/tradingTypes';
import { doubleCheckBinanceConnection } from '../services/binanceService';
import { getTradingAccount, saveTradingAccount } from '../services/tradingExecutionService';

interface BinanceApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: BinanceApiConfig;
  onConnectedSuccess: () => void;
}

export function BinanceApiConfigModal({ isOpen, onClose, config, onConnectedSuccess }: BinanceApiConfigModalProps) {
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [apiSecret, setApiSecret] = useState(config?.apiSecret || '');
  const [environment, setEnvironment] = useState<'production' | 'testnet' | 'sandbox_local'>(config?.environment || 'production');
  const [accountType, setAccountType] = useState<'SPOT' | 'FUTURES'>(config?.accountType || 'FUTURES');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    check1?: boolean;
    check2?: boolean;
    futuresBalance?: number;
    spotBalance?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setTestResult({
        success: false,
        message: 'Por favor, preencha a API Key e o API Secret para testar.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const isTestnet = environment === 'testnet';
      const result = await doubleCheckBinanceConnection(apiKey, apiSecret, isTestnet, accountType);

      if (result.success) {
        // Cada check reflete o mercado que respondeu de verdade. Marcar os dois
        // como passados quando só um respondeu esconde metade do resultado.
        setTestResult({
          success: true,
          message: result.message,
          check1: Boolean(result.permissions?.includes('SPOT')),
          check2: Boolean(result.permissions?.includes('FUTURES')),
          futuresBalance: result.futuresBalance,
          spotBalance: result.spotBalance
        });

        // Update local configuration on success
        const currentAccount = getTradingAccount();
        currentAccount.binanceConfig = {
          apiKey,
          apiSecret,
          environment,
          accountType,
          isConnected: true,
          isVerified: true,
          accountBalanceUsdt: accountType === 'FUTURES' ? result.futuresBalance : result.spotBalance,
          availableMarginUsdt: accountType === 'FUTURES' ? result.futuresDetails?.availableBalance : result.spotBalance,
          pingMs: result.pingMs,
          permissions: result.permissions,
          futuresDetails: result.futuresDetails
        };
        // Saldo zero é saldo zero. Com "|| 1000" uma conta vazia aparecia
        // com 1000 USDT, porque zero é falso em JavaScript.
        currentAccount.demoBalanceUsd = accountType === 'FUTURES'
          ? (result.futuresBalance ?? 0)
          : (result.spotBalance ?? 0);
        currentAccount.operationMode = 'REAL';
        currentAccount.activeBroker = 'BINANCE';

        saveTradingAccount(currentAccount);
      } else {
        setTestResult({
          success: false,
          message: result.message,
          check1: false,
          check2: false
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Ocorreu um erro inesperado durante a validação.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndActivate = () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setTestResult({ success: false, message: 'Preencha a API Key e o API Secret antes de ativar.' });
      return;
    }

    // Só ativa o Modo Real depois de a Binance ter confirmado a ligação.
    // Antes bastava ter as chaves preenchidas e o saldo caía num valor
    // fixo de 10000, o que dava a conta por ligada sem nunca a validar.
    if (!testResult?.success) {
      setTestResult({
        success: false,
        message: 'Teste a ligação primeiro. O Modo Real só é ativado com a confirmação da Binance.'
      });
      return;
    }

    const saldo = accountType === 'FUTURES' ? testResult.futuresBalance : testResult.spotBalance;

    if (saldo === undefined) {
      setTestResult({
        success: false,
        message: `A Binance não devolveu saldo de ${accountType} para esta chave. Verifique as permissões do mercado escolhido.`
      });
      return;
    }

    const currentAccount = getTradingAccount();
    currentAccount.binanceConfig = {
      apiKey,
      apiSecret,
      environment,
      accountType,
      isConnected: true,
      isVerified: true,
      accountBalanceUsdt: saldo,
      availableMarginUsdt: saldo,
      futuresDetails: accountType === 'FUTURES'
        ? {
            totalWalletBalance: saldo,
            availableBalance: saldo,
            totalMarginBalance: saldo
          }
        : undefined
    };
    currentAccount.operationMode = 'REAL';
    currentAccount.activeBroker = 'BINANCE';

    saveTradingAccount(currentAccount);
    onConnectedSuccess();
    onClose();
  };

  const handleClearConnection = () => {
    if (confirm('Deseja realmente desconectar e limpar as chaves da Binance API?')) {
      const currentAccount = getTradingAccount();
      currentAccount.binanceConfig = undefined;
      currentAccount.operationMode = 'DEMO';
      currentAccount.activeBroker = undefined;
      
      saveTradingAccount(currentAccount);
      
      setApiKey('');
      setApiSecret('');
      setTestResult(null);
      
      onConnectedSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0b0d13] border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0d1017]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30">
              <Key className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-white">Conexão API Binance</h3>
              <p className="text-slate-400 text-xs">Ligação validada na Binance antes de operar</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Como a ligação sai daqui, e o que isso exige do lado da Binance */}
        <div className="mx-6 mt-5 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex gap-3">
          <Globe className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs font-sans text-indigo-200 space-y-1.5">
            <p>
              <span className="font-extrabold text-white">Ligação pelo servidor da aplicação.</span>{' '}
              A Binance não permite chamadas assinadas a partir do navegador, por isso os pedidos
              saem do servidor, alojado na Europa.
            </p>
            <p className="text-indigo-300/90">
              Se a sua chave tiver <strong className="text-yellow-400">restrição de IP</strong>, ela vai
              ser recusada com o erro <strong>-2015</strong>, porque o IP do servidor não é o seu.
              Nesse caso, desative a restrição de IP na Binance ou use uma chave sem ela.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Binance API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ex: vmPUZE6evvXpxasU7G6m6p..."
              className="w-full bg-[#12151d] border border-slate-800 hover:border-slate-700 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          {/* API Secret */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Binance API Secret</label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Ex: s9s8f7f6f5f4f3f2f1..."
              className="w-full bg-[#12151d] border border-slate-800 hover:border-slate-700 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Environment */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Ambiente (Servidor)</label>
              <select
                value={environment}
                onChange={(e: any) => setEnvironment(e.target.value)}
                className="w-full bg-[#12151d] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-yellow-500/50"
              >
                <option value="production">Mainnet (Conta Real)</option>
                <option value="testnet">Binance Testnet (Simulado Oficial)</option>
              </select>
            </div>

            {/* Account Type */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Segmento de Operação</label>
              <select
                value={accountType}
                onChange={(e: any) => setAccountType(e.target.value)}
                className="w-full bg-[#12151d] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-yellow-500/50 font-bold text-yellow-400"
              >
                <option value="FUTURES">FUTUROS USD-M 🚀 (Recomendado)</option>
                <option value="SPOT">SPOT (À Vista)</option>
              </select>
            </div>
          </div>

          {/* Dual Check Progress Indicator */}
          {testResult && (
            <div className={`p-4 rounded-2xl border text-xs font-sans space-y-2.5 ${testResult.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200' : 'bg-rose-500/5 border-rose-500/20 text-rose-200'}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {testResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
                <span>{testResult.message}</span>
              </div>
              
              {/* Só mostrar os checks quando um teste realmente correu. Uma
                  mensagem de validação, como "preencha as chaves", não testa
                  nada, e antes marcava os dois como FALHOU sem motivo. */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px] font-mono">
                {testResult.check1 === undefined && testResult.check2 === undefined ? (
                  <div className="text-slate-400">
                    Nenhum teste executado ainda. Use <strong>Testar &amp; Duplo Check</strong>.
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span>CHECK 1: Conexão Spot Geral (Sincronização de Relógio)</span>
                      <span className={`px-2 py-0.5 rounded font-extrabold ${testResult.check1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {testResult.check1 ? 'PASSOU ✔' : 'FALHOU ✖'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>CHECK 2: Segmento Futuros USD-M &amp; Verificação de Margem</span>
                      <span className={`px-2 py-0.5 rounded font-extrabold ${testResult.check2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {testResult.check2 ? 'PASSOU ✔' : 'FALHOU ✖'}
                      </span>
                    </div>
                  </>
                )}
                {testResult.success && (
                  <div className="pt-2 flex justify-between items-center text-white border-t border-dashed border-slate-800">
                    <span>SALDO DE FUTUROS DETECTADO (USDT):</span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      ${(accountType === 'FUTURES' ? testResult.futuresBalance : testResult.spotBalance)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-[#0d1017] flex justify-between items-center gap-3">
          {config?.isConnected ? (
            <button
              type="button"
              onClick={handleClearConnection}
              className="px-4 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 font-mono text-xs font-bold transition-all"
            >
              Excluir API
            </button>
          ) : (
            <div className="w-1" />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/40 text-slate-200 text-xs font-bold font-sans flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-yellow-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />}
              <span>Testar & Duplo Check</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndActivate}
              className="px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-xs font-sans transition-all flex items-center gap-1.5"
            >
              <span>Salvar e Ativar</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
