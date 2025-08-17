import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const OnboardingSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        if (!sessionId) {
          setError('Session de paiement manquante');
          return;
        }

        // Vérifier le statut du paiement avec le backend
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/verify-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la vérification');
        }

        const data = await response.json();
        setPaymentStatus(data.status);
        
        if (data.status === 'completed') {
          setIsLoading(false);
        } else {
          setError('Paiement non confirmé');
          setIsLoading(false);
        }
        
      } catch (error) {
        console.error('Erreur vérification paiement:', error);
        setError('Erreur lors de la vérification du paiement');
        setIsLoading(false);
      }
    };

    handlePaymentSuccess();
  }, [sessionId]);

  const handleContinue = () => {
    // Rediriger vers le dashboard ou la page finale
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-aplo-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aplo-purple mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification du paiement en cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-aplo-cream flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Erreur de paiement
            </h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/onboarding/subscription')}
              className="btn btn-danger"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aplo-cream flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-md shadow-sm p-8">
          <div className="text-green-600 mb-4">
            <CheckCircleIcon className="h-16 w-16 mx-auto" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Paiement réussi !
          </h1>
          
          <p className="text-gray-600 mb-6">
            Votre abonnement a été activé avec succès. Vous pouvez maintenant accéder à votre dashboard et commencer à gérer vos événements.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              Prochaines étapes
            </h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Votre compte est maintenant actif</li>
              <li>• Vous recevrez un email de confirmation</li>
              <li>• Accédez à votre dashboard pour commencer</li>
            </ul>
          </div>
          
          <button
            onClick={handleContinue}
            className="btn btn-primary w-full"
          >
            Accéder au dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingSuccessPage; 