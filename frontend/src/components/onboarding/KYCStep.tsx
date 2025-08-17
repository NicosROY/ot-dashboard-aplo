import React, { useState, useEffect } from 'react';
import supabaseService from '../../services/supabase';
import toast from 'react-hot-toast';

interface KYCData {
  method: 'document';
  documentUploaded?: boolean;
  validated: boolean;
  documentId?: string;
}

interface CommuneData {
  id: number;
  name: string;
  population: number;
}

interface AdminData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  function: string;
}

interface KYCStepProps {
  data: KYCData;
  communeData: CommuneData;
  adminData: AdminData;
  onUpdate: (data: KYCData) => void;
  onNext: () => void;
  onPrev: () => void;
}

const KYCStep: React.FC<KYCStepProps> = ({ 
  data, 
  communeData, 
  adminData, 
  onUpdate, 
  onNext, 
  onPrev 
}) => {
  const [kycData, setKycData] = useState<KYCData>(data);
  const [isLoading, setIsLoading] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; type: string } | null>(null);

  // Debug log pour l'état du bouton
  useEffect(() => {
    console.log('État bouton Continuer:', {
      validated: kycData.validated,
      documentUploaded: kycData.documentUploaded,
      disabled: !kycData.validated && !kycData.documentUploaded
    });
  }, [kycData.validated, kycData.documentUploaded]);

  // VRAI upload vers Supabase Storage
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
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
                📄 Fichier trop volumineux
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Taille maximum : 10MB
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
      return;
    }

    // Vérifier le type de fichier
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
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
                📄 Format non autorisé
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Formats acceptés : PDF, JPG, PNG, DOC, DOCX
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
      return;
    }

    setDocumentStatus('uploading');
    setIsLoading(true);

    try {
      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabaseService.getClient().auth.getUser();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Générer un nom de fichier unique
      const fileExtension = file.name.split('.').pop();
      const fileName = `kyc_${user.id}_${Date.now()}.${fileExtension}`;
      const filePath = `kyc-documents/${fileName}`;

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseService.getClient().storage
        .from('kyc-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Pas d'insertion dans kyc_documents pendant l'onboarding
      // Le document sera enregistré à la fin de l'onboarding
      console.log('Document uploadé vers le bucket avec succès:', filePath);

      setDocumentStatus('uploaded');
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type
      });

      const newKycData = { 
        ...kycData, 
        documentUploaded: true, 
        method: 'document' as const,
        documentPath: filePath, // Sauvegarder le chemin du fichier
        fileName: file.name, // Sauvegarder le nom du fichier
        fileSize: file.size, // Sauvegarder la taille du fichier
        validated: false // Pas encore validé par l'admin
      };
      setKycData(newKycData);

      // Toast de succès pour l'upload
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
                📄 Document uploadé avec succès !
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Votre document sera validé sous 48h
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
      
    } catch (error) {
      console.error('Erreur upload document:', error);
      setDocumentStatus('error');
      
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
                📄 Erreur d'upload
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Erreur lors de l'upload du document. Veuillez réessayer.
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    console.log('État KYC actuel:', kycData);
    
    // Permettre de continuer si un document a été uploadé (même pas encore validé)
    if (kycData.documentUploaded) {
      onUpdate(kycData);
      onNext();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Validation de votre identité
        </h2>
        <p className="text-gray-600">
          Pour sécuriser votre compte, nous devons valider que vous représentez bien 
          l'Office de Tourisme de {communeData.name}.
        </p>
      </div>



      {/* Upload de document */}
      <div className="border border-gray-200 rounded-lg p-6 mb-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Upload d'un document officiel
          </h3>
          <p className="text-gray-600 mb-6">
            Téléchargez un document officiel prouvant votre lien avec l'Office de Tourisme 
            (arrêté municipal, convention, carte professionnelle, etc.)
          </p>
          
          <div className="space-y-4">
            <input
              type="file"
              id="document-upload"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleDocumentUpload}
              disabled={isLoading || documentStatus === 'uploaded'}
              className="hidden"
            />
            <label
              htmlFor="document-upload"
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md cursor-pointer transition-colors ${
                isLoading || documentStatus === 'uploaded'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {documentStatus === 'uploading' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Upload en cours...
                </>
              ) : documentStatus === 'uploaded' ? (
                <>
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Document uploadé
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choisir un document
                </>
              )}
            </label>
          </div>

          {/* Informations sur le fichier uploadé */}
          {uploadedFile && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-medium text-green-800">{uploadedFile.name}</p>
                  <p className="text-xs text-green-600">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {uploadedFile.type}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Processus de validation */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Processus de validation
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Validation manuelle par notre équipe sous 48h</li>
                <li>Vous recevrez un email de confirmation une fois validé</li>
                <li>Vous pouvez continuer l'onboarding en attendant la validation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons de navigation */}
      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Précédent
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!kycData.documentUploaded}
          className={`px-6 py-2 rounded-md text-white transition-colors ${
            kycData.documentUploaded
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continuer
        </button>
      </div>
    </div>
  );
};

export default KYCStep; 