import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabase';
import { aploService, DashboardEvent } from '../services/aploService';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  description: string;
  date_start: string;
  date_end: string;
  location: string;
  adresse: string | null;
  is_free: boolean;
  price: number | null;
  uploaded_image_url: string | null;
  category_id: number;
  category_name?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: 'pending' | 'approved' | 'rejected';
  aplo_sync_status?: 'pending' | 'synced' | 'error';
  commune_id?: string;
  commune_name?: string;
  created_by_name?: string;
  gps_lat?: number;
  gps_lng?: number;
}

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        if (!id) return;

        const { data, error } = await supabaseService.getClient()
          .from('events')
          .select(`
            *,
            categories(name),
            communes(name)
          `)
          .eq('id', id)
          .single();

        if (error) {
          console.error('Erreur lors de la récupération de l\'événement:', error);
          return;
        }

        // Formater les données
        const formattedEvent: Event = {
          ...data,
          category_name: data.categories?.name,
          commune_name: data.communes?.name,
          created_by_name: 'Utilisateur',
          aplo_sync_status: data.aplo_sync_status
        };

        setEvent(formattedEvent);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'événement:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event?.title,
        text: event?.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Ici tu pourrais ajouter un toast de confirmation
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleRemoveFromAplo = async () => {
    if (!event) return;
    
    try {
      // Adapter l'événement au format DashboardEvent
      const dashboardEvent: DashboardEvent = {
        id: event.id,
        title: event.title,
        description: event.description,
        date_debut: event.date_start,
        date_fin: event.date_end,
        location: event.location,
        adresse: event.adresse || undefined, // Convert null to undefined
        image_url: event.uploaded_image_url || undefined,
        gps_lat: event.gps_lat,
        gps_lng: event.gps_lng,
        coordinate: event.gps_lat && event.gps_lng ? `POINT(${event.gps_lng} ${event.gps_lat})` : undefined,
        commune_id: event.commune_id || undefined, // Use undefined if not available
        commune_name: event.commune_name || '',
        status: event.status,
        created_at: new Date().toISOString()
      };

      // Retirer d'APLO
      const removeResult = await aploService.removeEventFromAplo(dashboardEvent);

      if (removeResult.success) {
        // Marquer comme non synchronisé dans la base admin
        const { error: updateError } = await supabaseService.getClient()
          .from('events')
          .update({ aplo_sync_status: 'pending' })
          .eq('id', event.id);
        
        if (updateError) throw updateError;
        toast.success('Événement retiré d\'APLO avec succès');
        
        // Recharger l'événement pour mettre à jour l'affichage
        window.location.reload();
      } else {
        toast.error(`Erreur lors du retrait d'APLO: ${removeResult.error}`);
      }
    } catch (error) {
      console.error('Erreur lors du retrait d\'APLO:', error);
      toast.error('Erreur lors du retrait d\'APLO');
    }
  };

  const getBackButtonText = () => {
    return "Retour";
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Événement non trouvé</h1>
          <Link to="/dashboard" className="btn btn-primary">
            Retour au dashboard
          </Link>
        </div>
      </div>
    );
  }

  const hasNoImage = !event.uploaded_image_url;
  const isVideo = false; // Pour l'instant

  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="mb-6">
        <button onClick={handleGoBack} className="inline-flex items-center text-blue-600 hover:underline">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {getBackButtonText()}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="relative rounded-lg overflow-hidden h-[300px] md:h-[400px]">
            {isVideo || hasNoImage ? (
              <div 
                className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FF5F38] to-[#8A2BE2] p-4"
              >
                <h3 className="text-white text-3xl font-bold text-center leading-tight shadow-lg">{event.title}</h3>
              </div>
                         ) : (
               <img
                 src={event.uploaded_image_url || ''}
                 alt={event.title}
                 className="w-full h-full object-cover"
               />
             )}
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                className="rounded-full bg-white/80 backdrop-blur-sm hover:bg-white p-2 transition-colors"
                onClick={handleShare}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
              <button
                className={`rounded-full p-2 transition-colors ${
                  isFavorite
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-white/80 backdrop-blur-sm hover:bg-white"
                }`}
                onClick={toggleFavorite}
              >
                <svg className={`w-5 h-5 ${isFavorite ? "fill-white" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-orange-600">{event.title}</h1>
              {event.aplo_sync_status === 'synced' && (
                <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-sm">Online</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDate(event.date_start)}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatTime(event.date_start)}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{event.location || "Lieu à préciser"}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span>
                  {event.is_free ? "Gratuit" : `${event.price}€`}
                </span>
              </div>
            </div>
                         <div className="prose max-w-none">
               <h2 className="text-xl font-semibold mb-2 text-orange-600">Description</h2>
              <p className="whitespace-pre-line text-gray-700">{event.description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-orange-600">Réserver</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Prix:</span>
                <span className="font-semibold">
                  {event.is_free ? "Gratuit" : `${event.price}€`}
                </span>
              </div>
              {event.aplo_sync_status === 'synced' && (
                <button
                  onClick={handleRemoveFromAplo}
                  className="w-full border border-red-500 text-red-600 py-2 px-4 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Retirer d'APLO
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-orange-600">Lieu</h2>
            <div className="aspect-video rounded-md mb-4 overflow-hidden bg-gray-100">
              {event.gps_lat && event.gps_lng ? (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  Carte interactive à venir
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  Carte non disponible
                </div>
              )}
            </div>
            <p className="text-gray-600 mb-2">
              {(event.location && event.location.toUpperCase() !== 'NULL') ? event.location : event.adresse || "Adresse non spécifiée"}
            </p>
            <button 
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.adresse || '')}`, "_blank")}
                disabled={!event.adresse}
            >
              Voir sur Google Maps
            </button>
          </div>

          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-orange-600">Organisateur</h2>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                O
              </div>
              <div>
                <p className="font-medium">Organisateur</p>
                <p className="text-sm text-gray-500">
                  Membre depuis 2023
                </p>
              </div>
            </div>
            <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
              Contacter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage; 