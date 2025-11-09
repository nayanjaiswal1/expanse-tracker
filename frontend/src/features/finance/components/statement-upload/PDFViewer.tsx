/**
 * PDF Viewer with interactive region selection for table extraction.
 */

import React, { useState, useRef, useEffect } from 'react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PDFViewerProps {
  imageUrl: string;
  onRegionSelected?: (box: BoundingBox) => void;
  existingRegions?: Array<BoundingBox & { id: string; label: string }>;
  isDrawingEnabled?: boolean;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  imageUrl,
  onRegionSelected,
  existingRegions = [],
  isDrawingEnabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Load and draw image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to image size
      canvas.width = img.width;
      canvas.height = img.height;
      setImageSize({ width: img.width, height: img.height });

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Draw existing regions
      drawExistingRegions(ctx, img.width, img.height);
    };
    img.src = imageUrl;
  }, [imageUrl, existingRegions]);

  const drawExistingRegions = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    existingRegions.forEach((region, index) => {
      const x = (region.x / 100) * width;
      const y = (region.y / 100) * height;
      const w = (region.width / 100) * width;
      const h = (region.height / 100) * height;

      // Draw rectangle
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Draw label
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(x, y - 20, 100, 20);
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.fillText(region.label || `Table ${index + 1}`, x + 5, y - 5);
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentBox(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const box: BoundingBox = {
      x: Math.min(startPoint.x, currentX),
      y: Math.min(startPoint.y, currentY),
      width: Math.abs(currentX - startPoint.x),
      height: Math.abs(currentY - startPoint.y),
    };

    setCurrentBox(box);

    // Redraw canvas with current box
    redrawCanvas(box);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !startPoint) return;

    setIsDrawing(false);

    // Convert pixel coordinates to percentages
    const percentBox: BoundingBox = {
      x: (currentBox.x / imageSize.width) * 100,
      y: (currentBox.y / imageSize.height) * 100,
      width: (currentBox.width / imageSize.width) * 100,
      height: (currentBox.height / imageSize.height) * 100,
    };

    // Only emit if box is large enough (> 20x20 pixels)
    if (currentBox.width > 20 && currentBox.height > 20) {
      onRegionSelected?.(percentBox);
    }

    setStartPoint(null);
    setCurrentBox(null);
  };

  const redrawCanvas = (activeBox: BoundingBox | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reload and redraw image
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw existing regions
      drawExistingRegions(ctx, img.width, img.height);

      // Draw current selection
      if (activeBox) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(activeBox.x, activeBox.y, activeBox.width, activeBox.height);
        ctx.setLineDash([]);

        // Semi-transparent fill
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.fillRect(activeBox.x, activeBox.y, activeBox.width, activeBox.height);
      }
    };
    img.src = imageUrl;
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto bg-gray-100 rounded-lg border border-gray-300"
      style={{ height: '100%' }}
    >
      {isDrawingEnabled && (
        <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-xs px-3 py-1 rounded shadow">
          Draw a rectangle around the table to extract
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={isDrawingEnabled ? 'cursor-crosshair' : 'cursor-default'}
      />
    </div>
  );
};
