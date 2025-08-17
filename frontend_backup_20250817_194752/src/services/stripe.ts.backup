import { loadStripe, Stripe } from '@stripe/stripe-js';

// Configuration Stripe
const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51Rl4vLQD7xuAt5fNHa8nNM4SHr0A9S9uSsDZga3adojFEDRoxJUaRr9RoI7Bs2LSxcKatVQGFSowpyAboyhK12qm00GH970U8K';
const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

// Instance Stripe
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePublishableKey) {
    throw new Error('Clé Stripe manquante. Vérifiez REACT_APP_STRIPE_PUBLISHABLE_KEY');
  }
  
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Types pour les abonnements
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  populationLimit: number;
}

// Plans d'abonnement
export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'small_commune',
    name: 'Petite commune',
    price: 99,
    description: 'Pour les communes de moins de 10 000 habitants',
    features: [
      'Publication d\'événements illimitée',
      'Support client',
      'Jusqu\'à 5 utilisateurs',
      'Sans billetterie'
    ],
    populationLimit: 10000
  },
  {
    id: 'medium_commune',
    name: 'Commune moyenne',
    price: 199,
    description: 'Pour les communes de 10 000 à 100 000 habitants',
    features: [
      'Publication d\'événements illimitée',
      'Support client prioritaire',
      'Jusqu\'à 10 utilisateurs',
      'Sans billetterie'
    ],
    populationLimit: 100000
  },
  {
    id: 'large_commune',
    name: 'Grande commune',
    price: 299,
    description: 'Pour les communes de plus de 100 000 habitants',
    features: [
      'Publication d\'événements illimitée',
      'Support client prioritaire',
      'Jusqu\'à 15 utilisateurs',
      'Sans billetterie'
    ],
    populationLimit: 999999
  }
];

// Service de paiement
export class StripeService {
  private stripe: Stripe | null = null;

  async initialize() {
    this.stripe = await getStripe();
    return this.stripe;
  }

  // Créer une session de paiement
  async createCheckoutSession(planId: string, communeId: number, userId: string) {
    try {
      const response = await fetch(`${backendUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          communeId,
          userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la session');
      }

      const session = await response.json();
      return session;
    } catch (error) {
      console.error('Erreur Stripe:', error);
      throw error;
    }
  }

  // Rediriger vers le checkout Stripe
  async redirectToCheckout(sessionId: string) {
    if (!this.stripe) {
      await this.initialize();
    }

    if (!this.stripe) {
      throw new Error('Stripe non initialisé');
    }

    const { error } = await this.stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      throw error;
    }
  }

  // Vérifier le statut d'un abonnement
  async getSubscriptionStatus(subscriptionId: string) {
    try {
      const response = await fetch(`${backendUrl}/api/subscription-status/${subscriptionId}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la vérification du statut');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur vérification abonnement:', error);
      throw error;
    }
  }

  // Annuler un abonnement
  async cancelSubscription(subscriptionId: string) {
    try {
      const response = await fetch(`${backendUrl}/api/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'annulation');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur annulation abonnement:', error);
      throw error;
    }
  }
}

// Instance singleton
const stripeService = new StripeService();
export default stripeService; 