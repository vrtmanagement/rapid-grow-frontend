import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void> | void;
}

const CROP_SIZE = 320;
const OUTPUT_SIZE = 512;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const AvatarCropModal: React.FC<Props> = ({ file, open, onClose, onConfirm }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });
  const hasInitializedPositionRef = useRef(false);

  useEffect(() => {
    if (!file || !open) {
      setImageSrc(null);
      setImageSize({ width: 0, height: 0 });
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      hasInitializedPositionRef.current = false;
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    hasInitializedPositionRef.current = false;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, open]);

  const baseScale = useMemo(() => {
    if (!imageSize.width || !imageSize.height) return 1;
    return Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
  }, [imageSize.height, imageSize.width]);

  const scaledWidth = imageSize.width * baseScale * zoom;
  const scaledHeight = imageSize.height * baseScale * zoom;

  const clampPosition = (nextX: number, nextY: number, width = scaledWidth, height = scaledHeight) => {
    const minX = Math.min(0, CROP_SIZE - width);
    const minY = Math.min(0, CROP_SIZE - height);
    return {
      x: clamp(nextX, minX, 0),
      y: clamp(nextY, minY, 0),
    };
  };

  useEffect(() => {
    if (!imageSize.width || !imageSize.height || hasInitializedPositionRef.current) return;
    const centered = clampPosition(
      (CROP_SIZE - scaledWidth) / 2,
      (CROP_SIZE - scaledHeight) / 2,
      scaledWidth,
      scaledHeight,
    );
    setPosition(centered);
    hasInitializedPositionRef.current = true;
  }, [imageSize.width, imageSize.height, scaledHeight, scaledWidth]);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = event.clientY - dragStartRef.current.y;
      const next = clampPosition(
        positionStartRef.current.x + deltaX,
        positionStartRef.current.y + deltaY,
      );
      setPosition(next);
    };

    const handlePointerUp = () => {
      setDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, scaledHeight, scaledWidth]);

  if (!open || !file) return null;

  const updateZoom = (nextZoom: number) => {
    const clampedZoom = clamp(nextZoom, 1, 3);
    if (!imageSize.width || !imageSize.height) {
      setZoom(clampedZoom);
      return;
    }

    const previousScale = baseScale * zoom;
    const nextScale = baseScale * clampedZoom;
    const sourceCenterX = (CROP_SIZE / 2 - position.x) / previousScale;
    const sourceCenterY = (CROP_SIZE / 2 - position.y) / previousScale;
    const nextWidth = imageSize.width * nextScale;
    const nextHeight = imageSize.height * nextScale;
    const nextPosition = clampPosition(
      CROP_SIZE / 2 - sourceCenterX * nextScale,
      CROP_SIZE / 2 - sourceCenterY * nextScale,
      nextWidth,
      nextHeight,
    );

    setZoom(clampedZoom);
    setPosition(nextPosition);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageSrc) return;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    positionStartRef.current = position;
    setDragging(true);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateZoom(zoom - event.deltaY * 0.0015);
  };

  const handleConfirm = async () => {
    if (!imageSrc || !imageSize.width || !imageSize.height) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) return;

    const renderedScale = baseScale * zoom;
    const sourceX = Math.max(0, -position.x / renderedScale);
    const sourceY = Math.max(0, -position.y / renderedScale);
    const sourceSize = CROP_SIZE / renderedScale;

    const image = new Image();
    image.src = imageSrc;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to prepare image'));
    });

    context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((createdBlob) => resolve(createdBlob), 'image/jpeg', 0.92);
    });
    if (!blob) return;

    const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '-avatar.jpg', {
      type: 'image/jpeg',
    });

    setSubmitting(true);
    try {
      await onConfirm(croppedFile);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const previewScale = 128 / CROP_SIZE;
  const previewWidth = scaledWidth * previewScale;
  const previewHeight = scaledHeight * previewScale;
  const previewPosition = {
    x: position.x * previewScale,
    y: position.y * previewScale,
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl rounded-[2rem] bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Adjust profile photo</h3>
            <p className="text-sm text-slate-500 mt-1">
              Drag to reposition and use the circle to control what stays visible.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
        </div>

        <div className="p-8 grid lg:grid-cols-[1fr_260px] gap-8 items-start">
          <div className="space-y-5">
            <div className="mx-auto w-full max-w-[420px] aspect-square rounded-[2rem] bg-slate-900 p-6">
              <div
                className="relative mx-auto h-[320px] w-[320px] overflow-hidden rounded-[2rem] touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onWheel={handleWheel}
              >
                <div className="absolute inset-0 bg-slate-950" />
                {imageSrc && (
                  <img
                    src={imageSrc}
                    alt="Crop preview"
                    draggable={false}
                    onLoad={(event) => {
                      const target = event.currentTarget;
                      setImageSize({
                        width: target.naturalWidth,
                        height: target.naturalHeight,
                      });
                    }}
                    className="absolute top-0 left-0 select-none max-w-none"
                    style={{
                      width: `${scaledWidth}px`,
                      height: `${scaledHeight}px`,
                      transform: `translate(${position.x}px, ${position.y}px)`,
                    }}
                  />
                )}
                <div className="pointer-events-none absolute inset-0 bg-slate-950/55 [clip-path:circle(50%)]" />
                <div className="pointer-events-none absolute inset-0 border-[999px] border-slate-950/55 rounded-full" />
                <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => updateZoom(Number(event.target.value))}
                className="w-full accent-brand-red"
                disabled={submitting}
              />
              <p className="text-xs text-slate-400">You can also scroll on the image to zoom.</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 space-y-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">Live preview</p>
              <p className="text-sm text-slate-500 mt-1">
                This is how your profile picture will appear after upload.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-200">
                {imageSrc && (
                  <img
                    src={imageSrc}
                    alt="Avatar preview"
                    className="max-w-none"
                    style={{
                      width: `${previewWidth}px`,
                      height: `${previewHeight}px`,
                      transform: `translate(${previewPosition.x}px, ${previewPosition.y}px)`,
                    }}
                  />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full py-3 rounded-full bg-brand-red text-white text-sm font-bold tracking-[0.12em] uppercase shadow-lg hover:bg-brand-navy transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Applying...' : 'Apply photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal;
