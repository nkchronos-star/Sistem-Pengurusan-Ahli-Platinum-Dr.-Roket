import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Link as LinkIcon,
  X,
  Check,
  Trash2,
  Move,
  ZoomIn,
  RotateCcw,
} from 'lucide-react';
import { MAX_IMAGE_FILE_BYTES, STANDARD_AVATAR_SIZE } from '../utils/helpers';

interface AvatarUploadModalProps {
  isOpen: boolean;
  userName: string;
  userCode: string;
  currentAvatar: string;
  onSaveAvatar: (newAvatarUrlOrData: string) => void;
  onClose: () => void;
}

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
  isOpen,
  userName,
  userCode,
  currentAvatar,
  onSaveAvatar,
  onClose,
}) => {
  const [sourceDataUrl, setSourceDataUrl] = useState<string>(
    currentAvatar &&
      (currentAvatar.startsWith('data:') || currentAvatar.startsWith('http'))
      ? currentAvatar
      : ''
  );
  const [previewUrl, setPreviewUrl] = useState<string>(
    currentAvatar &&
      (currentAvatar.startsWith('data:') || currentAvatar.startsWith('http'))
      ? currentAvatar
      : ''
  );
  const [linkInput, setLinkInput] = useState<string>(
    currentAvatar && currentAvatar.startsWith('http') ? currentAvatar : ''
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Interactive pan & zoom state (offsetX, offsetY in normalized range -1..1, zoom 1..3)
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.15);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [canCropWithCanvas, setCanCropWithCanvas] = useState<boolean>(false);

  const loadedImgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  // Re-draw cropped 300x300 canvas whenever offsetX, offsetY, or zoom changes
  const renderCroppedCanvas = (
    img: HTMLImageElement,
    curOffsetX: number,
    curOffsetY: number,
    curZoom: number
  ) => {
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = STANDARD_AVATAR_SIZE;
    canvas.height = STANDARD_AVATAR_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, STANDARD_AVATAR_SIZE, STANDARD_AVATAR_SIZE);

    // Base scale so shortest side fills the 300x300 square
    const baseScale = Math.max(
      STANDARD_AVATAR_SIZE / img.width,
      STANDARD_AVATAR_SIZE / img.height
    );
    const finalScale = baseScale * curZoom;

    const drawW = img.width * finalScale;
    const drawH = img.height * finalScale;

    // Center + user drag offset
    const centerX = (STANDARD_AVATAR_SIZE - drawW) / 2;
    const centerY = (STANDARD_AVATAR_SIZE - drawH) / 2;

    const drawX = centerX + curOffsetX;
    const drawY = centerY + curOffsetY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    try {
      const exported = canvas.toDataURL('image/jpeg', 0.9);
      setPreviewUrl(exported);
    } catch {
      // If external URL blocks canvas toDataURL due to CORS, fallback to raw URL
      setCanCropWithCanvas(false);
    }
  };

  // Load image object whenever sourceDataUrl changes
  useEffect(() => {
    if (!isOpen || !sourceDataUrl) {
      loadedImgRef.current = null;
      setCanCropWithCanvas(false);
      return;
    }

    const img = new Image();
    if (sourceDataUrl.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      loadedImgRef.current = img;
      setCanCropWithCanvas(true);
      renderCroppedCanvas(img, offsetX, offsetY, zoom);
    };
    img.onerror = () => {
      loadedImgRef.current = null;
      setCanCropWithCanvas(false);
      setPreviewUrl(sourceDataUrl);
    };
    img.src = sourceDataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceDataUrl, isOpen]);

  // Update canvas when user drags or zooms
  useEffect(() => {
    if (loadedImgRef.current && canCropWithCanvas) {
      renderCroppedCanvas(loadedImgRef.current, offsetX, offsetY, zoom);
    }
  }, [offsetX, offsetY, zoom, canCropWithCanvas]);

  if (!isOpen) return null;

  const initials = userName
    .split(' ')
    .filter((w) => !['binti', 'bin', 'dr.'].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');

    if (file.size > MAX_IMAGE_FILE_BYTES * 2.5) {
      setErrorMsg('Saiz fail terlalu besar. Sila pilih gambar di bawah 5MB.');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      setOffsetX(0);
      setOffsetY(0);
      setZoom(1.15);
      setSourceDataUrl(rawDataUrl);
      setLinkInput('');
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setErrorMsg('Gagal membaca fail gambar.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLink = () => {
    setErrorMsg('');
    const trimmed = linkInput.trim();
    if (!trimmed) {
      setErrorMsg('Sila masukkan pautan (URL) gambar.');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg(
        'Pautan gambar mestilah bermula dengan https:// atau http://'
      );
      return;
    }
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1.15);
    setSourceDataUrl(trimmed);
    setPreviewUrl(trimmed);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canCropWithCanvas || !loadedImgRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    // Scale pointer delta from 160px preview to 300px canvas
    const scaleFactor = STANDARD_AVATAR_SIZE / 160;
    const dx = (e.clientX - dragStartRef.current.clientX) * scaleFactor;
    const dy = (e.clientY - dragStartRef.current.clientY) * scaleFactor;
    setOffsetX(dragStartRef.current.startOffsetX + dx);
    setOffsetY(dragStartRef.current.startOffsetY + dy);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  const handleResetPosition = () => {
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1.1);
  };

  const handleConfirmSave = () => {
    onSaveAvatar(previewUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-lg my-6">
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Muat Naik & Laras Kedudukan Gambar Profil
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {userName} ({userCode})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Circular Drag-to-Center Preview */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-indigo-700" />
            <span>
              Tarik (Drag) Gambar Di Dalam Bulatan Untuk Letak Muka Di Tengah
            </span>
          </div>

          {/* 160x160 Interactive Circle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`relative w-40 h-40 rounded-full overflow-hidden border-4 border-amber-400 bg-amber-400 text-slate-950 font-bold text-3xl flex items-center justify-center shadow-md select-none touch-none ${
              canCropWithCanvas
                ? isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : ''
            }`}
          >
            {/* Hidden 300x300 Canvas for exact rendering */}
            <canvas
              ref={canvasRef}
              width={STANDARD_AVATAR_SIZE}
              height={STANDARD_AVATAR_SIZE}
              className="hidden"
            />

            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onError={() => {
                    setErrorMsg(
                      'Pautan gambar tidak dapat dimuatkan. Sila semak URL tersebut.'
                    );
                  }}
                  className="w-full h-full object-cover pointer-events-none"
                />
                {/* Subtle Center Alignment Guide Crosshair while dragging */}
                {isDragging && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-full h-px bg-white/60" />
                    <div className="h-full w-px bg-white/60 absolute" />
                    <div className="w-24 h-24 rounded-full border border-dashed border-white/80 absolute" />
                  </div>
                )}
              </>
            ) : (
              <span>{initials || 'DR'}</span>
            )}
          </div>

          {/* Zoom & Position Controls when an image is loaded */}
          {canCropWithCanvas && (
            <div className="w-full space-y-2 pt-1">
              <div className="flex items-center gap-2.5 px-2">
                <ZoomIn className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-600 w-10">
                  Zum:
                </span>
                <input
                  type="range"
                  min="0.8"
                  max="2.8"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={handleResetPosition}
                  title="Set Semula ke Tengah"
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Tengah
                </button>
              </div>
              <p className="text-[11px] text-center text-emerald-700 font-medium">
                Klik dan tarik gambar ke atas, bawah, kiri atau kanan supaya
                wajah berada tepat di tengah bulatan (Output: 300×300 px).
              </p>
            </div>
          )}
        </div>

        {/* Pilihan 1: Muat Naik Fail Gambar */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            Pilihan 1: Muat Naik Fail Gambar Dari Peranti
          </label>
          <label className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-indigo-700" />
            <span>
              {isProcessing
                ? 'Sedang Memuatkan Gambar...'
                : 'Pilih Fail Gambar & Laras Kedudukan Muka'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Pilihan 2: Masukkan Link Gambar */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800">
            Pilihan 2: Masukkan Link (URL) Gambar Sahaja
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://contoh.com/gambar-profil.jpg"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyLink}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl whitespace-nowrap cursor-pointer"
            >
              Guna Link
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          {previewUrl ? (
            <button
              type="button"
              onClick={() => {
                setSourceDataUrl('');
                setPreviewUrl('');
                setLinkInput('');
                setCanCropWithCanvas(false);
              }}
              className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Buang Gambar
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Simpan Gambar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
