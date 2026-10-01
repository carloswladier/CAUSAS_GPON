export interface OpticalStatus {
  label: 'Excelente' | 'Bom / Aceitável' | 'Atenuado' | 'Crítico / Sem Sinal' | 'Saturação' | 'Não Informado';
  color: string;
  bgColor: string;
  borderColor: string;
  badgeClass: string;
  description: string;
}

export function evaluateOpticalPower(valueStr: string): OpticalStatus {
  if (!valueStr || isNaN(Number(valueStr.replace(',', '.')))) {
    return {
      label: 'Não Informado',
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-300',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      description: 'Informe o valor medido em dBm no Power Meter',
    };
  }

  const val = parseFloat(valueStr.replace(',', '.'));

  if (val > -8.0) {
    return {
      label: 'Saturação',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      badgeClass: 'bg-red-100 text-red-800 border-red-300',
      description: 'Potência muito alta (> -8 dBm). Risco de queimar o módulo óptico!',
    };
  }

  if (val >= -23.0 && val <= -14.0) {
    return {
      label: 'Excelente',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-300',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description: 'Nível óptico ideal para estabilidade e máxima velocidade GPON.',
    };
  }

  if (val >= -26.0 && val < -14.0) {
    return {
      label: 'Bom / Aceitável',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
      description: 'Dentro do padrão de funcionamento operacional.',
    };
  }

  if (val >= -28.0 && val < -26.0) {
    return {
      label: 'Atenuado',
      color: 'text-amber-800',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      description: 'Sinal degradado (-26 a -28 dBm). Recomenda-se limpar conector ou verificar curvatura.',
    };
  }

  return {
    label: 'Crítico / Sem Sinal',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Sinal fora da faixa operacional (< -28 dBm). Risco alto de oscilação e perda de pacotes.',
  };
}

export function calculateDropLoss(napStr: string, ontStr: string): {
  loss: number | null;
  status: 'normal' | 'alta' | 'invalida';
  message: string;
} {
  const nap = parseFloat(napStr.replace(',', '.'));
  const ont = parseFloat(ontStr.replace(',', '.'));

  if (isNaN(nap) || isNaN(ont)) {
    return { loss: null, status: 'invalida', message: 'Preencha ambas as potências para calcular perda do trecho' };
  }

  // Example: NAP = -19.0, ONT = -21.5 => Drop Loss = 2.5 dB
  // Loss = NAP - ONT (since ONT is typically more negative)
  const loss = Math.abs(nap - ont);
  const roundedLoss = Math.round(loss * 100) / 100;

  if (roundedLoss <= 2.5) {
    return {
      loss: roundedLoss,
      status: 'normal',
      message: `Atenuação no trecho Drop/Conectores: ${roundedLoss} dB (Padrão esperado)`,
    };
  }

  return {
    loss: roundedLoss,
    status: 'alta',
    message: `Atenuação elevada no trecho: ${roundedLoss} dB (Acima de 2.5 dB! Verifique conector ou dobra na fibra)`,
  };
}
