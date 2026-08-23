import { HighFrequencyConfluenceResult } from '../types/hftConfluenceTypes';

// Simple event bus for AI Signals
type SignalListener = (signal: HighFrequencyConfluenceResult) => void;

class SignalBus {
  private listeners: SignalListener[] = [];
  private latestSignals: Record<string, HighFrequencyConfluenceResult> = {};

  subscribe(listener: SignalListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(signal: HighFrequencyConfluenceResult) {
    this.latestSignals[signal.symbol] = signal;
    this.listeners.forEach(l => l(signal));
  }

  getLatestSignals() {
    return this.latestSignals;
  }
}

export const tradingSignalBus = new SignalBus();
