import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  Loader2
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AICryptoChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCoin?: string;
  selectedSource?: string;
}

export const AICryptoChatDrawer: React.FC<AICryptoChatDrawerProps> = ({
  isOpen,
  onClose,
  selectedCoin,
  selectedSource,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: 'Olá! Sou seu assistente de sentimento de fóruns de criptomoedas. Como posso ajudar a analisar o comportamento dos traders na Binance Square, eToro ou Reddit hoje?',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMsg, setInputMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const msg = textToSend || inputMsg;
    if (!msg.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: msg,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputMsg('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/forum-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          activeCoin: selectedCoin,
          activeSource: selectedSource,
        }),
      });

      let data: any;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error('O servidor está sobrecarregado (Limite de requisições excedido). Tente novamente em alguns segundos.');
      }
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha na resposta da IA.');
      }

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Desculpe, ocorreu um erro ao consultar o assistente de fóruns. Tente novamente.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'O que o fórum da Binance diz sobre Solana hoje?',
    'Existe pânico ou FUD sobre Bitcoin nos fóruns?',
    'Quais criptos têm maior sinal de alta de 24h?',
    'Como está a moral dos traders no Reddit em relação ao Ethereum?',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-[#0a0a0b] border-l border-slate-800/80 shadow-2xl flex flex-col animate-slideLeft">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0a0a0b]">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-serif italic text-white">
              Assistente de Sentimento IA
            </h3>
            <p className="text-[10px] font-mono text-slate-400">
              Pergunte sobre qualquer fórum de corretora
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Quick Prompt Chips */}
      <div className="p-3 bg-[#12141a] border-b border-slate-800 flex gap-2 overflow-x-auto scrollbar-none font-mono text-xs">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="text-[10px] bg-[#0a0a0b] hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1 rounded border border-slate-800 whitespace-nowrap transition-colors shrink-0 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] p-3 rounded-xl text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white font-mono rounded-tr-none'
                  : 'bg-[#12141a] text-slate-100 border border-slate-800 rounded-tl-none font-sans'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 bg-[#12141a] p-2.5 rounded-xl border border-slate-800 w-fit animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Pesquisando sentimentos nos fóruns...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-[#12141a]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Digite sua dúvida sobre fóruns cripto..."
            className="flex-1 bg-[#0a0a0b] text-slate-100 text-xs font-mono rounded-xl px-3.5 py-2.5 border border-slate-800 focus:border-indigo-500 outline-none placeholder:text-slate-600"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMsg.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 transition-colors shadow-md cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
};

