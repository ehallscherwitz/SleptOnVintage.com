import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cropImageBase64, type CropRegion } from '../utils/cropImage';

type CropRect = { x: number; y: number; size: number };

type ImageMetrics = {
  offsetX: number;
  offsetY: number;
  renderedW: number;
  renderedH: number;
  naturalW: number;
  naturalH: number;
};

const MIN_CROP_PX = 48;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function centeredSquareCrop(metrics: ImageMetrics): CropRect {
  const size = Math.min(metrics.renderedW, metrics.renderedH);
  return {
    x: (metrics.renderedW - size) / 2,
    y: (metrics.renderedH - size) / 2,
    size,
  };
}

function displayCropToNatural(crop: CropRect, metrics: ImageMetrics): CropRegion {
  const scale = metrics.naturalW / metrics.renderedW;
  return {
    x: crop.x * scale,
    y: crop.y * scale,
    size: crop.size * scale,
  };
}

function measureImage(img: HTMLImageElement): ImageMetrics | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const rect = img.getBoundingClientRect();
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const scale = Math.min(rect.width / naturalW, rect.height / naturalH);
  const renderedW = naturalW * scale;
  const renderedH = naturalH * scale;
  return {
    offsetX: (rect.width - renderedW) / 2,
    offsetY: (rect.height - renderedH) / 2,
    renderedW,
    renderedH,
    naturalW,
    naturalH,
  };
}

export type AdminImageCropModalProps = {
  fileName: string;
  dataBase64: string;
  contentType: string;
  busy?: boolean;
  onCancel: () => void;
  onApply: (result: { base64: string; contentType: string }) => void | Promise<void>;
};

const AdminImageCropModal: React.FC<AdminImageCropModalProps> = ({
  fileName,
  dataBase64,
  contentType,
  busy = false,
  onCancel,
  onApply,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const dragRef = useRef<{
    mode: 'move' | 'resize';
    pointerId: number;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  const src = `data:${contentType};base64,${dataBase64}`;

  const syncMetrics = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const next = measureImage(img);
    if (!next) return;
    setMetrics(next);
    setCrop((prev) => {
      if (!prev) return centeredSquareCrop(next);
      const maxSize = Math.min(next.renderedW, next.renderedH);
      const size = clamp(prev.size, MIN_CROP_PX, maxSize);
      return {
        size,
        x: clamp(prev.x, 0, next.renderedW - size),
        y: clamp(prev.y, 0, next.renderedH - size),
      };
    });
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const ro = new ResizeObserver(() => syncMetrics());
    ro.observe(img);
    return () => ro.disconnect();
  }, [syncMetrics]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !metrics) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const maxSize = Math.min(metrics.renderedW, metrics.renderedH);

      if (drag.mode === 'move') {
        const size = drag.startCrop.size;
        setCrop({
          size,
          x: clamp(drag.startCrop.x + dx, 0, metrics.renderedW - size),
          y: clamp(drag.startCrop.y + dy, 0, metrics.renderedH - size),
        });
        return;
      }

      const delta = Math.max(dx, dy);
      const size = clamp(drag.startCrop.size + delta, MIN_CROP_PX, maxSize);
      const maxFromOrigin = Math.min(metrics.renderedW - drag.startCrop.x, metrics.renderedH - drag.startCrop.y);
      setCrop({
        x: drag.startCrop.x,
        y: drag.startCrop.y,
        size: Math.min(size, maxFromOrigin),
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dragRef.current?.pointerId === e.pointerId) endDrag();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [endDrag, metrics]);

  const startDrag = (mode: 'move' | 'resize', e: React.PointerEvent) => {
    if (!crop || busy) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: crop,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const applyCrop = async () => {
    if (!crop || !metrics) return;
    setApplyError(null);
    try {
      const region = displayCropToNatural(crop, metrics);
      const result = await cropImageBase64(dataBase64, contentType, region, fileName);
      await onApply(result);
    } catch (ex) {
      setApplyError(ex instanceof Error ? ex.message : 'Crop failed');
    }
  };

  const boxStyle =
    crop && metrics
      ? {
          left: metrics.offsetX + crop.x,
          top: metrics.offsetY + crop.y,
          width: crop.size,
          height: crop.size,
        }
      : undefined;

  return (
    <div className="admin-crop-overlay" role="dialog" aria-modal="true" aria-labelledby="admin-crop-title">
      <div className="admin-crop-panel">
        <h2 id="admin-crop-title" className="admin-crop-title">
          Crop to square (1:1)
        </h2>
        <p className="admin-crop-hint">
          Drag the box to reposition. Drag the corner to resize. <strong>{fileName}</strong>
        </p>

        <div className="admin-crop-viewport">
          <img
            ref={imgRef}
            src={src}
            alt="Crop preview"
            className="admin-crop-image"
            draggable={false}
            onLoad={syncMetrics}
          />
          {boxStyle && (
            <div
              className="admin-crop-box"
              style={boxStyle}
              onPointerDown={(e) => startDrag('move', e)}
            >
              <div
                className="admin-crop-handle"
                aria-hidden
                onPointerDown={(e) => startDrag('resize', e)}
              />
            </div>
          )}
        </div>

        {applyError && <div className="checkout-alert checkout-alert--error">{applyError}</div>}

        <div className="admin-crop-actions">
          <button type="button" className="checkout-btn-secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="checkout-btn-primary" disabled={busy || !crop} onClick={() => void applyCrop()}>
            {busy ? 'Saving…' : 'Apply crop'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminImageCropModal;
