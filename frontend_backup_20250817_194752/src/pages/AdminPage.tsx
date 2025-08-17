import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import supabaseService from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import uploadService from '../services/uploadService';
import PDFViewerModal from '../components/PDFViewerModal';
import { aploService } from '../services/aploService';
import LoadingSpinner from '../components/LoadingSpinner';


interface AdminStats {
  totalCommunes: number;
  activeCommunes: number;
  communesInOnboarding: number;
  communesInDefault: number;
  totalEvents: number;
  eventsPerCommune: number;
  kycPending: number;
  kycValidated: number;
  kycRejected: number;
  monthlyRevenue: number;
  conversionRate: number;
  churnRate: number;
}

interface KYCRequest {
  id: string;
  communeName: string;
  adminName: string;
  adminEmail: string;
  documents: { name: string, path: string }[];
  status: 'pending' | 'validated' | 'rejected';
  submittedAt: string;
  validatedAt?: string;
  validatedBy?: string;
}

interface Commune {
  id: number;
  name: string;
  status: 'active' | 'suspended' | 'onboarding' | 'default';
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
  eventsCount: number;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  population: number;
}

interface Event {
  id: number;
  title: string;
  description: string;
  date_start: string;
  date_end: string;
  location: string;
  adresse?: string;
  category_id?: number;
  is_free?: boolean;
  price?: number;
  uploaded_image_url?: string;
  gps_lat?: number;
  gps_lng?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status: 'pending' | 'approved' | 'rejected' | 'pushed';
  aplo_sync_status: 'pending' | 'synced' | 'error';
  commune_name: string;
  created_by_name: string;
  created_at: string;
}

// Ajout de la fonction de normalisation (avant le composant AdminPage)
const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Fonction pour vérifier si un événement est complet
const isEventComplete = (event: Event): boolean => {
  // Vérifier les champs texte requis
  const textFields = [
    event.title,
    event.description,
    event.date_start,
    event.date_end,
    event.location,
    event.adresse
  ];
  
  const allTextFieldsFilled = textFields.every(field => 
    field !== null && field !== undefined && field !== ''
  );
  
  // Vérifier que category_id est défini et valide
  const validCategory = event.category_id !== null && event.category_id !== undefined && event.category_id > 0;
  
  // Vérifier que l'image est présente
  const hasImage = event.uploaded_image_url !== null && event.uploaded_image_url !== undefined && event.uploaded_image_url !== '';
  
  // Vérifier que les coordonnées GPS sont valides
  const validCoordinates = event.gps_lat !== null && event.gps_lat !== undefined && 
    event.gps_lng !== null && event.gps_lng !== undefined &&
    !isNaN(event.gps_lat) && !isNaN(event.gps_lng);
  
  return allTextFieldsFilled && validCategory && hasImage && validCoordinates;
};

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [kycRequests, setKycRequests] = useState<KYCRequest[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [pushedEvents, setPushedEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'kyc' | 'communes-without-payment' | 'communes' | 'events' | 'pushed-events'>('overview');
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date_start: '',
    date_end: '',
    location: '',
    adresse: '',
    commune_id: '',
    category_id: 0,
    is_free: true,
    price: 0,
    contact_name: '',
    contact_email: '',
    contact_phone: ''
  });
  const [categories, setCategories] = useState<Array<{id: number, name: string}>>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{display_name: string, lat: string, lon: string}>>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [communesWithoutPayment, setCommunesWithoutPayment] = useState<Array<{
    id: number;
    name: string;
    adminEmail: string;
    adminName: string;
    population: number;
    onboardingCompletedAt: string;
  }>>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Charger les commune_id actifs (user_profiles ET onboarding_progress)
  const [activeCommuneIds, setActiveCommuneIds] = useState<Set<string>>(new Set());

  const [allCommunes, setAllCommunes] = useState<any[]>([]);
  const [communeSearchQuery, setCommuneSearchQuery] = useState('');
  const [showCommuneSuggestions, setShowCommuneSuggestions] = useState(false);
  const [filteredCommunes, setFilteredCommunes] = useState<any[]>([]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      // Charger les statistiques
      const statsData = await loadStats();
      setStats(statsData);

      // Charger les demandes KYC
      const kycData = await loadKYCRequests();
      setKycRequests(kycData);

      // Charger les communes
      const communesData = await loadCommunes();
      setCommunes(communesData);

      // Charger les événements
      const eventsData = await loadEvents();
      setEvents(eventsData);

      // Charger les catégories depuis l'app publique
      const categoriesData = await loadCategories();
      setCategories(categoriesData);

      const communesWithoutPaymentData = await loadCommunesWithoutPayment();
      setCommunesWithoutPayment(communesWithoutPaymentData);

      // Charger les événements poussés
      const pushedEventsData = await loadPushedEvents();
      setPushedEvents(pushedEventsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données admin:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Détecter le paramètre tab dans l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['overview', 'kyc', 'communes-without-payment', 'communes', 'events', 'pushed-events'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab === 'kyc') {
      loadKYCRequests().then((data) => {
        console.log('KYC affichés:', data);
        setKycRequests(data);
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'events') {
      loadEvents().then((data) => {
        console.log('Events affichés:', data);
        setEvents(data);
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'communes') return;
    const fetchActiveCommuneIds = async () => {
      const supabase = supabaseService.getClient();
      // Communes avec user profil
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('commune_id')
        .not('commune_id', 'is', null);
      // Communes avec onboarding progress
      const { data: onboarding } = await supabase
        .from('onboarding_progress')
        .select('commune_data');
      const ids = new Set<string>();
      (userProfiles || []).forEach(up => up.commune_id && ids.add(String(up.commune_id)));
      (onboarding || []).forEach(ob => {
        if (ob.commune_data && ob.commune_data.id) ids.add(String(ob.commune_data.id));
      });
      setActiveCommuneIds(ids);
      console.log('[Communes] commune_ids actifs (user_profiles + onboarding) chargés:', Array.from(ids));
    };
    fetchActiveCommuneIds();
  }, [activeTab]);

  const loadStats = async (): Promise<AdminStats> => {
    try {
      // Compter les communes par statut
      const { data: communesData } = await supabaseService.getClient()
        .from('communes')
        .select('id, name');

      const { data: userProfilesData } = await supabaseService.getClient()
        .from('user_profiles')
        .select('commune_id, role');

      const { data: eventsData } = await supabaseService.getClient()
        .from('events')
        .select('id, commune_id');

      // Calculer les statistiques
      const totalCommunes = communesData?.length || 0;
      const activeCommunes = userProfilesData?.filter((u: any) => u.commune_id).length || 0;
      const totalEvents = eventsData?.length || 0;
      const eventsPerCommune = totalCommunes > 0 ? totalEvents / totalCommunes : 0;

      // Compter les documents KYC par statut
      const { data: kycData } = await supabaseService.getClient()
        .from('kyc_documents')
        .select('status');

      const kycPending = kycData?.filter((doc: any) => doc.status === 'pending').length || 0;
      const kycValidated = kycData?.filter((doc: any) => doc.status === 'approved').length || 0;
      const kycRejected = kycData?.filter((doc: any) => doc.status === 'rejected').length || 0;

      return {
        totalCommunes,
        activeCommunes,
        communesInOnboarding: 0, // À implémenter avec la logique d'onboarding
        communesInDefault: 0, // À implémenter avec Stripe
        totalEvents,
        eventsPerCommune: Math.round(eventsPerCommune * 10) / 10,
        kycPending,
        kycValidated,
        kycRejected,
        monthlyRevenue: 0, // À implémenter avec Stripe
        conversionRate: 0,
        churnRate: 0
      };
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
      return {
        totalCommunes: 0,
        activeCommunes: 0,
        communesInOnboarding: 0,
        communesInDefault: 0,
        totalEvents: 0,
        eventsPerCommune: 0,
        kycPending: 0,
        kycValidated: 0,
        kycRejected: 0,
        monthlyRevenue: 0,
        conversionRate: 0,
        churnRate: 0
      };
    }
  };

  // Correction requête KYC sans jointure
  const loadKYCRequests = async (): Promise<KYCRequest[]> => {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('kyc_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((doc: any) => ({
        id: doc.id,
        communeName: doc.commune_id || 'Commune inconnue',
        adminName: doc.user_id || 'Utilisateur inconnu',
        adminEmail: '',
        documents: [{ name: doc.file_name, path: doc.file_path }],
        status: doc.status,
        submittedAt: doc.uploaded_at,
        validatedAt: doc.validated_at,
        validatedBy: doc.validated_by
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des KYC:', error);
      return [];
    }
  };

  const loadCommunes = async (): Promise<Commune[]> => {
    try {
      const { data: communesData, error } = await supabaseService.getClient()
        .from('communes')
        .select(`
          id,
          name,
          population,
          created_at
        `)
        .order('name');

      if (error) throw error;

      // Compter les événements par commune
      const { data: eventsData } = await supabaseService.getClient()
        .from('events')
        .select('commune_id');

      const eventsCountByCommune = eventsData?.reduce((acc: Record<number, number>, event: any) => {
        acc[event.commune_id] = (acc[event.commune_id] || 0) + 1;
        return acc;
      }, {} as Record<number, number>) || {};

      // Vérifier les abonnements par commune
      const { data: subscriptionsData } = await supabaseService.getClient()
        .from('subscriptions')
        .select('commune_id, status, created_at, plan_type');

      const subscriptionsByCommune = subscriptionsData?.reduce((acc: Record<number, any>, sub: any) => {
        acc[sub.commune_id] = sub;
        return acc;
      }, {} as Record<number, any>) || {};

      return (communesData || []).map((commune: any) => {
        const subscription = subscriptionsByCommune[commune.id];
        return {
          id: commune.id,
          name: commune.name,
          status: subscription ? 'active' : 'onboarding' as const,
          subscriptionStatus: subscription ? subscription.status : 'expired' as const,
          eventsCount: eventsCountByCommune[commune.id] || 0,
          lastPaymentDate: subscription?.created_at,
          nextPaymentDate: undefined, // À calculer selon la logique métier
          population: commune.population || 0
        };
      });
    } catch (error) {
      console.error('Erreur lors du chargement des communes:', error);
      return [];
    }
  };

  // Correction requête events avec jointures
  const loadEvents = async (): Promise<Event[]> => {
    try {
      console.log('[EVENTS] Début du chargement des événements...');
      
      const { data, error } = await supabaseService.getClient()
        .from('events')
        .select(`
          *,
          user_profiles(first_name, last_name),
          communes(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[EVENTS] Erreur lors du chargement:', error);
        throw error;
      }

      console.log('[EVENTS] Données brutes reçues:', data);

      if (!data || data.length === 0) {
        console.log('[EVENTS] Aucun événement trouvé');
        return [];
      }

      // Extraire les IDs des utilisateurs pour récupérer les profils
      const userIds = Array.from(new Set(data.map(event => event.created_by)));

      let profilesData: any[] = [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabaseService.getClient()
          .from('user_profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (profilesError) {
          console.error('[EVENTS] Erreur lors du chargement des profils:', profilesError);
        } else {
          console.log('[EVENTS] Profils chargés:', profilesData);
        }
      }

      const events = data.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date_start: event.date_start,
        date_end: event.date_end,
        location: event.location,
        adresse: event.adresse,
        category_id: event.category_id,
        is_free: event.is_free,
        price: event.price,
        uploaded_image_url: event.uploaded_image_url,
        gps_lat: event.gps_lat,
        gps_lng: event.gps_lng,
        contact_name: event.contact_name,
        contact_email: event.contact_email,
        contact_phone: event.contact_phone,
        status: event.status,
        aplo_sync_status: event.aplo_sync_status,
        commune_name: event.communes?.name || 'Commune inconnue',
        created_by_name: event.user_profiles ? 
          `${event.user_profiles.first_name} ${event.user_profiles.last_name}` : 
          'Utilisateur inconnu',
        created_at: event.created_at
      }));

      console.log('[EVENTS] Événements traités:', events);
      return events;

    } catch (error) {
      console.error('[EVENTS] Erreur générale:', error);
      return [];
    }
  };

  const loadPushedEvents = async (): Promise<Event[]> => {
    try {
      console.log('[PUSHED EVENTS] Début du chargement des événements poussés...');
      
      const { data, error } = await supabaseService.getClient()
        .from('events')
        .select(`
          *,
          user_profiles!inner(first_name, last_name),
          communes!inner(name)
        `)
        .eq('aplo_sync_status', 'synced')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PUSHED EVENTS] Erreur lors du chargement:', error);
        throw error;
      }

      console.log('[PUSHED EVENTS] Données brutes reçues:', data);

      if (!data || data.length === 0) {
        console.log('[PUSHED EVENTS] Aucun événement poussé trouvé');
        return [];
      }

      const pushedEvents = data.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date_start: event.date_start,
        date_end: event.date_end,
        location: event.location,
        adresse: event.adresse,
        category_id: event.category_id,
        is_free: event.is_free,
        price: event.price,
        uploaded_image_url: event.uploaded_image_url,
        gps_lat: event.gps_lat,
        gps_lng: event.gps_lng,
        contact_name: event.contact_name,
        contact_email: event.contact_email,
        contact_phone: event.contact_phone,
        status: event.status,
        aplo_sync_status: event.aplo_sync_status,
        commune_name: event.communes?.name || 'Commune inconnue',
        created_by_name: event.user_profiles ? 
          `${event.user_profiles.first_name} ${event.user_profiles.last_name}` : 
          'Utilisateur inconnu',
        created_at: event.created_at
      }));

      console.log('[PUSHED EVENTS] Événements poussés traités:', pushedEvents);
      return pushedEvents;

    } catch (error) {
      console.error('[PUSHED EVENTS] Erreur générale:', error);
      return [];
    }
  };

  const loadCategories = async (): Promise<Array<{id: number, name: string}>> => {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      return [];
    }
  };



  const loadCommunesWithoutPayment = async (): Promise<Array<{
    id: number;
    name: string;
    adminEmail: string;
    adminName: string;
    population: number;
    onboardingCompletedAt: string;
  }>> => {
    try {
      console.log('[COMMUNES EN RETARD] Début du chargement...');
      
      // Récupérer les abonnements actifs
      const { data: subscriptions, error: subscriptionsError } = await supabaseService.getClient()
        .from('subscriptions')
        .select(`
          id,
          commune_id,
          status,
          current_period_end,
          created_at
        `)
        .eq('status', 'active');

      if (subscriptionsError) {
        console.error('[COMMUNES EN RETARD] Erreur abonnements:', subscriptionsError);
        throw subscriptionsError;
      }

      console.log('[COMMUNES EN RETARD] Abonnements actifs:', subscriptions);

      const today = new Date();
      const communesEnRetard: any[] = [];

      // Vérifier chaque abonnement
      for (const subscription of subscriptions || []) {
        const periodEnd = new Date(subscription.current_period_end);
        const deadline = new Date(periodEnd);
        deadline.setDate(deadline.getDate() + 1); // +1 jour de tolérance

        console.log(`[COMMUNES EN RETARD] Vérification abonnement ${subscription.id}:`, {
          commune_id: subscription.commune_id,
          period_end: subscription.current_period_end,
          deadline: deadline.toISOString(),
          today: today.toISOString(),
          en_retard: today > deadline
        });

        // Si la date limite est dépassée
        if (today > deadline) {
          // Vérifier s'il y a un paiement après la date de fin de période
          const { data: payments, error: paymentsError } = await supabaseService.getClient()
            .from('payments')
            .select('created_at')
            .eq('subscription_id', subscription.id)
            .gte('created_at', subscription.current_period_end)
            .order('created_at', { ascending: false })
            .limit(1);

          if (paymentsError) {
            console.error('[COMMUNES EN RETARD] Erreur paiements:', paymentsError);
            continue;
          }

          console.log(`[COMMUNES EN RETARD] Paiements trouvés pour ${subscription.id}:`, payments);

          // Si pas de paiement après la date de fin de période
          if (!payments || payments.length === 0) {
            communesEnRetard.push(subscription);
          }
        }
      }

      console.log('[COMMUNES EN RETARD] Communes en retard trouvées:', communesEnRetard);

      // Récupérer les détails des communes en retard
      const communeIds = communesEnRetard.map(s => s.commune_id);
      let communesData: any[] = [];
      
      if (communeIds.length > 0) {
        const { data: communes, error: communesError } = await supabaseService.getClient()
          .from('communes')
          .select('id, name, population')
          .in('id', communeIds);

        if (communesError) {
          console.error('[COMMUNES EN RETARD] Erreur communes:', communesError);
        } else {
          communesData = communes || [];
        }
      }

      // Récupérer les profils admin pour ces communes
      const { data: profiles, error: profilesError } = await supabaseService.getClient()
        .from('user_profiles')
        .select('commune_id, email, first_name, last_name')
        .in('commune_id', communeIds)
        .eq('role', 'admin');

      if (profilesError) {
        console.error('[COMMUNES EN RETARD] Erreur profils:', profilesError);
      }

      // Mapper les données
      const result = communesEnRetard.map((subscription) => {
        const commune = communesData.find(c => c.id === subscription.commune_id);
        const profile = profiles?.find(p => p.commune_id === subscription.commune_id);
        
        return {
          id: subscription.commune_id,
          name: commune?.name || `Commune ID ${subscription.commune_id}`,
          adminEmail: profile?.email || '',
          adminName: profile ? `${profile.first_name} ${profile.last_name}` : '',
          population: commune?.population || 0,
          onboardingCompletedAt: subscription.created_at
        };
      });

      console.log('[COMMUNES EN RETARD] Résultat final:', result);
      return result;

    } catch (error) {
      console.error('Erreur lors du chargement des communes en retard:', error);
      return [];
    }
  };

  const handleAddressSearch = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    try {
      // TODO: Implémenter la recherche d'adresse
      // const suggestions = await geocodingService.searchAddresses(query);
      // setAddressSuggestions(suggestions.map(s => ({
      //   display_name: s.formatted,
      //   lat: s.geometry.lat.toString(),
      //   lon: s.geometry.lng.toString()
      // })));
      // setShowAddressSuggestions(true);
      console.log('Recherche d\'adresse non implémentée pour le moment');
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresse:', error);
    }
  };

  const handleAddressSelect = (suggestion: {display_name: string, lat: string, lon: string}) => {
    setNewEvent(prev => ({
      ...prev,
      adresse: suggestion.display_name
    }));
    setShowAddressSuggestions(false);
  };

  const handleCategoryToggle = (categoryId: number) => {
    setNewEvent(prev => ({
      ...prev,
      category_id: categoryId
    }));
  };

  const handleCommuneSearch = (query: string) => {
    setCommuneSearchQuery(query);
    if (query.length < 2) {
      setShowCommuneSuggestions(false);
      return;
    }

    const filteredCommunes = allCommunes.filter(commune => {
      const searchQuery = query.toLowerCase();
      const words = commune.name.toLowerCase().split(/[\s\-']/);
      const matches = words.some((word: string) => word.startsWith(searchQuery));
      console.log(`[COMMUNE FILTER] "${commune.name}" mots: [${words.join(', ')}] commence par "${searchQuery}" ? ${matches}`);
      return matches;
    });

    setFilteredCommunes(filteredCommunes.slice(0, 10));
    setShowCommuneSuggestions(true);
  };

  const handleCommuneSelect = (commune: any) => {
    setNewEvent(prev => ({
      ...prev,
      commune_id: commune.id.toString()
    }));
    setCommuneSearchQuery(commune.name);
    setShowCommuneSuggestions(false);
  };



  // Filtrage côté client comme dans l'onboarding
  const filteredCommunesForDisplay = allCommunes.filter(commune => {
    const name = normalize(commune.name.toLowerCase());
    const query = normalize(communeSearchQuery.toLowerCase());
    return name.includes(query);
  });
  
  console.log('[COMMUNE FILTER] Résultat filtré:', filteredCommunesForDisplay.map(c => c.name));

  const handleKycAction = async (kycId: string, action: 'validate' | 'reject') => {
    try {
      if (!user) {
        toast.error('Vous devez être connecté pour effectuer cette action');
        return;
      }
      console.log('[KYC] Tentative de', action, 'pour KYC id:', kycId, 'par user:', user.id);
      // Mettre à jour le statut dans la base de données
      const { error } = await supabaseService.getClient()
        .from('kyc_documents')
        .update({
          status: action === 'validate' ? 'approved' : 'rejected',
          validated_at: new Date().toISOString(),
          validated_by: user.id
        })
        .eq('id', kycId);
      if (error) {
        console.error('[KYC] Erreur Supabase UPDATE:', error);
        toast.error('Erreur Supabase: ' + error.message);
        return;
      } else {
        console.log('[KYC] UPDATE réussi pour', kycId, 'action:', action);
      }
      // Mettre à jour l'état local
      setKycRequests(prev => prev.map(kyc => 
        kyc.id === kycId 
          ? { 
              ...kyc, 
              status: action === 'validate' ? 'validated' : 'rejected',
              validatedAt: new Date().toISOString(),
              validatedBy: user.email || 'Admin'
            }
          : kyc
      ));
      // Mettre à jour les stats
      if (stats) {
        setStats(prev => prev ? {
          ...prev,
          kycPending: prev.kycPending - 1,
          kycValidated: action === 'validate' ? prev.kycValidated + 1 : prev.kycValidated,
          kycRejected: action === 'reject' ? prev.kycRejected + 1 : prev.kycRejected
        } : null);
      }
      toast.success(`Document KYC ${action === 'validate' ? 'validé' : 'rejeté'} avec succès`);
    } catch (error) {
      console.error('[KYC] Exception JS:', error);
      toast.error('Erreur lors de l\'action KYC');
    }
  };

  const handleCommuneAction = async (communeId: number, action: 'suspend' | 'activate') => {
    try {
      // TODO: Implémenter la vraie logique de suspension/activation
      // Pour l'instant, on met à jour seulement l'état local
      // À connecter avec Stripe ou une table de statut des communes
      
      setCommunes(prev => prev.map(commune => 
        commune.id === communeId 
          ? { 
              ...commune, 
              status: action === 'activate' ? 'active' : 'suspended'
            }
          : commune
      ));
      
      toast.success(`Commune ${action === 'activate' ? 'activée' : 'suspendue'} avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'action commune:', error);
      toast.error('Erreur lors de l\'action sur la commune');
    }
  };

  const handleEventAction = async (eventId: number, action: 'reject' | 'approve' | 'push' | 'remove-from-aplo') => {
    try {
      if (action === 'reject') {
        const { error } = await supabaseService.getClient()
          .from('events')
          .update({ status: 'rejected' })
          .eq('id', eventId);
        
        if (error) throw error;
        toast.success('Événement rejeté');
      } else if (action === 'approve') {
        const { error } = await supabaseService.getClient()
          .from('events')
          .update({ status: 'approved' })
          .eq('id', eventId);
        
        if (error) throw error;
        toast.success('Événement approuvé');
      } else if (action === 'push') {
        // Récupérer l'événement complet pour la synchronisation
        const { data: eventData, error: fetchError } = await supabaseService.getClient()
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (fetchError) throw fetchError;

        // Pousser vers APLO
        const pushResult = await aploService.pushEvent(eventData);

        if (pushResult.success) {
          // Marquer comme synchronisé dans la base admin
          const { error: updateError } = await supabaseService.getClient()
            .from('events')
            .update({ 
              aplo_sync_status: 'synced',
              status: 'approved' // Garder 'approved' au lieu de 'pushed'
            })
            .eq('id', eventId);
          
          if (updateError) throw updateError;
          toast.success('Événement poussé vers APLO avec succès');
        } else {
          // Gérer les erreurs de doublon
          if (pushResult.isDuplicate) {
            toast.error('Événement déjà présent dans APLO (doublon détecté)');
          } else {
            toast.error(`Erreur lors du push vers APLO: ${pushResult.error}`);
          }
          
          // Marquer comme erreur dans la base admin
          await supabaseService.getClient()
            .from('events')
            .update({ aplo_sync_status: 'error' })
            .eq('id', eventId);
          
          return;
        }
      } else if (action === 'remove-from-aplo') {
        // Récupérer l'événement complet
        const { data: eventData, error: fetchError } = await supabaseService.getClient()
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (fetchError) throw fetchError;

        // Retirer d'APLO
        const removeResult = await aploService.removeEventFromAplo(eventData);

        if (removeResult.success) {
          // Marquer comme non synchronisé dans la base admin
          const { error: updateError } = await supabaseService.getClient()
            .from('events')
            .update({ aplo_sync_status: 'pending' })
            .eq('id', eventId);
          
          if (updateError) throw updateError;
          toast.success('Événement retiré d\'APLO avec succès');
        } else {
          toast.error(`Erreur lors du retrait d'APLO: ${removeResult.error}`);
          return;
        }
      }

      // Recharger les événements
      const eventsData = await loadEvents();
      setEvents(eventsData);
      
      // Recharger les événements poussés
      const pushedEventsData = await loadPushedEvents();
      setPushedEvents(pushedEventsData);
    } catch (error) {
      console.error('Erreur lors de l\'action sur l\'événement:', error);
      toast.error('Erreur lors de l\'action');
    }
  };

  const handlePushAllEvents = async () => {
    try {
      const approvedEvents = events.filter(event => event.status === 'approved' && event.aplo_sync_status !== 'synced');
      
      if (approvedEvents.length === 0) {
        toast.success('Aucun événement à pousser');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const event of approvedEvents) {
        try {
          // Récupérer l'événement complet
          const { data: eventData, error: fetchError } = await supabaseService.getClient()
            .from('events')
            .select('*')
            .eq('id', event.id)
            .single();

          if (fetchError) {
            errorCount++;
            continue;
          }

          // Pousser vers APLO
          const pushResult = await aploService.pushEvent(eventData);

          if (pushResult.success) {
            // Marquer comme synchronisé
            await supabaseService.getClient()
              .from('events')
              .update({ aplo_sync_status: 'synced' })
              .eq('id', event.id);
            
            successCount++;
          } else {
            errorCount++;
            console.error('Erreur push APLO:', pushResult.error);
          }
        } catch (error) {
          errorCount++;
        }
      }

      // Recharger les événements
      const eventsData = await loadEvents();
      setEvents(eventsData);

      if (successCount > 0) {
        toast.success(`${successCount} événement(s) poussé(s) avec succès`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} événement(s) en erreur`);
      }
    } catch (error) {
      console.error('Erreur lors du push de tous les événements:', error);
      toast.error('Erreur lors du push en masse');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeocoding(true);

    try {
      // Géolocalisation automatique via Nominatim
      let fullAddress = `${newEvent.location}, ${newEvent.adresse}`;
      
      // Nettoyer l'adresse pour le géocodage
      fullAddress = fullAddress
        .replace(/,+/g, ',') // Virgules multiples
        .replace(/ ,/g, ',') // Espace avant virgule
        .replace(/, /g, ', ') // Espace après virgule
        .replace(/\s+/g, ' ') // Espaces multiples
        .trim();
      
      // Solution simple : supprimer "La citadel" si présent
      if (fullAddress.toLowerCase().includes('la citadel')) {
        fullAddress = fullAddress.replace(/^[^,]*?,\s*/i, '');
      }
      
      console.log('🔍 [DEBUG] Adresse complète à géocoder:', fullAddress);
      
      // TODO: Implémenter le géocodage
      // const geocodingResult = await geocodingService.geocodeAddress(fullAddress);
      // console.log('📍 [DEBUG] Résultat géocodage:', geocodingResult);
      
      // if (!geocodingResult) {
      //   toast.error('Adresse invalide. Veuillez vérifier l\'adresse.');
      //   setIsGeocoding(false);
      //   return;
      // }

      // Upload de l'image si sélectionnée
      let imageUrl = '';
      if (selectedImage) {
        const uploadResult = await uploadService.uploadImage(selectedImage);
        if (uploadResult.error) {
          throw new Error(uploadResult.error);
        }
        imageUrl = uploadResult.url;
      }

      // Créer l'événement avec tous les champs
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        date_start: newEvent.date_start,
        date_end: newEvent.date_end,
        nom_lieu: newEvent.location,
        adresse: newEvent.adresse,
        category_id: newEvent.category_id,
        is_free: newEvent.is_free,
        price: newEvent.is_free ? null : newEvent.price,
        uploaded_image_url: imageUrl,
        gps_lat: null, // TODO: Implémenter le géocodage
        gps_lng: null, // TODO: Implémenter le géocodage
        coordinate: null, // TODO: Implémenter le géocodage
        contact_name: newEvent.contact_name,
        contact_email: newEvent.contact_email,
        contact_phone: newEvent.contact_phone,
        status: 'pending', // Toujours en attente de validation
        commune_id: parseInt(newEvent.commune_id),
        created_by: user?.id
      };

      const { error } = await supabaseService.getClient()
        .from('events')
        .insert([eventData]);

      if (error) throw error;

      toast.success('Événement créé avec succès');
      setShowEventForm(false);
      setNewEvent({
        title: '',
        description: '',
        date_start: '',
        date_end: '',
        location: '',
        adresse: '',
        commune_id: '',
        category_id: 0,
        is_free: true,
        price: 0,
        contact_name: '',
        contact_email: '',
        contact_phone: ''
      });
      setSelectedImage(null);
      setImagePreview('');
      setCommuneSearchQuery('');
      setShowCommuneSuggestions(false);

      // Recharger les événements
      const eventsData = await loadEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Calcul des communes à relancer (KYC rejeté mais aucun approuvé)
  const communesWithOnlyRejectedKYC = React.useMemo(() => {
    // Regrouper tous les KYC par commune
    const byCommune: Record<string, {communeName: string, documents: {name: string, status: string}[]}> = {};
    kycRequests.forEach(kyc => {
      if (!kyc.communeName) return;
      if (!byCommune[kyc.communeName]) {
        byCommune[kyc.communeName] = { communeName: kyc.communeName, documents: [] };
      }
      byCommune[kyc.communeName].documents.push(...kyc.documents.map(doc => ({ name: doc.name, status: kyc.status })));
    });
    // Filtrer : aucune doc approved, au moins une rejected
    return Object.values(byCommune).filter(commune => {
      const hasApproved = commune.documents.some(doc => doc.status === 'approved');
      const hasRejected = commune.documents.some(doc => doc.status === 'rejected');
      return !hasApproved && hasRejected;
    });
  }, [kycRequests]);

  // Liste simple des communes actives (user_profiles OU onboarding_progress)
  const [activeCommunes, setActiveCommunes] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab !== 'communes') return;
    const fetchActiveCommunes = async () => {
      const supabase = supabaseService.getClient();
      // 1. Récupérer les commune_id de user_profiles
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('commune_id, email')
        .not('commune_id', 'is', null);
      // 2. Récupérer les commune_id de onboarding_progress
      const { data: onboarding } = await supabase
        .from('onboarding_progress')
        .select('commune_data');
      const ids = new Set();
      (userProfiles || []).forEach(up => up.commune_id && ids.add(String(up.commune_id)));
      (onboarding || []).forEach(ob => {
        if (ob.commune_data && ob.commune_data.id) ids.add(String(ob.commune_data.id));
      });
      const activeCommuneIds = Array.from(ids);
      if (activeCommuneIds.length === 0) {
        setActiveCommunes([]);
        return;
      }
      // 3. Récupérer les infos des communes actives
      const { data: communes } = await supabase
        .from('communes')
        .select('*')
        .in('id', activeCommuneIds);
      // 4. Récupérer les abonnements
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .in('commune_id', activeCommuneIds);
      // 5. Récupérer les événements
      const { data: events } = await supabase
        .from('events')
        .select('commune_id')
        .in('commune_id', activeCommuneIds);
      // 6. Mapper les infos sur chaque commune
      const communesWithDetails = (communes || []).map(commune => {
        const sub = (subscriptions || []).find(s => String(s.commune_id) === String(commune.id));
        const eventCount = (events || []).filter(e => String(e.commune_id) === String(commune.id)).length;
        const adminProfile = (userProfiles || []).find(up => String(up.commune_id) === String(commune.id));
        // Calcul du prochain paiement
        let prochainPaiement = '-';
        if (sub) {
          if (sub.current_period_end) {
            prochainPaiement = new Date(sub.current_period_end).toLocaleDateString('fr-FR');
          } else if (sub.created_at) {
            const created = new Date(sub.created_at);
            const next = new Date(created.setMonth(created.getMonth() + 1));
            prochainPaiement = next.toLocaleDateString('fr-FR');
          }
        }
        return {
          ...commune,
          abonnement: sub ? `${sub.status}${sub.plan_type ? ' (' + sub.plan_type + ')' : ''}` : 'Aucun',
          prochainPaiement,
          eventsCount: eventCount,
          adminEmail: adminProfile?.email || '',
        };
      });
      setActiveCommunes(communesWithDetails);
      console.log('[Communes] communes actives:', communesWithDetails);
    };
    fetchActiveCommunes();
  }, [activeTab]);

  // Charger toutes les communes quand le formulaire d'événement s'ouvre
  useEffect(() => {
    if (showEventForm && allCommunes.length === 0) {
      fetch('/communes.json')
        .then(res => res.json())
        .then(setAllCommunes)
        .catch(err => console.error('Erreur chargement communes.json', err));
    }
  }, [showEventForm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Chargement du dashboard admin...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aplo-cream">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin APLO</h1>
              <p className="text-gray-600">Interface de contrôle et gestion</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Dernière mise à jour</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date().toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Vue d\'ensemble', icon: '📊' },
              { id: 'kyc', name: 'KYC', icon: '📋' },
              { id: 'communes-without-payment', name: 'Sans paiement', icon: '💰' },
              { id: 'communes', name: 'Communes', icon: '🏘️' },
              { id: 'events', name: 'Événements', icon: '📅' },
              { id: 'pushed-events', name: 'Événements poussés', icon: '🚀' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-lg">🏘️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Communes actives</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeCommunes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-lg">📅</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Événements total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-lg">💰</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Revenus mensuels</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.monthlyRevenue}€</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-red-600 text-lg">⚠️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">KYC en attente</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.kycPending}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Graphiques et détails */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques KYC</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Validés</span>
                    <span className="font-medium text-green-600">{stats.kycValidated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">En attente</span>
                    <span className="font-medium text-yellow-600">{stats.kycPending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rejetés</span>
                    <span className="font-medium text-red-600">{stats.kycRejected}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Métriques Business</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taux de conversion</span>
                    <span className="font-medium text-blue-600">{stats.conversionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taux de churn</span>
                    <span className="font-medium text-red-600">{stats.churnRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Événements/commune</span>
                    <span className="font-medium text-gray-900">{stats.eventsPerCommune}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kyc' && (
          <>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Demandes KYC en attente</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commune
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Administrateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Documents
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date soumission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {kycRequests.filter(k => k.status === 'pending').map((kyc) => (
                      <tr key={kyc.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{kyc.communeName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{kyc.adminName}</div>
                          <div className="text-sm text-gray-500">{kyc.adminEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {kyc.documents.map((doc, index) => (
                              <button
                                key={index}
                                className="inline-block bg-gray-100 rounded px-2 py-1 text-xs mr-1 mb-1 text-blue-600 underline hover:text-blue-800"
                                onClick={async () => {
                                  setPdfLoading(true);
                                  let storagePath = doc.path; // Utiliser le chemin complet, sans modification
                                  const { data, error } = await supabaseService.getClient().storage
                                    .from('kyc-documents')
                                    .createSignedUrl(storagePath, 60 * 5); // 5 min
                                  if (error || !data?.signedUrl) {
                                    toast.error('Impossible de charger le document');
                                    setPdfLoading(false);
                                    return;
                                  }
                                  setPdfUrl(data.signedUrl);
                                  setPdfLoading(false);
                                }}
                                disabled={pdfLoading}
                              >
                                {doc.name}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(kyc.submittedAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleKycAction(kyc.id, 'validate')}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Valider
                          </button>
                          <button
                            onClick={() => handleKycAction(kyc.id, 'reject')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Rejeter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}

        {activeTab === 'communes-without-payment' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Communes sans paiement</h3>
              <p className="text-sm text-gray-600 mt-1">
                Ces communes ont terminé leur onboarding mais n'ont pas encore souscrit à un abonnement.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commune
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Administrateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Population
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Onboarding terminé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {communesWithoutPayment.map((commune) => (
                    <tr key={commune.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{commune.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{commune.adminName}</div>
                        <div className="text-sm text-gray-500">{commune.adminEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commune.population.toLocaleString()} habitants
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(commune.onboardingCompletedAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {/* TODO: Ouvrir modal pour créer abonnement manuel */}}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Créer abonnement
                          </button>
                          <button
                            onClick={() => {/* TODO: Envoyer email de relance */}}
                            className="text-green-600 hover:text-green-900"
                          >
                            Relancer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'communes' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Gestion des communes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commune
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Population
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Abonnement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Événements
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prochain paiement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeCommunes.map((commune) => (
                    <tr key={commune.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{commune.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commune.population?.toLocaleString('fr-FR') ?? ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commune.abonnement}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commune.eventsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commune.prochainPaiement}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {commune.adminEmail ? (
                          <a
                            href={`mailto:${commune.adminEmail}`}
                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition"
                          >
                            Contacter
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Événements en attente */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Événements en attente de validation</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Titre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commune
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de début
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Créé par
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Complétude
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Détails
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {events.filter(event => event.status === 'pending').map((event) => (
                      <tr key={event.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {event.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.commune_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(event.date_start).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.created_by_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {isEventComplete(event) ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Complet
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Incomplet
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => window.location.href = `/admin/events/${event.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Voir détails
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEventAction(event.id, 'approve')}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => handleEventAction(event.id, 'reject')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Rejeter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {events.filter(event => event.status === 'pending').length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    Aucun événement en attente de validation
                  </div>
                )}
              </div>
            </div>

            {/* Événements validés */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Événements validés</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handlePushAllEvents()}
                    className="px-4 py-2 text-aplo-purple bg-white border border-aplo-purple rounded-md hover:bg-aplo-purple hover:text-white transition-all duration-200 font-medium"
                  >
                    Push All
                  </button>
                  <button
                    onClick={() => setShowEventForm(true)}
                    className="px-4 py-2 text-aplo-purple bg-white border border-aplo-purple rounded-md hover:bg-aplo-purple hover:text-white transition-all duration-200 font-medium"
                  >
                    + Ajouter un événement
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Titre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commune
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de début
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Créé par
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Complétude
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sync Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Détails
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {events.filter(event => event.status === 'approved' && event.aplo_sync_status !== 'synced').map((event) => (
                      <tr key={event.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {event.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.commune_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(event.date_start).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.created_by_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {isEventComplete(event) ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Complet
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Incomplet
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              event.aplo_sync_status === 'synced' ? 'bg-green-100 text-green-800' :
                              event.aplo_sync_status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {event.aplo_sync_status === 'synced' ? 'Synchronisé' :
                               event.aplo_sync_status === 'error' ? 'Erreur' :
                               'En attente'}
                            </span>
                            {event.aplo_sync_status === 'error' && (
                              <svg 
                                className="w-4 h-4 text-red-500" 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => window.location.href = `/admin/events/${event.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Voir détails
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEventAction(event.id, 'push')}
                            className="px-3 py-1 text-aplo-purple bg-white border border-aplo-purple rounded-md hover:bg-aplo-purple hover:text-white transition-all duration-200 font-medium mr-3"
                          >
                            Push
                          </button>
                          <button
                            onClick={() => handleEventAction(event.id, 'reject')}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {events.filter(event => event.status === 'approved' && event.aplo_sync_status !== 'synced').length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    Aucun événement validé
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pushed-events' && (
          <div className="space-y-6">
            {/* Événements poussés */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Événements poussés</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Titre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commune
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de début
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Créé par
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Complétude
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sync Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Détails
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pushedEvents.map((event) => (
                      <tr key={event.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {event.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.commune_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(event.date_start).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.created_by_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {isEventComplete(event) ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Complet
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Incomplet
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              event.aplo_sync_status === 'synced' ? 'bg-green-100 text-green-800' :
                              event.aplo_sync_status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {event.aplo_sync_status === 'synced' ? 'Synchronisé' :
                               event.aplo_sync_status === 'error' ? 'Erreur' :
                               'En attente'}
                            </span>
                            {event.aplo_sync_status === 'error' && (
                              <svg 
                                className="w-4 h-4 text-red-500" 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => window.location.href = `/admin/events/${event.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Voir détails
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEventAction(event.id, 'remove-from-aplo')}
                            className="text-orange-600 hover:text-orange-900 px-3 py-1 border border-orange-600 rounded hover:bg-orange-50"
                            title="Retirer d'APLO"
                          >
                            Retirer d'APLO
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pushedEvents.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    Aucun événement poussé
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal pour créer un événement */}
        {showEventForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-8 border w-full max-w-4xl shadow-sm rounded-md bg-white">
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-gray-900">Créer un nouvel événement</h3>
                  <button
                    onClick={() => {
                      setShowEventForm(false);
                      setCommuneSearchQuery('');
                      setShowCommuneSuggestions(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleCreateEvent} className="space-y-8 max-h-[80vh] overflow-y-auto">
                {/* Sélection de la commune */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-md border border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Commune
                  </h4>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={communeSearchQuery}
                      onChange={(e) => handleCommuneSearch(e.target.value)}
                      onFocus={() => {
                        if (communeSearchQuery.length > 0) {
                          setShowCommuneSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        // Délai pour permettre le clic sur les suggestions
                        setTimeout(() => setShowCommuneSuggestions(false), 200);
                      }}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                      placeholder="Tapez pour rechercher une commune..."
                    />
                    {showCommuneSuggestions && filteredCommunes.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCommunes.map((commune) => (
                          <button
                            key={commune.id}
                            type="button"
                            onClick={() => handleCommuneSelect(commune)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none"
                          >
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {commune.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {newEvent.commune_id && (
                    <div className="mt-2 text-sm text-green-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Commune sélectionnée
                    </div>
                  )}
                </div>

                {/* Titre et description */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-md border border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Informations générales
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Titre de l'événement *
                      </label>
                      <input
                        type="text"
                        required
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        placeholder="Ex: Festival de la musique"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        rows={4}
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all duration-200 resize-none"
                        placeholder="Décrivez votre événement en détail..."
                      />
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-md border border-green-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Dates et horaires
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date et heure de début *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={newEvent.date_start}
                        onChange={(e) => setNewEvent({...newEvent, date_start: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date et heure de fin *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={newEvent.date_end}
                        onChange={(e) => setNewEvent({...newEvent, date_end: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Nom du lieu et adresse */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-md border border-orange-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Localisation
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nom du lieu *
                      </label>
                      <input
                        type="text"
                        required
                        value={newEvent.location || ''}
                        onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all duration-200"
                        placeholder="Ex: Salle des fêtes, Place du marché..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Adresse complète *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={newEvent.adresse || ''}
                          onChange={(e) => {
                            setNewEvent({...newEvent, adresse: e.target.value});
                            if (e.target.value.length >= 3) {
                              handleAddressSearch(e.target.value);
                            }
                          }}
                          onFocus={() => {
                            if ((newEvent.adresse || '').length >= 3) {
                              setShowAddressSuggestions(true);
                            }
                          }}
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all duration-200"
                          placeholder="Ex: 123 rue de la Paix, 75001 Paris"
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
                    </div>
                  </div>
                </div>

                {/* Catégorie */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-md border border-purple-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Catégorisation
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Catégorie de l'événement *
                    </label>
                    <select
                      required
                      value={newEvent.category_id || ''}
                      onChange={(e) => setNewEvent({...newEvent, category_id: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Gratuit/Payant */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-md border border-emerald-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Tarification
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex space-x-6">
                      <label className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:bg-emerald-50 ${
                        newEvent.is_free !== false ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                      }">
                        <input
                          type="radio"
                          value="true"
                          checked={newEvent.is_free !== false}
                          onChange={(e) => setNewEvent({...newEvent, is_free: e.target.value === 'true'})}
                          className="mr-3 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Gratuit</div>
                          <div className="text-sm text-gray-500">Accès libre à l'événement</div>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:bg-emerald-50 ${
                        newEvent.is_free === false ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                      }">
                        <input
                          type="radio"
                          value="false"
                          checked={newEvent.is_free === false}
                          onChange={(e) => setNewEvent({...newEvent, is_free: e.target.value === 'true'})}
                          className="mr-3 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Payant</div>
                          <div className="text-sm text-gray-500">Billet d'entrée requis</div>
                        </div>
                      </label>
                    </div>

                    {newEvent.is_free === false && (
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
                            value={newEvent.price || ''}
                            onChange={(e) => setNewEvent({...newEvent, price: parseFloat(e.target.value) || 0})}
                            className="w-full pl-8 pr-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload d'image */}
                <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-md border border-pink-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Image de l'événement
                  </h4>
                  
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
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Contact
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nom du contact
                      </label>
                      <input
                        type="text"
                        value={newEvent.contact_name || ''}
                        onChange={(e) => setNewEvent({...newEvent, contact_name: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
                        placeholder="Ex: Jean Dupont"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email du contact
                      </label>
                      <input
                        type="email"
                        value={newEvent.contact_email || ''}
                        onChange={(e) => setNewEvent({...newEvent, contact_email: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
                        placeholder="contact@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Téléphone du contact
                      </label>
                      <input
                        type="tel"
                        value={newEvent.contact_phone || ''}
                        onChange={(e) => setNewEvent({...newEvent, contact_phone: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
                        placeholder="01 23 45 67 89"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowEventForm(false)}
                    className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isGeocoding}
                    className="btn btn-primary btn-lg"
                  >
                    {isGeocoding ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Géocodage...
                      </div>
                    ) : (
                      'Créer l\'événement'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {pdfUrl && (
        <PDFViewerModal url={pdfUrl} onClose={() => setPdfUrl(null)} />
      )}
    </div>
  );
};

export default AdminPage; 