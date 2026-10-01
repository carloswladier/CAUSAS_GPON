import { ServiceReport } from '../types';
import { calculateDropLoss } from './optical';

export function formatWhatsAppReport(report: ServiceReport): string {
  const toaStatusIcon = report.isNapEqualToToa === 'SIM' ? '✅ SIM' : report.isNapEqualToToa === 'NAO' ? '⚠️ NÃO (Divergente)' : 'Não informado';
  
  const faultsList = report.selectedFaults.length > 0 
    ? report.selectedFaults.map(f => {
        if (f === 'OUTROS' && report.otherFaultDescription) {
          return `  • OUTROS: ${report.otherFaultDescription.trim()}`;
        }
        return `  • ${f}`;
      }).join('\n')
    : '  • Nenhuma falha apontada';

  const dropAnalysis = calculateDropLoss(report.napPower, report.ontPower);
  const lossText = dropAnalysis.loss !== null ? ` (Perda trecho: ${dropAnalysis.loss} dB)` : '';

  const dateStr = new Date(report.createdAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let message = `🛠️ *RELATÓRIO TÉCNICO DE CAMPO - FIBRA ÓPTICA*
📅 *Data/Hora:* ${dateStr}

👤 *Técnico:* ${report.technicianName || 'Não preenchido'}
📄 *Contrato:* ${report.contractNumber || 'Não preenchido'}

📍 *NAP / DIO FÍSICA:* ${report.physicalNapDio || 'Não preenchido'}
🎯 *NAP Física igual ao TOA?:* ${toaStatusIcon}`;

  if (report.napObservation) {
    message += `\n📝 *Obs. Número da NAP:* ${report.napObservation}`;
  }

  message += `\n\n🔍 *FALHA ENCONTRADA:*
${faultsList}`;

  message += `\n\n⚡ *NÍVEIS DE POTÊNCIA ÓPTICA:*
📶 *Potência NAP / DIO:* ${report.napPower ? `${report.napPower} dBm` : 'Não medida'}
📶 *Potência ONT:* ${report.ontPower ? `${report.ontPower} dBm` : 'Não medida'}${lossText}`;

  if (report.generalObservations) {
    message += `\n\n💬 *Observações Gerais:*
${report.generalObservations.trim()}`;
  }

  if (report.locationAddress) {
    message += `\n\n📌 *Localização:* ${report.locationAddress}`;
  } else if (report.locationCoords) {
    message += `\n\n📌 *GPS:* ${report.locationCoords.latitude.toFixed(6)}, ${report.locationCoords.longitude.toFixed(6)}`;
  }

  message += `\n📸 *Evidências Fotográficas:* ${report.photos.length} foto(s) anexada(s)`;

  return message;
}

export function createWhatsAppUrl(report: ServiceReport, phone: string = ''): string {
  const text = formatWhatsAppReport(report);
  const encoded = encodeURIComponent(text);
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
