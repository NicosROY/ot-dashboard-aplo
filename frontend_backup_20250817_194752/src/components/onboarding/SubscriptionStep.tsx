import React, { useState, useEffect } from 'react';
import { subscriptionPlans, SubscriptionPlan } from '../../services/stripe';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { config } from '../../config/environment';

// Configuration Stripe
const stripePromise = loadStripe(config.stripePublishableKey);

interface SubscriptionData {
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
}

interface SubscriptionStepProps {
  data: SubscriptionData;
  communePopulation: number;
  communeId: number;
  userId: string;
  onUpdate: (data: SubscriptionData) => void;
  onNext: () => void;
  onPrev: () => void;
}

// Composant de formulaire de paiement
const PaymentForm: React.FC<{
  plan: SubscriptionPlan;
  communeId: number;
  userId: string;
  onPaymentSuccess: (stripeData: any) => void;
}> = ({ plan, communeId, userId, onPaymentSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);

  // Vérifier si Stripe est chargé
  useEffect(() => {
    const checkStripe = async () => {
      try {
        const stripeInstance = await stripePromise;
        setStripeLoaded(!!stripeInstance);
      } catch (err) {
        console.warn('Stripe bloqué par ad blocker:', err);
        setStripeLoaded(false);
      }
    };
    checkStripe();
  }, []);

  // Si le plan est gratuit, pas besoin de paiement
  if (plan.price === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center p-6 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Plan gratuit activé !
          </h3>
          <p className="text-green-700 mb-4">
            Ce plan de test est entièrement gratuit. Aucun paiement requis.
          </p>
          <button
            onClick={() => onPaymentSuccess({ 
              paymentIntentId: 'free_plan',
              clientSecret: 'free_plan',
              amount: 0,
              currency: 'eur',
              status: 'succeeded'
            })}
            className="w-full bg-green-600 text-white font-medium py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Activer le plan gratuit
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe n\'est pas disponible. Veuillez désactiver votre bloqueur de publicités pour cette page.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Debug: afficher les données envoyées
      const paymentData = {
        planId: plan.id,
        communeId,
        userId,
        amount: plan.price * 100, // Stripe utilise les centimes
      };
      console.log('Données de paiement envoyées:', paymentData);
      
      // Créer l'intention de paiement côté serveur
      const response = await fetch(`${config.backendUrl}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la création du paiement');
      }

      const { clientSecret } = await response.json();

      // Confirmer le paiement avec Stripe
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (paymentError) {
        const errorMessage = paymentError.message || 'Erreur lors du paiement';
        setError(errorMessage);
        
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
                  💳 Erreur de paiement
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {errorMessage}
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
            duration: 8000,
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
      } else if (paymentIntent.status === 'succeeded') {
        // Stocker les infos Stripe pour la finalisation
        const stripeData = {
          paymentIntentId: paymentIntent.id,
          clientSecret: clientSecret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        };
        
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
                  💳 Paiement réussi !
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Votre abonnement est activé
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
        onPaymentSuccess(stripeData);
      }
    } catch (err) {
      console.error('Erreur paiement:', err);
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        setError('Impossible de se connecter au serveur. Vérifiez que le backend est démarré.');
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors du traitement du paiement');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Si Stripe n'est pas chargé, afficher un message d'erreur
  if (!stripeLoaded) {
    return (
      <div className="space-y-6">
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="font-medium">Stripe bloqué par le bloqueur de publicités</h4>
              <p className="mt-1">
                Pour effectuer le paiement, veuillez désactiver votre bloqueur de publicités pour cette page 
                et recharger la page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Recharger la page
              </button>
            </div>
          </div>
        </div>
        

      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Informations de carte bancaire
        </label>
        <div className="border border-gray-300 rounded-md p-3 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Traitement en cours...
          </span>
        ) : (
          `Payer ${plan.price}€ HT/mois`
        )}
      </button>

      <div className="text-xs text-gray-500 text-center">
        Paiement sécurisé par Stripe • Vos données ne sont jamais stockées
      </div>
    </form>
  );
};

const SubscriptionStep: React.FC<SubscriptionStepProps> = ({ 
  data, 
  communePopulation, 
  communeId,
  userId,
  onUpdate, 
  onNext, 
  onPrev 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    data.planId ? subscriptionPlans.find(p => p.id === data.planId) || null : null
  );

  // Déterminer le plan recommandé selon la population
  const getRecommendedPlan = () => {
    // Si population négative, proposer le plan de test gratuit
    if (communePopulation < 0) {
      return 'test_commune';
    }
    // Sinon, logique normale
    return communePopulation < 10000 ? 'small_commune' : 'large_commune';
  };

  const recommendedPlanId = getRecommendedPlan();
  
  // Filtrer pour afficher seulement le plan approprié
  const availablePlans = subscriptionPlans.filter(plan => plan.id === recommendedPlanId);

  // Sélectionner automatiquement le plan recommandé
  useEffect(() => {
    if (availablePlans.length > 0 && !selectedPlan) {
      const plan = availablePlans[0];
      setSelectedPlan(plan);
      onUpdate({
        planId: plan.id,
        planName: plan.name,
        price: plan.price
      });
    }
  }, [availablePlans, selectedPlan, onUpdate]);

  const handlePaymentSuccess = (stripeData: any) => {
    onUpdate({
      ...data,
      paymentCompleted: true,
      stripeData: stripeData
    });
    
    // Passer à l'étape suivante après un délai
    setTimeout(() => {
      onNext();
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choisissez votre abonnement
        </h2>
        <p className="text-lg text-gray-600">
          Votre commune compte {communePopulation.toLocaleString()} habitants
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Période d'essai gratuite de 7 jours • Sans engagement
        </p>
        
        {/* Message si paiement déjà effectué */}
        {data?.paymentCompleted && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">
                Paiement effectué avec succès ! Vous pouvez continuer.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center mb-8">
        {availablePlans.map((plan) => (
          <div
            key={plan.id}
            className="relative rounded-lg border-2 p-6 transition-all duration-200 max-w-md w-full border-blue-500 bg-white"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {plan.name}
              </h3>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {plan.price}€
                <span className="text-lg font-normal text-gray-500">/mois HT</span>
              </div>
              <p className="text-gray-600">
                {plan.description}
              </p>
            </div>

            {/* Formulaire de paiement intégré */}
            {!data?.paymentCompleted && (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  plan={plan}
                  communeId={communeId}
                  userId={userId}
                  onPaymentSuccess={handlePaymentSuccess}
                />
              </Elements>
            )}

            {/* Bouton continuer si paiement déjà fait */}
            {data?.paymentCompleted && (
              <button
                onClick={onNext}
                className="w-full bg-green-600 text-white font-medium py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Paiement effectué - Continuer
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Informations importantes */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Informations de paiement
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Paiement sécurisé par Stripe</li>
                <li>Période d'essai de 7 jours gratuite</li>
                <li>Résiliable à tout moment avec un préavis d'un mois</li>
                <li>Facturation mensuelle automatique</li>
                <li>Aucun engagement de durée</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons de navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Retour
        </button>
      </div>
    </div>
  );
};

export default SubscriptionStep; 