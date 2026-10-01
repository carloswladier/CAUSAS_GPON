import React, { useState, useEffect } from 'react';
import { Database, Server, Check, AlertCircle, X, RefreshCw, Key, ShieldCheck, HelpCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

interface DbStatus {
  connected: boolean;
  configured: boolean;
  message: string;
  config?: {
    host: string;
    port: number;
    user: string;
    database: string;
  };
}

export const HostingerConfigModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Fetch current status on open
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/status');
      const data: DbStatus = await res.json();
      setStatus(data);
      if (data.config) {
        setHost(data.config.host || '');
        setPort(String(data.config.port || '3306'));
        setUser(data.config.user || '');
        setDatabase(data.config.database || '');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao verificar status do servidor local: ' + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, database }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao testar conexão: ' + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, database }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Configurações salvas e conexão estabelecida!' });
        await checkStatus();
        if (onSuccess) onSuccess();
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao salvar configuração: ' + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto text-slate-900 flex flex-col max-h-[92vh]">
        {/* Header Claro Red Theme */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-[#E32626]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">Conexão Banco Hostinger</h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#E32626] text-white">
                  MYSQL
                </span>
              </div>
              <p className="text-xs text-slate-500">Integração do Dashboard de Visitas Técnicas e Mapa de Calor</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Status Indicator */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            status?.connected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full shrink-0 ${status?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div className="text-xs">
                <span className="font-bold block">
                  {status?.connected ? 'Conectado à Hostinger' : 'Desconectado / Pendente'}
                </span>
                <span className="text-[11px] opacity-90 block font-medium">{status?.message || 'Verificando status...'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={checkStatus}
              disabled={isLoading}
              className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs flex items-center gap-1 transition-colors border border-slate-300 cursor-pointer shrink-0 shadow-xs"
              title="Recarregar status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-red-50 border-red-300 text-red-800'
            }`}>
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              )}
              <span className="leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {/* Help Accordion for Hostinger Remote MySQL */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-2">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-between font-bold text-slate-800 hover:text-[#E32626] cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-xs text-[#E32626]">
                <HelpCircle className="w-4 h-4" />
                Como pegar esses dados no hPanel da Hostinger?
              </span>
              <span className="text-slate-500">{showHelp ? '▲' : '▼'}</span>
            </button>

            {showHelp && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1.5 leading-relaxed font-medium">
                <p>1. Acesse o painel da <b>Hostinger (hPanel)</b> e vá em <b>Bancos de Dados &gt; Gerenciamento</b>.</p>
                <p>2. Copie o <b>Nome do Banco</b>, <b>Usuário</b> e a <b>Senha</b> cadastrada.</p>
                <p>3. <b>Importante:</b> Vá na aba <b>MySQL Remoto</b> no hPanel e libere o acesso adicionando <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono font-bold">%</code> no campo de IP para permitir conexões do aplicativo.</p>
                <p>4. O Host geralmente é o IP do servidor ou <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono font-bold">srvXXXX.hstgr.io</code> indicado no hPanel.</p>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Host MySQL (Hostinger) *
                </label>
                <input
                  type="text"
                  required
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="Ex: srv1234.hstgr.io ou 185.xxx.xxx.xxx"
                  className="w-full bg-slate-50 border border-slate-300 text-xs sm:text-sm px-3 py-2 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E32626] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Porta
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="3306"
                  className="w-full bg-slate-50 border border-slate-300 text-xs sm:text-sm px-3 py-2 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E32626] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Nome do Banco de Dados *
                </label>
                <input
                  type="text"
                  required
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  placeholder="Ex: u123456789_telecom"
                  className="w-full bg-slate-50 border border-slate-300 text-xs sm:text-sm px-3 py-2 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E32626] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Usuário MySQL *
                </label>
                <input
                  type="text"
                  required
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="Ex: u123456789_user"
                  className="w-full bg-slate-50 border border-slate-300 text-xs sm:text-sm px-3 py-2 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E32626] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Senha do Banco de Dados
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-50 border border-slate-300 text-xs sm:text-sm px-3 py-2 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E32626] focus:bg-white"
              />
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={isLoading || !host || !user || !database}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Server className="w-3.5 h-3.5 text-[#E32626]" />
                Testar Conexão
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 bg-[#E32626] hover:bg-[#C91F1F] active:bg-[#A81717] disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-red-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                Salvar e Conectar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
