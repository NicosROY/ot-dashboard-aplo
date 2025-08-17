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
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  created_at: string;
  aplo_sync_status?: 'pending' | 'synced' | 'error';
}

interface DashboardStats {
  totalEvents: number;
  pendingEvents: number;
  approvedEvents: number;
  rejectedEvents: number;
  eventsByCategory: Array<{
    category: string;
    count: number;
  }>;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<Event[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user?.id) return;

        // Récupérer les événements de la commune de l'utilisateur
        const { data: userEvents, error: eventsError } = await supabaseService.getClient()
          .from('events')
          .select('*, categories(name)')
          .eq('commune_id', user.commune_id);

        if (eventsError) {
          console.error('Erreur lors de la récupération des événements:', eventsError);
          return;
        }

        // Filtrer les événements par statut
        const pending = userEvents?.filter((event: any) => event.status === 'pending') || [];
        const approved = userEvents?.filter((event: any) => event.status === 'approved') || [];
        const rejected = userEvents?.filter((event: any) => event.status === 'rejected') || [];

        // Calculer les statistiques
        const totalEvents = userEvents?.length || 0;
        const pendingCount = pending.length;
        const approvedCount = approved.length;
        const rejectedCount = rejected.length;

        // Grouper par catégorie
        const categoryCounts = userEvents?.reduce((acc: Record<string, number>, event: any) => {
          const category = event.category || 'Autre';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const eventsByCategory = Object.entries(categoryCounts).map(([category, count]) => ({
          category,
          count: count as number
        }));

        const stats: DashboardStats = {
          totalEvents,
          pendingEvents: pendingCount,
          approvedEvents: approvedCount,
          rejectedEvents: rejectedCount,
          eventsByCategory
        };

        setStats(stats);
        setPendingEvents(pending as Event[]);
        setApprovedEvents(approved as Event[]);
        setRejectedEvents(rejected as Event[]);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  const deleteEvent = async (eventId: string) => {
    try {
      setDeletingEventId(eventId);
      
      const { error } = await supabaseService.getClient()
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('commune_id', user?.commune_id);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de l\'événement');
        return;
      }

      // Mettre à jour toutes les listes d'événements
      setPendingEvents(prev => prev.filter(event => event.id !== eventId));
      setApprovedEvents(prev => prev.filter(event => event.id !== eventId));
      setRejectedEvents(prev => prev.filter(event => event.id !== eventId));
      
      // Mettre à jour les statistiques
      if (stats) {
        setStats(prev => prev ? {
          ...prev,
          totalEvents: prev.totalEvents - 1,
          pendingEvents: prev.pendingEvents - (pendingEvents.find(e => e.id === eventId) ? 1 : 0),
          approvedEvents: prev.approvedEvents - (approvedEvents.find(e => e.id === eventId) ? 1 : 0),
          rejectedEvents: prev.rejectedEvents - (rejectedEvents.find(e => e.id === eventId) ? 1 : 0),
        } : null);
      }
      
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'événement');
    } finally {
      setDeletingEventId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">En attente</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Validé</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejeté</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-aplo-cream">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-aplo-orange to-aplo-yellow rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Tableau de bord
                </h1>
                <p className="text-gray-600 mt-1">
                  Vue d'ensemble de votre commune
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Bandeau de métriques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-md shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-aplo-orange to-aplo-yellow rounded-md flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total événements</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-md shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-aplo-yellow to-aplo-orange rounded-md flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En attente</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingEvents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-md shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-aplo-purple to-aplo-purple-dark rounded-md flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Validés</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approvedEvents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-md shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-md flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Refusés</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rejectedEvents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-md shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-aplo-purple to-aplo-orange rounded-md flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Catégories</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.eventsByCategory.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sections d'événements - Toutes en pleine largeur */}
        
        {/* Section Événements validés */}
        <div className="bg-white rounded-md shadow-sm border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                  Événements validés
                </span>
                <span className="text-sm text-gray-500">
                  {approvedEvents.length} événement{approvedEvents.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {approvedEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun événement validé pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="bg-gray-50 border border-gray-200 rounded-md p-4 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 leading-tight truncate">{event.title}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2 overflow-hidden" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word'
                        }}>
                          {event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>📅 {formatDate(event.date_start)}</span>
                          <span>🏷️ {event.category}</span>
                          {getStatusBadge(event.status)}
                          {event.aplo_sync_status === 'synced' && (
                            <div className="flex items-center space-x-1 text-green-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium">Online</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Link
                          to={`/events/${event.id}`}
                          className="btn btn-primary whitespace-nowrap"
                        >
                          Voir détails
                        </Link>
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
                  </div>
                ))}
                {approvedEvents.length > 3 && (
                  <div className="text-center pt-4">
                    <Link
                      to="/events"
                      className="btn btn-secondary"
                    >
                      Voir tous les événements ({approvedEvents.length})
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section Événements en attente */}
        <div className="bg-white rounded-md shadow-sm border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-aplo-yellow text-gray-900 border border-aplo-yellow">
                  En attente de validation
                </span>
                <span className="text-sm text-gray-500">
                  {pendingEvents.length} événement{pendingEvents.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="w-12 h-12 bg-aplo-yellow rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {pendingEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Aucun événement en attente de validation</p>
                <Link
                  to="/events/new"
                  className="btn btn-primary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Créer un événement
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="bg-gray-50 border border-gray-200 rounded-md p-4 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 leading-tight truncate">{event.title}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2 overflow-hidden" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word'
                        }}>
                          {event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>📅 {formatDate(event.date_start)}</span>
                          <span>🏷️ {event.category}</span>
                          {getStatusBadge(event.status)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Link
                          to={`/events/${event.id}`}
                          className="btn btn-primary whitespace-nowrap"
                        >
                          Voir détails
                        </Link>
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
                  </div>
                ))}
                {pendingEvents.length > 3 && (
                  <div className="text-center pt-4">
                    <Link
                      to="/events"
                      className="btn btn-secondary"
                    >
                      Voir tous les événements ({pendingEvents.length})
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section Événements refusés */}
        <div className="bg-white rounded-md shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                  Événements refusés
                </span>
                <span className="text-sm text-gray-500">
                  {rejectedEvents.length} événement{rejectedEvents.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {rejectedEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun événement refusé</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rejectedEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="bg-gray-50 border border-gray-200 rounded-md p-4 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 leading-tight truncate">{event.title}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2 overflow-hidden" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word'
                        }}>
                          {event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>📅 {formatDate(event.date_start)}</span>
                          <span>🏷️ {event.category}</span>
                          {getStatusBadge(event.status)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Link
                          to={`/events/${event.id}`}
                          className="btn btn-primary whitespace-nowrap"
                        >
                          Voir détails
                        </Link>
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
                  </div>
                ))}
                {rejectedEvents.length > 3 && (
                  <div className="text-center pt-4">
                    <Link
                      to="/events"
                      className="btn btn-secondary"
                    >
                      Voir tous les événements ({rejectedEvents.length})
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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

export default DashboardPage; 