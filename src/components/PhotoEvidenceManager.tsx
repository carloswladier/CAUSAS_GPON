import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Maximize2, Tag, X, Check, Stamp } from 'lucide-react';
import { PhotoEvidence } from '../types';

interface Props {
  photos: PhotoEvidence[];
  onChange: (photos: PhotoEvidence[]) => void;
  technicianName: string;
  contractNumber: string;
}

const PHOTO_TAGS = [
  'Power Meter (NAP)',
  'Power Meter (ONT)',
  'NAP Aberta / DIO',
  'Conector Danificado',
  'Drop / Cabo Rompido',
  'Poste / Fachada',
  'ONT / Roteador / Mesh',
  'Geral / Local do Cliente',
];

export const PhotoEvidenceManager: React.FC<Props> = ({
  photos,
  onChange,
  technicianName,
  contractNumber,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [selectedTag, setSelectedTag] = useState<string>(PHOTO_TAGS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoEvidence | null>(null);
  const [applyWatermark, setApplyWatermark] = useState(true);

  // Resize and optionally stamp watermark onto photo
  const processImage = async (file: File, tag: string): Promise<PhotoEvidence> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1280; // Optimized for mobile field evidence
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Draw original scaled
          ctx.drawImage(img, 0, 0, width, height);

          const now = new Date();
          const timestampStr = now.toLocaleString('pt-BR');

          // Add watermark banner if enabled
          if (applyWatermark) {
            const bannerHeight = Math.max(38, Math.round(height * 0.065));
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

            // Watermark text
            const fontSize = Math.max(12, Math.round(bannerHeight * 0.36));
            ctx.fillStyle = '#38bdf8'; // Cyan
            ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
            ctx.textBaseline = 'middle';
            
            const line1 = `CLARO TELECOM | ${tag.toUpperCase()}`;
            ctx.fillText(line1, 14, height - (bannerHeight * 0.68));

            ctx.fillStyle = '#ffffff';
            ctx.font = `${fontSize * 0.9}px "Inter", sans-serif`;
            const techStr = technicianName ? ` • Téc: ${technicianName}` : '';
            const contStr = contractNumber ? ` • Cont: ${contractNumber}` : '';
            const line2 = `${timestampStr}${techStr}${contStr}`;
            ctx.fillText(line2, 14, height - (bannerHeight * 0.28));
          }

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

          resolve({
            id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            dataUrl: compressedDataUrl,
            timestamp: timestampStr,
            tag: tag,
          });
        };
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessing(true);
    try {
      const newItems: PhotoEvidence[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const item = await processImage(fileList[i], selectedTag);
        newItems.push(item);
      }
      onChange([...photos, ...newItems]);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar imagem. Verifique se o formato é válido.');
    } finally {
      setIsProcessing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const removePhoto = (id: string) => {
    onChange(photos.filter(p => p.id !== id));
    if (previewPhoto?.id === id) {
      setPreviewPhoto(null);
    }
  };

  const updatePhotoTag = (id: string, newTag: string) => {
    onChange(photos.map(p => (p.id === id ? { ...p, tag: newTag } : p)));
  };

  return (
    <div className="space-y-4">
      {/* Hidden file inputs: one with capture="environment" for camera, one standard */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Tag selector for upcoming photo */}
      <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#E32626]" />
            Classificação da próxima foto:
          </label>
          <button
            type="button"
            onClick={() => setApplyWatermark(!applyWatermark)}
            className={`text-xs px-2.5 py-0.5 rounded-md flex items-center gap-1 font-semibold transition-colors ${
              applyWatermark
                ? 'bg-red-50 text-[#E32626] border border-red-200'
                : 'bg-slate-200 text-slate-600 border border-slate-300'
            }`}
            title="Estampar data, hora, contrato e técnico na foto para auditoria"
          >
            <Stamp className="w-3 h-3" />
            Carimbo de Auditoria: {applyWatermark ? 'Ativo' : 'Desligado'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PHOTO_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedTag === tag
                  ? 'bg-[#E32626] text-white shadow-sm ring-1 ring-red-500'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-[#E32626] hover:bg-[#C91F1F] active:bg-[#A81717] text-white font-bold rounded-xl shadow-md shadow-red-950/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        >
          <Camera className="w-5 h-5 text-white animate-pulse" />
          <span>Tirar Foto Direto do Celular</span>
        </button>

        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <ImageIcon className="w-5 h-5 text-[#E32626]" />
          <span>Escolher da Galeria</span>
        </button>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-red-50 border border-red-200 rounded-xl text-[#E32626] text-xs sm:text-sm font-semibold">
          <div className="w-4 h-4 border-2 border-[#E32626] border-t-transparent rounded-full animate-spin" />
          <span>Processando e otimizando evidência fotográfica...</span>
        </div>
      )}

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/60">
          <Camera className="w-9 h-9 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-bold text-slate-700">Nenhuma evidência anexada ainda</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Fotografe a tela do Power Meter, conector danificado, número da NAP ou caixa de emenda
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-semibold">
            <span>{photos.length} foto(s) anexada(s)</span>
            <span className="text-[#E32626]">Toque na imagem para ampliar</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col"
              >
                {/* Image display */}
                <div
                  className="relative aspect-4/3 bg-slate-100 cursor-pointer overflow-hidden"
                  onClick={() => setPreviewPhoto(photo)}
                >
                  <img
                    src={photo.dataUrl}
                    alt={`Evidência ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white drop-shadow" />
                  </div>
                  <div className="absolute top-1.5 left-1.5 bg-[#E32626] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                    #{index + 1}
                  </div>
                </div>

                {/* Card footer with tag and delete */}
                <div className="p-2 flex flex-col justify-between flex-1 gap-1.5 bg-slate-50 border-t border-slate-200">
                  <div className="text-[11px] font-bold text-slate-800 truncate" title={photo.tag}>
                    {photo.tag}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate font-mono">
                    {photo.timestamp}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(photo)}
                      className="text-[11px] text-[#E32626] hover:text-red-700 font-bold cursor-pointer"
                    >
                      Ver
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(photo.id);
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                      title="Excluir foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Photo Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-cyan-400 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                {previewPhoto.tag}
              </h4>
              <p className="text-xs text-slate-400">{previewPhoto.timestamp}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  removePhoto(previewPhoto.id);
                  setPreviewPhoto(null);
                }}
                className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Foto
              </button>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 overflow-auto">
            <img
              src={previewPhoto.dataUrl}
              alt="Visualização ampliada"
              className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl border border-slate-800"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Alterar etiqueta:</span>
              <select
                value={previewPhoto.tag}
                onChange={(e) => {
                  updatePhotoTag(previewPhoto.id, e.target.value);
                  setPreviewPhoto({ ...previewPhoto, tag: e.target.value });
                }}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1 focus:ring-1 focus:ring-cyan-500"
              >
                {PHOTO_TAGS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
