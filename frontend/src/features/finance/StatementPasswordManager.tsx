import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Lock, Plus, Trash2, Check, X, Shield } from 'lucide-react'

interface StatementPassword {
  id: number
  account: number | null
  password_hint: string
  is_default: boolean
  success_count: number
  last_used: string | null
  created_at: string
}

export function StatementPasswordManager() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    password_hint: '',
    is_default: false,
  })

  const queryClient = useQueryClient()

  // Fetch passwords
  const { data: passwords = [] } = useQuery<StatementPassword[]>({
    queryKey: ['statement-passwords'],
    queryFn: async () => {
      const response = await apiClient.get('/v1/statement-passwords/')
      return response.data.results || response.data
    },
  })

  // Add password
  const addPassword = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiClient.post('/v1/statement-passwords/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement-passwords'] })
      setFormData({ password: '', password_hint: '', is_default: false })
      setShowForm(false)
    },
  })

  // Delete password
  const deletePassword = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/v1/statement-passwords/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement-passwords'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password && formData.password_hint) {
      addPassword.mutate(formData)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-gray-900">Statement Passwords</h2>
        </div>
        <p className="text-sm text-gray-600">
          Securely store passwords for password-protected bank statements
        </p>
      </div>

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Password</span>
        </button>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password Hint
              </label>
              <input
                type="text"
                value={formData.password_hint}
                onChange={(e) =>
                  setFormData({ ...formData, password_hint: e.target.value })
                }
                placeholder="e.g., Date of birth, Last 4 digits"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) =>
                  setFormData({ ...formData, is_default: e.target.checked })
                }
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                Use as default password
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addPassword.isPending}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition disabled:opacity-50"
              >
                {addPassword.isPending ? 'Saving...' : 'Save Password'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password List */}
      <div className="space-y-3">
        {passwords.length === 0 && !showForm && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No passwords saved yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add a password to unlock protected statements automatically
            </p>
          </div>
        )}

        {passwords.map((pw) => (
          <div
            key={pw.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {pw.password_hint || 'No hint'}
                  </span>
                  {pw.is_default && (
                    <span className="px-2 py-1 bg-primary-light text-primary text-xs rounded-md">
                      Default
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-success" />
                    <span>Used {pw.success_count} times</span>
                  </div>
                  {pw.last_used && (
                    <div className="text-gray-500">
                      Last used: {new Date(pw.last_used).toLocaleDateString()}
                    </div>
                  )}
                  <div className="text-gray-400">
                    Created: {new Date(pw.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm('Delete this password?')) {
                    deletePassword.mutate(pw.id)
                  }
                }}
                disabled={deletePassword.isPending}
                className="p-2 text-gray-400 hover:text-error hover:bg-error-light rounded-md transition disabled:opacity-50"
                title="Delete password"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-2">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Secure Storage</p>
            <p className="text-xs text-blue-700">
              Passwords are encrypted using Fernet encryption and stored securely.
              They will be automatically tried when uploading password-protected PDFs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
