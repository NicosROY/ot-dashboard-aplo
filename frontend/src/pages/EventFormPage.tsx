import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import supabaseService from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import uploadService from '../services/uploadService';
import geocodingService from '../services/geocodingService';
import { EventFormData, Category } from '../types';
import removeAccents from 'remove-accents';

const EventFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isFree, setIsFree] = useState(true);
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{display_name: string, lat: string, lon: string}>>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);
  const [userCommune, setUserCommune] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer la commune de l'utilisateur depuis l'objet user déjà disponible
        if (user?.commune_id) {
          // Requête simple pour récupérer le nom de la commune
          const { data: commune, error } = await supabaseService.getClient()
            .from('communes')
            .select('name')
            .eq('id', user.commune_id)
            .single();
          
          if (!error && commune?.name) {
           setUserCommune(commune.name);
            console.log('🏘️ [DEBUG] Commune récupérée:', commune.name);
          }
        }

        // Récupérer les catégories depuis Supabase
        const { data: categoriesData, error: categoriesError } = await supabaseService.getClient()
          .from('categories')
          .select('*')
          .order('name');

        if (categoriesError) {
          console.error('Erreur lors de la récupération des catégories:', categoriesError);
          return;
        }

        setCategories(categoriesData || []);

        if (id) {
          setIsEditMode(true);
          // Récupérer l'événement depuis Supabase
          const { data: event, error: eventError } = await supabaseService.getClient()
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

          if (eventError) {
            console.error('Erreur lors de la récupération de l\'événement:', eventError);
            return;
          }

          if (event) {
            // Pré-remplir le formulaire
            setValue('title', event.title);
            setValue('description', event.description || '');
            setValue('dateStart', event.date_start);
            setValue('dateEnd', event.date_end);
            setValue('location', event.nom_lieu || '');
            setValue('adresse', event.adresse || '');
            setValue('categoryId', event.category_id || 0);
            setValue('price', event.price);
            setValue('contactName', event.contact_name || '');
            setValue('contactEmail', event.contact_email || '');
            setValue('contactPhone', event.contact_phone || '');
            
            // Charger les données supplémentaires
            if (event.uploaded_image_url) {
              setImagePreview(event.uploaded_image_url);
            }
            setIsFree(event.is_free !== false);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error('Erreur lors du chargement des données');
      }
    };

    fetchData();
  }, [id, setValue, user?.id]);

  // Fonction pour valider l'adresse en temps réel
  const validateAddress = async (address: string) => {
    if (!address || !userCommune) {
      setAddressValidation(null);
      return;
    }

    try {
      // Utiliser l'API de geocoding pour récupérer la ville réelle
      const geocodingResult = await geocodingService.geocodeAddress(address);
      
      if (!geocodingResult) {
        setAddressValidation({
          isValid: false,
          message: 'Adresse invalide',
          type: 'error'
        });
        return;
      }

      // Récupérer la ville depuis les composants de l'adresse
      const city = geocodingResult.components?.city || 
                   geocodingResult.components?.town || 
                   geocodingResult.components?.village;

      if (!city) {
        setAddressValidation({
          isValid: false,
          message: 'Impossible de déterminer la ville',
          type: 'error'
        });
        return;
      }

      const normalize = (str: string) => removeAccents(str || '').toLowerCase().trim();
      const normalizedCity = normalize(city);
      const normalizedCommune = normalize(userCommune);

      if (normalizedCity === normalizedCommune) {
        setAddressValidation({
          isValid: true,
          message: `✅ Adresse valide pour ${userCommune}`,
          type: 'success'
        });
      } else {
        setAddressValidation({
          isValid: false,
          message: `L'adresse est localisée dans ${city.toUpperCase()}. Vous ne pouvez créer un événement que dans votre commune (${userCommune})`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur validation adresse:', error);
      setAddressValidation({
        isValid: false,
        message: 'Erreur lors de la validation de l\'adresse',
        type: 'error'
      });
    }
  };

  // Fonction pour rechercher des adresses avec Nominatim
  const handleAddressSearch = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    console.log('🔍 Recherche adresse:', query);

    try {
      const suggestions = await geocodingService.searchAddresses(query);
      console.log('📋 Suggestions reçues:', suggestions);
      
      setAddressSuggestions(suggestions.map(s => ({
        display_name: s.formatted,
        lat: s.geometry.lat.toString(),
        lon: s.geometry.lng.toString()
      })));
      setShowAddressSuggestions(true);
    } catch (error) {
      console.error('❌ Erreur recherche adresse:', error);
      setAddressSuggestions([]);
    }
  };

  // Fonction pour sélectionner une adresse
  const handleAddressSelect = (suggestion: {display_name: string, lat: string, lon: string}) => {
    setValue('adresse', suggestion.display_name);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };

  // Fonction utilitaire pour nettoyer et remplacer les abréviations dans une adresse
  function cleanAndExpandAddress(address: string): string {
    let cleaned = address.trim().replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/,+/g, ','); // Virguless multiples
    cleaned = cleaned.replace(/ ,/g, ','); // Espace avant virgule
    cleaned = cleaned.replace(/\s{2,}/g, ' '); // Espaces multiples

    // Mapping d'abréviations courantes
    const abbrMap: Record<string, string> = {
      'mnt': 'mont',
      'bd': 'boulevard',
      'av': 'avenue',
      'all': 'allée',
      'r': 'rue',
      'pl': 'place',
      'imp': 'impasse',
      'faub': 'faubourg',
      'st': 'saint',
      'ste': 'sainte',
      'res': 'résidence',
      'sq': 'square',
      'che': 'chemin',
      'pas': 'passage',
      'quai': 'quai',
      'cours': 'cours',
      'voie': 'voie',
      'villa': 'villa',
      'sent': 'sentier',
      'lot': 'lotissement',
      'dom': 'domaine',
      'parc': 'parc',
      'roc': 'rocade',
      'za': 'zone artisanale',
      'zi': 'zone industrielle',
      'zac': 'zone d\'aménagement concerté',
      'ctre': 'centre',
      'egl': 'église',
      'egl.': 'église',
      'egl ': 'église ',
      'egl. ': 'église ',
      // Ajoute ici d'autres abréviations si besoin
    };

    // Remplacement intelligent (début ou après un numéro)
    cleaned = cleaned.replace(/\b(\d+)?\s*(mnt|bd|av|all|r|pl|imp|faub|st|ste|res|sq|che|pas|quai|cours|voie|villa|sent|lot|dom|parc|roc|za|zi|zac|ctre|egl|eglise|egl\.|egl |egl\. |eglise )\b/gi, (match, num, abbr) => {
      if (abbr) {
        return (num ? num + ' ' : '') + abbrMap[abbr.toLowerCase()] || match;
      }
      return match;
    });

    return cleaned;
  }

  const onSubmit = async (data: EventFormData) => {
    setIsLoading(true);
    
    console.log('🚀 [DEBUG] onSubmit - Données reçues:', data);
    console.log('🚀 [DEBUG] onSubmit - User commune:', userCommune);
    
    // Vérification commune/adresse améliorée
    const userCommuneName = userCommune;
    const normalize = (str: string) => removeAccents(str || '').toLowerCase().trim();
    
    console.log('🔍 [DEBUG] Condition validation:');
    console.log('  - userCommuneName:', userCommuneName);
    console.log('  - data.adresse:', data.adresse);
    console.log('  - Condition satisfaite:', !!(userCommuneName && data.adresse));
    
    if (userCommuneName && data.adresse) {
      // Construire l'adresse complète comme elle sera utilisée pour le géocodage
      const fullAddress = `${data.location}, ${data.adresse}`;
      const normalizedAdresse = normalize(fullAddress);
      const normalizedCommune = normalize(userCommuneName);
      
      console.log('🔍 [DEBUG] Validation côté serveur:');
      console.log('  - Location brute:', data.location);
      console.log('  - Adresse brute:', data.adresse);
      console.log('  - Adresse complète:', fullAddress);
      console.log('  - Adresse normalisée:', normalizedAdresse);
      console.log('  - Commune utilisateur:', userCommuneName);
      console.log('  - Commune normalisée:', normalizedCommune);
      
      // Vérifier si la commune est présente dans l'adresse
      const communeInAdresse = normalizedAdresse.includes(normalizedCommune);
      console.log('  - Commune dans adresse:', communeInAdresse);
      
      // Vérifier aussi si l'adresse contient des communes voisines ou communes différentes
      // Liste de communes françaises communes pour éviter les faux positifs
      const communesFrancaises = [
        'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg', 
        'montpellier', 'bordeaux', 'lille', 'rennes', 'reims', 'saint-etienne',
        'toulon', 'le havre', 'grenoble', 'dijon', 'angers', 'nîmes', 'saint-denis'
      ];
      
      let adresseContientAutreCommune = false;
      let communePrincipale = '';
      
      // Trouver quelle commune est la plus présente dans l'adresse
      for (const commune of communesFrancaises) {
        if (normalizedAdresse.includes(commune)) {
          // Compter les occurrences de chaque commune
          const regex = new RegExp(commune, 'g');
          const count = (normalizedAdresse.match(regex) || []).length;
          
          console.log(`  - Commune "${commune}" trouvée ${count} fois`);
          
          if (count > 0) {
            if (!communePrincipale || count > (normalizedAdresse.match(new RegExp(communePrincipale, 'g')) || []).length) {
              communePrincipale = commune;
            }
          }
        }
      }

      console.log('  - Commune principale détectée:', communePrincipale);

      // Si une autre commune est plus présente que la commune de l'utilisateur
      if (communePrincipale && communePrincipale !== normalizedCommune) {
        adresseContientAutreCommune = true;
        console.log('  - ❌ AUTRE COMMUNE DÉTECTÉE!');
      } else {
        console.log('  - ✅ Validation OK');
      }
      
      if (!communeInAdresse) {
        console.log('  - ❌ Commune utilisateur non trouvée dans adresse');
        toast.error(`L'adresse doit contenir votre commune (${userCommuneName}). Vous ne pouvez créer un événement que dans votre commune.`);
        setIsLoading(false);
        return;
      }
      
      if (adresseContientAutreCommune) {
        console.log('  - ❌ Autre commune détectée, rejet');
        toast.error(`L'adresse semble principalement localisée dans ${communePrincipale.toUpperCase()}. Vous ne pouvez créer un événement que dans votre commune (${userCommuneName}).`);
        setIsLoading(false);
        return;
      }
      
      // VÉRIFICATION FORCÉE : si l'adresse contient "marseille" et que l'utilisateur n'est pas de Marseille, REJETER
      if (normalizedAdresse.includes('marseille') && normalizedCommune !== 'marseille') {
        console.log('  - ❌ MARSEILLE DÉTECTÉE FORCÉMENT!');
        toast.error(`ERREUR : L'adresse contient "Marseille" mais vous êtes de ${userCommuneName}. Vous ne pouvez créer un événement que dans votre commune.`);
        setIsLoading(false);
        return;
      }
    }
    
    // Validation supplémentaire : empêcher la soumission si l'adresse n'est pas valide
    if (addressValidation && !addressValidation.isValid) {
      toast.error('Veuillez corriger l\'adresse avant de soumettre l\'événement.');
      setIsLoading(false);
      return;
    }

    try {
      // Upload de l'image si sélectionnée
      let imageUrl = '';
      if (selectedImage) {
        const uploadResult = await uploadService.uploadImage(selectedImage);
        if (uploadResult.error) {
          throw new Error(uploadResult.error);
        }
        imageUrl = uploadResult.url;
      }

      // Géolocalisation automatique via Nominatim
      let fullAddress = `${data.location}, ${data.adresse}`;
      
      // Nettoyer l'adresse pour le géocodage
      console.log('🧹 [DEBUG] Adresse avant nettoyage:', fullAddress);
      
      fullAddress = fullAddress
        .replace(/,+/g, ',') // Virgules multiples
        .replace(/ ,/g, ',') // Espace avant virgule
        .replace(/, /g, ', ') // Espace après virgule
        .replace(/\s+/g, ' ') // Espaces multiples
        .trim();
      
      console.log('🧹 [DEBUG] Adresse après nettoyage basique:', fullAddress);
      
      // Appliquer le mapping des abréviations
      fullAddress = cleanAndExpandAddress(fullAddress);
      
      console.log('🧹 [DEBUG] Adresse après mapping abréviations:', fullAddress);
      
      // Solution simple : supprimer "La citadel" si présent
      if (fullAddress.toLowerCase().includes('la citadel')) {
        fullAddress = fullAddress.replace(/^[^,]*?,\s*/i, '');
        console.log('🧹 [DEBUG] Supprimé "La citadel"');
      }
      
      console.log('🧹 [DEBUG] Adresse après nettoyage lieux-dits:', fullAddress);
      
      console.log('🔍 [DEBUG] Adresse complète à géocoder:', fullAddress);
      
      const geocodingResult = await geocodingService.geocodeAddress(fullAddress);
      console.log('📍 [DEBUG] Résultat géocodage:', geocodingResult);
      
      if (!geocodingResult) {
        console.error('❌ [DEBUG] Géocodage échoué pour:', fullAddress);
        toast.error('Adresse invalide. Veuillez vérifier l\'adresse.');
        setIsLoading(false);
        return;
      }
      
      const gps_lat = geocodingResult.latitude;
      const gps_lng = geocodingResult.longitude;
      const coordinate = geocodingService.calculateWKB(gps_lat, gps_lng);
      
      console.log('📍 [DEBUG] Coordonnées finales:', { gps_lat, gps_lng, coordinate });

      const eventData = {
        title: data.title,
        description: data.description,
        date_start: data.dateStart,
        date_end: data.dateEnd,
        location: data.location, // nom du lieu
        adresse: data.adresse,
        category_id: data.categoryId,
        is_free: isFree,
        price: isFree ? null : data.price,
        uploaded_image_url: imageUrl,
        gps_lat,
        gps_lng,
        coordinate,
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone,
        status: 'pending', // Toujours en attente de validation
        commune_id: user?.commune_id,
        created_by: user?.id
      };
      
      console.log('📦 [DEBUG] Données événement à envoyer:', eventData);

      if (isEditMode && id) {
        const { error } = await supabaseService.getClient()
          .from('events')
          .update(eventData)
          .eq('id', id);

        if (error) {
          throw error;
        }
        toast.success('Événement mis à jour avec succès');
      } else {
        const { error } = await supabaseService.getClient()
          .from('events')
          .insert(eventData);

        if (error) {
          throw error;
        }
        toast.success('Événement créé avec succès');
      }
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {isEditMode ? 'Modifier l\'événement' : 'Nouvel événement'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {isEditMode ? 'Modifiez les informations de l\'événement' : 'Créez un nouvel événement pour votre commune'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/70 backdrop-blur-sm rounded-md shadow-sm border border-white/20">
          <div className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Titre et description */}
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-md border border-blue-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Informations générales
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Titre de l'événement *
                      </label>
                      <input
                        type="text"
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.title 
                            ? 'border-red-300 bg-red-50' 
                            : 'border-gray-200 hover:border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="Ex: Festival de la musique"
                        {...register('title', { required: 'Le titre est requis' })}
                      />
                      {errors.title && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.title.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        rows={4}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                          errors.description 
                            ? 'border-red-300 bg-red-50' 
                            : 'border-gray-200 hover:border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="Décrivez votre événement en détail..."
                        {...register('description')}
                      />
                      {errors.description && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.description.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-md border border-green-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Dates et horaires
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date et heure de début *
                    </label>
                    <input
                      type="datetime-local"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        errors.dateStart 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300 focus:border-green-500'
                      }`}
                      {...register('dateStart', { required: 'La date de début est requise' })}
                    />
                    {errors.dateStart && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.dateStart.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date et heure de fin *
                    </label>
                    <input
                      type="datetime-local"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        errors.dateEnd 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300 focus:border-green-500'
                      }`}
                      {...register('dateEnd', { required: 'La date de fin est requise' })}
                    />
                    {errors.dateEnd && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.dateEnd.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nom du lieu et adresse */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-md border border-orange-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Localisation
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom du lieu *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.location 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300 focus:border-orange-500'
                      }`}
                      placeholder="Ex: Salle des fêtes, Place du marché..."
                      {...register('location', { required: 'Le nom du lieu est requis' })}
                    />
                    {errors.location && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.location.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Adresse complète *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.adresse 
                            ? 'border-red-300 bg-red-50' 
                            : addressValidation?.type === 'error'
                            ? 'border-red-300 bg-red-50'
                            : addressValidation?.type === 'warning'
                            ? 'border-yellow-300 bg-yellow-50'
                            : addressValidation?.type === 'success'
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 focus:border-orange-500'
                        }`}
                        placeholder="Ex: 123 rue de la Paix, 75001 Paris"
                        {...register('adresse', { required: 'L\'adresse est requise' })}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Ne pas nettoyer l'adresse pendant la saisie, seulement valider
                          validateAddress(value);
                          handleAddressSearch(value);
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData('text');
                          const cleaned = cleanAndExpandAddress(pasted);
                          setValue('adresse', cleaned);
                          validateAddress(cleaned);
                          handleAddressSearch(cleaned);
                          setShowAddressSuggestions(true);
                          e.preventDefault();
                        }}
                        onFocus={() => {
                          const value = (document.querySelector('input[name="adresse"]') as HTMLInputElement)?.value;
                          if (value && value.length >= 3) {
                            setShowAddressSuggestions(true);
                          }
                        }}
                      />
                      {showAddressSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {addressSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleAddressSelect(suggestion)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                            >
                              {suggestion.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.adresse && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.adresse.message}
                      </p>
                    )}
                    {addressValidation && !errors.adresse && (
                      <p className={`mt-2 text-sm flex items-center ${
                        addressValidation.type === 'error' ? 'text-red-600' :
                        addressValidation.type === 'warning' ? 'text-yellow-600' :
                        addressValidation.type === 'success' ? 'text-green-600' :
                        'text-blue-600'
                      }`}>
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          {addressValidation.type === 'error' && (
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          )}
                          {addressValidation.type === 'warning' && (
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          )}
                          {addressValidation.type === 'success' && (
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          )}
                        </svg>
                        {addressValidation.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Catégorie */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-md border border-purple-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Catégorisation
                </h3>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Catégorie de l'événement *
                  </label>
                  <select
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.categoryId 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300 focus:border-purple-500'
                    }`}
                    {...register('categoryId', { required: 'La catégorie est requise' })}
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.categoryId.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Gratuit/Payant */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-md border border-emerald-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Tarification
                </h3>
                
                <div className="space-y-4">
                  <div className="flex space-x-6">
                    <label className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:bg-emerald-50 ${
                      isFree ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                    }">
                      <input
                        type="radio"
                        value="true"
                        checked={isFree}
                        onChange={(e) => setIsFree(e.target.value === 'true')}
                        className="mr-3 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Gratuit</div>
                        <div className="text-sm text-gray-500">Accès libre à l'événement</div>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:bg-emerald-50 ${
                      !isFree ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                    }">
                      <input
                        type="radio"
                        value="false"
                        checked={!isFree}
                        onChange={(e) => setIsFree(e.target.value === 'true')}
                        className="mr-3 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Payant</div>
                        <div className="text-sm text-gray-500">Billet d'entrée requis</div>
                      </div>
                    </label>
                  </div>

                  {!isFree && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-emerald-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Prix d'entrée (€)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full pl-8 pr-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                            errors.price 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-200 hover:border-gray-300 focus:border-emerald-500'
                          }"
                          placeholder="0.00"
                          {...register('price', { 
                            valueAsNumber: true,
                            min: { value: 0, message: 'Le prix doit être positif' }
                          })}
                        />
                      </div>
                      {errors.price && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.price.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload d'image */}
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-md border border-pink-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Image de l'événement
                </h3>
                
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-all duration-200 hover:border-pink-400 ${
                  imagePreview ? 'border-pink-300 bg-pink-50' : 'border-gray-300 hover:border-pink-400'
                }">
                  <div className="space-y-1 text-center">
                    {imagePreview ? (
                      <div>
                        <img src={imagePreview} alt="Aperçu" className="mx-auto h-32 w-auto rounded-lg shadow-md" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview('');
                          }}
                          className="mt-3 px-4 py-2 text-sm text-red-600 hover:text-red-500 bg-white rounded-lg border border-red-200 hover:border-red-300 transition-all duration-200"
                        >
                          Supprimer l'image
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="image-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-pink-600 hover:text-pink-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-pink-500 px-4 py-2 border border-pink-200 hover:border-pink-300 transition-all duration-200"
                          >
                            <span>Télécharger un fichier</span>
                            <input
                              id="image-upload"
                              name="image-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const validation = uploadService.validateFile(file);
                                  if (validation.valid) {
                                    setSelectedImage(file);
                                    setImagePreview(URL.createObjectURL(file));
                                  } else {
                                    toast.error(validation.error || 'Erreur de validation');
                                  }
                                }
                              }}
                            />
                          </label>
                          <p className="pl-3 self-center">ou glisser-déposer</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, WebP jusqu'à 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>



              {/* Contact */}
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-md border border-cyan-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Contact
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom du contact
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                        errors.contactName 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300 focus:border-cyan-500'
                      }`}
                      placeholder="Ex: Jean Dupont"
                      {...register('contactName')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email du contact
                    </label>
                    <input
                      type="email"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                        errors.contactEmail 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300 focus:border-cyan-500'
                      }`}
                      placeholder="contact@example.com"
                      {...register('contactEmail')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Téléphone du contact
                    </label>
                    <input
                      type="tel"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                        errors.contactPhone 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300 focus:border-cyan-500'
                      }`}
                      placeholder="01 23 45 67 89"
                      {...register('contactPhone')}
                    />
                  </div>
                </div>
              </div>



              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 text-white bg-aplo-purple border-2 border-aplo-purple rounded-md hover:bg-aplo-purple-dark hover:border-aplo-purple-dark transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Enregistrement...' : 'Créer l\'événement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventFormPage; 