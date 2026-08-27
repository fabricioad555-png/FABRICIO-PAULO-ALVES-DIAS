import { relatarErro } from '../services/relatorErrosService';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    relatarErro(
      `Componente quebrou: ${this.props.fallbackTitle || 'sem nome'}`,
      (error as any)?.stack || String(error),
      { componente: this.props.fallbackTitle }
    );
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-xl bg-[#12161f] border border-rose-900/60 shadow-xl text-slate-200 my-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-700/60 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {this.props.fallbackTitle || 'Instabilidade no Módulo'}
              </h3>
              <p className="text-xs text-slate-400">
                Ocorreu uma falha temporária de renderização neste painel.
              </p>
            </div>
          </div>
          {this.state.error?.message && (
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-rose-300 mb-4 overflow-x-auto">
              {this.state.error.message}
            </div>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recarregar Painel</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
