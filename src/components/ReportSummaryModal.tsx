import React, { useState } from 'react';
import { Check, Copy, MessageSquare, Printer, X, Share2, Sparkles, ExternalLink } from 'lucide-react';
import { ServiceReport } from '../types';
import { formatWhatsAppReport, createWhatsAppUrl } from '../utils/whatsapp';
import { calculateDropLoss, evaluateOpticalPower } from '../utils/optical';

interface Props {
  report: ServiceReport;
  onClose: () => void;
  onSaveToHistory: () => void;
}

export const ReportSummaryModal: React.FC<Props> = ({
  report,
  onClose,
  onSaveToHistory,
}) => {
  const [copied, setCopied] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const textMessage = formatWhatsAppReport(report);
  const dropLoss = calculateDropLoss(report.napPower, report.ontPower);
  const napStatus = evaluateOpticalPower(report.napPower);
  const ontStatus = evaluateOpticalPower(report.ontPower);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Não foi possível copiar automaticamente. Selecione o texto abaixo e copie.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `OS Telecom - Contrato ${report.contractNumber || ''}`,
          text: textMessage,
        });
      } catch {
        // user dismissed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto text-slate-900">
        {/* Header Claro Red Theme */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-[#E32626]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">Relatório Formatado</h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#E32626] text-white">
                  CLARO
                </span>
              </div>
              <p className="text-xs text-slate-500">Pronto para envio via WhatsApp e sincronização com a Hostinger</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Técnico</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                {report.technicianName || 'Não inf.'}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Contrato</span>
              <span className="text-xs sm:text-sm font-bold text-[#E32626] truncate block font-mono">
                {report.contractNumber || 'Não inf.'}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">NAP = TOA?</span>
              <span className={`text-xs sm:text-sm font-bold truncate block ${report.isNapEqualToToa === 'SIM' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {report.isNapEqualToToa === 'SIM' ? 'SIM (Correto)' : report.isNapEqualToToa === 'NAO' ? 'NÃO (Divergente)' : 'Não avaliado'}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Fotos Anexas</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 block">
                {report.photos.length} evidência(s)
              </span>
            </div>
          </div>

          {/* Optical Analysis Banner */}
          {(report.napPower || report.ontPower) && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Potência NAP: <b className="text-slate-900 font-mono">{report.napPower || '-'} dBm</b></span>
                <span className={`font-bold text-[11px] ${napStatus.color}`}>{napStatus.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Potência ONT: <b className="text-slate-900 font-mono">{report.ontPower || '-'} dBm</b></span>
                <span className={`font-bold text-[11px] ${ontStatus.color}`}>{ontStatus.label}</span>
              </div>
              {dropLoss.loss !== null && (
                <div className="pt-1.5 border-t border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-700 font-semibold">Atenuação do Drop:</span>
                  <span className={`font-bold font-mono ${dropLoss.status === 'normal' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {dropLoss.loss} dB {dropLoss.status === 'alta' ? '⚠️ (Elevada)' : '✅'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Text Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E32626]" />
                Texto para WhatsApp / Despacho:
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-[#E32626] hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>
            </div>

            <textarea
              readOnly
              value={textMessage}
              rows={11}
              className="w-full bg-slate-50 font-mono text-xs sm:text-sm p-3.5 rounded-xl border border-slate-300 text-slate-800 resize-none focus:outline-none focus:border-[#E32626] leading-relaxed select-all"
            />
          </div>

          {/* Direct WhatsApp destination */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Enviar para número específico no WhatsApp (Opcional):
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="Ex: 11999998888 ou deixe em branco para escolher contato"
                className="flex-1 bg-white border border-slate-300 text-xs sm:text-sm px-3 py-2 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E32626]"
              />
              <a
                href={createWhatsAppUrl(report, whatsappPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                Abrir WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Share2 className="w-4 h-4 text-[#E32626]" />
              Compartilhar
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSaveToHistory();
                onClose();
              }}
              className="px-5 py-2.5 bg-[#E32626] hover:bg-[#C91F1F] active:bg-[#A81717] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-red-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
