import React from 'react';
import { Activity, Plus, Minus, Info } from 'lucide-react';
import { evaluateOpticalPower } from '../utils/optical';

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  helperText?: string;
}

export const OpticalPowerInput: React.FC<Props> = ({
  label,
  value,
  onChange,
  placeholder = '-19.50',
  helperText,
}) => {
  const status = evaluateOpticalPower(value);

  const handleStep = (delta: number) => {
    let current = parseFloat(value.replace(',', '.'));
    if (isNaN(current)) {
      current = -20.0;
    }
    const next = (current + delta).toFixed(1);
    onChange(next);
  };

  const presets = ['-16.0', '-18.5', '-21.0', '-23.5', '-26.0'];

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm hover:border-slate-400 transition-colors">
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#E32626]" />
          {label}
        </label>
        <span className="text-[11px] font-mono text-slate-500 font-semibold">Unidade: dBm</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Decrement stepper */}
        <button
          type="button"
          onClick={() => handleStep(-0.5)}
          className="p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl border border-slate-300 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
          title="Diminuir 0.5 dBm"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Input box */}
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-50 border border-slate-300 focus:border-[#E32626] focus:bg-white focus:ring-2 focus:ring-[#E32626]/20 text-slate-900 font-mono text-xl sm:text-2xl font-bold py-2.5 px-3 rounded-xl tracking-tight text-center outline-none transition-all placeholder:text-slate-400"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">
            dBm
          </span>
        </div>

        {/* Increment stepper */}
        <button
          type="button"
          onClick={() => handleStep(0.5)}
          className="p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl border border-slate-300 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
          title="Aumentar 0.5 dBm"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex items-center justify-between gap-1.5 mt-2.5">
        <span className="text-[10px] text-slate-500 font-bold uppercase">Atalhos:</span>
        <div className="flex gap-1 overflow-x-auto py-0.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className="text-[11px] font-mono font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 active:scale-95 transition-transform cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Optical status badge and diagnosis */}
      {value && !isNaN(Number(value.replace(',', '.'))) && (
        <div className={`mt-3 p-2.5 rounded-lg border flex items-start gap-2 ${status.bgColor} ${status.borderColor}`}>
          <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 bg-current" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-bold ${status.color}`}>
                Status: {status.label}
              </span>
              <span className="text-[10px] font-mono font-bold opacity-90 text-slate-800">
                {parseFloat(value.replace(',', '.')).toFixed(2)} dBm
              </span>
            </div>
            <p className="text-[11px] text-slate-700 mt-0.5 leading-snug font-medium">
              {status.description}
            </p>
          </div>
        </div>
      )}

      {helperText && !value && (
        <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1 font-medium">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          {helperText}
        </p>
      )}
    </div>
  );
};
