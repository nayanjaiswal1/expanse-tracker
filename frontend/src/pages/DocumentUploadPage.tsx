import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '../components/ui/Toast';
import { apiClient } from '../api';
import { Button } from '../components/ui/Button';
import type { UploadSession } from '../types';
import { FlexBetween } from '../components/ui/Layout';

const DocumentUploadPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getErrorMessage = (e: unknown): string => {
    if (typeof e === 'string') return e;
    if (e && typeof e === 'object') {
      const maybeMsg = (e as { message?: string }).message;
      // Axios-style error shape
      const maybeResp = (e as { response?: { data?: { detail?: string; error?: string } } })
        .response;
      const detail = maybeResp?.data?.detail || maybeResp?.data?.error;
      return detail || maybeMsg || 'Unknown error';
    }
    return 'Unknown error';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getUploadSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      showError('Failed to load sessions', getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleUpload = async () => {
    if (!selectedFile) {
      showError('No file selected', 'Please select a file to upload.');
      return;
    }

    try {
      setIsLoading(true);
      const session = await apiClient.uploadFile(selectedFile);
      showSuccess('File uploaded', `${session.original_filename} processed (${session.status}).`);
      setSelectedFile(null);
      // refresh sessions
      await fetchSessions();
    } catch (e: unknown) {
      showError('Upload failed', getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Document Upload and Viewing</h1>

      <div className="mb-6 p-4 border rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-3">Upload New Document</h2>
        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        <Button
          onClick={handleUpload}
          disabled={!selectedFile}
          variant="primary"
          size="none"
          className="mt-4 rounded-lg px-6 py-2 font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
        >
          Upload Document
        </Button>
      </div>

      <div className="p-4 border rounded-lg shadow-sm">
        <FlexBetween className="mb-3">
          <h2 className="text-xl font-semibold">Recent Upload Sessions</h2>
          <Button
            onClick={fetchSessions}
            className="rounded px-3 py-1 text-sm"
            variant="neutral-soft"
            size="none"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </FlexBetween>
        {sessions.length === 0 ? (
          <p className="text-gray-600">No sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">File</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Imported</th>
                  <th className="py-2 pr-4">Errors</th>
                  <th className="py-2 pr-4">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="py-2 pr-4 font-medium">{s.original_filename}</td>
                    <td className="py-2 pr-4">{s.file_type}</td>
                    <td className="py-2 pr-4">{(s.file_size / 1024).toFixed(1)} KB</td>
                    <td className="py-2 pr-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 capitalize">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {s.successful_imports}/{s.total_transactions}
                    </td>
                    <td className="py-2 pr-4">{s.failed_imports}</td>
                    <td className="py-2 pr-4">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadPage;
