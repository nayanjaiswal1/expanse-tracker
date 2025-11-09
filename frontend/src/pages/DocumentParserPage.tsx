import { useState, useCallback, lazy, Suspense } from 'react';
import { useDropzone } from 'react-dropzone';
import { Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../api/client';
import { EnhancedParsedDataViewer } from '../components/parser/EnhancedParsedDataViewer';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { FlexCenter } from '../components/ui/Layout';

// Lazy load DocumentViewer to reduce initial bundle size (includes large PDF.js library)
const DocumentViewer = lazy(() =>
  import('../components/parser/DocumentViewer').then((module) => ({
    default: module.DocumentViewer,
  }))
);

export function DocumentParserPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const parseWithPassword = useCallback(async (uploadedFile: File, pwd?: string) => {
    setIsLoading(true);
    setError(null);
    setPasswordError('');

    try {
      const data = await apiClient.parseDocument(uploadedFile, pwd);
      setParsedData(data);
      setPasswordRequired(false);
      setPassword('');
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.password_required) {
        setPasswordRequired(true);
        setPasswordError('');
      } else if (errorData?.error?.includes('Incorrect password')) {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        setError(errorData?.error || 'Failed to parse document.');
        setPasswordRequired(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const uploadedFile = acceptedFiles[0];
      setFile(uploadedFile);
      setParsedData(null);
      setError(null);
      setPasswordRequired(false);
      setPassword('');
      setPasswordError('');

      await parseWithPassword(uploadedFile);
    },
    [parseWithPassword]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif'],
      'image/bmp': ['.bmp'],
    },
    maxFiles: 1,
  });

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Document Parser</h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload and parse bank statements, receipts, and invoices
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {!file && (
          <FlexCenter className="h-full p-6">
            <div
              {...getRootProps()}
              className={`w-full max-w-2xl border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-center p-16">
                <div className="mx-auto w-16 h-16 mb-4 text-gray-400">
                  <svg
                    className="w-full h-full"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  Drag & drop a document here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, JPG, PNG, TIFF, BMP (Max 10MB)
                </p>
              </div>
            </div>
          </FlexCenter>
        )}

        {isLoading && (
          <FlexCenter className="h-full">
            <div className="text-center">
              <LoadingSpinner />
              <p className="mt-4 text-lg font-medium text-gray-700">Parsing document...</p>
              <p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
            </div>
          </FlexCenter>
        )}

        {passwordRequired && file && (
          <FlexCenter className="h-full p-6">
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
                  Password Protected Document
                </h3>
                <p className="text-sm text-gray-600">
                  This document is encrypted. Please enter the password to continue parsing.
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
                        if (e.key === 'Enter' && password && file) {
                          parseWithPassword(file, password);
                        }
                      }}
                      placeholder="Enter password"
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPasswordRequired(false);
                      setFile(null);
                      setPassword('');
                      setPasswordError('');
                      setShowPassword(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (password && file) {
                        parseWithPassword(file, password);
                      }
                    }}
                    disabled={!password || isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Unlocking...' : 'Unlock'}
                  </button>
                </div>
              </div>
            </div>
          </FlexCenter>
        )}

        {error && !passwordRequired && (
          <FlexCenter className="h-full p-6">
            <div className="max-w-md text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-red-500">
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
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-xl font-semibold text-gray-900 mb-2">Parsing Failed</p>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => {
                  setFile(null);
                  setError(null);
                }}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Another File
              </button>
            </div>
          </FlexCenter>
        )}

        {file && !isLoading && parsedData && (
          <div className="h-full flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
            {/* Document Viewer Panel */}
            <div className="flex-1 flex flex-col border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden min-h-0">
              <Suspense
                fallback={
                  <FlexCenter className="h-full">
                    <div className="text-center">
                      <LoadingSpinner />
                      <p className="mt-4 text-sm text-gray-600">Loading PDF viewer...</p>
                    </div>
                  </FlexCenter>
                }
              >
                <DocumentViewer
                  file={file}
                  onClear={() => {
                    setFile(null);
                    setParsedData(null);
                    setError(null);
                  }}
                />
              </Suspense>
            </div>

            {/* Parsed Data Panel */}
            <div className="flex-1 flex flex-col border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden min-h-0">
              <div className="border-b border-gray-200 px-4 py-3 bg-white flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">Extracted Data & Import</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Review, edit, and import transactions to your account
                </p>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
                <EnhancedParsedDataViewer
                  data={parsedData}
                  onImportComplete={() => {
                    // Optionally refresh or show success message
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
