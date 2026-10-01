import React, { useState } from 'react';
import { History, X, Trash2, Download, Search, ExternalLink, Calendar, User, FileText } from 'lucide-react';
import { ServiceReport } from '../types';
import { deleteReportFromHistory, exportReportsAsCSV } from '../utils/storage';

interface Props {
  reports: ServiceReport[];
  onClose: () => void;
  onSelectReport: (report: ServiceReport) => void;
  onRefresh: () => void;
}

export const ReportHistoryModal: React.FC<Props> = ({
  reports,
  onClose,
  onSelectReport,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.contractNumber.toLowerCase().includes(q) ||
      r.technicianName.toLowerCase().includes(q) ||
      r.physicalNapDio.toLowerCase().includes(q) ||
      r.selectedFaults.some(f => f.toLowerCase().includes(q))
    );
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja remover este relatório do histórico?')) {
      deleteReportFromHistory(id);
      onRefresh();
    }
  };

  const handleExportCSV = () => {
    if (reports.length === 0) return;
    const csvContent = exportReportsAsCSV(reports);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorios_claro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-[#E32626]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">Histórico de Atendimentos</h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#E32626] text-white">
                  CLARO
                </span>
              </div>
              <p className="text-xs text-slate-500">{reports.length} ordem(ns) gravada(s) localmente no dispositivo</p>
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

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por contrato, NAP, técnico..."
              className="w-full bg-white border border-slate-300 text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E32626]"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={reports.length === 0}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-300 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-[#E32626]" />
            Exportar Planilha (CSV)
          </button>
        </div>

        {/* List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-[#F8F9FA]">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-sm text-slate-700">Nenhum atendimento encontrado</p>
              <p className="text-xs text-slate-500">Preencha o formulário e clique em "Salvar Atendimento" para registrar.</p>
            </div>
          ) : (
            filteredReports.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectReport(item)}
                className="bg-white border border-slate-200 hover:border-red-300 p-4 rounded-xl transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm sm:text-base text-[#E32626]">
                      Contrato: {item.contractNumber || 'S/N'}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      item.isNapEqualToToa === 'SIM'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      NAP = TOA: {item.isNapEqualToToa || 'N/I'}
                    </span>
                    {item.photos.length > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 font-semibold">
                        📷 {item.photos.length} foto(s)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {item.technicianName || 'Técnico não informado'}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      NAP: <b className="text-slate-800">{item.physicalNapDio || '-'}</b>
                    </span>
                    {(item.napPower || item.ontPower) && (
                      <span className="font-mono font-bold text-slate-700">
                        {item.napPower ? `NAP: ${item.napPower} dBm` : ''}
                        {item.ontPower ? ` | ONT: ${item.ontPower} dBm` : ''}
                      </span>
                    )}
                  </div>

                  {item.selectedFaults.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.selectedFaults.slice(0, 3).map((f) => (
                        <span key={f} className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-medium px-2 py-0.5 rounded">
                          {f}
                        </span>
                      ))}
                      {item.selectedFaults.length > 3 && (
                        <span className="text-[10px] text-slate-500 font-bold self-center">
                          +{item.selectedFaults.length - 3} mais
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span className="text-xs text-[#E32626] font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Abrir <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
