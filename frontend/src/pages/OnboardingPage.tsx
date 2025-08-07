import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminInfoStep from '../components/onboarding/AdminInfoStep';
import CommuneSelectionStep from '../components/onboarding/CommuneSelectionStep';
import KYCStep from '../components/onboarding/KYCStep';
import TeamSetupStep from '../components/onboarding/TeamSetupStep';
import LegalAcceptanceStep from '../components/onboarding/LegalAcceptanceStep';
import SubscriptionStep from '../components/onboarding/SubscriptionStep';
import OnboardingCompleteStep from '../components/onboarding/OnboardingCompleteStep';
import { getOnboardingData, saveOnboardingData, clearOnboardingData } from '../utils/onboardingStorage';
import supabaseService from '../services/supabase';
import adminNotificationService from '../services/adminNotificationService';
import toast from 'react-hot-toast';

export interface OnboardingData {
  // Étape 1: Informations administrateur
  adminInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    function: string;
    password: string;
  };
  
  // Étape 2: Sélection commune
  commune: {
    id: number;
    name: string;
    population: number;
  };
  
  // Étape 3: KYC
  kyc: {
    method: 'document';
    documentUploaded?: boolean;
    validated: boolean;
  };
  
  // Étape 4: Documents légaux
  legal: {
    cgvAccepted: boolean;
    cguAccepted: boolean;
    responsibilityAccepted: boolean;
  };
  
  // Étape 5: Abonnement
  subscription: {
    planId: string;
    planName: string;
    price: number;
    paymentCompleted?: boolean;
    stripeData?: {
      paymentIntentId: string;
      clientSecret: string;
      amount: number;
      currency: string;
      status: string;
    };
  };
}

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    adminInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      function: '',
      password: ''
    },
    commune: {
      id: 0,
      name: '',
      population: 0
    },
    kyc: {
      method: 'document',
      validated: false
    },
    legal: {
      cgvAccepted: false,
      cguAccepted: false,
      responsibilityAccepted: false
    },
    subscription: {
      planId: '',
      planName: '',
      price: 0,
      paymentCompleted: false
    }
  });

  // Charger les données sauvegardées et vérifier l'état de connexion au montage
  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        setIsLoading(true);
        
        // Vérifier si l'utilisateur est connecté
        const { data: { user } } = await supabaseService.getClient().auth.getUser();
        
        if (user) {
          setCurrentUser(user);
          console.log('Utilisateur connecté:', user.email);
          
          // Récupérer les données depuis la base de données
          const { data: dbOnboarding, error: dbError } = await supabaseService.getClient()
            .from('onboarding_progress')
            .select('*')
            .eq('id', user.id)
            .single();

          if (dbOnboarding && !dbError) {
            console.log('Données trouvées en DB, étape:', dbOnboarding.current_step);
            console.log('Données brutes de la DB:', dbOnboarding);
            console.log('💳 subscription_data brut:', dbOnboarding.subscription_data);
            console.log('💳 stripeData dans DB?', !!dbOnboarding.subscription_data?.stripeData);
            
            // Restaurer depuis la base de données
            const restoredData: OnboardingData = {
              adminInfo: {
                firstName: dbOnboarding.admin_info?.firstName || '',
                lastName: dbOnboarding.admin_info?.lastName || '',
                email: dbOnboarding.admin_info?.email || '',
                phone: dbOnboarding.admin_info?.phone || '',
                function: dbOnboarding.admin_info?.function || '',
                password: ''
              },
              commune: dbOnboarding.commune_data || {
                id: 0,
                name: '',
                population: 0
              },
              kyc: dbOnboarding.kyc_data || {
                method: 'email',
                validated: false
              },
              legal: dbOnboarding.legal_data || {
                cgvAccepted: false,
                cguAccepted: false,
                responsibilityAccepted: false
              },
              subscription: {
                planId: dbOnboarding.subscription_data?.planId || '',
                planName: dbOnboarding.subscription_data?.planName || '',
                price: dbOnboarding.subscription_data?.price || 0,
                paymentCompleted: dbOnboarding.subscription_data?.paymentCompleted || false,
                stripeData: dbOnboarding.subscription_data?.stripeData || undefined
              }
            };

            setOnboardingData(restoredData);
            setCurrentStep(dbOnboarding.current_step);
            
            // Mettre à jour le localStorage
            saveOnboardingData(restoredData, dbOnboarding.current_step);
            
          } else {
            console.log('Pas de données en DB, création nouvelle entrée');
            
            // Créer une nouvelle entrée d'onboarding
            const { error: createError } = await supabaseService.getClient()
              .from('onboarding_progress')
              .insert({
                id: user.id,
                current_step: 1,
                admin_info: {},
                commune_data: null,
                kyc_data: null,
                legal_data: null,
                subscription_data: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (createError && createError.code !== '23505') {
              console.error('Erreur création onboarding:', createError);
            }

            // Commencer à l'étape 1
            setCurrentStep(1);
          }
        } else {
          console.log('Utilisateur non connecté');
          setCurrentStep(1);
        }
      } catch (error) {
        console.error('Erreur initialisation:', error);
        setCurrentStep(1);
      } finally {
        setIsLoading(false);
      }
    };

    initializeOnboarding();
  }, []);

  // 1. totalSteps = 6
  const totalSteps = 6;

  // Fonction pour sauvegarder dans la base de données
  const saveToDatabase = async (data: OnboardingData, step: number) => {
    try {
      const { data: { user } } = await supabaseService.getClient().auth.getUser();
      if (!user) return;

      const { error } = await supabaseService.getClient()
        .from('onboarding_progress')
        .upsert({
          id: user.id,
          current_step: step,
          admin_info: data.adminInfo,
          commune_data: data.commune,
          kyc_data: data.kyc,
          legal_data: data.legal,
          subscription_data: data.subscription,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erreur sauvegarde DB:', error);
      } else {
        console.log('Sauvegarde DB réussie, étape:', step);
      }
    } catch (error) {
      console.error('Erreur sauvegarde DB:', error);
    }
  };

  const updateOnboardingData = async (updates: Partial<OnboardingData>) => {
    const newData = { ...onboardingData, ...updates };
    setOnboardingData(newData);
    
    // Sauvegarder automatiquement
    saveOnboardingData(newData, currentStep);
    await saveToDatabase(newData, currentStep);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      
      // Sauvegarder la progression
      saveOnboardingData(onboardingData, newStep);
      saveToDatabase(onboardingData, newStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      
      // Sauvegarder la progression
      saveOnboardingData(onboardingData, newStep);
      saveToDatabase(onboardingData, newStep);
    }
  };

  const goToStep = (step: number) => {
    // Empêcher la navigation vers des étapes non complétées
    if (step > currentStep) {
      return; // Ne pas permettre d'avancer sans validation
    }
    
    // Vérifications de sécurité supplémentaires
    if (step === 6 && currentStep < 6) {
      // Empêcher d'aller à l'étape finale sans avoir complété toutes les étapes
      return;
    }
    
    // Vérifier que le paiement est complété si on va à l'étape 6
    if (step === 6 && !onboardingData.subscription.paymentCompleted) {
      toast.error('Vous devez compléter le paiement avant de finaliser l\'onboarding');
      return;
    }
    
    setCurrentStep(step);
    
    // Sauvegarder la progression
    saveOnboardingData(onboardingData, step);
    saveToDatabase(onboardingData, step);
  };

  // Nettoyer les données à la fin de l'onboarding
  const handleOnboardingComplete = async () => {
    try {
      // Vérification des données requises
      console.log('🔍 Vérification des données avant finalisation...');
      
      if (!onboardingData.adminInfo.firstName || !onboardingData.adminInfo.lastName) {
        toast.error('Informations administrateur manquantes');
        return;
      }
      
      if (!onboardingData.commune.id) {
        toast.error('Commune non sélectionnée');
        return;
      }
      
      // Vérification que le paiement est complété
      if (!onboardingData.subscription.paymentCompleted && currentStep < 6) {
        toast.error('Vous devez compléter votre paiement avant de finaliser l\'onboarding.');
        return;
      }
      
      // Si on est à l'étape 6, on considère que le paiement est complété
      if (currentStep === 6 && !onboardingData.subscription.paymentCompleted) {
        const updatedData = {
          ...onboardingData,
          subscription: {
            ...onboardingData.subscription,
            paymentCompleted: true
          }
        };
        setOnboardingData(updatedData);
        await saveToDatabase(updatedData, currentStep);
      }

      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabaseService.getClient().auth.getUser();
      
      if (user) {
        console.log('🚀 Début de la finalisation de l\'onboarding pour:', user.email);
        console.log('📊 Données onboarding:', onboardingData);

        // 1. Créer ou mettre à jour le profil utilisateur avec TOUTES les données
        const profileData = {
          id: user.id,
          email: onboardingData.adminInfo.email,
          first_name: onboardingData.adminInfo.firstName,
          last_name: onboardingData.adminInfo.lastName,
          phone: onboardingData.adminInfo.phone,
          function: onboardingData.adminInfo.function,
          commune_id: onboardingData.commune.id,
          role: 'admin',
          is_active: true
        };
        
        console.log('👤 Création/mise à jour profil avec:', profileData);
        console.log('👤 Données complètes envoyées:', JSON.stringify(profileData, null, 2));

        const { error: profileError } = await supabaseService.getClient()
          .from('user_profiles')
          .upsert(profileData);

        if (profileError) {
          console.error('❌ Erreur création/mise à jour profil:', profileError);
          throw profileError;
        }
        console.log('✅ Profil utilisateur créé/mis à jour');

        // 2. Créer les acceptations légales
        const { error: legalError } = await supabaseService.getClient()
          .from('legal_acceptances')
          .insert({
            user_id: user.id,
            cgv_accepted: onboardingData.legal.cgvAccepted,
            cgu_accepted: onboardingData.legal.cguAccepted,
            responsibility_accepted: onboardingData.legal.responsibilityAccepted,
            cgv_accepted_at: onboardingData.legal.cgvAccepted ? new Date().toISOString() : null,
            cgu_accepted_at: onboardingData.legal.cguAccepted ? new Date().toISOString() : null,
            responsibility_accepted_at: onboardingData.legal.responsibilityAccepted ? new Date().toISOString() : null
          });

        if (legalError) {
          console.error('❌ Erreur création acceptations légales:', legalError);
        } else {
          console.log('✅ Acceptations légales créées');
        }

        // Création d'invitations d'équipe désactivée pour la version mono-user

        // 4. Créer l'abonnement et le paiement si les infos Stripe sont disponibles
        console.log('💳 Données subscription complètes:', onboardingData.subscription);
        console.log('💳 stripeData disponible?', !!onboardingData.subscription.stripeData);
        console.log('💳 Contenu stripeData:', onboardingData.subscription.stripeData);
        
        if (onboardingData.subscription.stripeData) {
          console.log('💳 Création de l\'abonnement avec données Stripe:', onboardingData.subscription.stripeData);
          
          // D'abord créer l'abonnement
          const { data: subscriptionData, error: subscriptionError } = await supabaseService.getClient()
            .from('subscriptions')
            .insert({
              commune_id: onboardingData.commune.id,
              stripe_subscription_id: onboardingData.subscription.stripeData.paymentIntentId,
              status: 'active',
              plan_type: onboardingData.subscription.planId === 'small_commune' ? 'small' : 'large',
              amount_monthly: onboardingData.subscription.price,
              currency: onboardingData.subscription.stripeData.currency,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

          if (subscriptionError) {
            console.error('❌ Erreur création abonnement:', subscriptionError);
          } else {
            console.log('✅ Abonnement créé:', subscriptionData.id);
            
            // Puis créer le paiement associé
            const { error: paymentError } = await supabaseService.getClient()
              .from('payments')
              .insert({
                subscription_id: subscriptionData.id,
                stripe_payment_intent_id: onboardingData.subscription.stripeData.paymentIntentId,
                amount: onboardingData.subscription.stripeData.amount / 100,
                currency: onboardingData.subscription.stripeData.currency,
                status: 'succeeded',
                payment_method: 'stripe'
              });

            if (paymentError) {
              console.error('❌ Erreur création paiement:', paymentError);
            } else {
              console.log('✅ Paiement créé');
            }
          }
        } else {
          console.log('⚠️ Pas d\'infos Stripe disponibles - l\'abonnement sera créé via webhook');
        }

        // 5. Marquer l'onboarding comme terminé avant de le supprimer
        const { error: updateError } = await supabaseService.getClient()
          .from('onboarding_progress')
          .update({ current_step: 6 })
          .eq('id', user.id);

        if (updateError) {
          console.error('❌ Erreur mise à jour étape finale:', updateError);
        }

        // 6. Supprimer la progression d'onboarding
        const { error: deleteError } = await supabaseService.getClient()
          .from('onboarding_progress')
          .delete()
          .eq('id', user.id);

        if (deleteError) {
          console.error('❌ Erreur suppression onboarding:', deleteError);
        } else {
          console.log('✅ Onboarding supprimé de la DB');
        }
      }

      // Nettoyer le localStorage
      clearOnboardingData();
      
      console.log('🎉 Onboarding finalisé avec succès !');
      toast.success('Onboarding terminé avec succès ! Votre espace est maintenant actif.');
      
      // Redirection immédiate vers le dashboard
      console.log('🔄 Redirection vers le dashboard...');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('❌ Erreur lors de la finalisation:', error);
      toast.error('Erreur lors de la finalisation de l\'onboarding');
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            const isAccessible = stepNumber <= currentStep; // Seules les étapes actuelles et précédentes sont accessibles
            
            return (
              <div key={stepNumber} className="flex items-center">
                <button
                  onClick={() => goToStep(stepNumber)}
                  disabled={!isAccessible}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white cursor-pointer'
                      : isAccessible
                      ? 'bg-gray-200 text-gray-600 cursor-pointer hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? '✓' : stepNumber}
                </button>
                {stepNumber < totalSteps && (
                  <div className={`w-16 h-1 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="text-center mt-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {getStepTitle(currentStep)}
          </h2>
          <p className="text-sm text-gray-600">
            Étape {currentStep} sur {totalSteps}
          </p>
        </div>
      </div>
    );
  };

  // 2. getStepTitle: retire la clé 4 (équipe), décale les titres
  const getStepTitle = (step: number): string => {
    const titles = {
      1: 'Informations administrateur',
      2: 'Sélection de la commune',
      3: 'Validation de l\'identité',
      4: 'Acceptation des conditions',
      5: 'Choix de l\'abonnement',
      6: 'Finalisation'
    };
    return titles[step as keyof typeof titles] || '';
  };

  // 3. renderCurrentStep: supprime le case 4, décale les suivants
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <AdminInfoStep
            data={onboardingData.adminInfo}
            onUpdate={async (data) => await updateOnboardingData({ adminInfo: data })}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <CommuneSelectionStep
            data={onboardingData.commune}
            onUpdate={async (data: OnboardingData['commune']) => await updateOnboardingData({ commune: data })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <KYCStep
            data={onboardingData.kyc}
            communeData={onboardingData.commune}
            adminData={onboardingData.adminInfo}
            onUpdate={async (data: OnboardingData['kyc']) => await updateOnboardingData({ kyc: data })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 4:
        return (
          <LegalAcceptanceStep
            data={onboardingData.legal}
            onUpdate={async (data: OnboardingData['legal']) => await updateOnboardingData({ legal: data })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 5:
        return (
          <SubscriptionStep
            data={onboardingData.subscription}
            communePopulation={onboardingData.commune.population}
            communeId={onboardingData.commune.id}
            userId={currentUser?.id || ""}
            onUpdate={async (data: OnboardingData['subscription']) => await updateOnboardingData({ subscription: data })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 6:
        return (
          <OnboardingCompleteStep
            onboardingData={onboardingData}
            onComplete={handleOnboardingComplete}
          />
        );
      default:
        return <div>Étape non trouvée</div>;
    }
  };

  return (
    <div className="min-h-screen bg-aplo-cream">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue sur APLO
          </h1>
          <p className="text-lg text-gray-600">
            Configurez votre espace Office de Tourisme en quelques étapes
          </p>
        </div>

        {/* Progress indicator */}
        {renderStepIndicator()}

        {/* Current step content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement de votre progression...</p>
              </div>
            </div>
          ) : (
            renderCurrentStep()
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Besoin d'aide ? Contactez-nous à{' '}
            <a href="mailto:support@aplo.fr" className="text-blue-600 hover:underline">
              support@aplo.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage; 