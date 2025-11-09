import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import { FileText, TestTube, CheckCircle, XCircle } from 'lucide-react';

interface RegexPatternBuilderProps {
  sessionId: string;
  fileType: string;
  textContent: string[];
  onPatternCreated: () => void;
  isProcessing: boolean;
}

interface PatternExample {
  name: string;
  pattern: string;
  description: string;
  groups: Record<string, string>;
}

interface TestResult {
  success: boolean;
  matches_found: number;
  matches: Array<{
    line: string;
    groups: string[];
    extracted_data: Record<string, string>;
  }>;
  pattern_valid: boolean;
  error?: string;
}

interface ExistingPattern {
  id: number;
  pattern_name: string;
  regex_pattern: string;
  confidence_score: number;
  success_count: number;
  failure_count: number;
  is_built_in: boolean;
}

const FIELD_TYPES = [
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'description', label: 'Description' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'balance', label: 'Balance' },
  { value: 'type', label: 'Transaction Type' },
];

export function RegexPatternBuilder({
  sessionId,
  fileType,
  textContent,
  onPatternCreated,
  isProcessing,
}: RegexPatternBuilderProps) {
  const [patternName, setPatternName] = useState('');
  const [regexPattern, setRegexPattern] = useState('');
  const [description, setDescription] = useState('');
  const [groupMappings, setGroupMappings] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [existingPatterns, setExistingPatterns] = useState<ExistingPattern[]>([]);
  const [selectedExample, setSelectedExample] = useState<string>('');

  const PATTERN_EXAMPLES: PatternExample[] = [
    {
      name: 'Date Amount Description',
      pattern: '(\\d{1,2}/\\d{1,2}/\\d{4})\\s+(.+?)\\s+(\\$[\\d,]+\\.\\d{2})',
      description: 'Matches: 12/31/2023 WALMART $45.67',
      groups: { '1': 'date', '2': 'description', '3': 'amount' },
    },
    {
      name: 'Date Description Debit Credit',
      pattern:
        '(\\d{1,2}/\\d{1,2}/\\d{4})\\s+(.+?)\\s+(\\$[\\d,]*\\.?\\d*)\\s+(\\$[\\d,]*\\.?\\d*)',
      description: 'Matches debit/credit format',
      groups: { '1': 'date', '2': 'description', '3': 'debit', '4': 'credit' },
    },
    {
      name: 'Date Posted Description Amount Balance',
      pattern:
        '(\\d{1,2}/\\d{1,2}/\\d{4})\\s+(\\d{1,2}/\\d{1,2}/\\d{4})\\s+(.+?)\\s+([-+]?\\$[\\d,]+\\.\\d{2})\\s+(\\$[\\d,]+\\.\\d{2})',
      description: 'Matches posted date format with balance',
      groups: { '1': 'date', '3': 'description', '4': 'amount', '5': 'balance' },
    },
  ];

  useEffect(() => {
    loadExistingPatterns();
  }, [fileType]);

  const loadExistingPatterns = async () => {
    try {
      const response = await fetch(`/api/finance/regex-patterns/?file_type=${fileType}`);
      if (response.ok) {
        const patterns = await response.json();
        setExistingPatterns(patterns);
      }
    } catch (error) {
      console.error('Failed to load existing patterns:', error);
    }
  };

  const handleExampleSelect = (exampleName: string) => {
    const example = PATTERN_EXAMPLES.find((e) => e.name === exampleName);
    if (example) {
      setPatternName(example.name);
      setRegexPattern(example.pattern);
      setDescription(example.description);
      setGroupMappings(example.groups);
      setSelectedExample(exampleName);
    }
  };

  const handleGroupMappingChange = (groupNumber: string, fieldType: string) => {
    setGroupMappings((prev) => ({
      ...prev,
      [groupNumber]: fieldType === 'none' ? '' : fieldType,
    }));
  };

  const testPattern = async () => {
    if (!regexPattern) {
      setTestResult({
        success: false,
        matches_found: 0,
        matches: [],
        pattern_valid: false,
        error: 'Please enter a regex pattern',
      });
      return;
    }

    setIsTesting(true);

    try {
      const response = await fetch('/api/finance/regex-patterns/test/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regex_pattern: regexPattern,
          test_text: textContent.join('\n'),
          group_mappings: groupMappings,
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('Pattern testing failed:', error);
      setTestResult({
        success: false,
        matches_found: 0,
        matches: [],
        pattern_valid: false,
        error: 'Network error occurred',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const createPattern = async () => {
    if (!patternName || !regexPattern) {
      return;
    }

    try {
      const response = await fetch('/api/finance/regex-patterns/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern_name: patternName,
          regex_pattern: regexPattern,
          description,
          file_type: fileType,
          group_mappings: groupMappings,
        }),
      });

      if (response.ok) {
        onPatternCreated();
        // Reset form
        setPatternName('');
        setRegexPattern('');
        setDescription('');
        setGroupMappings({});
        setTestResult(null);
        setSelectedExample('');
        // Reload existing patterns
        await loadExistingPatterns();
      } else {
        const error = await response.json();
        setTestResult({
          success: false,
          matches_found: 0,
          matches: [],
          pattern_valid: false,
          error: error.error || 'Failed to create pattern',
        });
      }
    } catch (error) {
      console.error('Pattern creation failed:', error);
    }
  };

  const getPatternGroupCount = (pattern: string) => {
    try {
      const regex = new RegExp(pattern);
      // Count the number of capturing groups
      const matches = 'test'.match(regex);
      return pattern.split('(').length - 1;
    } catch {
      return 0;
    }
  };

  const groupCount = getPatternGroupCount(regexPattern);

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <HStack gap={2}>
                <FileText className="w-5 h-5" />
                Regex Pattern Builder
              </HStack>
            </h2>
            <p className="text-sm text-gray-600">
              Create custom regex patterns for extracting transaction data
            </p>
          </div>
          <div className="space-y-6">
            {/* Pattern Examples */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pattern Examples
              </label>
              <select
                value={selectedExample}
                onChange={(e) => handleExampleSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a pattern example</option>
                {PATTERN_EXAMPLES.map((example) => (
                  <option key={example.name} value={example.name}>
                    {example.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pattern Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="pattern-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Pattern Name
                </label>
                <input
                  id="pattern-name"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  placeholder="My Pattern"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this pattern matches"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="regex-pattern"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Regex Pattern
              </label>
              <textarea
                id="regex-pattern"
                value={regexPattern}
                onChange={(e) => setRegexPattern(e.target.value)}
                placeholder="Enter your regex pattern with capturing groups"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={3}
              />
              {regexPattern && (
                <p className="text-xs text-gray-500 mt-1">
                  Detected {groupCount} capturing group{groupCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Group Mappings */}
            {groupCount > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Mappings
                </label>
                <p className="text-xs text-gray-500 mb-3">Map regex groups to transaction fields</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: groupCount }, (_, i) => i + 1).map((groupNum) => (
                    <HStack key={groupNum} gap={2}>
                      <span className="text-sm font-medium w-16">Group {groupNum}:</span>
                      <select
                        value={groupMappings[groupNum.toString()] || 'none'}
                        onChange={(e) =>
                          handleGroupMappingChange(groupNum.toString(), e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">No mapping</option>
                        {FIELD_TYPES.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </HStack>
                  ))}
                </div>
              </div>
            )}

            {/* Test Pattern */}
            <div className="flex gap-3">
              <Button onClick={testPattern} disabled={isTesting || !regexPattern} variant="outline">
                <HStack gap={2}>
                  <TestTube className="w-4 h-4" />
                  {isTesting ? 'Testing...' : 'Test Pattern'}
                </HStack>
              </Button>
              <Button
                onClick={createPattern}
                disabled={isProcessing || !patternName || !regexPattern}
                className="flex-1"
              >
                {isProcessing ? 'Creating...' : 'Create Pattern'}
              </Button>
            </div>

            {/* Test Results */}
            {testResult && (
              <div>
                <h3 className="text-sm font-medium mb-3">Test Results</h3>
                {testResult.pattern_valid ? (
                  <Alert className="border-green-200 bg-green-50">
                    <HStack gap={2}>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">
                        Pattern is valid. Found {testResult.matches_found} matches.
                      </span>
                    </HStack>
                  </Alert>
                ) : (
                  <Alert className="border-red-200 bg-red-50">
                    <HStack gap={2}>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-700">
                        {testResult.error || 'Pattern is invalid'}
                      </span>
                    </HStack>
                  </Alert>
                )}

                {/* Show sample matches */}
                {testResult.matches && testResult.matches.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Sample Matches:</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {testResult.matches.slice(0, 5).map((match, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-gray-50">
                          <p className="text-sm font-mono mb-2">{match.line}</p>
                          {Object.entries(match.extracted_data).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(match.extracted_data).map(([field, value]) => (
                                <Badge key={field} variant="outline" className="text-xs">
                                  {field}: {value}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {testResult.matches.length > 5 && (
                        <p className="text-xs text-gray-500">
                          ... and {testResult.matches.length - 5} more matches
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Existing Patterns */}
            {existingPatterns.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Existing Patterns</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {existingPatterns.map((pattern) => (
                    <FlexBetween key={pattern.id} className="p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{pattern.pattern_name}</p>
                        <p className="text-xs text-gray-500 font-mono">{pattern.regex_pattern}</p>
                      </div>
                      <HStack gap={2}>
                        <Badge
                          className={
                            pattern.confidence_score >= 0.7
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {Math.round(pattern.confidence_score * 100)}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {pattern.success_count}/{pattern.success_count + pattern.failure_count}
                        </Badge>
                        {pattern.is_built_in && (
                          <Badge variant="secondary" className="text-xs">
                            Built-in
                          </Badge>
                        )}
                      </HStack>
                    </FlexBetween>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Text Preview */}
            {textContent.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Sample Text for Testing</h3>
                <div className="bg-gray-50 border rounded-lg p-3 max-h-32 overflow-y-auto">
                  {textContent.slice(0, 10).map((line, index) => (
                    <p key={index} className="text-xs font-mono text-gray-700">
                      {line}
                    </p>
                  ))}
                  {textContent.length > 10 && (
                    <p className="text-xs text-gray-500">
                      ... and {textContent.length - 10} more lines
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
