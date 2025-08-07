import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabase';
import LoadingSpinner from '../components/LoadingSpinner';

interface Event {
  id: string;
  title: string;
  description: string;
  date_start: string;
  date_end: string;
  location: string;
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  created_at: string;
  categories?: {
    name: string;
  };
}

const EventsPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        if (!user?.id) return;

        const { data: userEvents, error } = await supabaseService.getClient()
          .from('events')
          .select(`
            *,
            categories(name)
          `)
          .eq('commune_id', user.commune_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erreur lors de la récupération des événements:', error);
          return;
        }

        setEvents(userEvents || []);
      } catch (error) {
        console.error('Erreur lors du chargement des événements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user?.id]);

  const deleteEvent = async (eventId: string) => {
    try {
      setDeletingEventId(eventId);
      
      const { error } = await supabaseService.getClient()
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('commune_id', user?.commune_id); // Sécurité : vérifier que l'événement appartient à la commune

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de l\'événement');
        return;
      }

      // Mettre à jour la liste des événements
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'événement');
    } finally {
      setDeletingEventId(null);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.status === filter;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date non définie';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-aplo-yellow text-gray-900 shadow-sm">En attente</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shadow-sm">Validé</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 shadow-sm">Rejeté</span>;
      default:
        return null;
    }
  };

  const getStatusCount = (status: string) => {
    return events.filter(event => event.status === status).length;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-aplo-cream">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mes événements</h1>
              <p className="text-gray-600 mt-1">
                Gérez tous vos événements
              </p>
            </div>
            <Link
              to="/events/new"
              className="btn btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nouvel événement
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-aplo-purple text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tous ({events.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'pending'
                  ? 'bg-aplo-yellow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              En attente ({getStatusCount('pending')})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Validés ({getStatusCount('approved')})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Rejetés ({getStatusCount('rejected')})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'Aucun événement' : `Aucun événement ${filter === 'pending' ? 'en attente' : filter === 'approved' ? 'validé' : 'rejeté'}`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? 'Créez votre premier événement pour commencer.'
                : 'Aucun événement ne correspond à ce filtre.'
              }
            </p>
            {filter === 'all' && (
              <Link
                to="/events/new"
                className="btn btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Créer un événement
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200">
                {/* Header avec titre et badge */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 leading-tight flex-1 pr-2 truncate">
                      {event.title}
                    </h3>
                    {getStatusBadge(event.status)}
                  </div>
                  
                  {/* Description avec limite de lignes */}
                  <p className="text-sm text-gray-600 leading-relaxed overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word'
                  }}>
                    {event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description}
                  </p>
                </div>
                
                {/* Informations de l'événement */}
                <div className="px-6 pb-4 space-y-3">
                  {/* Date */}
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{formatDate(event.date_start)}</span>
                  </div>
                  
                  {/* Localisation */}
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{event.location || 'Lieu non défini'}</span>
                  </div>
                  
                  {/* Catégorie */}
                  {event.categories?.name && (
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="truncate">{event.categories.name}</span>
                    </div>
                  )}
                </div>
                
                {/* Boutons d'action */}
                <div className="px-6 pb-6 flex space-x-2">
                  <Link
                    to={`/events/${event.id}`}
                    className="btn btn-primary flex-1 text-center"
                  >
                    Voir détails
                  </Link>
                  {event.status === 'pending' && (
                    <Link
                      to={`/events/${event.id}/edit`}
                      className="btn btn-secondary whitespace-nowrap"
                    >
                      Modifier
                    </Link>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(event.id)}
                    disabled={deletingEventId === event.id}
                    className="btn btn-danger p-2 min-w-0"
                    title="Supprimer l'événement"
                  >
                    {deletingEventId === event.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            {/* Header avec icône d'avertissement */}
            <div className="bg-red-50 rounded-t-2xl p-6 border-b border-red-100">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Confirmer la suppression
              </h3>
              <p className="text-sm text-gray-600 text-center">
                Cette action masquera l'événement du dashboard
              </p>
            </div>
            
            {/* Contenu */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer cet événement ? 
                  <br /><br />
                  <span className="font-semibold text-red-600">
                    ⚠️ Cette action est irréversible et masquera définitivement l'événement.
                  </span>
                </p>
              </div>
              
              {/* Boutons d'action */}
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => deleteEvent(showDeleteConfirm)}
                  disabled={deletingEventId === showDeleteConfirm}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2"
                >
                  {deletingEventId === showDeleteConfirm ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Suppression en cours...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>SUPPRIMER DÉFINITIVEMENT</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deletingEventId === showDeleteConfirm}
                  className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all duration-200"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage; 