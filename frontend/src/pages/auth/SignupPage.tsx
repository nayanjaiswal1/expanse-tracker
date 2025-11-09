import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { ObjectForm } from '../../components/forms';
import { createRegisterFormConfig } from '../../features/auth/forms';
import { RegisterFormData } from '../../features/auth/schemas';

const SignupPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (data: RegisterFormData) => {
    setError(null);
    setIsLoading(true);
    try {
      await apiClient.register(data.email, data.password, data.fullName);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
        <ObjectForm config={createRegisterFormConfig(handleSubmit, isLoading)} />
      </div>
    </div>
  );
};

export default SignupPage;
