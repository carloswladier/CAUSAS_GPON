import React, { useState, useEffect } from 'react';
import {
  Wrench,
  FileText,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  History,
  MapPin,
  Camera,
  Share2,
  Copy,
  Check,
  Activity,
  Layers,
  Sparkles,
  Info,
  MessageSquare,
  Database,
  Flame,
  LayoutDashboard,
  Server
} from 'lucide-react';

import {
  FAULT_OPTIONS,
  FaultType,
  PhotoEvidence,
  ServiceReport,
  ToaComparison,
} from './types';
import { PhotoEvidenceManager } from './components/PhotoEvidenceManager';
import { OpticalPowerInput } from './components/OpticalPowerInput';
import { ReportSummaryModal } from './components/ReportSummaryModal';
import { ReportHistoryModal } from './components/ReportHistoryModal';
import { HostingerConfigModal } from './components/HostingerConfigModal';
import { DashboardHeatmapView } from './components/DashboardHeatmapView';
import { calculateDropLoss } from './utils/optical';
import {
  getSavedReports,
  saveReportToHistory,
  getLastTechnicianName,
} from './utils/storage';
import { formatWhatsAppReport, createWhatsAppUrl } from './utils/whatsapp';

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard'>('form');

  // Technician & Contract Core Fields
  const [technicianName, setTechnicianName] = useState(() => getLastTechnicianName());
  const [contractNumber, setContractNumber] = useState('');
  const [physicalNapDio, setPhysicalNapDio] = useState('');

  // TOA Comparison Fields
  const [isNapEqualToToa, setIsNapEqualToToa] = useState<ToaComparison>('');
  const [napObservation, setNapObservation] = useState('');

  // Faults selection
  const [selectedFaults, setSelectedFaults] = useState<FaultType[]>([]);
  const [otherFaultDescription, setOtherFaultDescription] = useState('');

  // Optical Powers
  const [napPower, setNapPower] = useState('');
  const [ontPower, setOntPower] = useState('');

  // General observations & Photos
  const [generalObservations, setGeneralObservations] = useState('');
  const [photos, setPhotos] = useState<PhotoEvidence[]>([]);

  // Geolocation
  const [isLocating, setIsLocating] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | undefined>(undefined);
  const [locationAddress, setLocationAddress] = useState<string>('');

  // Modals & UI state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHostingerModal, setShowHostingerModal] = useState(false);
  const [savedReports, setSavedReports] = useState<ServiceReport[]>([]);
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [quickCopied, setQuickCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: 'Verificando Hostinger...',
  });

  // Check Hostinger MySQL status on mount
  useEffect(() => {
    setSavedReports(getSavedReports());
    checkHostingerStatus();
  }, []);

  const checkHostingerStatus = async () => {
    try {
      const res = await fetch('/api/db/status');
      const data = await res.json();
      setSyncStatus({
        connected: data.connected,
        message: data.connected ? 'Hostinger Conectada' : 'Hostinger Desconectada',
      });
    } catch {
      setSyncStatus({ connected: false, message: 'Hostinger Offline' });
    }
  };

  // Drop Loss calculation
  const dropLoss = calculateDropLoss(napPower, ontPower);

  // Toggle fault helper
  const handleToggleFault = (fault: FaultType) => {
    if (selectedFaults.includes(fault)) {
      setSelectedFaults(selectedFaults.filter((f) => f !== fault));
    } else {
      setSelectedFaults([...selectedFaults, fault]);
    }
  };

  // Capture GPS
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada neste dispositivo.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setLocationCoords(coords);
        setLocationAddress(`Lat: ${coords.latitude.toFixed(6)}, Long: ${coords.longitude.toFixed(6)} (Precisão: ±${Math.round(coords.accuracy || 0)}m)`);
      },
      (err) => {
        setIsLocating(false);
        alert('Não foi possível obter a localização. Permita o acesso ao GPS nas configurações do navegador.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Current report object
  const currentReport: ServiceReport = {
    id: `report_${Date.now()}`,
    createdAt: new Date().toISOString(),
    technicianName: technicianName.trim(),
    contractNumber: contractNumber.trim(),
    physicalNapDio: physicalNapDio.trim(),
    isNapEqualToToa,
    napObservation: napObservation.trim(),
    selectedFaults,
    otherFaultDescription: otherFaultDescription.trim(),
    napPower: napPower.trim(),
    ontPower: ontPower.trim(),
    generalObservations: generalObservations.trim(),
    photos,
    locationCoords,
    locationAddress,
    status: 'concluido',
  };

  // Send report to Hostinger MySQL & Local Storage
  const handleSaveReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!contractNumber.trim()) {
      setFormAlert('Por favor, informe o número do Contrato do cliente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!isNapEqualToToa) {
      setFormAlert('Por favor, responda se a NAP Física está igual ao TOA (SIM ou NÃO).');
      return;
    }

    setFormAlert(null);
    setSaveSuccessMessage(null);
    setIsSubmitting(true);

    try {
      // 1. Save to local storage
      saveReportToHistory(currentReport);
      setSavedReports(getSavedReports());

      // 2. Sync to Hostinger MySQL
      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentReport),
      });
      const data = await res.json();

      if (data.savedToMysql) {
        setSaveSuccessMessage('Atendimento salvo e sincronizado com o banco de dados da Hostinger!');
      } else {
        setSaveSuccessMessage('Atendimento salvo no histórico local do aparelho!');
      }
      
      // Open summary modal to allow quick WhatsApp sharing or PDF printing
      setShowSummaryModal(true);
    } catch (err) {
      console.error('Error saving visit to backend:', err);
      setSaveSuccessMessage('Atendimento salvo com sucesso no histórico local.');
      setShowSummaryModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickCopy = async () => {
    const text = formatWhatsAppReport(currentReport);
    try {
      await navigator.clipboard.writeText(text);
      setQuickCopied(true);
      setTimeout(() => setQuickCopied(false), 2000);
    } catch {
      alert('Selecione e copie o relatório na janela de visualização.');
    }
  };

  const handleResetForm = () => {
    if (confirm('Deseja iniciar um novo atendimento? Os dados não salvos serão limpos.')) {
      setContractNumber('');
      setPhysicalNapDio('');
      setIsNapEqualToToa('');
      setNapObservation('');
      setSelectedFaults([]);
      setOtherFaultDescription('');
      setNapPower('');
      setOntPower('');
      setGeneralObservations('');
      setPhotos([]);
      setLocationCoords(undefined);
      setLocationAddress('');
      setFormAlert(null);
      setSaveSuccessMessage(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadFromHistory = (item: ServiceReport) => {
    setTechnicianName(item.technicianName);
    setContractNumber(item.contractNumber);
    setPhysicalNapDio(item.physicalNapDio);
    setIsNapEqualToToa(item.isNapEqualToToa);
    setNapObservation(item.napObservation);
    setSelectedFaults(item.selectedFaults);
    setOtherFaultDescription(item.otherFaultDescription || '');
    setNapPower(item.napPower);
    setOntPower(item.ontPower);
    setGeneralObservations(item.generalObservations || '');
    setPhotos(item.photos || []);
    setLocationCoords(item.locationCoords);
    setLocationAddress(item.locationAddress || '');
    setShowHistoryModal(false);
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fill sample data for rapid testing
  const handleFillDemoData = () => {
    setTechnicianName(technicianName || 'Carlos Eduardo - Téc Claro');
    setContractNumber('994820-CL');
    setPhysicalNapDio('NAP-CLARO-08/16 (Porta 04)');
    setIsNapEqualToToa('NAO');
    setNapObservation('No TOA constava NAP-02/08 Porta 01, mas cliente está conectado na NAP-CLARO-08/16 Porta 04.');
    setSelectedFaults(['CONECTOR EXTERNO', 'ONT SEM NAVEGAÇÃO']);
    setNapPower('-19.4');
    setOntPower('-22.8');
    setGeneralObservations('Realizada fusão/conectorização nova na caixa de atendimento Claro. Sinal óptico normalizado com teste de velocidade ok.');
  };

  return (
    <div className="min-h-screen bg-[#F4F5F8] text-slate-900 font-sans antialiased">
      {/* Top Header - Claro Visual Identity (Always Sunlight Mode) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Claro Logo and Title */}
          <div className="flex items-center gap-3">
            {/* Claro Emblem */}
            <div className="w-10 h-10 rounded-2xl bg-[#E32626] flex items-center justify-center text-white shadow-md shadow-red-600/30 shrink-0 font-black tracking-tighter text-lg select-none">
              claro
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight text-slate-900 flex items-center gap-1.5">
                  <span className="text-[#E32626] font-black">Claro</span> Técnico
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-[#E32626] border border-red-200">
                  FIBRA ÓPTICA
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Relatório de Campo & Sincronização Hostinger
              </p>
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-2">
            {/* Hostinger DB Status Pill */}
            <button
              type="button"
              onClick={() => setShowHostingerModal(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs ${
                syncStatus.connected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Configuração do Banco de Dados Hostinger"
            >
              <Database className="w-3.5 h-3.5 shrink-0 text-slate-700" />
              <span className="hidden sm:inline">{syncStatus.message}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${syncStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </button>

            {/* History Button */}
            <button
              type="button"
              onClick={() => {
                setSavedReports(getSavedReports());
                setShowHistoryModal(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-colors cursor-pointer shadow-xs"
            >
              <History className="w-3.5 h-3.5 text-[#E32626]" />
              <span className="hidden sm:inline">Histórico</span>
              {savedReports.length > 0 && (
                <span className="bg-[#E32626] text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {savedReports.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Switcher: Nova OS vs Dashboard & Mapa de Calor */}
        <div className="max-w-5xl mx-auto mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-[#E32626] text-white shadow-sm shadow-red-600/30'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Nova Visita Técnica (OS)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#E32626] text-white shadow-sm shadow-red-600/30'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Dashboard & Mapa de Calor</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-semibold hidden md:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E32626]" />
            Modo Sol (Alta Visibilidade)
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto p-3 sm:p-6 pb-12">
        {/* Render Tab 2: Dashboard & Mapa de Calor */}
        {activeTab === 'dashboard' && (
          <DashboardHeatmapView
            localReports={savedReports}
            onOpenHostingerConfig={() => setShowHostingerModal(true)}
          />
        )}

        {/* Render Tab 1: Formulario da Visita Tecnica */}
        {activeTab === 'form' && (
          <div>
            {/* Quick actions top bar: Demo Data / Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ordem de Serviço em Campo
                </span>
                {contractNumber && (
                  <span className="text-xs font-mono font-bold text-[#E32626] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                    Contrato: {contractNumber}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFillDemoData}
                  className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-[#E32626] transition-colors cursor-pointer shadow-xs"
                >
                  ⚡ Exemplo Claro
                </button>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold bg-white text-slate-700 border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar Campos
                </button>
              </div>
            </div>

            {/* Form Alert Message */}
            {formAlert && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-300 rounded-xl text-red-800 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formAlert}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormAlert(null)}
                  className="text-red-600 hover:text-red-900 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Success Message Banner */}
            {saveSuccessMessage && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSaveSuccessMessage(null)}
                  className="text-emerald-700 hover:text-emerald-950 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSaveReport} className="space-y-6">
              {/* ======================================================== */}
              {/* SECTION 1: DADOS GERAIS (Técnico, Contrato, NAP Física) */}
              {/* ======================================================== */}
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-200">
                  <FileText className="w-4 h-4 text-[#E32626]" />
                  <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#E32626]">
                    1. Identificação do Atendimento
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome do Técnico */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Nome do Técnico <span className="text-[#E32626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo - Técnico Claro"
                      className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:border-[#E32626] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 transition-all"
                    />
                  </div>

                  {/* Contrato */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Contrato do Cliente <span className="text-[#E32626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contractNumber}
                      onChange={(e) => setContractNumber(e.target.value)}
                      placeholder="Ex: 10482910 ou OS-CLARO-9948"
                      className="w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:border-[#E32626] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 transition-all"
                    />
                  </div>

                  {/* NAP / DIO FÍSICA */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>NAP / DIO FÍSICA</span>
                      <span className="text-[10px] font-semibold text-slate-500">Identificação na caixa ou DIO</span>
                    </label>
                    <input
                      type="text"
                      value={physicalNapDio}
                      onChange={(e) => setPhysicalNapDio(e.target.value)}
                      placeholder="Ex: NAP-CLARO-JD-08 / PORTA 04 ou DIO-CENTRO-01"
                      className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:border-[#E32626] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 transition-all"
                    />
                  </div>
                </div>
              </section>

              {/* ======================================================== */}
              {/* SECTION 2: NAP FÍSICA ESTÁ IGUAL AO TOA? */}
              {/* ======================================================== */}
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#E32626]" />
                    <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#E32626]">
                      2. NAP FÍSICA ESTÁ IGUAL AO TOA? <span className="text-rose-600">*</span>
                    </h2>
                  </div>
                  {isNapEqualToToa && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      isNapEqualToToa === 'SIM'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {isNapEqualToToa === 'SIM' ? 'CONFERIDO: IGUAL' : 'DIVERGÊNCIA CADASTRAL'}
                    </span>
                  )}
                </div>

                {/* SIM / NAO Selectors */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setIsNapEqualToToa('SIM')}
                    className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base transition-all border cursor-pointer ${
                      isNapEqualToToa === 'SIM'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-700/20 ring-2 ring-emerald-400'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className={`w-5 h-5 ${isNapEqualToToa === 'SIM' ? 'text-white' : 'text-emerald-600'}`} />
                    <span>SIM (Igual ao TOA)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsNapEqualToToa('NAO')}
                    className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base transition-all border cursor-pointer ${
                      isNapEqualToToa === 'NAO'
                        ? 'bg-[#E32626] text-white border-[#E32626] shadow-md shadow-red-700/20 ring-2 ring-red-400'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-red-50 hover:text-red-800 hover:border-red-300'
                    }`}
                  >
                    <AlertTriangle className={`w-5 h-5 ${isNapEqualToToa === 'NAO' ? 'text-white' : 'text-[#E32626]'}`} />
                    <span>NÃO (Diferente)</span>
                  </button>
                </div>

                {/* Campo para incluir a observação do número da NAP */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  isNapEqualToToa === 'NAO'
                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      Observação do Número da NAP
                      {isNapEqualToToa === 'NAO' && (
                        <span className="text-[10px] text-amber-800 font-bold px-1.5 py-0.2 rounded bg-amber-100 border border-amber-300">
                          Obrigatório indicar divergência
                        </span>
                      )}
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={napObservation}
                    onChange={(e) => setNapObservation(e.target.value)}
                    placeholder={
                      isNapEqualToToa === 'NAO'
                        ? 'Ex: No TOA constava NAP-01 porta 2, mas o cliente está na NAP-04 porta 7. Necessário ajustar cadastro no sistema.'
                        : 'Inclua detalhes adicionais sobre o número da NAP ou porta, caso necessário...'
                    }
                    className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-[#E32626] focus:outline-none focus:ring-1 focus:ring-[#E32626] placeholder:text-slate-400"
                  />
                </div>
              </section>

              {/* ======================================================== */}
              {/* SECTION 3: FALHA ENCONTRADA */}
              {/* ======================================================== */}
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#E32626]" />
                    <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#E32626]">
                      3. Falha Encontrada
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {selectedFaults.length} selecionada(s)
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-3 font-medium">
                  Toque nos itens correspondentes ao diagnóstico técnico identificado no local:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {FAULT_OPTIONS.map((fault) => {
                    const isSelected = selectedFaults.includes(fault);
                    return (
                      <button
                        key={fault}
                        type="button"
                        onClick={() => handleToggleFault(fault)}
                        className={`flex items-center justify-between p-3 rounded-xl text-xs sm:text-sm font-bold transition-all border text-left cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? 'bg-[#E32626] text-white border-red-600 shadow-sm shadow-red-600/30'
                            : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                        }`}
                      >
                        <span className="truncate pr-1">{fault}</span>
                        <span className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-white text-[#E32626] border-white'
                            : 'border-slate-400 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Campo OUTROS em que seja possível escrever o problema */}
                {selectedFaults.includes('OUTROS') && (
                  <div className="mt-4 p-3.5 bg-red-50/50 border border-red-300 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#E32626]" />
                      Descreva o problema específico (Campo Outros):
                    </label>
                    <textarea
                      rows={3}
                      value={otherFaultDescription}
                      onChange={(e) => setOtherFaultDescription(e.target.value)}
                      placeholder="Descreva detalhadamente a falha encontrada..."
                      className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-[#E32626] focus:outline-none focus:ring-1 focus:ring-[#E32626] placeholder:text-slate-400"
                    />
                  </div>
                )}
              </section>

              {/* ======================================================== */}
              {/* SECTION 4: POTÊNCIA NAP / DIO & POTÊNCIA ONT */}
              {/* ======================================================== */}
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#E32626]" />
                    <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#E32626]">
                      4. Medição Óptica (Power Meter)
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono font-bold">
                    Rede Claro GPON
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* POTÊNCIA NAP / DIO */}
                  <OpticalPowerInput
                    label="POTÊNCIA NAP / DIO"
                    value={napPower}
                    onChange={setNapPower}
                    placeholder="-19.00"
                    helperText="Medição direta na porta da caixa de atendimento"
                  />

                  {/* POTÊNCIA ONT */}
                  <OpticalPowerInput
                    label="POTÊNCIA ONT"
                    value={ontPower}
                    onChange={setOntPower}
                    placeholder="-21.50"
                    helperText="Medição no conector que entra na ONT do cliente"
                  />
                </div>

                {/* Delta / Drop Loss Indicator */}
                {napPower && ontPower && dropLoss.loss !== null && (
                  <div className={`mt-4 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    dropLoss.status === 'normal'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                      <Activity className="w-4 h-4 shrink-0" />
                      <span>{dropLoss.message}</span>
                    </div>
                    <div className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-white border border-current self-start sm:self-center shrink-0 shadow-xs">
                      Δ Atenuação: {dropLoss.loss} dB
                    </div>
                  </div>
                )}
              </section>

              {/* ======================================================== */}
              {/* SECTION 5: EVIDÊNCIA DO PROBLEMA (FOTOS COM CELULAR) */}
              {/* ======================================================== */}
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#E32626]" />
                    <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#E32626]">
                      5. Evidência do Problema (Fotos com Celular)
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    Câmera nativa do smartphone
                  </span>
                </div>

                <PhotoEvidenceManager
                  photos={photos}
                  onChange={setPhotos}
                  technicianName={technicianName}
                  contractNumber={contractNumber}
                />
              </section>

              {/* ======================================================== */}
              {/* SECTION 6: LOCALIZAÇÃO E OBSERVAÇÕES */}
              {/* ======================================================== */}
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#E32626]" />
                    <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#E32626]">
                      6. Localização & Observações Gerais
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={isLocating}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#E32626] border border-red-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {isLocating ? 'Buscando GPS...' : locationCoords ? 'GPS Capturado ✓' : 'Capturar GPS do Local'}
                  </button>
                </div>

                {locationAddress && (
                  <div className="mb-3 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 flex items-center justify-between gap-2">
                    <span className="font-mono font-medium truncate">{locationAddress}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded font-bold shrink-0">Geotag Ativa</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Observações Adicionais do Atendimento
                  </label>
                  <textarea
                    rows={3}
                    value={generalObservations}
                    onChange={(e) => setGeneralObservations(e.target.value)}
                    placeholder="Ex: Cliente ciente da substituição do conector. Teste de velocidade executado com sucesso."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:border-[#E32626] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </section>

              {/* ======================================================== */}
              {/* BOTÃO DE SALVAR NO FINAL DA PÁGINA (SEM BARRA FLUTUANTE) */}
              {/* ======================================================== */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {contractNumber ? `Contrato: ${contractNumber}` : 'Contrato pendente'}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-[#E32626]">
                      {photos.length} evidência(s) anexada(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${syncStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="font-semibold">
                      {syncStatus.connected ? 'Hostinger MySQL Ativa' : 'Armazenamento Local'}
                    </span>
                  </div>
                </div>

                {/* Primary Large Save Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-[#E32626] hover:bg-[#C91F1F] active:bg-[#A81717] disabled:opacity-50 text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <Server className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span>{isSubmitting ? 'Salvando e Sincronizando...' : 'Salvar Atendimento'}</span>
                </button>

                {/* Secondary Actions underneath */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <a
                    href={createWhatsAppUrl(currentReport)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Enviar Relatório via WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleQuickCopy}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {quickCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{quickCopied ? 'Texto Copiado!' : 'Copiar Texto para Despacho'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* MODAL: Relatório Formatado / WhatsApp / Impressão */}
      {showSummaryModal && (
        <ReportSummaryModal
          report={currentReport}
          onClose={() => setShowSummaryModal(false)}
          onSaveToHistory={() => {
            saveReportToHistory(currentReport);
            setSavedReports(getSavedReports());
          }}
        />
      )}

      {/* MODAL: Histórico de Atendimentos */}
      {showHistoryModal && (
        <ReportHistoryModal
          reports={savedReports}
          onClose={() => setShowHistoryModal(false)}
          onSelectReport={handleLoadFromHistory}
          onRefresh={() => setSavedReports(getSavedReports())}
        />
      )}

      {/* MODAL: Configuração do Banco Hostinger */}
      {showHostingerModal && (
        <HostingerConfigModal
          onClose={() => setShowHostingerModal(false)}
          onSuccess={() => checkHostingerStatus()}
        />
      )}
    </div>
  );
}
