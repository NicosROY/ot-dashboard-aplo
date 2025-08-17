import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  AuthResponse, 
  User, 
  Event, 
  EventFormData, 
  Category, 
  Commune, 
  Stats, 
  ApiResponse, 
  ApiError,
  EventFilters
} from '../types';

// Configuration Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variables d\'environnement Supabase manquantes. Vérifiez REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_ANON_KEY');
    }
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  }

  // Méthodes d'authentification
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Utilisateur non trouvé');
      }

      // AuthContext gère la vérification du statut utilisateur
      return {
        success: true,
        token: data.session?.access_token || '',
        user: undefined, // AuthContext vérifiera le statut
        expiresIn: data.session?.expires_in?.toString() || '3600'
      };
    } catch (error: any) {
      throw new Error(error.message || 'Erreur de connexion');
    }
  }

  async verifyToken(): Promise<{ success: boolean; user: User | null }> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) {
        throw new Error('Token invalide');
      }

      // Récupérer les données utilisateur depuis la table user_profiles
      const { data: userData, error: userError } = await this.supabase
        .from('user_profiles')
        .select(`
          *,
          communes(id, name, logo_url)
        `)
        .eq('id', user.id)
        .maybeSingle();

      // Si pas de profil, chercher l'onboarding_progress au lieu d'en créer un
      let finalUserData = userData;
      if (!userData && !userError) {
        // Vérifier s'il y a un onboarding en cours
        const { data: onboardingProgress, error: onboardingError } = await this.supabase
          .from('onboarding_progress')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        // Retourner les données de base sans créer de profil
        finalUserData = {
          id: user.id,
          email: user.email,
          role: 'user',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          commune_id: null,
          communes: null
        };
      }

      return {
        success: true,
        user: finalUserData
      };
    } catch (error: any) {
      return {
        success: false,
        user: null
      };
    }
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;

      return {
        success: true,
        message: 'Déconnexion réussie'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erreur de déconnexion'
      };
    }
  }

  // Méthodes pour les événements
  async getEvents(filters: EventFilters = {}): Promise<ApiResponse<Event[]>> {
    try {
      let query = this.supabase
        .from('events')
        .select(`
          *,
          categories(name),
          communes(name)
        `);

      // Appliquer les filtres
      if (filters.category) {
        query = query.eq('category_id', filters.category);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte('date_start', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('date_end', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Événements récupérés avec succès'
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.message || 'Erreur lors de la récupération des événements'
      };
    }
  }

  async getEvent(id: number): Promise<ApiResponse<Event | null>> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select(`
          *,
          categories(name),
          communes(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Événement récupéré avec succès'
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: error.message || 'Erreur lors de la récupération de l\'événement'
      };
    }
  }

  async createEvent(eventData: EventFormData): Promise<ApiResponse<{ id: number } | null>> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .insert([eventData])
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { id: data.id },
        message: 'Événement créé avec succès'
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: error.message || 'Erreur lors de la création de l\'événement'
      };
    }
  }

  async updateEvent(id: number, eventData: Partial<EventFormData>): Promise<ApiResponse<{ id: number } | null>> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .update(eventData)
        .eq('id', id)
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { id: data.id },
        message: 'Événement mis à jour avec succès'
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: error.message || 'Erreur lors de la mise à jour de l\'événement'
      };
    }
  }

  async deleteEvent(id: number): Promise<ApiResponse<{ message: string } | null>> {
    try {
      const { error } = await this.supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        success: true,
        data: { message: 'Événement supprimé avec succès' },
        message: 'Événement supprimé avec succès'
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: error.message || 'Erreur lors de la suppression de l\'événement'
      };
    }
  }

  // Méthodes pour les communes et catégories
  async getCommunes(): Promise<ApiResponse<Commune[]>> {
    try {
      const { data, error } = await this.supabase
        .from('communes')
        .select('*')
        .order('name');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Communes récupérées avec succès'
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.message || 'Erreur lors de la récupération des communes'
      };
    }
  }

  async getCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Catégories récupérées avec succès'
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.message || 'Erreur lors de la récupération des catégories'
      };
    }
  }

  // Méthodes pour les statistiques
  async getStats(): Promise<ApiResponse<Stats | null>> {
    try {
      // Compter les événements par statut
      const { data: eventsByStatus, error: statusError } = await this.supabase
        .from('events')
        .select('status');

      if (statusError) throw statusError;

      const totalEvents = eventsByStatus?.length || 0;
      const publishedEvents = eventsByStatus?.filter(e => e.status === 'published').length || 0;
      const draftEvents = eventsByStatus?.filter(e => e.status === 'draft').length || 0;

      const stats: Stats = {
        monthly: [],
        byCategory: [],
        general: {
          totalEvents,
          publishedEvents,
          draftEvents,
          syncedEvents: 0,
          syncErrors: 0
        }
      };

      return {
        success: true,
        data: stats,
        message: 'Statistiques récupérées avec succès'
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: error.message || 'Erreur lors de la récupération des statistiques'
      };
    }
  }

  // Méthode pour gérer les erreurs
  handleError(error: any): ApiError {
    return {
      error: error.message || 'Une erreur inattendue est survenue',
      code: error.code || 'UNKNOWN_ERROR',
      details: error.details,
    };
  }

  // Méthode pour tester la connexion
  async healthCheck(): Promise<{ status: string; services: any }> {
    try {
      // Test de connexion Supabase
      const { error } = await this.supabase.auth.getUser();
      
      return {
        status: error ? 'error' : 'ok',
        services: {
          supabase: error ? 'error' : 'ok',
          database: error ? 'error' : 'ok'
        }
      };
    } catch (error) {
      return {
        status: 'error',
        services: {
          supabase: 'error',
          database: 'error'
        }
      };
    }
  }

  // Méthode publique pour accéder au client Supabase
  getClient(): SupabaseClient {
    return this.supabase;
  }
}

// Instance singleton
const supabaseService = new SupabaseService();
export default supabaseService; 