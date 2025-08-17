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
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [isCheckingUserStatus, setIsCheckingUserStatus] = useState(false); // Flag pour éviter le double appel
  const [hasProcessedSignIn, setHasProcessedSignIn] = useState(false); // Flag pour éviter la boucle
  const [hasInitialized, setHasInitialized] = useState(false); // Flag pour éviter l'initialisation en boucle

  // Écouter les changements d'état d'authentification
  useEffect(() => {
    // Éviter l'initialisation en boucle
    if (hasInitialized) {
      console.log('🚫 AuthProvider déjà initialisé, ignoré');
      return;
    }
    
    console.log('🔍 Configuration de l\'écouteur d\'authentification...');
    setHasInitialized(true);
    
    const { data: { subscription } } = supabaseService.getClient().auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Événement d\'authentification:', event, 'Session:', session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
          console.log('✅ Utilisateur connecté:', session.user.email);
          
          // Éviter la boucle infinie
          if (hasProcessedSignIn) {
            console.log('🚫 SIGNED_IN déjà traité, ignoré');
            return;
          }
          
          setHasProcessedSignIn(true);
          
          // Vérifier immédiatement le statut d'authentification et d'onboarding
          await checkUserStatus(session.user.id);
          
        } else if (event === 'SIGNED_OUT') {
          console.log('❌ Utilisateur déconnecté');
          setUser(null);
          setToken(null);
          setOnboardingStatus('incomplete');
          setOnboardingStep(0);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 Token rafraîchi');
          // Stocker le token SEULEMENT si légitime
          if (user || onboardingStatus === 'incomplete') {
            setToken(session.access_token);
          }
        }
      }
    );

    // Déclencher une vérification initiale de la session
    supabaseService.getClient().auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 Session initiale:', session?.user?.email || 'AUCUNE');
      if (session) {
        // Ne pas appeler checkUserStatus ici, onAuthStateChange s'en chargera
        console.log('🔍 Session trouvée, onAuthStateChange va se déclencher');
        setIsLoading(false);
      } else {
        console.log('🏁 Pas de session initiale, setIsLoading(false)');
        setIsLoading(false);
      }
    }).catch((error) => {
      console.error('❌ Erreur session initiale:', error);
      setIsLoading(false);
    });

    // Nettoyer l'abonnement au démontage
    return () => subscription.unsubscribe();
  }, []);

  // Redirection automatique basée sur les changements d'état
  useEffect(() => {
    if (!isLoading) {
      if (onboardingStatus === 'incomplete') {
        console.log('🚀 Redirection automatique vers /onboarding (useEffect)');
        window.location.href = '/onboarding';
      } else if (user) {
        console.log('🚀 Redirection automatique vers /dashboard (useEffect)');
        window.location.href = '/dashboard';
      }
    }
  }, [isLoading, onboardingStatus, user]);

  // Fonction pour vérifier le statut complet de l'utilisateur
  const checkUserStatus = useCallback(async (userId: string) => {
    // Éviter le double appel
    if (isCheckingUserStatus) {
      console.log('🚫 checkUserStatus déjà en cours, ignoré');
      return;
    }
    
    console.log('🚀 DÉBUT checkUserStatus appelé avec userId:', userId);
    setIsCheckingUserStatus(true);
    
    // TIMEOUT de sécurité : si ça prend plus de 2 secondes, on arrête
    const timeoutId = setTimeout(() => {
      console.error('⏰ TIMEOUT checkUserStatus après 2s - arrêt forcé');
      setUser(null);
      setOnboardingStatus('incomplete');
      setOnboardingStep(0);
      setToken(null);
      setIsLoading(false);
      setIsCheckingUserStatus(false);
    }, 2000);
    
    try {
      console.log('🔍 Vérification du statut utilisateur pour:', userId);
      
      // 1. Vérifier si l'utilisateur a un profil complet
      console.log('🔍 Requête user_profiles en cours...');
      let userProfileResponse;
      try {
        console.log('🔍 Appel Supabase user_profiles...');
        userProfileResponse = await supabaseService.getClient()
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        console.log('🔍 Réponse user_profiles reçue:', userProfileResponse);
        console.log('🔍 userProfileResponse.data:', userProfileResponse.data);
        console.log('🔍 userProfileResponse.error:', userProfileResponse.error);
      } catch (error) {
        console.error('❌ ERREUR requête user_profiles:', error);
        throw error;
      }
      
      const { data: userProfile, error: profileError } = userProfileResponse;
      console.log('👤 Profil utilisateur:', userProfile);
      console.log('❌ Erreur profil:', profileError);

      if (profileError || !userProfile) {
        console.log('Profil utilisateur non trouvé, vérification onboarding_progress...');
        
        // Si pas de user_profiles, vérifier onboarding_progress
        console.log('🔍 Requête onboarding_progress en cours...');
        const { data: onboardingProgress, error: onboardingError } = await supabaseService.getClient()
          .from('onboarding_progress')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        console.log('📋 Onboarding progress:', onboardingProgress);
        
        if (onboardingProgress) {
          console.log('Onboarding en cours détecté, étape:', onboardingProgress.current_step);
          setUser(null); // Pas de user_profile = pas authentifié
          setOnboardingStatus('incomplete');
          setOnboardingStep(onboardingProgress.current_step || 0);
          
          // Stocker le token SEULEMENT si onboarding_progress existe (lien mail)
          const { data: { session } } = await supabaseService.getClient().auth.getSession();
          if (session) {
            setToken(session.access_token);
            console.log('🔑 Token stocké car onboarding_progress existe (lien mail)');
          }
          
          console.log('🚀 États mis à jour : user=null, onboardingStatus=incomplete, isLoading va devenir false');
          console.log('🔍 Vérification des états après setState...');
          console.log('🔍 user va devenir:', null);
          console.log('🔍 onboardingStatus va devenir: incomplete');
          console.log('🔍 onboardingStep va devenir:', onboardingProgress.current_step || 0);
        } else {
          console.log('Aucun profil ni onboarding trouvé');
          setUser(null);
          setOnboardingStatus('incomplete');
          setOnboardingStep(0);
          // NE PAS stocker le token si rien n'existe
          setToken(null);
        }
      } else {
        // 2. Si user_profiles existe → DASHBOARD (point final)
        console.log('✅ User profile trouvé, onboarding complet');
        setUser(userProfile);
        setOnboardingStatus('complete');
        setOnboardingStep(0);
        
        // Stocker le token car user_profile existe
        const { data: { session } } = await supabaseService.getClient().auth.getSession();
        if (session) {
          setToken(session.access_token);
          console.log('🔑 Token stocké car user_profile existe');
        }
      }
      
      // ARRÊTER le chargement après vérification
      console.log('🏁 FIN checkUserStatus - setIsLoading(false)');
      console.log('🔍 Juste avant setIsLoading(false)');
      clearTimeout(timeoutId); // Nettoyer le timeout
      setIsLoading(false);
      console.log('🔍 Après setIsLoading(false)');
      setIsCheckingUserStatus(false);
      console.log('🔍 Après setIsCheckingUserStatus(false)');
      
      // Les états sont mis à jour, la redirection se fera via useEffect
    } catch (error) {
      console.error('Erreur lors de la vérification du statut utilisateur:', error);
      clearTimeout(timeoutId); // Nettoyer le timeout même en cas d'erreur
      setUser(null);
      setOnboardingStatus('incomplete');
      setOnboardingStep(0);
      setToken(null); // NE PAS stocker le token en cas d'erreur
      setIsLoading(false); // ARRÊTER le chargement même en cas d'erreur
      setIsCheckingUserStatus(false);
    }
  }, []);



  const login = async (email: string, password: string) => {
    try {
      const response = await supabaseService.login(email, password);
      
      if (response.success) {
        // Déclencher onAuthStateChange en récupérant la session
        const { data: { session } } = await supabaseService.getClient().auth.getSession();
        if (session) {
          console.log('🔑 Session récupérée après login, onAuthStateChange va se déclencher');
        }
        return response;
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
      // UTILISER le token SEULEMENT si user_profile existe
      if (user && token) {
        await supabaseService.logout();
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      // Nettoyage local
      setUser(null);
      setToken(null);
      setOnboardingStatus('incomplete');
      setOnboardingStep(0);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  // Fonction pour rafraîchir le statut d'onboarding
  const refreshOnboardingStatus = async () => {
    // UTILISER le token SEULEMENT si user_profile existe
    if (user && token) {
      const { data: { user: authUser } } = await supabaseService.getClient().auth.getUser();
      if (authUser) {
        await checkUserStatus(authUser.id);
      }
    }
  };

  const SUPERADMIN_ID = '39d145c4-20d9-495a-9a57-5c4cd3553089';
  
  // LOGIQUE CLAIRE : isAuthenticated = true seulement si user_profile existe
  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user, // SEULEMENT si user_profile existe
    onboardingStatus,
    isOnboardingComplete: onboardingStatus === 'complete',
    onboardingStep, // Nouvelle propriété pour l'étape sauvegardée
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