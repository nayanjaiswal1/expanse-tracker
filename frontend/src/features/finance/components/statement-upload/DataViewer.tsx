/**
 * Data Viewer with toggle between JSON, Table, and Transaction Preview formats.
 */

import React, { useState } from 'react';
import { ParsedTransaction, ExtractedTable } from '../../../../api/statementApi';
import { Button } from '../../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../../components/ui/Layout';

type ViewMode = 'table' | 'json' | 'preview';

interface DataViewerProps {
  tables: ExtractedTable[];
  transactions: ParsedTransaction[];
  metadata?: Record<string, any>;
  onTransactionSelect?: (transaction: ParsedTransaction) => void;
  selectedTransactions?: Set<number>;
}

export const DataViewer: React.FC<DataViewerProps> = ({
  tables,
  transactions,
  metadata,
  onTransactionSelect,
  selectedTransactions = new Set(),
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [expandedTable, setExpandedTable] = useState<number>(0);

  const renderTableView = () => {
    if (tables.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No tables extracted yet. Draw regions on the PDF to extract tables.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {tables.map((table, idx) => (
          <div key={idx} className="border border-gray-300 rounded-lg overflow-hidden">
            <FlexBetween
              className="bg-gray-100 px-4 py-2 cursor-pointer"
              onClick={() => setExpandedTable(expandedTable === idx ? -1 : idx)}
            >
              <div>
                <h3 className="font-medium text-sm">
                  Table {idx + 1} - Page {table.page_number}
                </h3>
                <p className="text-xs text-gray-600">
                  {table.headers.length} columns × {table.rows.length} rows
                </p>
              </div>
              <Button variant="text-muted" className="text-sm" type="button">
                {expandedTable === idx ? '▼' : '▶'}
              </Button>
            </FlexBetween>

            {expandedTable === idx && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {table.headers.map((header, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-3 py-2 text-left font-medium text-gray-700 border-b"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-gray-50 border-b">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-gray-900">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderJSONView = () => {
    const data = {
      tables,
      transactions,
      metadata,
      summary: {
        total_tables: tables.length,
        total_transactions: transactions.length,
      },
    };

    return (
      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  const renderPreviewView = () => {
    if (transactions.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No transactions found. Parse the statement to extract transactions.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <FlexBetween className="mb-4">
          <h3 className="font-medium text-sm">Transactions ({transactions.length})</h3>
          {metadata?.bank && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {metadata.bank}
            </span>
          )}
        </FlexBetween>

        <div className="space-y-1">
          {transactions.map((tx, idx) => {
            const isDuplicate = tx.status === 'duplicate';

            return (
              <div
                key={idx}
                className={`border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer ${
                  isDuplicate ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'
                } ${selectedTransactions.has(idx) ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => onTransactionSelect?.(tx)}
              >
                <FlexBetween className="items-start">
                  <div className="flex-1">
                    <HStack className="gap-2">
                      <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                      {isDuplicate && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                          Duplicate
                        </span>
                      )}
                    </HStack>
                    <p className="text-xs text-gray-600 mt-1">{tx.date}</p>
                    {tx.external_id && (
                      <p className="text-xs text-gray-500">Ref: {tx.external_id}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.transaction_type === 'credit' ? '+' : '-'}
                      {tx.amount}
                    </p>
                    {tx.balance && <p className="text-xs text-gray-500 mt-1">Bal: {tx.balance}</p>}
                  </div>
                </FlexBetween>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* View mode toggle */}
      <HStack className="gap-2 mb-4 border-b pb-2">
        <button
          onClick={() => setViewMode('preview')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'preview'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'table'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tables
        </button>
        <button
          onClick={() => setViewMode('json')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'json'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          JSON
        </button>
      </HStack>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'table' && renderTableView()}
        {viewMode === 'json' && renderJSONView()}
        {viewMode === 'preview' && renderPreviewView()}
      </div>
    </div>
  );
};
