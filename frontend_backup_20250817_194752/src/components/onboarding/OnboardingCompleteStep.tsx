import React, { useState, useEffect } from 'react';
import { OnboardingData } from '../../pages/OnboardingPage';
import { useAuth } from '../../contexts/AuthContext';

interface OnboardingCompleteStepProps {
  onboardingData: OnboardingData;
  onComplete: () => void;
}

const OnboardingCompleteStep: React.FC<OnboardingCompleteStepProps> = ({ 
  onboardingData, 
  onComplete 
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);

  // Debug des données reçues
  console.log('🔍 OnboardingCompleteStep - données reçues:', onboardingData);
  console.log('📧 Email adminInfo:', onboardingData.adminInfo.email);
  console.log('📧 Email AuthContext:', user?.email);

  // Debug des données reçues
  console.log('🔍 OnboardingCompleteStep - données reçues:', onboardingData);
  console.log('📧 Email adminInfo:', onboardingData.adminInfo.email);

  useEffect(() => {
    // Finalisation immédiate - pas de simulation
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Toutes les étapes sont complétées immédiatement
      setStep(4);
    }
  }, [isLoading]);

  const getStepStatus = (stepNumber: number) => {
    if (isLoading) return 'pending';
    if (step >= stepNumber) return 'completed';
    return 'pending';
  };

  const getStepIcon = (stepNumber: number) => {
    const status = getStepStatus(stepNumber);
    
    if (status === 'completed') {
      return (
        <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (status === 'pending' && step === stepNumber) {
      return (
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      );
    }
    
    return (
      <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Finalisation de votre inscription
          </h2>
          <p className="text-gray-600">
            Nous configurons votre espace Office de Tourisme...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Félicitations !
        </h2>
        <p className="text-lg text-gray-600">
          Votre espace Office de Tourisme est maintenant configuré
        </p>
      </div>

      {/* Étapes de finalisation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Configuration terminée
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            {getStepIcon(1)}
            <div className="flex-1">
              <p className="font-medium text-gray-900">Création du compte administrateur</p>
              <p className="text-sm text-gray-600">
                {onboardingData.adminInfo.firstName} {onboardingData.adminInfo.lastName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {getStepIcon(2)}
            <div className="flex-1">
              <p className="font-medium text-gray-900">Configuration de la commune</p>
              <p className="text-sm text-gray-600">
                {onboardingData.commune.name} ({onboardingData.commune.population.toLocaleString()} habitants)
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {getStepIcon(3)}
            <div className="flex-1">
              <p className="font-medium text-gray-900">Validation de l'identité</p>
              <p className="text-sm text-gray-600">
                Processus de validation en cours
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {getStepIcon(4)}
            <div className="flex-1">
              <p className="font-medium text-gray-900">Activation de l'abonnement</p>
              <p className="text-sm text-gray-600">
                {onboardingData.subscription.planName} - {onboardingData.subscription.price}€ HT/mois
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Informations de connexion */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          Informations de connexion
        </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                      <div>
            <p className="text-sm font-medium text-blue-800">Email de connexion</p>
            <p className="text-blue-900">{user?.email || onboardingData.adminInfo.email || 'Non renseigné'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">Commune</p>
            <p className="text-blue-900">{onboardingData.commune.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">Plan d'abonnement</p>
            <p className="text-blue-900">{onboardingData.subscription.planName}</p>
          </div>
        </div>
      </div>

      {/* Informations importantes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Important
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Votre compte sera entièrement activé après validation de votre identité. 
                En attendant, vous pouvez explorer la plateforme en mode démonstration.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Besoin d'aide ?
        </h3>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Support technique</h4>
          <p className="text-sm text-gray-600 mb-2">
            Pour toute question technique ou problème d'accès
          </p>
          <a 
            href="mailto:support@aplo.fr" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            support@aplo.fr
          </a>
        </div>
      </div>

      {/* Bouton final */}
      <div className="text-center">
        <button
          onClick={onComplete}
          className="w-full px-6 py-3 text-aplo-purple bg-white border border-aplo-purple rounded-md hover:bg-aplo-purple hover:text-white transition-all duration-200 font-medium"
        >
          Accéder au dashboard
        </button>
        <p className="text-sm text-gray-500 mt-3">
          Vous recevrez également un email de confirmation avec tous les détails
        </p>
      </div>
    </div>
  );
};

export default OnboardingCompleteStep; 