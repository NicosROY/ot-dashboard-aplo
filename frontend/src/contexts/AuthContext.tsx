import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthContextType } from '../types';
import supabaseService from '../services/supabase';
import onboardingService from '../services/onboardingService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('🔄 AuthProvider rendu');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<'checking' | 'complete' | 'incomplete'>('checking');

  // Vérifier le statut complet de l'onboarding
  const checkOnboardingStatus = useCallback(async (userId: string): Promise<'complete' | 'incomplete'> => {
    try {
      console.log('🔍 Début vérification onboarding pour:', userId);
      
      // 1. Vérifier si l'utilisateur a un profil complet
      const { data: userProfile, error: profileError } = await supabaseService.getClient()
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('👤 Profil utilisateur:', userProfile);
      console.log('❌ Erreur profil:', profileError);

      if (profileError || !userProfile) {
        console.log('Profil utilisateur non trouvé, vérification onboarding_progress...');
        
        // Si pas de user_profiles, vérifier onboarding_progress
        const { data: onboardingProgress, error: onboardingError } = await supabaseService.getClient()
          .from('onboarding_progress')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        console.log('📋 Onboarding progress:', onboardingProgress);
        
        if (onboardingProgress) {
          console.log('Onboarding en cours détecté');
          return 'incomplete';
        } else {
          console.log('Aucun profil ni onboarding trouvé');
          return 'incomplete';
        }
      }

      // 2. Si user_profiles existe → DASHBOARD (point final)
      console.log('✅ User profile trouvé, onboarding complet');
      return 'complete';
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'onboarding:', error);
      return 'incomplete';
    }
  }, []);

  // Vérification automatique du token au démarrage
  useEffect(() => {
    const checkExistingAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          console.log('🔍 Vérification du token stocké...');
          const user = JSON.parse(storedUser);
          
          // Vérifier si le token est toujours valide
          const { data: { user: currentUser }, error } = await supabaseService.getClient().auth.getUser(storedToken);
          
          if (currentUser && !error) {
            console.log('✅ Token valide, restauration de la session');
            setToken(storedToken);
            setUser(user);
            
            // Vérifier le statut d'onboarding
            const { data: userProfile, error: profileError } = await supabaseService.getClient()
              .from('user_profiles')
              .select('*')
              .eq('id', currentUser.id)
              .single();

            if (userProfile) {
              setOnboardingStatus('complete');
            } else {
              const { data: onboardingProgress } = await supabaseService.getClient()
                .from('onboarding_progress')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle();

              setOnboardingStatus(onboardingProgress ? 'incomplete' : 'complete');
            }
          } else {
            console.log('❌ Token invalide, nettoyage');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Erreur lors de la vérification du token:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      setIsLoading(false);
    };

    checkExistingAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await supabaseService.login(email, password);
      
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        
        // Vérifier UNIQUEMENT user_profiles
        if (response.user) {
          const { data: userProfile, error: profileError } = await supabaseService.getClient()
            .from('user_profiles')
            .select('*')
            .eq('id', response.user.id)
            .single();

          if (userProfile) {
            // Si user_profiles existe → DASHBOARD (point final)
            console.log('✅ User profile trouvé, redirection vers dashboard');
            setOnboardingStatus('complete');
          } else {
            // Si pas de user_profiles, vérifier onboarding_progress
            console.log('🔍 Vérification onboarding_progress...');
            const { data: onboardingProgress, error: onboardingError } = await supabaseService.getClient()
              .from('onboarding_progress')
              .select('*')
              .eq('id', response.user.id)
              .maybeSingle();

            if (onboardingProgress) {
              console.log('📋 Onboarding en cours détecté');
              setOnboardingStatus('incomplete');
            } else {
              console.log('❌ Aucun profil ni onboarding trouvé');
              setOnboardingStatus('incomplete');
            }
          }
        }
        
        // Stockage en localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        return response; // Retourner les données de connexion
      } else {
        throw new Error('Échec de la connexion');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await supabaseService.logout();
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      // Nettoyage local
      setToken(null);
      setUser(null);
      setOnboardingStatus('incomplete');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  // Fonction pour rafraîchir le statut d'onboarding
  const refreshOnboardingStatus = async () => {
    if (user) {
      const status = await checkOnboardingStatus(user.id);
      setOnboardingStatus(status);
    }
  };

  const SUPERADMIN_ID = '39d145c4-20d9-495a-9a57-5c4cd3553089';
  // Dans le calcul de isAuthenticated, considère le super admin comme authentifié même sans user_profiles
  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: (!!user && !!token) || (user?.id === SUPERADMIN_ID && !!token),
    onboardingStatus,
    isOnboardingComplete: onboardingStatus === 'complete',
    refreshOnboardingStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}; 