import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isOnboardingComplete } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        navigate('/aploadmin');
      } else if (isOnboardingComplete) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, user, isOnboardingComplete, navigate]);

  return <LoadingSpinner />;
};

export default AuthCallbackPage; 