import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabase';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading, onboardingStep } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      console.log('🔍 AuthCallbackPage - État actuel:', {
        isLoading,
        isAuthenticated,
        user: user ? { id: user.id, email: user.email, role: user.role } : null,
        onboardingStep
      });

      // Attendre que AuthContext finisse de charger
      if (isLoading) return;

      // Si authentifié (user_profile existe) → redirection vers dashboard
      if (isAuthenticated) {
        console.log('✅ Utilisateur authentifié avec user_profile, redirection vers /dashboard');
        navigate('/dashboard');
        return;
      }

      // Si pas authentifié, vérifier s'il y a une session active (onboarding en cours)
      try {
        const { data: { session } } = await supabaseService.getClient().auth.getSession();
        
        if (session?.user) {
          console.log('🔍 Session trouvée mais pas de user_profile, vérification onboarding_progress...');
          
          // Vérifier s'il y a un onboarding_progress
          const { data: onboardingProgress } = await supabaseService.getClient()
            .from('onboarding_progress')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (onboardingProgress) {
            console.log('📋 Onboarding en cours détecté, redirection vers /onboarding');
            navigate('/onboarding');
          } else {
            console.log('❌ Pas d\'onboarding_progress, redirection vers /login');
            navigate('/login');
          }
        } else {
          console.log('❌ Pas de session, redirection vers /login');
          navigate('/login');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
        navigate('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthAndOnboarding();
  }, [isLoading, isAuthenticated, user, onboardingStep, navigate]);

  // Afficher un loader pendant la vérification
  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Vérification...</span>
      </div>
    );
  }

  return null;
};

export default AuthCallbackPage; 