import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import {
  FileText,
  Table,
  Brain,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

import { ColumnMappingInterface } from './ColumnMappingInterface';
import { RegexPatternBuilder } from './RegexPatternBuilder';
import { ManualAnnotationInterface } from './ManualAnnotationInterface';

interface MultiLevelParserProps {
  sessionId: string;
  fileType: string;
  fileName: string;
  onParsingComplete: (result: ParseResult) => void;
  onCancel: () => void;
}

interface ParseResult {
  success: boolean;
  parsing_method: string;
  total_transactions: number;
  transactions: Transaction[];
  confidence: number;
  parsing_time: number;
  error?: string;
  requires_manual_correction?: boolean;
  manual_correction_data?: any;
}

interface Transaction {
  date: string;
  amount: number;
  description: string;
  transaction_type: string;
  confidence?: number;
}

interface ParsingAttempt {
  method: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  transactions_found: number;
  confidence: number;
  error_message: string;
  duration: number;
}

const PARSING_METHODS = [
  {
    id: 'ui_column_extraction',
    name: 'UI Column Extraction',
    description: 'Interactive column mapping for CSV/Excel files',
    icon: Table,
    supportedTypes: ['csv', 'excel', 'xlsx'],
  },
  {
    id: 'regex_patterns',
    name: 'Regex Patterns',
    description: 'Pattern-based extraction for structured text',
    icon: FileText,
    supportedTypes: ['pdf', 'txt', 'csv'],
  },
  {
    id: 'ai_parsing',
    name: 'AI Parsing',
    description: 'Intelligent parsing for complex documents',
    icon: Brain,
    supportedTypes: ['pdf', 'txt', 'csv', 'excel', 'xlsx'],
  },
  {
    id: 'manual_correction',
    name: 'Manual Correction',
    description: 'Manual annotation and correction',
    icon: User,
    supportedTypes: ['pdf', 'txt', 'csv', 'excel', 'xlsx'],
  },
];

export function MultiLevelParser({
  sessionId,
  fileType,
  fileName,
  onParsingComplete,
  onCancel,
}: MultiLevelParserProps) {
  const [currentMethod, setCurrentMethod] = useState<string>('ui_column_extraction');
  const [parsingAttempts, setParsingAttempts] = useState<ParsingAttempt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [manualCorrectionData, setManualCorrectionData] = useState<any>(null);

  useEffect(() => {
    loadParsingAttempts();
  }, [sessionId]);

  const loadParsingAttempts = async () => {
    try {
      const response = await fetch(`/api/finance/sessions/${sessionId}/parsing-attempts/`);
      if (response.ok) {
        const data = await response.json();
        setParsingAttempts(data.attempts || []);
      }
    } catch (error) {
      console.error('Failed to load parsing attempts:', error);
    }
  };

  const startMultiLevelParsing = async (forceMethod?: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/finance/sessions/${sessionId}/multi-level-parse/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force_method: forceMethod,
          max_attempts: 4,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setParseResult(result);
        onParsingComplete(result);
      } else if (result.requires_manual_correction) {
        setParseResult(result);
        setManualCorrectionData(result.manual_correction_data);
      } else {
        setParseResult(result);
      }

      // Refresh parsing attempts
      await loadParsingAttempts();
    } catch (error) {
      console.error('Multi-level parsing failed:', error);
      setParseResult({
        success: false,
        parsing_method: 'error',
        total_transactions: 0,
        transactions: [],
        confidence: 0,
        parsing_time: 0,
        error: 'Network error occurred',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualColumnMapping = async (columnMappings: Record<string, string>) => {
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/finance/sessions/${sessionId}/manual-column-mapping/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          column_mappings: columnMappings,
        }),
      });

      const result = await response.json();
      setParseResult(result);

      if (result.success) {
        onParsingComplete(result);
      }

      await loadParsingAttempts();
    } catch (error) {
      console.error('Manual column mapping failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualAnnotation = async (annotations: Transaction[]) => {
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/finance/sessions/${sessionId}/manual-annotation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          annotations,
          validation_notes: 'Manual annotation from multi-level parser',
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Create a synthetic parse result for manual annotations
        const parseResult: ParseResult = {
          success: true,
          parsing_method: 'manual_annotation',
          total_transactions: annotations.length,
          transactions: annotations,
          confidence: 1.0,
          parsing_time: 0,
        };

        setParseResult(parseResult);
        onParsingComplete(parseResult);
      }

      await loadParsingAttempts();
    } catch (error) {
      console.error('Manual annotation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const supportedMethods = PARSING_METHODS.filter((method) =>
    method.supportedTypes.includes(fileType.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <HStack gap={2}>
              <FileText className="w-5 h-5" />
              Multi-Level Statement Parser
            </HStack>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Progressive parsing system with multiple fallback strategies for {fileName}
          </p>
        </CardHeader>
        <CardContent>
          {/* Parsing Status */}
          {parsingAttempts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">Previous Parsing Attempts</h3>
              <div className="space-y-2">
                {parsingAttempts.map((attempt, index) => (
                  <FlexBetween key={index} className="p-3 border rounded-lg">
                    <HStack gap={3}>
                      {getStatusIcon(attempt.status)}
                      <div>
                        <p className="font-medium text-sm">
                          {PARSING_METHODS.find((m) => m.id === attempt.method)?.name ||
                            attempt.method}
                        </p>
                        <p className="text-xs text-gray-500">
                          {attempt.transactions_found} transactions found
                        </p>
                      </div>
                    </HStack>
                    <div className="text-right">
                      <Badge className={getConfidenceColor(attempt.confidence)}>
                        {Math.round(attempt.confidence * 100)}% confidence
                      </Badge>
                      {attempt.duration > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{attempt.duration.toFixed(1)}s</p>
                      )}
                    </div>
                  </FlexBetween>
                ))}
              </div>
            </div>
          )}

          {/* Parsing Result */}
          {parseResult && (
            <div className="mb-6">
              {parseResult.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Successfully parsed {parseResult.total_transactions} transactions using{' '}
                    {parseResult.parsing_method}
                    {parseResult.confidence && (
                      <span className="ml-2">
                        (Confidence: {Math.round(parseResult.confidence * 100)}%)
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {parseResult.error || 'Parsing failed'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button
              onClick={() => startMultiLevelParsing()}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : 'Start Auto Parsing'}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
          </div>

          {/* Manual Correction Interface */}
          {parseResult?.requires_manual_correction && manualCorrectionData && (
            <Tabs defaultValue="column-mapping" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="column-mapping">Column Mapping</TabsTrigger>
                <TabsTrigger value="regex-patterns">Regex Patterns</TabsTrigger>
                <TabsTrigger value="manual-annotation">Manual Annotation</TabsTrigger>
              </TabsList>

              <TabsContent value="column-mapping">
                <ColumnMappingInterface
                  sessionId={sessionId}
                  fileType={fileType}
                  onSubmit={handleManualColumnMapping}
                  isProcessing={isProcessing}
                />
              </TabsContent>

              <TabsContent value="regex-patterns">
                <RegexPatternBuilder
                  sessionId={sessionId}
                  fileType={fileType}
                  textContent={manualCorrectionData.text_content}
                  onPatternCreated={() => startMultiLevelParsing('regex_patterns')}
                  isProcessing={isProcessing}
                />
              </TabsContent>

              <TabsContent value="manual-annotation">
                <ManualAnnotationInterface
                  sessionId={sessionId}
                  textContent={manualCorrectionData.text_content}
                  onSubmit={handleManualAnnotation}
                  isProcessing={isProcessing}
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Method Selection for Retry */}
          {!parseResult?.success && !isProcessing && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-3">Try Specific Method</h3>
              <div className="grid grid-cols-2 gap-3">
                {supportedMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <Button
                      key={method.id}
                      variant="outline"
                      onClick={() => startMultiLevelParsing(method.id)}
                      className="h-auto p-4"
                    >
                      <HStack gap={2}>
                        <Icon className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium text-sm">{method.name}</div>
                          <div className="text-xs text-gray-500">{method.description}</div>
                        </div>
                      </HStack>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
