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
import { useAuth } from '../contexts/AuthContext';
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
    confirmPassword: string;
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
    documentPath?: string;
    fileName?: string;
    fileSize?: number;
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
  const { user, isLoading: authIsLoading, isAuthenticated, onboardingStatus } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    adminInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      function: '',
      password: '',
      confirmPassword: ''
    },
    commune: {
      id: 0,
      name: '',
      population: 0
    },
    kyc: {
      method: 'document',
      documentUploaded: false,
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
      console.log('🚀 DÉBUT initializeOnboarding');
      
      // Attendre que AuthContext soit prêt
      if (authIsLoading) {
        console.log('⏳ AuthContext en cours de chargement, attente...');
        return;
      }
      
      // Attendre que checkUserStatus ait fini et que les états soient stables
      if (onboardingStatus === 'checking') {
        console.log('⏳ Statut onboarding encore en cours de vérification, attente...');
        return;
      }

      try {
        setIsLoading(true);
        console.log('⏳ setIsLoading(true) appelé');
        
        console.log('🔍 Vérification utilisateur depuis AuthContext...');
        console.log('👤 User depuis AuthContext:', user ? user.email : 'AUCUN USER');
        console.log('🔐 isAuthenticated:', isAuthenticated);
        
        if (user) {
          console.log('✅ Utilisateur trouvé dans AuthContext:', user.email);
          
          // Récupérer les données depuis la base de données
          console.log('📊 Récupération onboarding_progress...');
          const { data: dbOnboarding, error: dbError } = await supabaseService.getClient()
            .from('onboarding_progress')
            .select('*')
            .eq('id', user.id)
            .single();

          console.log('📊 Résultat onboarding_progress:', { dbOnboarding, dbError });

          if (dbOnboarding && !dbError) {
            console.log('✅ Données trouvées en DB, étape:', dbOnboarding.current_step);
            console.log('📋 Données brutes de la DB:', dbOnboarding);
            
            console.log('🔄 Début restauration des données...');
            
            // Parser les colonnes jsonb qui sont des chaînes JSON
            let adminInfo: any = {};
            if (dbOnboarding.admin_info) {
              if (typeof dbOnboarding.admin_info === 'string') {
                try {
                  adminInfo = JSON.parse(dbOnboarding.admin_info);
                } catch (e) {
                  console.error('❌ Erreur parsing admin_info:', e);
                  adminInfo = {};
                }
              } else {
                adminInfo = dbOnboarding.admin_info;
              }
            }
            const communeData = dbOnboarding.commune_data ? 
              (typeof dbOnboarding.commune_data === 'string' ? JSON.parse(dbOnboarding.commune_data) : dbOnboarding.commune_data) : {};
            const kycData = dbOnboarding.kyc_data ? 
              (typeof dbOnboarding.kyc_data === 'string' ? JSON.parse(dbOnboarding.kyc_data) : dbOnboarding.kyc_data) : {};
            const legalData = dbOnboarding.legal_data ? 
              (typeof dbOnboarding.legal_data === 'string' ? JSON.parse(dbOnboarding.legal_data) : dbOnboarding.legal_data) : {};
            const subscriptionData = dbOnboarding.subscription_data ? 
              (typeof dbOnboarding.subscription_data === 'string' ? JSON.parse(dbOnboarding.subscription_data) : dbOnboarding.subscription_data) : {};
            
            console.log('🔍 Données parsées:', { adminInfo, communeData, kycData, legalData, subscriptionData });
            
            // Restaurer les données existantes
            const restoredData: OnboardingData = {
              adminInfo: {
                firstName: adminInfo.firstName || '',
                lastName: adminInfo.lastName || '',
                email: adminInfo.email || user.email || '',
                phone: adminInfo.phone || '',
                function: adminInfo.function || '',
                password: adminInfo.password || '',
                confirmPassword: adminInfo.confirmPassword || ''
              },
              commune: {
                id: communeData.id || 0,
                name: communeData.name || '',
                population: communeData.population || 0
              },
              kyc: {
                method: kycData.method || 'document',
                documentUploaded: kycData.documentUploaded || false,
                validated: kycData.validated || false,
                fileName: kycData.fileName || '',
                fileSize: kycData.fileSize || 0,
                documentPath: kycData.documentPath || ''
              },
              legal: {
                cgvAccepted: legalData.cgvAccepted || false,
                cguAccepted: legalData.cguAccepted || false,
                responsibilityAccepted: legalData.responsibilityAccepted || false
              },
              subscription: {
                planId: subscriptionData.planId || '',
                planName: subscriptionData.planName || '',
                price: subscriptionData.price || 0,
                paymentCompleted: subscriptionData.paymentCompleted || false,
                stripeData: subscriptionData.stripeData
              }
            };

            console.log('📋 Données restaurées:', restoredData);
            console.log('📧 Email dans admin_info DB:', dbOnboarding.admin_info?.email);
            console.log('📧 Email dans user AuthContext:', user.email);
            console.log('📧 Email final restauré:', restoredData.adminInfo.email);
            console.log('🔄 Appel setOnboardingData...');
            setOnboardingData(restoredData);
            console.log('🔄 Appel setCurrentStep avec:', dbOnboarding.current_step);
            setCurrentStep(dbOnboarding.current_step);
            console.log('✅ Restauration terminée');
            
          } else {
            console.log('❌ Pas de données en DB, création nouvelle entrée');
            
            // Créer une nouvelle entrée d'onboarding
            console.log('🆕 Création nouvelle entrée onboarding_progress...');
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

            console.log('🆕 Résultat création:', createError);

            if (createError && createError.code !== '23505') {
              console.error('❌ Erreur création onboarding:', createError);
            }

            // Commencer à l'étape 1
            console.log('🔄 setCurrentStep(1)');
            setCurrentStep(1);
          }
        } else if (isAuthenticated) {
          // Cas bizarre : isAuthenticated mais pas de user
          console.log('⚠️ isAuthenticated=true mais pas de user, création étape 1');
          setCurrentStep(1);
        } else {
          // Pas d'utilisateur connecté, mais on peut quand même permettre l'onboarding
          console.log('❌ Utilisateur non connecté, démarrage étape 1');
          console.log('🔄 setCurrentStep(1) pour user non connecté');
          setCurrentStep(1);
        }
      } catch (error) {
        console.error('💥 ERREUR dans initializeOnboarding:', error);
        console.log('🔄 setCurrentStep(1) après erreur');
        setCurrentStep(1);
      } finally {
        console.log('🏁 FINALLY: setIsLoading(false)');
        setIsLoading(false);
        console.log('✅ initializeOnboarding TERMINÉ');
      }
    };

    console.log('🎬 Lancement initializeOnboarding...');
    initializeOnboarding();
  }, [user, authIsLoading, isAuthenticated]); // RETOUR aux dépendances originales

  // 1. totalSteps = 6
  const totalSteps = 6;

  // Fonction pour sauvegarder dans la base de données
  const saveToDatabase = async (data: OnboardingData, step: number) => {
    try {
      const { data: { user } } = await supabaseService.getClient().auth.getUser();
      if (!user) return;

      console.log('💾 Sauvegarde en base - Étape:', step);
      console.log('📊 Données à sauvegarder:', data);

      // Récupérer les données existantes pour éviter l'écrasement
      const { data: existingData, error: fetchError } = await supabaseService.getClient()
        .from('onboarding_progress')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Erreur récupération données existantes:', fetchError);
        return;
      }

      // Fonction de fusion intelligente qui préserve les données existantes
      const mergeData = (existing: any, newData: any) => {
        if (!existing) return newData;
        if (!newData) return existing;
        
        // Parser les données existantes si elles sont des chaînes JSON
        let parsedExisting = existing;
        if (typeof existing === 'string') {
          try {
            parsedExisting = JSON.parse(existing);
          } catch (e) {
            console.warn('⚠️ Erreur parsing JSON existant:', e);
            parsedExisting = {};
          }
        }
        
        // Fusionner en préservant l'existant et en ajoutant seulement le nouveau non-vide
        const merged = { ...parsedExisting };
        Object.keys(newData).forEach(key => {
          if (newData[key] !== undefined && newData[key] !== null && newData[key] !== '') {
            // Si c'est un objet, fusionner récursivement
            if (typeof newData[key] === 'object' && !Array.isArray(newData[key])) {
              merged[key] = mergeData(parsedExisting[key] || {}, newData[key]);
            } else {
              merged[key] = newData[key];
            }
          }
        });
        return merged;
      };

      // Fusionner les données existantes avec les nouvelles (PRÉSERVER L'EXISTANT)
      const mergedData = {
        id: user.id,
        current_step: step,
        admin_info: mergeData(existingData?.admin_info, data.adminInfo),
        commune_data: data.commune.id ? data.commune : existingData?.commune_data,
        kyc_data: mergeData(existingData?.kyc_data, data.kyc),
        legal_data: mergeData(existingData?.legal_data, data.legal),
        subscription_data: mergeData(existingData?.subscription_data, data.subscription),
        updated_at: new Date().toISOString()
      };

      console.log('🔄 Données fusionnées (PRÉSERVATION EXISTANT):', mergedData);
      console.log('📊 Données existantes préservées:', existingData);

      const { error } = await supabaseService.getClient()
        .from('onboarding_progress')
        .upsert(mergedData);

      if (error) {
        console.error('❌ Erreur sauvegarde DB:', error);
      } else {
        console.log('✅ Sauvegarde DB réussie, étape:', step);
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde DB:', error);
    }
  };

  const updateOnboardingData = async (updates: Partial<OnboardingData>) => {
    const newData = { ...onboardingData, ...updates };
    setOnboardingData(newData);
    
    // Sauvegarder automatiquement
    saveOnboardingData(newData, currentStep);
    await saveToDatabase(newData, currentStep);
    
    console.log('💾 Données mises à jour et sauvegardées:', updates);
    console.log('📊 Nouvelles données complètes:', newData);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      
      // Si on passe du step 1 au step 2, créer l'onboarding_progress
      if (currentStep === 1 && newStep === 2) {
        console.log('📝 Création de l\'onboarding_progress au passage du step 1 au step 2');
        
        // Créer l'onboarding_progress avec les données du step 1
        const createOnboardingProgress = async () => {
          try {
            const { data: { user } } = await supabaseService.getClient().auth.getUser();
            if (!user) return;

            const { error: createError } = await supabaseService.getClient()
              .from('onboarding_progress')
              .insert({
                id: user.id,
                current_step: newStep,
                admin_info: onboardingData.adminInfo,
                commune_data: onboardingData.commune,
                kyc_data: onboardingData.kyc,
                legal_data: onboardingData.legal,
                subscription_data: onboardingData.subscription,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (createError) {
              console.error('❌ Erreur création onboarding_progress:', createError);
            } else {
              console.log('✅ Onboarding_progress créé avec succès');
            }
          } catch (error) {
            console.error('❌ Erreur lors de la création onboarding_progress:', error);
          }
        };

        createOnboardingProgress();
      }
      
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
      // Récupérer les données fraîches depuis la base
      const { data: { user } } = await supabaseService.getClient().auth.getUser();
      if (!user) {
        toast.error('Utilisateur non connecté');
        return;
      }

      console.log('🔍 Récupération des données fraîches depuis la base...');
      const { data: dbOnboarding, error: dbError } = await supabaseService.getClient()
        .from('onboarding_progress')
        .select('*')
        .eq('id', user.id)
        .single();

      if (dbError || !dbOnboarding) {
        console.error('❌ Erreur récupération données:', dbError);
        toast.error('Erreur lors de la récupération des données');
        return;
      }

      // Parser TOUTES les données depuis la base
      let adminInfo: any = {};
      let communeData: any = {};
      let kycData: any = {};
      let legalData: any = {};
      let subscriptionData: any = {};

      // Parser admin_info
      if (dbOnboarding.admin_info) {
        if (typeof dbOnboarding.admin_info === 'string') {
          try {
            adminInfo = JSON.parse(dbOnboarding.admin_info);
          } catch (e) {
            console.error('❌ Erreur parsing admin_info:', e);
            adminInfo = {};
          }
        } else {
          adminInfo = dbOnboarding.admin_info;
        }
      }

      // Parser commune_data
      if (dbOnboarding.commune_data) {
        if (typeof dbOnboarding.commune_data === 'string') {
          try {
            communeData = JSON.parse(dbOnboarding.commune_data);
          } catch (e) {
            console.error('❌ Erreur parsing commune_data:', e);
            communeData = {};
          }
        } else {
          communeData = dbOnboarding.commune_data;
        }
      }

      // Parser kyc_data
      if (dbOnboarding.kyc_data) {
        if (typeof dbOnboarding.kyc_data === 'string') {
          try {
            kycData = JSON.parse(dbOnboarding.kyc_data);
          } catch (e) {
            console.error('❌ Erreur parsing kyc_data:', e);
            kycData = {};
          }
        } else {
          kycData = dbOnboarding.kyc_data;
        }
      }

      // Parser legal_data
      if (dbOnboarding.legal_data) {
        if (typeof dbOnboarding.legal_data === 'string') {
          try {
            legalData = JSON.parse(dbOnboarding.legal_data);
          } catch (e) {
            console.error('❌ Erreur parsing legal_data:', e);
            legalData = {};
          }
        } else {
          legalData = dbOnboarding.legal_data;
        }
      }

      // Parser subscription_data
      if (dbOnboarding.subscription_data) {
        if (typeof dbOnboarding.subscription_data === 'string') {
          try {
            subscriptionData = JSON.parse(dbOnboarding.subscription_data);
          } catch (e) {
            console.error('❌ Erreur parsing subscription_data:', e);
            subscriptionData = {};
          }
        } else {
          subscriptionData = dbOnboarding.subscription_data;
        }
      }

      console.log('🔍 Vérification des données depuis la base...');
      console.log('👤 adminInfo depuis base:', adminInfo);
      console.log('🏘️ communeData depuis base:', communeData);
      console.log('📄 kycData depuis base:', kycData);
      console.log('⚖️ legalData depuis base:', legalData);
      console.log('💳 subscriptionData depuis base:', subscriptionData);
      
      if (!adminInfo.firstName || !adminInfo.lastName) {
        console.error('❌ VALIDATION ÉCHOUÉE - firstName ou lastName manquant');
        console.error('❌ firstName:', adminInfo.firstName);
        console.error('❌ lastName:', adminInfo.lastName);
        toast.error('Informations administrateur manquantes');
        return;
      }
      
      if (!communeData.id) {
        toast.error('Commune non sélectionnée');
        return;
      }
      
      // Vérification que le paiement est complété
      if (!subscriptionData.paymentCompleted && currentStep < 6) {
        toast.error('Vous devez compléter votre paiement avant de finaliser l\'onboarding.');
        return;
      }

      // Récupérer l'utilisateur connecté (déjà récupéré plus haut)
      
      if (user) {
        console.log('🚀 Début de la finalisation de l\'onboarding pour:', user.email);
        console.log('📊 Données onboarding:', onboardingData);

        // 1. Créer ou mettre à jour le profil utilisateur avec TOUTES les données de la base
        const profileData = {
          id: user.id,
          email: adminInfo.email,
          first_name: adminInfo.firstName,
          last_name: adminInfo.lastName,
          phone: adminInfo.phone,
          function: adminInfo.function,
          commune_id: communeData.id,
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

        // 3. Créer les documents KYC si un document a été uploadé
        if (onboardingData.kyc.documentUploaded && onboardingData.kyc.documentPath) {
          console.log('📄 Création document KYC avec path:', onboardingData.kyc.documentPath);
          
          const { error: kycError } = await supabaseService.getClient()
            .from('kyc_documents')
            .insert({
              user_id: user.id,
              commune_id: onboardingData.commune.id,
              file_name: onboardingData.kyc.fileName || 'document_identite.pdf',
              file_path: onboardingData.kyc.documentPath,
              file_size: onboardingData.kyc.fileSize || 0,
              file_type: 'application/pdf',
              status: 'pending_validation'
            });

          if (kycError) {
            console.error('❌ Erreur création document KYC:', kycError);
          } else {
            console.log('✅ Document KYC créé');
          }
        } else {
          console.log('⚠️ Pas de document KYC à créer');
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
      
      // Redirection avec délai pour voir les logs
      console.log('🔄 Redirection vers le dashboard dans 1 minute...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 60000);
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
            userId={user?.id || ""}
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