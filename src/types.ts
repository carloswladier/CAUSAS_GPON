export type ToaComparison = 'SIM' | 'NAO' | '';

export const FAULT_OPTIONS = [
  'ONT SEM NAVEGAÇÃO',
  'CONECTOR INTERNO',
  'CONECTOR EXTERNO',
  'CABEAMENTO INTERNO',
  'CABEAMENTO EXTERNO',
  'TROCA DE POSTE',
  'REDE EXTERNA',
  'NORMALIZADO',
  'BOOT',
  'MESH',
  'OUTROS',
] as const;

export type FaultType = typeof FAULT_OPTIONS[number];

export interface PhotoEvidence {
  id: string;
  dataUrl: string;
  timestamp: string;
  tag: string;
  note?: string;
  location?: string;
}

export interface ServiceReport {
  id: string;
  createdAt: string;
  technicianName: string;
  contractNumber: string;
  physicalNapDio: string;
  isNapEqualToToa: ToaComparison;
  napObservation: string;
  selectedFaults: FaultType[];
  otherFaultDescription: string;
  napPower: string; // e.g. "-19.5"
  ontPower: string; // e.g. "-22.1"
  generalObservations: string;
  photos: PhotoEvidence[];
  locationCoords?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  locationAddress?: string;
  status: 'concluido' | 'pendente' | 'em_andamento';
}
