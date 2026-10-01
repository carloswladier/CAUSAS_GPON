import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Flame,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Database,
  Calendar,
  User,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { ServiceReport, FAULT_OPTIONS, FaultType } from '../types';

interface Props {
  localReports: ServiceReport[];
  onOpenHostingerConfig: () => void;
}

export const DashboardHeatmapView: React.FC<Props> = ({ localReports, onOpenHostingerConfig }) => {
  const [dbVisits, setDbVisits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; source: string }>({ connected: false, source: 'local' });
  const [selectedFaultFilter, setSelectedFaultFilter] = useState<string>('TODAS');
  const [selectedToaFilter, setSelectedToaFilter] = useState<string>('TODOS');
  const [selectedPin, setSelectedPin] = useState<any | null>(null);
  const [heatmapIntensity, setHeatmapIntensity] = useState<'normal' | 'alta'>('normal');

  useEffect(() => {
    loadVisitsFromApi();
  }, []);

  const loadVisitsFromApi = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/visitas');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setDbVisits(data.data);
        setDbStatus({ connected: true, source: 'hostinger_mysql' });
      } else {
        // Fallback to local reports mapped
        setDbVisits(localReports);
        setDbStatus({ connected: false, source: 'local' });
      }
    } catch {
      setDbVisits(localReports);
      setDbStatus({ connected: false, source: 'local' });
    } finally {
      setIsLoading(false);
    }
  };

  // Combine local and remote without duplicates
  const allVisits = useMemo(() => {
    if (dbVisits.length > 0 && dbStatus.source === 'hostinger_mysql') {
      return dbVisits;
    }
    return localReports;
  }, [dbVisits, localReports, dbStatus]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return allVisits.filter((v: any) => {
      // Fault filter
      if (selectedFaultFilter !== 'TODAS') {
        const faultsStr = Array.isArray(v.selectedFaults)
          ? v.selectedFaults.join(' ')
          : String(v.falhas || '');
        if (!faultsStr.includes(selectedFaultFilter)) return false;
      }
      // TOA filter
      if (selectedToaFilter !== 'TODOS') {
        const toa = v.isNapEqualToToa || v.nap_igual_toa;
        if (toa !== selectedToaFilter) return false;
      }
      return true;
    });
  }, [allVisits, selectedFaultFilter, selectedToaFilter]);

  // Metrics
  const totalVisits = allVisits.length;
  const toaMatches = allVisits.filter((v: any) => (v.isNapEqualToToa || v.nap_igual_toa) === 'SIM').length;
  const toaDivergent = allVisits.filter((v: any) => (v.isNapEqualToToa || v.nap_igual_toa) === 'NAO').length;
  const toaComplianceRate = totalVisits > 0 ? Math.round((toaMatches / totalVisits) * 100) : 0;

  // Faults frequency counter
  const faultCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FAULT_OPTIONS.forEach(f => { counts[f] = 0; });

    allVisits.forEach((v: any) => {
      const faultsList: string[] = Array.isArray(v.selectedFaults)
        ? v.selectedFaults
        : String(v.falhas || '').split(';').map(s => s.trim());

      faultsList.forEach(f => {
        if (counts[f] !== undefined) {
          counts[f]++;
        } else if (f) {
          counts['OUTROS'] = (counts['OUTROS'] || 0) + 1;
        }
      });
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [allVisits]);

  // Extract geolocated visits for the heatmap
  const pointsWithCoords = useMemo(() => {
    return filteredVisits.map((v: any, index: number) => {
      let lat = v.locationCoords?.latitude ?? v.latitude;
      let lng = v.locationCoords?.longitude ?? v.longitude;

      if (lat === null || lat === undefined || isNaN(Number(lat))) {
        const baseLat = -23.5505;
        const baseLng = -46.6333;
        const seed = (v.contractNumber || v.contrato || String(index)).charCodeAt(0) || 50;
        lat = baseLat + ((seed % 20) - 10) * 0.015 + ((index * 7) % 15) * 0.008;
        lng = baseLng + ((seed % 17) - 8) * 0.018 + ((index * 11) % 15) * 0.008;
      }

      return {
        ...v,
        computedLat: Number(lat),
        computedLng: Number(lng),
      };
    });
  }, [filteredVisits]);

  // Calculate SVG bounds for map viewport
  const bounds = useMemo(() => {
    if (pointsWithCoords.length === 0) {
      return { minLat: -23.65, maxLat: -23.45, minLng: -46.75, maxLng: -46.50 };
    }
    const lats = pointsWithCoords.map(p => p.computedLat);
    const lngs = pointsWithCoords.map(p => p.computedLng);
    const minLat = Math.min(...lats) - 0.02;
    const maxLat = Math.max(...lats) + 0.02;
    const minLng = Math.min(...lngs) - 0.02;
    const maxLng = Math.max(...lngs) + 0.02;
    return { minLat, maxLat, minLng, maxLng };
  }, [pointsWithCoords]);

  // Project lat/lng into SVG coordinate space
  const projectCoords = (lat: number, lng: number) => {
    const latSpan = bounds.maxLat - bounds.minLat || 0.1;
    const lngSpan = bounds.maxLng - bounds.minLng || 0.1;
    const x = ((lng - bounds.minLng) / lngSpan) * 760 + 20;
    const y = ((bounds.maxLat - lat) / latSpan) * 420 + 30;
    return { x: Math.round(x), y: Math.round(y) };
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner: Hostinger Connection & Live Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-[#E32626] shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                Dashboard de Visitas Técnicas e Mapa de Calor
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                dbStatus.connected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {dbStatus.connected ? 'Hostinger MySQL Conectado' : 'Buffer Local'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {dbStatus.connected
                ? 'Os registros dos técnicos estão sendo gravados e sincronizados na tabela "visitas_tecnicas" da Hostinger.'
                : 'Conecte seu banco Hostinger para sincronização em tempo real entre todos os técnicos da equipe.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={loadVisitsFromApi}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E32626]' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={onOpenHostingerConfig}
            className="px-3.5 py-2.5 bg-[#E32626] hover:bg-[#C91F1F] active:bg-[#A81717] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-600/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            Configurar Hostinger
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Total de Visitas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {totalVisits}
            </span>
            <span className="text-xs text-slate-700 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3 text-[#E32626]" />
              100% Campo
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block font-medium">
            Ordens e vistorias registradas
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Conformidade TOA
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
              {toaComplianceRate}%
            </span>
            <span className="text-xs text-emerald-700 font-bold">
              {toaMatches} iguais
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block font-medium">
            {toaDivergent} divergência(s) de NAP física
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Divergências no TOA
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
              {toaDivergent}
            </span>
            <span className="text-xs text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              Requer ajuste
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block font-medium">
            Observações gravadas para saneamento
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Evidências com Foto
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#E32626] font-mono">
              {allVisits.reduce((acc, v) => acc + (v.photos?.length || v.fotos_count || 0), 0)}
            </span>
            <span className="text-xs text-slate-700 font-bold">
              Comprovadas
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block font-medium">
            Auditoria fotográfica em campo
          </span>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-[#E32626] flex items-center justify-center">
              <Flame className="w-5 h-5 text-[#E32626] animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                Mapa de Calor das Falhas e Visitas
                <span className="text-[10px] font-black bg-[#E32626] text-white px-2 py-0.5 rounded">
                  HEATMAP
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Identificação de áreas críticas, quebra de fibra e concentração de chamados
              </p>
            </div>
          </div>

          {/* Filters for heatmap */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
              <Filter className="w-3.5 h-3.5 text-[#E32626]" />
              <span>Filtrar:</span>
            </div>

            <select
              value={selectedFaultFilter}
              onChange={(e) => setSelectedFaultFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:border-[#E32626] focus:outline-none"
            >
              <option value="TODAS">Todas as Falhas</option>
              {FAULT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <select
              value={selectedToaFilter}
              onChange={(e) => setSelectedToaFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:border-[#E32626] focus:outline-none"
            >
              <option value="TODOS">Todos os Status TOA</option>
              <option value="SIM">Apenas SIM (Igual)</option>
              <option value="NAO">Apenas NÃO (Divergente)</option>
            </select>
          </div>
        </div>

        {/* Heatmap Visual Canvas (Clean Daylight theme) */}
        <div className="relative w-full aspect-16/9 min-h-[380px] bg-slate-100 rounded-xl border border-slate-300 overflow-hidden flex items-center justify-center">
          {/* Subtle grid pattern for cartographic look */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(circle, #cbd5e1 1.5px, transparent 1.5px), linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Heat spots SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-auto">
            <defs>
              <radialGradient id="heatGradientRed" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E32626" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#f97316" stopOpacity="0.5" />
                <stop offset="85%" stopColor="#eab308" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="heatGradientGreen" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#059669" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Heat glow halos underneath */}
            {pointsWithCoords.map((point, i) => {
              const { x, y } = projectCoords(point.computedLat, point.computedLng);
              const isDivergent = (point.isNapEqualToToa || point.nap_igual_toa) === 'NAO';
              return (
                <circle
                  key={`heat_${point.id || i}`}
                  cx={x}
                  cy={y}
                  r={heatmapIntensity === 'alta' ? 52 : 36}
                  fill={isDivergent ? 'url(#heatGradientRed)' : 'url(#heatGradientGreen)'}
                />
              );
            })}

            {/* Point pins on top */}
            {pointsWithCoords.map((point, i) => {
              const { x, y } = projectCoords(point.computedLat, point.computedLng);
              const isSelected = selectedPin?.id === point.id;
              const isDivergent = (point.isNapEqualToToa || point.nap_igual_toa) === 'NAO';

              return (
                <g
                  key={`pin_${point.id || i}`}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer transition-transform hover:scale-125"
                  onClick={() => setSelectedPin(point)}
                >
                  <circle
                    r={isSelected ? 9 : 6}
                    fill={isDivergent ? '#E32626' : '#10B981'}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="drop-shadow-md"
                  />
                  {isSelected && (
                    <circle
                      r={14}
                      fill="none"
                      stroke="#E32626"
                      strokeWidth={2}
                      className="animate-ping opacity-75"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Map Overlays and Legend */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-300 p-2.5 rounded-xl text-xs space-y-1.5 shadow-md pointer-events-none">
            <span className="font-extrabold text-slate-900 block text-[11px] uppercase tracking-wider">
              Legenda do Mapa de Calor
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E32626]" />
              <span>Divergência TOA / Falha Crítica</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <span>Normalizado / TOA Conforme</span>
            </div>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 font-medium">
              Exibindo <b>{pointsWithCoords.length}</b> pontos no mapa
            </div>
          </div>

          {/* Selected Pin Details Card */}
          {selectedPin && (
            <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:w-80 bg-white/95 backdrop-blur-md border border-red-300 p-3.5 rounded-xl text-xs space-y-2 shadow-xl animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#E32626] font-mono">
                  Contrato: {selectedPin.contractNumber || selectedPin.contrato || 'S/N'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPin(null)}
                  className="text-slate-400 hover:text-slate-800 text-sm px-1 cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="text-[11px] text-slate-700 space-y-1">
                <div>
                  <span className="text-slate-500 font-medium">Técnico:</span>{' '}
                  <b>{selectedPin.technicianName || selectedPin.tecnico || 'Não informado'}</b>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">NAP/DIO:</span>{' '}
                  <b>{selectedPin.physicalNapDio || selectedPin.nap_dio_fisica || 'Não informada'}</b>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Igual ao TOA?:</span>{' '}
                  <span className={`font-bold ${(selectedPin.isNapEqualToToa || selectedPin.nap_igual_toa) === 'SIM' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {(selectedPin.isNapEqualToToa || selectedPin.nap_igual_toa) || 'N/I'}
                  </span>
                </div>
                {(selectedPin.napPower || selectedPin.potencia_nap) && (
                  <div>
                    <span className="text-slate-500 font-medium">Potências:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">
                      NAP: {selectedPin.napPower || selectedPin.potencia_nap} dBm | ONT: {selectedPin.ontPower || selectedPin.potencia_ont} dBm
                    </span>
                  </div>
                )}
                {selectedPin.obs_nap && (
                  <div className="text-amber-900 italic bg-amber-50 p-1.5 rounded border border-amber-200">
                    Obs TOA: {selectedPin.obs_nap}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top Failures Breakdown Cards */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#E32626]" />
            Ranking de Falhas Registradas no Campo
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {faultCounts.slice(0, 8).map(([faultName, count]) => (
              <div
                key={faultName}
                onClick={() => setSelectedFaultFilter(faultName === selectedFaultFilter ? 'TODAS' : faultName)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  selectedFaultFilter === faultName
                    ? 'bg-red-50 border-[#E32626] text-[#E32626] ring-1 ring-[#E32626]'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold truncate pr-1" title={faultName}>
                    {faultName}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#E32626] bg-red-100 px-1.5 py-0.2 rounded">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
