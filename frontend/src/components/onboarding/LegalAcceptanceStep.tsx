import React, { useState } from 'react';
import supabaseService from '../../services/supabase';
import toast from 'react-hot-toast';

interface LegalData {
  cgvAccepted: boolean;
  cguAccepted: boolean;
  responsibilityAccepted: boolean;
}

interface LegalAcceptanceStepProps {
  data: LegalData;
  onUpdate: (data: LegalData) => void;
  onNext: () => void;
  onPrev: () => void;
}

const LegalAcceptanceStep: React.FC<LegalAcceptanceStepProps> = ({ 
  data, 
  onUpdate, 
  onNext, 
  onPrev 
}) => {
  const [legalData, setLegalData] = useState<LegalData>(data);
  const [showCGV, setShowCGV] = useState(false);
  const [showCGU, setShowCGU] = useState(false);
  const [showResponsibility, setShowResponsibility] = useState(false);

  // Vérifier si l'email vient d'être validé au montage du composant
  React.useEffect(() => {
    const checkEmailValidation = async () => {
      try {
        const { data: { user } } = await supabaseService.getClient().auth.getUser();
        
        if (user && user.email_confirmed_at) {
          // Email validé, afficher un toast de confirmation
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
                    Vous pouvez maintenant procéder au paiement
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
        }
      } catch (error) {
        console.error('Erreur lors de la vérification email:', error);
      }
    };

    checkEmailValidation();
  }, []);

  const handleAcceptanceChange = async (field: keyof LegalData, value: boolean) => {
    const updatedData = { ...legalData, [field]: value };
    setLegalData(updatedData);
    onUpdate(updatedData);
    
    // Sauvegarder dans la table legal de Supabase
    try {
      const { data: { user } } = await supabaseService.getClient().auth.getUser();
      if (!user) return;

      const { error } = await supabaseService.getClient()
        .from('legal')
        .upsert({
          user_id: user.id,
          cgv_accepted: updatedData.cgvAccepted,
          cgu_accepted: updatedData.cguAccepted,
          responsibility_accepted: updatedData.responsibilityAccepted,
          cgv_accepted_at: updatedData.cgvAccepted ? new Date().toISOString() : null,
          cgu_accepted_at: updatedData.cguAccepted ? new Date().toISOString() : null,
          responsibility_accepted_at: updatedData.responsibilityAccepted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Erreur sauvegarde legal:', error);
      } else {
        console.log('✅ Legal sauvegardé:', updatedData);
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde legal:', error);
    }
  };

  const handleContinue = async () => {
    if (legalData.cgvAccepted && legalData.cguAccepted && legalData.responsibilityAccepted) {
      // Vérifier si l'email est confirmé avant de permettre le passage au paiement
      try {
        const { data: { user } } = await supabaseService.getClient().auth.getUser();
        
        if (user && !user.email_confirmed_at) {
          // Email non confirmé, afficher le message et empêcher la continuation
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
                    ⚠️ Email non confirmé
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Vous devez confirmer votre email avant de procéder au paiement
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Vérifiez votre boîte mail et cliquez sur le lien de confirmation
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
          
          // Envoyer un nouvel email de confirmation
          if (user.email) {
            await supabaseService.getClient().auth.resend({
              type: 'signup',
              email: user.email
            });
          }
          
          toast.success(
            (t) => (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    📧 Email renvoyé
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Un nouvel email de confirmation a été envoyé
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
                border: '1px solid #dbeafe',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '16px',
                minWidth: '400px'
              }
            }
          );
          
          return; // Empêcher le passage à l'étape suivante
        }
        
        // Email confirmé, permettre le passage au paiement
        onNext();
        
      } catch (error) {
        console.error('Erreur lors de la vérification email:', error);
        toast.error('Erreur lors de la vérification. Veuillez réessayer.');
      }
    }
  };

  const allAccepted = legalData.cgvAccepted && legalData.cguAccepted && legalData.responsibilityAccepted;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Acceptation des conditions légales
        </h2>
        <p className="text-gray-600">
          Pour finaliser votre inscription, vous devez accepter les conditions légales 
          qui régissent l'utilisation de la plateforme APLO.
        </p>
      </div>

      {/* Documents légaux */}
      <div className="space-y-6 mb-8">
        {/* CGV */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="cgv"
                checked={legalData.cgvAccepted}
                onChange={(e) => handleAcceptanceChange('cgvAccepted', e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <label htmlFor="cgv" className="text-lg font-medium text-gray-900 cursor-pointer">
                  Conditions Générales de Vente (CGV)
                </label>
                <p className="text-gray-600 mt-1">
                  Définissent les conditions de vente, les tarifs et les modalités de paiement.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCGV(!showCGV)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showCGV ? 'Masquer' : 'Lire'}
            </button>
          </div>
          
          {showCGV && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md max-h-64 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <h3>CONDITIONS GÉNÉRALES DE VENTE</h3>
                <p><strong>ÉDITEUR</strong></p>
                <p><strong>ROY ADVISOR</strong><br/>
                SAS au capital social de 1 000 €<br/>
                SIREN : 949 471 908<br/>
                SIRET : 949 471 908 00010<br/>
                Siège social : 39 COURS GAMBETTA 13100 AIX-EN-PROVENCE<br/>
                Activité : Conseil en relations publiques et communication (Code NAF/APE : 70.21Z)<br/>
                Nom commercial : APLO</p>
                
                <h4>PRÉAMBULE</h4>
                <p>Les présentes Conditions Générales de Vente (CGV) s'appliquent à tous les services proposés par ROY ADVISOR sous la marque APLO, notamment la plateforme de gestion d'événements destinée aux Offices de Tourisme.</p>
                
                <h4>ARTICLE 1 - OBJET</h4>
                <p>Les présentes CGV ont pour objet de définir les conditions de vente des abonnements à la plateforme APLO, service de publication d'événements pour les Offices de Tourisme.</p>
                
                <h4>ARTICLE 2 - SERVICES PROPOSÉS</h4>
                <p><strong>2.1 Description du service</strong><br/>
                APLO propose une plateforme permettant aux Offices de Tourisme de :</p>
                <ul>
                  <li>Publier des événements illimités</li>
                  <li>Gérer jusqu'à 5 utilisateurs par compte</li>
                  <li>Bénéficier d'un support client</li>
                  <li>Synchroniser les événements avec l'agrégateur APLO</li>
                </ul>
                
                <p><strong>2.2 Offres d'abonnement</strong></p>
                <p><strong>Petite commune (moins de 10 000 habitants)</strong><br/>
                - Prix : 79 € HT / mois<br/>
                - Période d'essai : 7 jours gratuits</p>
                
                <p><strong>Grande commune (plus de 10 000 habitants)</strong><br/>
                - Prix : 149 € HT / mois<br/>
                - Période d'essai : 7 jours gratuits</p>
                
                <h4>ARTICLE 3 - COMMANDE ET PAIEMENT</h4>
                <p><strong>3.1 Commande</strong><br/>
                La commande s'effectue en ligne via la plateforme APLO. L'utilisateur doit :</p>
                <ul>
                  <li>Créer un compte administrateur</li>
                  <li>Sélectionner sa commune</li>
                  <li>Valider son identité (KYC)</li>
                  <li>Choisir un plan d'abonnement</li>
                  <li>Accepter les présentes CGV</li>
                </ul>
                
                <p><strong>3.2 Paiement</strong></p>
                <ul>
                  <li>Moyens de paiement acceptés : Cartes bancaires via Stripe</li>
                  <li>Paiement mensuel automatique</li>
                  <li>Facturation en euros, prix HT</li>
                  <li>TVA applicable selon la législation française</li>
                </ul>
                
                <p><strong>3.3 Période d'essai</strong></p>
                <ul>
                  <li>Durée : 7 jours gratuits</li>
                  <li>Aucun engagement pendant cette période</li>
                  <li>Possibilité d'annulation sans frais</li>
                  <li>Début de facturation après la période d'essai</li>
                </ul>
                
                <h4>ARTICLE 4 - DURÉE ET RÉSILIATION</h4>
                <p><strong>4.1 Durée</strong></p>
                <ul>
                  <li>Abonnement sans engagement de durée</li>
                  <li>Renouvellement automatique mensuel</li>
                  <li>Tacite reconduction</li>
                </ul>
                
                <p><strong>4.2 Résiliation</strong></p>
                <ul>
                  <li>Résiliation possible à tout moment</li>
                  <li>Préavis : 1 mois</li>
                  <li>Résiliation en ligne via le compte client</li>
                  <li>Pas de frais de résiliation</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* CGU */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="cgu"
                checked={legalData.cguAccepted}
                onChange={(e) => handleAcceptanceChange('cguAccepted', e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <label htmlFor="cgu" className="text-lg font-medium text-gray-900 cursor-pointer">
                  Conditions Générales d'Utilisation (CGU)
                </label>
                <p className="text-gray-600 mt-1">
                  Régissent l'utilisation de la plateforme et les responsabilités des utilisateurs.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCGU(!showCGU)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showCGU ? 'Masquer' : 'Lire'}
            </button>
          </div>
          
          {showCGU && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md max-h-64 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <h3>CONDITIONS GÉNÉRALES D'UTILISATION</h3>
                <p><strong>ÉDITEUR</strong></p>
                <p><strong>ROY ADVISOR</strong><br/>
                SAS au capital social de 1 000 €<br/>
                SIREN : 949 471 908<br/>
                SIRET : 949 471 908 00010<br/>
                Siège social : 39 COURS GAMBETTA 13100 AIX-EN-PROVENCE<br/>
                Activité : Conseil en relations publiques et communication (Code NAF/APE : 70.21Z)<br/>
                Nom commercial : APLO</p>
                
                <h4>PRÉAMBULE</h4>
                <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme APLO, service de gestion d'événements destiné aux Offices de Tourisme.</p>
                
                <h4>ARTICLE 1 - DÉFINITIONS</h4>
                <ul>
                  <li><strong>Plateforme</strong> : Le service APLO accessible en ligne</li>
                  <li><strong>Utilisateur</strong> : Toute personne utilisant la plateforme</li>
                  <li><strong>Administrateur</strong> : Utilisateur principal responsable du compte</li>
                  <li><strong>Événement</strong> : Tout contenu publié par l'utilisateur</li>
                  <li><strong>Commune</strong> : Collectivité territoriale représentée par l'Office de Tourisme</li>
                </ul>
                
                <h4>ARTICLE 2 - ACCÈS ET INSCRIPTION</h4>
                <p><strong>2.1 Conditions d'accès</strong><br/>
                L'accès à la plateforme est réservé aux Offices de Tourisme français, sous réserve de :</p>
                <ul>
                  <li>Validation de l'identité (KYC)</li>
                  <li>Acceptation des présentes CGU</li>
                  <li>Souscription à un abonnement en cours de validité</li>
                </ul>
                
                <h4>ARTICLE 3 - UTILISATION DE LA PLATEFORME</h4>
                <p><strong>3.1 Utilisation autorisée</strong><br/>
                La plateforme permet de :</p>
                <ul>
                  <li>Publier des événements illimités</li>
                  <li>Gérer le contenu des événements</li>
                  <li>Synchroniser avec l'agrégateur APLO</li>
                  <li>Gérer les utilisateurs de l'équipe</li>
                </ul>
                
                <p><strong>3.2 Utilisation interdite</strong><br/>
                Il est interdit de :</p>
                <ul>
                  <li>Publier du contenu illégal ou diffamatoire</li>
                  <li>Utiliser la plateforme à des fins commerciales non autorisées</li>
                  <li>Tenter de contourner les mesures de sécurité</li>
                  <li>Partager les accès avec des tiers non autorisés</li>
                </ul>
                
                <h4>ARTICLE 4 - PUBLICATION D'ÉVÉNEMENTS</h4>
                <p><strong>4.1 Règles de publication</strong><br/>
                Les événements doivent :</p>
                <ul>
                  <li>Être liés à la commune de l'Office de Tourisme</li>
                  <li>Respecter la réglementation en vigueur</li>
                  <li>Être conformes aux bonnes mœurs</li>
                  <li>Ne pas contenir de contenu illégal</li>
                </ul>
                
                <h4>ARTICLE 5 - DONNÉES ET CONFIDENTIALITÉ</h4>
                <p>Les données personnelles sont traitées conformément au Règlement Général sur la Protection des Données (RGPD) et à la politique de confidentialité d'APLO.</p>
                
                <h4>ARTICLE 6 - DISPONIBILITÉ ET MAINTENANCE</h4>
                <p>ROY ADVISOR s'efforce d'assurer une disponibilité optimale de la plateforme, mais ne peut garantir une disponibilité de 100%.</p>
                
                <h4>ARTICLE 7 - PROPRIÉTÉ INTELLECTUELLE</h4>
                <p>ROY ADVISOR détient les droits sur la plateforme et le nom APLO. L'utilisateur conserve les droits sur ses contenus.</p>
                
                <h4>ARTICLE 8 - RÉSILIATION</h4>
                <p>La résiliation est possible à tout moment avec un préavis d'un mois. ROY ADVISOR peut résilier en cas de non-respect des CGU.</p>
              </div>
            </div>
          )}
        </div>

        {/* Déclaration de responsabilité */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="responsibility"
                checked={legalData.responsibilityAccepted}
                onChange={(e) => handleAcceptanceChange('responsibilityAccepted', e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <label htmlFor="responsibility" className="text-lg font-medium text-gray-900 cursor-pointer">
                  Déclaration de responsabilité
                </label>
                <p className="text-gray-600 mt-1">
                  Vous déclarez être légalement responsable des événements que vous publiez.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowResponsibility(!showResponsibility)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showResponsibility ? 'Masquer' : 'Lire'}
            </button>
          </div>
          
          {showResponsibility && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md max-h-64 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <h3>DÉCLARATION DE RESPONSABILITÉ</h3>
                <p><strong>ÉDITEUR</strong></p>
                <p><strong>ROY ADVISOR</strong><br/>
                SAS au capital social de 1 000 €<br/>
                SIREN : 949 471 908<br/>
                SIRET : 949 471 908 00010<br/>
                Siège social : 39 COURS GAMBETTA 13100 AIX-EN-PROVENCE<br/>
                Nom commercial : APLO</p>
                
                <h4>PRÉAMBULE</h4>
                <p>La présente déclaration de responsabilité est un document contractuel qui définit les responsabilités respectives entre ROY ADVISOR (éditeur de la plateforme APLO) et l'Office de Tourisme utilisateur de la plateforme.</p>
                
                <h4>ARTICLE 1 - ENGAGEMENT DE L'OFFICE DE TOURISME</h4>
                <p><strong>1.1 Responsabilité légale</strong><br/>
                L'Office de Tourisme déclare et s'engage à être <strong>légalement responsable</strong> de tous les événements qu'il publie sur la plateforme APLO, notamment :</p>
                <ul>
                  <li><strong>Contenu des événements</strong> : Textes, images, vidéos, informations</li>
                  <li><strong>Véracité des informations</strong> : Dates, horaires, lieux, prix, conditions</li>
                  <li><strong>Respect des droits</strong> : Propriété intellectuelle, droits à l'image</li>
                  <li><strong>Conformité réglementaire</strong> : Respect de toutes les réglementations applicables</li>
                </ul>
                
                <h4>ARTICLE 2 - DÉCHARGE DE RESPONSABILITÉ D'APLO</h4>
                <p><strong>2.1 Limitation de responsabilité</strong><br/>
                ROY ADVISOR se décharge expressément de toute responsabilité concernant :</p>
                <ul>
                  <li><strong>Le contenu des événements</strong> publiés par les Offices de Tourisme</li>
                  <li><strong>La véracité des informations</strong> fournies par les utilisateurs</li>
                  <li><strong>Les conséquences</strong> de la publication d'événements</li>
                  <li><strong>Les litiges</strong> entre l'Office de Tourisme et les participants aux événements</li>
                  <li><strong>Les dommages</strong> causés lors des événements organisés</li>
                  <li><strong>Les problèmes de sécurité</strong> lors des événements</li>
                </ul>
                
                <h4>ARTICLE 3 - INDEMNISATION</h4>
                <p><strong>3.1 Engagement d'indemnisation</strong><br/>
                L'Office de Tourisme s'engage à indemniser ROY ADVISOR de :</p>
                <ul>
                  <li>Tous les préjudices subis par ROY ADVISOR</li>
                  <li>Tous les coûts de défense en cas de litige</li>
                  <li>Toutes les amendes ou sanctions administratives</li>
                  <li>Tous les dommages réputationnels</li>
                </ul>
                
                <h4>ARTICLE 4 - MODÉRATION ET SANCTIONS</h4>
                <p>ROY ADVISOR se réserve le droit de modérer le contenu publié, de suspendre la publication d'événements non conformes, de supprimer tout contenu problématique et de suspendre l'accès à la plateforme.</p>
                
                <h4>ARTICLE 5 - ASSURANCE</h4>
                <p>L'Office de Tourisme s'engage à souscrire une assurance responsabilité civile adaptée et à couvrir les risques liés à l'organisation d'événements.</p>
                
                <h4>ARTICLE 6 - NOTIFICATION DES PROBLÈMES</h4>
                <p>L'Office de Tourisme s'engage à notifier immédiatement ROY ADVISOR de tout problème lié à un événement, de toute réclamation d'un tiers, de tout litige en cours ou de tout changement de situation.</p>
              </div>
            </div>
          )}
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
              Informations importantes
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Ces documents sont contractuels et vous engagent légalement</li>
                <li>Vous pouvez les consulter à tout moment dans votre espace client</li>
                <li>En cas de modification, vous serez notifié par email</li>
                <li>Pour toute question, contactez-nous à legal@aplo.fr</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons de navigation */}
      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Retour
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!allAccepted}
          className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
            !allAccepted
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-white text-aplo-purple border border-aplo-purple hover:bg-aplo-purple hover:text-white focus:outline-none focus:ring-2 focus:ring-aplo-purple focus:ring-offset-2'
          }`}
        >
          Continuer
        </button>
      </div>
    </div>
  );
};

export default LegalAcceptanceStep; 