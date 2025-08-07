import React, { useState, useEffect, useCallback } from 'react';
import supabaseService from '../../services/supabase';
import { saveOnboardingData } from '../../utils/onboardingStorage';
import toast from 'react-hot-toast';

interface AdminInfoStepProps {
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    function: string;
    password: string;
  };
  onUpdate: (data: AdminInfoStepProps['data']) => void;
  onNext: () => void;
}

const AdminInfoStep: React.FC<AdminInfoStepProps> = ({ data, onUpdate, onNext }) => {
  const [formData, setFormData] = useState(data);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fonction de sauvegarde avec debounce
  const debouncedSave = useCallback((newFormData: AdminInfoStepProps['data']) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeout = setTimeout(() => {
      saveOnboardingData({
        adminInfo: newFormData,
        commune: { id: 0, name: '', population: 0 },
        kyc: { method: 'document', validated: false },
        legal: { cgvAccepted: false, cguAccepted: false, responsibilityAccepted: false },
        subscription: { planId: '', planName: '', price: 0 }
      }, 1);
    }, 500); // Sauvegarder après 500ms d'inactivité
    
    setSaveTimeout(timeout);
  }, [saveTimeout]);

  // Charger les données sauvegardées au montage (une seule fois)
  useEffect(() => {
    if (isInitialized) return;
    
    const savedData = localStorage.getItem('aplo_onboarding_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.data?.adminInfo) {
          const savedAdminInfo = parsed.data.adminInfo;
          setFormData(savedAdminInfo);
          // Ne pas appeler onUpdate ici pour éviter la boucle
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données sauvegardées:', error);
      }
    }
    setIsInitialized(true);
  }, [isInitialized]);

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Vérifier si l'email vient d'être validé au montage du composant
  useEffect(() => {
    const checkEmailValidation = async () => {
      try {
        const { data: { user } } = await supabaseService.getClient().auth.getUser();
        
        if (user && user.email_confirmed_at) {
          // Email validé, afficher un toast de confirmation et passer à l'étape suivante
          toast.success(
            (t) => (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    ✅ Email validé avec succès !
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Vous pouvez maintenant continuer l'onboarding
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ),
            {
              duration: 5000,
              position: 'top-center',
              style: {
                background: '#fff',
                border: '1px solid #d1fae5',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '16px',
                minWidth: '400px'
              }
            }
          );
          
          // Passer automatiquement à l'étape suivante après un court délai
          setTimeout(() => {
            onUpdate(formData);
            onNext();
          }, 2000);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification email:', error);
      }
    };

    checkEmailValidation();
  }, [formData, onUpdate, onNext]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    } else if (!/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(formData.phone)) {
      newErrors.phone = 'Format de téléphone français invalide';
    }

    if (!formData.function.trim()) {
      newErrors.function = 'La fonction est requise';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof AdminInfoStepProps['data'], value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Mettre à jour les données parent immédiatement
    onUpdate(newFormData);
    
    // Sauvegarder localement au lieu d'appeler onUpdate à chaque frappe
    debouncedSave(newFormData);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Vérifier si l'utilisateur est déjà connecté
      const { data: { user } } = await supabaseService.getClient().auth.getUser();
      
      if (user) {
        // L'utilisateur est déjà connecté, passer directement à l'étape suivante
        onUpdate(formData);
        onNext();
        return;
      }

      // Créer le compte utilisateur avec connexion automatique
      const { data: authData, error: authError } = await supabaseService.getClient().auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      });

      if (authError) {
        // Gestion simple des erreurs
        if (authError.message?.includes('User already registered')) {
          setErrors({ email: 'Cet email est déjà utilisé' });
        } else if (authError.message?.includes('24 seconds') || authError.message?.includes('429')) {
          toast.error(
            (t) => (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    ⏰ Trop de tentatives
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Veuillez attendre 24 secondes ou utiliser un autre email
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ),
            {
              duration: 5000,
              position: 'top-center',
              style: {
                background: '#fff',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '16px',
                minWidth: '400px'
              }
            }
          );
        } else {
          toast.error(
            (t) => (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    ❌ Erreur de création
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {authError.message || 'Une erreur inattendue s\'est produite'}
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ),
            {
              duration: 5000,
              position: 'top-center',
              style: {
                background: '#fff',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '16px',
                minWidth: '400px'
              }
            }
          );
        }
        return;
      }

      // Compte créé avec succès
      if (authData.user) {
        // Vérifier si l'email a été envoyé
        if (authData.session === null) {
          // Email de vérification envoyé - NE PAS PASSER À L'ÉTAPE SUIVANTE
          toast.success(
            (t) => (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    🎉 Compte créé avec succès !
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Un email de vérification a été envoyé à <span className="font-medium">{formData.email}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Important :</strong> Vous devez confirmer votre email avant de continuer l'onboarding
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ),
            {
              duration: 10000,
              position: 'top-center',
              style: {
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '16px',
                minWidth: '400px'
              }
            }
          );
          
          // Sauvegarder les données mais NE PAS passer à l'étape suivante
          onUpdate(formData);
          
          // Afficher un message d'attente persistant
          toast(
            (t) => (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    ⏳ En attente de confirmation
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Vérifiez votre email et cliquez sur le lien de confirmation
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Vous pourrez continuer l'onboarding une fois votre email confirmé
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ),
            {
              duration: 0, // Ne pas fermer automatiquement
              position: 'top-center',
              style: {
                background: '#fff',
                border: '1px solid #dbeafe',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '16px',
                minWidth: '400px'
              }
            }
          );
          
        } else {
          // L'utilisateur est déjà connecté (email confirmé automatiquement)
          onUpdate(formData);
          onNext();
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du compte:', error);
      toast.error('Erreur lors de la création du compte. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Informations de l'administrateur principal
        </h2>
        <p className="text-gray-600">
          Vous êtes l'administrateur principal de votre Office de Tourisme. 
          Ces informations seront utilisées pour la facturation et le support.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Prénom */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              Prénom *
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Votre prénom"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Nom */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Nom *
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Votre nom"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email professionnel *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="votre.email@commune.fr"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Utilisez votre email professionnel (.gouv.fr, .fr, etc.)
          </p>
        </div>

        {/* Téléphone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Téléphone professionnel *
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="01 23 45 67 89"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        {/* Fonction */}
        <div>
          <label htmlFor="function" className="block text-sm font-medium text-gray-700 mb-2">
            Fonction dans l'Office de Tourisme *
          </label>
          <select
            id="function"
            value={formData.function}
            onChange={(e) => handleInputChange('function', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.function ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Sélectionnez votre fonction</option>
            <option value="directeur">Directeur/Directrice</option>
            <option value="adjoint">Adjoint/Adjointe</option>
            <option value="charge_mission">Chargé(e) de mission</option>
            <option value="animateur">Animateur/Animatrice</option>
            <option value="agent">Agent</option>
            <option value="autre">Autre</option>
          </select>
          {errors.function && (
            <p className="mt-1 text-sm text-red-600">{errors.function}</p>
          )}
        </div>

        {/* Mot de passe */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Mot de passe *
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Choisissez un mot de passe"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Informations importantes */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Informations importantes
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Vous serez l'administrateur principal du compte</li>
                  <li>Vous pourrez inviter jusqu'à 4 utilisateurs supplémentaires</li>
                  <li>Ces informations seront utilisées pour la facturation</li>
                  <li>Votre email servira d'identifiant de connexion</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton de soumission */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Validation...
              </span>
            ) : (
              'Continuer'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminInfoStep; 