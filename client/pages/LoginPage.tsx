import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ICONS } from '../constants';

// UI Components
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactNumber || !password) {
        setError('Please enter both Login ID and Password.');
        return;
    }
    setError('');
    setLoading(true);
    try {
        await login({ contactNumber, password });
        navigate('/');
    } catch(err) {
        setError('Login failed. Please check your credentials.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-light flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full mx-auto">
        <div className="flex items-center justify-center mb-6">
            {ICONS.logo}
            <h1 className="text-3xl font-bold text-on-surface ml-3">MS Mango Mundy</h1>
        </div>
        <div className="bg-surface p-8 rounded-xl shadow-lg">
          <h2 className="text-center text-2xl font-bold text-gray-800 mb-6">Login</h2>
          {error && <Alert message={error} onClose={() => setError('')} />}
          <form onSubmit={handleLogin} className="space-y-6 mt-4">
            <Input
              label="Login ID (Contact Number)"
              id="contactNumber"
              name="contactNumber"
              type="text"
              autoComplete="tel"
              required
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
            />
            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button 
              type="submit" 
              isLoading={loading}
              className="w-full"
              size="lg"
            >
              Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
