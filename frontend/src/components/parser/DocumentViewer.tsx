import { useState, useRef, ChangeEvent } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '../ui/Button';
import { FlexBetween, FlexCenter, HStack } from '../ui/Layout';

// Setup PDF.js worker to use a CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  file: File;
  onClear?: () => void;
}

export function DocumentViewer({ file, onClear }: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const pageWidth = 600;
  const [password, setPassword] = useState<string>('');
  const [passwordRequired, setPasswordRequired] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [hasAttemptedPassword, setHasAttemptedPassword] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(null);
    setPasswordRequired(false);
    setPasswordError('');
    setCurrentPage(1);
    setHasAttemptedPassword(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);

    // Check for specific error types
    if (error.message.includes('password') || error.message.includes('encrypted')) {
      if (hasAttemptedPassword) {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        setPasswordError('');
      }
      setPasswordRequired(true);
      setError(null);
    } else if (error.message.includes('Invalid PDF')) {
      setError('Invalid or corrupted PDF file. Please try another file.');
    } else if (error.message.includes('fetch')) {
      setError('Failed to load PDF. The file may be corrupted or inaccessible.');
    } else {
      setError(`Failed to load PDF: ${error.message || 'Unknown error'}`);
    }
  }

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handlePageInput = (e: ChangeEvent<HTMLInputElement>) => {
    const pageNum = parseInt(e.target.value, 10);
    if (!isNaN(pageNum) && numPages && pageNum >= 1 && pageNum <= numPages) {
      setCurrentPage(pageNum);
    }
  };

  const handleExportToJSON = () => {
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
      numPages: numPages,
      currentPage: currentPage,
      exportedAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(metadata, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file.name.replace(/\.[^/.]+$/, '')}_metadata.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fileURL = URL.createObjectURL(file);

  const renderToolbar = () => (
    <FlexBetween className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm sticky top-0 z-10">
      <HStack gap={3} className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {(file.size / 1024).toFixed(2)} KB
        </span>
      </HStack>

      <HStack gap={1}>
        {/* Zoom Controls */}
        <HStack gap={1} className="border-r border-gray-200 pr-2 mr-1">
          <Button
            onClick={handleZoomOut}
            variant="icon-soft"
            title="Zoom Out"
            disabled={scale <= 0.5}
          >
            <ZoomOut className="w-4 h-4 text-gray-700" />
          </Button>
          <span className="text-sm font-medium min-w-[50px] text-center text-gray-700">
            {Math.round(scale * 100)}%
          </span>
          <Button
            onClick={handleZoomIn}
            variant="icon-soft"
            title="Zoom In"
            disabled={scale >= 3.0}
          >
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </Button>
          <Button
            onClick={handleResetZoom}
            variant="icon-soft"
            className="px-2 py-1.5 text-xs font-medium text-gray-700"
            title="Reset Zoom"
          >
            Reset
          </Button>
        </HStack>

        {/* Rotation */}
        {file.type === 'application/pdf' && (
          <Button onClick={handleRotate} variant="icon-soft" title="Rotate 90°">
            <RotateCw className="w-4 h-4 text-gray-700" />
          </Button>
        )}

        {/* Export to JSON */}
        <Button onClick={handleExportToJSON} variant="icon-soft" title="Export Metadata to JSON">
          <Download className="w-4 h-4 text-gray-700" />
        </Button>

        {/* Clear */}
        {onClear && (
          <Button
            onClick={onClear}
            variant="icon-soft"
            className="hover:bg-red-50 text-red-600 ml-1"
            title="Clear Document"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </HStack>
    </FlexBetween>
  );

  const renderPageNavigation = () => {
    if (file.type !== 'application/pdf' || !numPages) return null;

    return (
      <FlexCenter className="bg-white border-t border-gray-200 px-4 py-3 shadow-sm sticky bottom-0 z-10">
        <HStack gap={2}>
          <Button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            variant="icon-soft"
            title="Previous Page"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Button>

          <HStack gap={2}>
            <span className="text-sm text-gray-600">Page</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={handlePageInput}
              className="w-16 px-2 py-1.5 text-center text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">of {numPages}</span>
          </HStack>

          <Button
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            variant="icon-soft"
            title="Next Page"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </Button>
        </HStack>
      </FlexCenter>
    );
  };

  if (file.type.startsWith('image/')) {
    return (
      <div className="h-full flex flex-col bg-white">
        {renderToolbar()}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-50"
          style={{ minHeight: 0 }}
        >
          <FlexCenter className="h-full p-8">
            <img
              src={fileURL}
              alt="Document preview"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </FlexCenter>
        </div>
      </div>
    );
  }

  if (file.type === 'application/pdf') {
    return (
      <div className="h-full flex flex-col bg-white">
        {renderToolbar()}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-50"
          style={{ minHeight: 0 }}
        >
          {passwordRequired ? (
            <FlexCenter className="h-full p-8">
              <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 text-yellow-500">
                    <svg
                      className="w-full h-full"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Password Protected PDF
                  </h3>
                  <p className="text-sm text-gray-600">
                    This document is encrypted. Please enter the password to view it.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && password) {
                            setHasAttemptedPassword(true);
                            setPasswordRequired(false);
                            setPasswordError('');
                          }
                        }}
                        placeholder="Enter password"
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}
                  </div>
                  <button
                    onClick={() => {
                      if (password) {
                        setHasAttemptedPassword(true);
                        setPasswordRequired(false);
                        setPasswordError('');
                      }
                    }}
                    disabled={!password}
                    className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Unlock PDF
                  </button>
                </div>
              </div>
            </FlexCenter>
          ) : (
            <FlexCenter className="h-full p-8">
              <Document
                file={fileURL}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                options={{
                  password: password || undefined,
                }}
                loading={
                  <div className="text-center p-8 text-gray-600">
                    <div className="animate-pulse">Loading PDF...</div>
                  </div>
                }
              >
                {error ? (
                  <div className="text-red-600 p-8 bg-red-50 rounded-lg">{error}</div>
                ) : (
                  <Page
                    pageNumber={currentPage}
                    width={pageWidth}
                    scale={scale}
                    rotate={rotation}
                    className="shadow-lg"
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                )}
              </Document>
            </FlexCenter>
          )}
        </div>
        {renderPageNavigation()}
      </div>
    );
  }

  return <p>Unsupported file type for viewing.</p>;
}
