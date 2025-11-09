import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import { Alert } from '../../../components/ui/Alert';
import { FileText, Upload, Settings, Brain, TrendingUp, Info } from 'lucide-react';

import { MultiLevelParser } from './MultiLevelParser';
import { FileUploadZone } from '../../../components/ui/FileUploadZone';
import { useToast } from '../../../components/ui/Toast';

interface StatementParserProps {
  onParsingComplete?: (result: any) => void;
}

export function StatementParser({ onParsingComplete }: StatementParserProps) {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File, password?: string) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (password) formData.append('password', password);

      // Always use multi-level parsing in this interface
      formData.append('use_multi_level_parsing', 'true');

      const response = await fetch('/api/enhanced-upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setUploadSessionId(result.session_id);
        setFileName(file.name);
        setFileType(result.file_type);
        setActiveTab('parser');
      } else if (result.requires_manual_correction) {
        setUploadSessionId(result.session_id);
        setFileName(file.name);
        setFileType(result.file_type || 'unknown');
        setActiveTab('parser');
      } else {
        showError('Upload Failed', result.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('Upload Failed', 'Network error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (files: FileList) => {
    if (files.length === 0) return;

    const file = files[0];
    await handleFileUpload(file);
  };

  const handleParsingComplete = (result: any) => {
    setActiveTab('results');
    showSuccess('Parsing Complete', `Parsed ${result.total_transactions} transactions`);

    if (onParsingComplete) {
      onParsingComplete(result);
    }
  };

  const resetParser = () => {
    setUploadSessionId(null);
    setFileName('');
    setFileType('');
    setActiveTab('upload');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <div className="p-6">
          <div className="mb-6">
            <HStack as="h1" className="text-2xl font-bold gap-3 text-gray-900 dark:text-white">
              <Brain className="w-6 h-6 text-blue-600" />
              Advanced Statement Parser
            </HStack>
            <p className="text-gray-600 mt-2">
              Upload financial statements and use our multi-level parsing system with progressive
              fallback strategies
            </p>
          </div>
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                onClick={() => setActiveTab('parser')}
                disabled={!uploadSessionId}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === 'parser'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Settings className="w-4 h-4" />
                Parse Statement
              </button>
              <button
                onClick={() => setActiveTab('results')}
                disabled={!uploadSessionId}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === 'results'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <TrendingUp className="w-4 h-4" />
                Results
              </button>
            </div>

            {activeTab === 'upload' && (
              <div className="space-y-6">
                <Alert className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                  <Info className="w-4 h-4" />
                  <div className="ml-2">
                    <strong>Supported File Types:</strong> PDF, CSV, Excel (.xlsx, .xls), JSON
                    <br />
                    <strong>Features:</strong> Password-protected PDFs, Column mapping, Regex
                    patterns, AI parsing
                  </div>
                </Alert>

                <FileUploadZone
                  isDragging={false}
                  onDragOver={() => {}}
                  onDragLeave={() => {}}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const files = e.dataTransfer.files;
                    await handleFileSelect(files);
                  }}
                  onBrowseClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf,.csv,.xlsx,.xls,.json';
                    input.onchange = async (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files) {
                        await handleFileSelect(target.files);
                      }
                    };
                    input.click();
                  }}
                  acceptedTypes="PDF, CSV, Excel, JSON"
                  maxSize="50MB"
                  features={[
                    'Multi-level parsing',
                    'UI column mapping',
                    'Regex pattern matching',
                    'AI-powered parsing',
                    'Password-protected PDFs',
                    'Learning dataset collection',
                  ]}
                />

                {isUploading && (
                  <FlexBetween className="py-8">
                    <HStack className="gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Uploading and analyzing file...</span>
                    </HStack>
                  </FlexBetween>
                )}
              </div>
            )}

            {activeTab === 'parser' && (
              <div className="mt-6">
                {uploadSessionId && (
                  <MultiLevelParser
                    sessionId={uploadSessionId}
                    fileType={fileType}
                    fileName={fileName}
                    onParsingComplete={handleParsingComplete}
                    onCancel={resetParser}
                  />
                )}
              </div>
            )}

            {activeTab === 'results' && (
              <div className="mt-6">
                <Card>
                  <div className="p-6">
                    <div className="mb-4">
                      <HStack
                        as="h3"
                        className="text-lg font-semibold gap-2 text-gray-900 dark:text-white"
                      >
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        Parsing Results
                      </HStack>
                    </div>
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">
                        Your transactions have been parsed successfully!
                      </p>
                      <HStack className="gap-3 justify-center">
                        <Button onClick={resetParser} variant="outline">
                          Parse Another File
                        </Button>
                        <Button onClick={() => (window.location.href = '/finance/transactions')}>
                          View Transactions
                        </Button>
                      </HStack>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <HStack className="gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">UI Column Mapping</h3>
          </HStack>
          <p className="text-sm text-gray-600">
            Interactive column mapping for CSV and Excel files with auto-detection
          </p>
        </Card>

        <Card className="p-4">
          <HStack className="gap-3 mb-2">
            <Settings className="w-5 h-5 text-purple-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">Regex Patterns</h3>
          </HStack>
          <p className="text-sm text-gray-600">
            Create and test custom regex patterns for structured text parsing
          </p>
        </Card>

        <Card className="p-4">
          <HStack className="gap-3 mb-2">
            <Brain className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">AI Parsing</h3>
          </HStack>
          <p className="text-sm text-gray-600">
            Intelligent parsing for complex documents using advanced AI models
          </p>
        </Card>

        <Card className="p-4">
          <HStack className="gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">Learning System</h3>
          </HStack>
          <p className="text-sm text-gray-600">
            Continuously improves parsing accuracy based on user feedback
          </p>
        </Card>
      </div>
    </div>
  );
}
