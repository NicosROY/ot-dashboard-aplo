const express = require('express');
const cors = require('cors');
const stripe = require('stripe');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Proxy pour Nominatim (contourne CORS)
app.get('/api/nominatim/search', async (req, res) => {
  try {
    const { q, countrycodes, limit, format, addressdetails } = req.query;
    
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(q)}` +
      `&countrycodes=${countrycodes}` +
      `&limit=${limit}` +
      `&format=${format}` +
      `&addressdetails=${addressdetails}`;

    console.log('🌐 Proxy Nominatim:', nominatimUrl);

    const response = await fetch(nominatimUrl, {
      headers: {
        'Accept-Language': 'fr',
        'User-Agent': 'APLO-Dashboard/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📋 Résultats Nominatim:', data.length, 'résultats');
    
    res.json(data);
  } catch (error) {
    console.error('❌ Erreur proxy Nominatim:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche d\'adresses' });
  }
});

// Import du webhook Stripe
const stripeWebhook = require('./webhook-stripe');

// Configuration Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeInstance = stripe(stripeSecretKey);

// Configuration Supabase
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Plans d'abonnement Stripe
const STRIPE_PLANS = {
  small_commune: {
    priceId: process.env.STRIPE_SMALL_COMMUNE_PRICE_ID,
    name: 'Petite commune',
    price: 99
  },
  medium_commune: {
    priceId: process.env.STRIPE_MEDIUM_COMMUNE_PRICE_ID,
    name: 'Commune moyenne',
    price: 199
  },
  large_commune: {
    priceId: process.env.STRIPE_LARGE_COMMUNE_PRICE_ID,
    name: 'Grande commune',
    price: 299
  }
};

// Route pour créer une session de checkout Stripe
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { planId, communeId, userId } = req.body;

    if (!planId || !communeId || !userId) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    const plan = STRIPE_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    // Créer la session Stripe
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/onboarding/subscription`,
      metadata: {
        communeId: communeId.toString(),
        userId: userId,
        planId: planId
      },
      subscription_data: {
        metadata: {
          communeId: communeId.toString(),
          userId: userId,
          planId: planId
        }
      }
    });

    res.json({
      id: session.id,
      url: session.url,
      status: session.status
    });

  } catch (error) {
    console.error('Erreur création session Stripe:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la session' });
  }
});

// Route pour créer une intention de paiement Stripe
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { planId, communeId, userId, amount } = req.body;

    if (!planId || !communeId || !userId || !amount) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    // Créer l'intention de paiement Stripe
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amount, // Montant en centimes
      currency: 'eur',
      metadata: {
        communeId: communeId.toString(),
        userId: userId,
        planId: planId
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    });

  } catch (error) {
    console.error('Erreur création payment intent:', error);
    console.error('Détails de l\'erreur:', error.message);
    console.error('Code d\'erreur Stripe:', error.code);
    res.status(500).json({ error: 'Erreur lors de la création du paiement', details: error.message });
  }
});

// Route pour vérifier le statut d'un abonnement
app.get('/api/subscription-status/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);

    res.json({
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end
    });

  } catch (error) {
    console.error('Erreur vérification abonnement:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Route pour vérifier le statut d'un paiement
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID manquant' });
    }

    // Vérifier la session Stripe
    const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session de paiement non trouvée' });
    }

    // Vérifier que le paiement est bien payé
    if (session.payment_status !== 'paid') {
      return res.json({ 
        status: 'pending',
        session: session
      });
    }

    // Vérifier en base de données
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (paymentError && paymentError.code !== 'PGRST116') {
      console.error('Erreur vérification paiement en base:', paymentError);
      return res.status(500).json({ error: 'Erreur lors de la vérification en base' });
    }

    if (payment) {
      // Le paiement existe en base, vérifier qu'il est bien completé
      if (payment.status === 'completed') {
        res.json({ 
          status: 'completed',
          session: session,
          payment: payment
        });
      } else {
        res.json({ 
          status: 'pending',
          session: session,
          payment: payment
        });
      }
    } else {
      // Le webhook n'a peut-être pas encore traité, créer l'enregistrement
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          stripe_session_id: sessionId,
          subscription_id: session.subscription,
          user_id: session.metadata.userId,
          commune_id: session.metadata.communeId,
          plan_id: session.metadata.planId,
          amount: session.amount_total,
          status: 'completed',
          payment_method: 'stripe'
        });

      if (insertError) {
        console.error('Erreur création paiement:', insertError);
        return res.status(500).json({ error: 'Erreur lors de l\'enregistrement du paiement' });
      }

      res.json({ 
        status: 'completed',
        session: session
      });
    }

  } catch (error) {
    console.error('Erreur vérification paiement:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Route pour annuler un abonnement
app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    const subscription = await stripeInstance.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    res.json({
      id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end
    });

  } catch (error) {
    console.error('Erreur annulation abonnement:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation' });
  }
});

// Routes pour les invitations d'équipe
app.post('/api/team-invitations/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token d\'invitation manquant' });
    }

    // Récupérer l'invitation
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invitation invalide ou expirée' });
    }

    // Vérifier que l'invitation n'a pas expiré
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation expirée' });
    }

    res.json({ invitation });

  } catch (error) {
    console.error('Erreur vérification invitation:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

app.post('/api/team-invitations/accept', async (req, res) => {
  try {
    const { token } = req.body;
    const authHeader = req.headers.authorization;

    if (!token) {
      return res.status(400).json({ error: 'Token d\'invitation manquant' });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    const userToken = authHeader.split(' ')[1];

    // Vérifier l'utilisateur avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    // Récupérer l'invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      return res.status(404).json({ error: 'Invitation invalide ou expirée' });
    }

    // Vérifier que l'invitation n'a pas expiré
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation expirée' });
    }

    // Vérifier que l'email correspond
    if (invitation.email !== user.email) {
      return res.status(403).json({ error: 'Email ne correspond pas à l\'invitation' });
    }

    // Créer le membre d'équipe
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        user_id: user.id,
        admin_user_id: invitation.admin_user_id,
        commune_id: invitation.commune_id,
        role: invitation.role,
        invitation_id: invitation.id
      });

    if (memberError) {
      console.error('Erreur création membre:', memberError);
      return res.status(500).json({ error: 'Erreur lors de l\'ajout au groupe' });
    }

    // Marquer l'invitation comme acceptée
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Erreur mise à jour invitation:', updateError);
    }

    res.json({ success: true, message: 'Invitation acceptée avec succès' });

  } catch (error) {
    console.error('Erreur acceptation invitation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'acceptation' });
  }
});

app.post('/api/team-invitations/decline', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token d\'invitation manquant' });
    }

    // Marquer l'invitation comme expirée
    const { error } = await supabase
      .from('team_invitations')
      .update({
        status: 'expired'
      })
      .eq('invitation_token', token);

    if (error) {
      console.error('Erreur refus invitation:', error);
      return res.status(500).json({ error: 'Erreur lors du refus' });
    }

    res.json({ success: true, message: 'Invitation refusée' });

  } catch (error) {
    console.error('Erreur refus invitation:', error);
    res.status(500).json({ error: 'Erreur lors du refus' });
  }
});

// Routes webhook Stripe
app.use('/api', stripeWebhook);

// Gestionnaires d'événements Stripe
async function handleCheckoutCompleted(session) {
  console.log('Checkout complété:', session.id);
  
  // Mettre à jour le statut de paiement dans Supabase
  const { error } = await supabase
    .from('payments')
    .insert({
      stripe_session_id: session.id,
      subscription_id: session.subscription,
      user_id: session.metadata.userId,
      commune_id: session.metadata.communeId,
      plan_id: session.metadata.planId,
      amount: session.amount_total,
      status: 'completed',
      payment_method: 'stripe'
    });

  if (error) {
    console.error('Erreur mise à jour paiement:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Paiement réussi:', invoice.id);
  
  // Mettre à jour le statut de l'abonnement
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'active',
      current_period_end: new Date(invoice.period_end * 1000)
    })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    console.error('Erreur mise à jour abonnement:', error);
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Paiement échoué:', invoice.id);
  
  // Mettre à jour le statut de l'abonnement
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    console.error('Erreur mise à jour abonnement:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Abonnement supprimé:', subscription.id);
  
  // Mettre à jour le statut de l'abonnement
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Erreur mise à jour abonnement:', error);
  }
}

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'APLO Backend is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}`);
}); 