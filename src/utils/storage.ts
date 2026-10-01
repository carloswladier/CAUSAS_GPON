import { ServiceReport } from '../types';

const STORAGE_KEY_REPORTS = 'telecom_tech_reports_v1';
const STORAGE_KEY_LAST_TECH = 'telecom_tech_last_technician_name';

export function getSavedReports(): ServiceReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load reports from storage', e);
    return [];
  }
}

export function saveReportToHistory(report: ServiceReport): void {
  try {
    const existing = getSavedReports();
    // check if updating existing or adding new
    const idx = existing.findIndex(r => r.id === report.id);
    let updated: ServiceReport[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = report;
    } else {
      updated = [report, ...existing];
    }
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updated));
    if (report.technicianName) {
      localStorage.setItem(STORAGE_KEY_LAST_TECH, report.technicianName);
    }
  } catch (e) {
    console.error('Failed to save report', e);
  }
}

export function deleteReportFromHistory(id: string): void {
  try {
    const existing = getSavedReports();
    const filtered = existing.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete report', e);
  }
}

export function getLastTechnicianName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_TECH) || '';
  } catch {
    return '';
  }
}

export function exportReportsAsCSV(reports: ServiceReport[]): string {
  const headers = [
    'Data/Hora',
    'Técnico',
    'Contrato',
    'NAP Física',
    'Igual ao TOA?',
    'Obs. NAP',
    'Falhas Encontradas',
    'Outros Detalhe',
    'Potência NAP (dBm)',
    'Potência ONT (dBm)',
    'Qtd Fotos',
  ];

  const rows = reports.map(r => [
    `"${new Date(r.createdAt).toLocaleString('pt-BR')}"`,
    `"${r.technicianName.replace(/"/g, '""')}"`,
    `"${r.contractNumber.replace(/"/g, '""')}"`,
    `"${r.physicalNapDio.replace(/"/g, '""')}"`,
    `"${r.isNapEqualToToa}"`,
    `"${r.napObservation.replace(/"/g, '""')}"`,
    `"${r.selectedFaults.join('; ').replace(/"/g, '""')}"`,
    `"${r.otherFaultDescription.replace(/"/g, '""')}"`,
    `"${r.napPower}"`,
    `"${r.ontPower}"`,
    r.photos.length,
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
