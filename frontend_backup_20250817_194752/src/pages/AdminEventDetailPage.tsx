import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabaseService from '../services/supabase';

interface Event {
  id: number;
  title: string;
  description: string;
  date_start: string;
  date_end: string;
  location: string;
  adresse: string | null;
  uploaded_image_url: string | null;
  is_free: boolean;
  price: number | null;
  category_name?: string;
  commune_name?: string;
  created_by_name?: string;
  gps_lat?: number;
  gps_lng?: number;
}

const AdminEventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
          created_by_name: 'Utilisateur'
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
    navigate('/aploadmin?tab=events');
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
      alert('Lien copié dans le presse-papiers');
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const getBackButtonText = () => {
    return 'Retour à l\'admin';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-aplo-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de l'événement...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-aplo-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Événement non trouvé</h1>
          <button onClick={handleGoBack} className="btn btn-primary">
            Retour à l'admin
          </button>
        </div>
      </div>
    );
  }

  const isVideo = false; // À adapter selon tes besoins
  const hasNoImage = !event.uploaded_image_url;

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button onClick={handleGoBack} className="inline-flex items-center text-orange-600 hover:underline">
            ← {getBackButtonText()}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="relative rounded-lg overflow-hidden h-[300px] md:h-[400px]">
              {isVideo || hasNoImage ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FF5F38] to-[#8A2BE2] p-4">
                  <h3 className="text-white text-3xl font-bold text-center leading-tight shadow-lg">{event.title}</h3>
                </div>
              ) : (
                <img src={event.uploaded_image_url || ''} alt={event.title} className="w-full h-full object-cover" />
              )}
              <div className="absolute top-4 right-4 flex space-x-2">
                <button
                  onClick={handleShare}
                  className="px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors text-sm"
                >
                  Partager
                </button>
                <button
                  onClick={toggleFavorite}
                  className={`px-3 py-1 rounded-full transition-colors text-sm ${
                    isFavorite ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white/80 backdrop-blur-sm hover:bg-white"
                  }`}
                >
                  {isFavorite ? "❤️" : "🤍"}
                </button>
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold mb-4 text-orange-600">{event.title}</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center text-muted-foreground">
                  📅 <span className="ml-2">{formatDate(event.date_start)}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  🕐 <span className="ml-2">{formatTime(event.date_start)}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  📍 <span className="ml-2">{event.location || "Lieu à préciser"}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  💰 <span className="ml-2">
                    {event.is_free ? "Gratuit" : `${event.price}€ (sur place)`}
                  </span>
                </div>
              </div>
              
              <div className="prose max-w-none dark:prose-invert">
                <h2 className="text-xl font-semibold mb-2 text-orange-600">Description</h2>
                <p className="whitespace-pre-line">{event.description}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4 text-orange-600">Informations</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Prix:</span>
                  <span className="font-semibold">
                    {event.is_free ? "Gratuit" : `${event.price}€ (sur place)`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Catégorie:</span>
                  <span className="font-semibold">{event.category_name || 'Non définie'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Commune:</span>
                  <span className="font-semibold">{event.commune_name || 'Non définie'}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4 text-orange-600">Lieu</h2>
              <div className="aspect-video rounded-md mb-4 overflow-hidden bg-muted">
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Carte non disponible
                </div>
              </div>
              <p className="text-muted-foreground mb-2">
                {event.location || "Adresse non spécifiée"}
              </p>
              {event.adresse && (
                <p className="text-muted-foreground mb-4">
                  {event.adresse}
                </p>
              )}
              <button
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.adresse || event.location || '')}`, "_blank")}
                className="w-full btn btn-outline"
              >
                Voir sur Google Maps
              </button>
            </div>
            
            <div className="bg-card rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4 text-orange-600">Organisateur</h2>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
                  O
                </div>
                <div>
                  <p className="font-medium">{event.created_by_name || 'Organisateur'}</p>
                  <p className="text-sm text-muted-foreground">
                    Membre depuis 2023
                  </p>
                </div>
              </div>
              <button className="w-full btn btn-outline">
                Contacter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEventDetailPage; 