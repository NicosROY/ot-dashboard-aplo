import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import onboardingService from '../services/onboardingService';
import supabaseService from '../services/supabase';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      // Connexion avec le service d'authentification
      await login(data.email, data.password);
      
      // La redirection est gérée automatiquement par AuthContext
      toast.success('Connexion réussie !');
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      toast.error(error.message || 'Erreur de connexion. Vérifiez vos identifiants.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-aplo-orange to-aplo-yellow py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-aplo">
            <svg className="h-8 w-8 text-aplo-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            APLO Espace Pro
          </h2>
          <p className="mt-2 text-sm text-white/80">
            Connectez-vous à votre espace Office de Tourisme
          </p>
        </div>

        <div className="bg-aplo-cream overflow-hidden shadow-sm rounded-md border border-white/20">
          <div className="px-6 py-8">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Adresse email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className={`w-full px-4 py-3 rounded-md border transition-all duration-200 focus:ring-2 focus:ring-aplo-purple focus:border-transparent ${
                      errors.email 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300 focus:border-aplo-purple'
                    }`}
                    placeholder="votre@email.fr"
                    {...register('email', {
                      required: 'L\'email est requis',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Adresse email invalide'
                      }
                    })}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className={`w-full px-4 py-3 rounded-md border transition-all duration-200 focus:ring-2 focus:ring-aplo-purple focus:border-transparent ${
                      errors.password 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300 focus:border-aplo-purple'
                    }`}
                    placeholder="••••••••"
                    {...register('password', {
                      required: 'Le mot de passe est requis',
                      minLength: {
                        value: 6,
                        message: 'Le mot de passe doit contenir au moins 6 caractères'
                      }
                    })}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 text-aplo-purple bg-white border border-aplo-purple rounded-md hover:bg-aplo-purple hover:text-white transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner mr-2"></div>
                      Connexion en cours...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </div>
            </form>


          </div>
        </div>

        <div className="text-center space-y-4">
                      <div className="bg-white/10 rounded-md p-4">
              <p className="text-sm text-white/90 mb-3">
                Nouvel Office de Tourisme ?
              </p>
              <button
                onClick={async () => {
                  try {
                    // 1. Déconnecter Supabase complètement
                    await supabaseService.getClient().auth.signOut();
                    
                    // 2. Vider le cache et localStorage
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // 3. Rediriger vers l'onboarding
                    navigate('/onboarding');
                  } catch (error) {
                    console.error('Erreur lors du nettoyage:', error);
                    // Rediriger quand même
                    navigate('/onboarding');
                  }
                }}
                className="inline-flex items-center px-6 py-3 text-aplo-purple bg-white border border-aplo-purple rounded-md hover:bg-aplo-purple hover:text-white transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Créer mon espace
              </button>
            </div>
            

          
          <p className="text-xs text-white/60">
            © 2024 APLO - Offices de Tourisme
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 