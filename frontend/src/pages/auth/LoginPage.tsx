import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { ObjectForm } from '../../components/forms';
import { createLoginFormConfig } from '../../features/auth/forms';
import { LoginFormData } from '../../features/auth/schemas';

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);
    try {
      await apiClient.login(data.username, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
        <ObjectForm config={createLoginFormConfig(handleSubmit, isLoading)} />
      </div>
    </div>
  );
};

export default LoginPage;
