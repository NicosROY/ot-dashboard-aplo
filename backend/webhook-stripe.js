const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Middleware pour vérifier la signature Stripe
const verifyStripeSignature = (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET manquant');
    return res.status(500).json({ error: 'Configuration webhook manquante' });
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    req.stripeEvent = event;
    next();
  } catch (err) {
    console.error('Erreur vérification signature Stripe:', err.message);
    return res.status(400).json({ error: 'Signature invalide' });
  }
};

// Endpoint webhook Stripe
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), verifyStripeSignature, async (req, res) => {
  const event = req.stripeEvent;

  console.log('🔔 Webhook Stripe reçu:', event.type);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`⚠️ Événement non géré: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Erreur webhook Stripe:', error);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// Gérer un paiement réussi
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('✅ Paiement réussi:', paymentIntent.id);

  try {
    // Récupérer les métadonnées du paiement
    const { commune_id, user_id, plan_type, amount_monthly } = paymentIntent.metadata;

    if (!commune_id || !user_id) {
      console.error('❌ Métadonnées manquantes dans le paiement');
      return;
    }

    // 1. Créer ou mettre à jour l'abonnement
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        commune_id: parseInt(commune_id),
        stripe_subscription_id: paymentIntent.id,
        status: 'active',
        plan_type: plan_type || 'small',
        amount_monthly: parseFloat(amount_monthly) || 0,
        currency: paymentIntent.currency,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('❌ Erreur création abonnement:', subscriptionError);
      return;
    }

    console.log('✅ Abonnement créé/mis à jour:', subscriptionData.id);

    // 2. Créer l'enregistrement de paiement
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        subscription_id: subscriptionData.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Stripe utilise les centimes
        currency: paymentIntent.currency,
        status: 'succeeded',
        payment_method: 'stripe'
      });

    if (paymentError) {
      console.error('❌ Erreur création paiement:', paymentError);
    } else {
      console.log('✅ Paiement enregistré');
    }

    // 3. Mettre à jour le statut de l'onboarding si nécessaire
    const { error: onboardingError } = await supabase
      .from('onboarding_progress')
      .update({
        subscription_data: {
          ...paymentIntent.metadata,
          paymentCompleted: true,
          stripeData: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status
          }
        }
      })
      .eq('id', user_id);

    if (onboardingError) {
      console.error('❌ Erreur mise à jour onboarding:', onboardingError);
    } else {
      console.log('✅ Onboarding mis à jour');
    }

  } catch (error) {
    console.error('❌ Erreur traitement paiement réussi:', error);
  }
}

// Gérer un paiement échoué
async function handlePaymentIntentFailed(paymentIntent) {
  console.log('❌ Paiement échoué:', paymentIntent.id);

  try {
    const { user_id } = paymentIntent.metadata;

    if (user_id) {
      // Mettre à jour le statut de l'onboarding
      const { error: onboardingError } = await supabase
        .from('onboarding_progress')
        .update({
          subscription_data: {
            paymentCompleted: false,
            stripeData: {
              paymentIntentId: paymentIntent.id,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              status: paymentIntent.status,
              error: paymentIntent.last_payment_error?.message
            }
          }
        })
        .eq('id', user_id);

      if (onboardingError) {
        console.error('❌ Erreur mise à jour onboarding échec:', onboardingError);
      }
    }
  } catch (error) {
    console.error('❌ Erreur traitement paiement échoué:', error);
  }
}

// Gérer une facture payée (abonnements récurrents)
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('✅ Facture payée:', invoice.id);

  try {
    // Récupérer l'abonnement associé
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();

    if (subscriptionError || !subscription) {
      console.error('❌ Abonnement non trouvé pour la facture:', invoice.subscription);
      return;
    }

    // Créer l'enregistrement de paiement
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        subscription_id: subscription.id,
        stripe_payment_intent_id: invoice.payment_intent,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'succeeded',
        payment_method: 'stripe'
      });

    if (paymentError) {
      console.error('❌ Erreur création paiement récurrent:', paymentError);
    } else {
      console.log('✅ Paiement récurrent enregistré');
    }

  } catch (error) {
    console.error('❌ Erreur traitement facture payée:', error);
  }
}

// Gérer une facture non payée
async function handleInvoicePaymentFailed(invoice) {
  console.log('❌ Facture non payée:', invoice.id);

  try {
    // Mettre à jour le statut de l'abonnement
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due'
      })
      .eq('stripe_subscription_id', invoice.subscription);

    if (subscriptionError) {
      console.error('❌ Erreur mise à jour statut abonnement:', subscriptionError);
    } else {
      console.log('✅ Statut abonnement mis à jour: past_due');
    }

  } catch (error) {
    console.error('❌ Erreur traitement facture non payée:', error);
  }
}

module.exports = router; 