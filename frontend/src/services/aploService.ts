import { createClient } from '@supabase/supabase-js';

// Configuration Supabase APLO
const APLO_SUPABASE_URL = 'https://olzfglymtpcazrptazov.supabase.co';
const APLO_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semZnbHltdHBjYXpycHRhem92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyOTEwOTEsImV4cCI6MjA2MTg2NzA5MX0.FWYWuAdPBQOs5UHrC7FHc5fGNbb_AI1HIA02ou8O230';
const APLO_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semZnbHltdHBjYXpycHRhem92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI5MTA5MSwiZXhwIjoyMDYxODY3MDkxfQ.ESU3czLRtn2sqQsLugwFRcC-7t4oDwp1teqFpmer-gc';

// Client Supabase pour APLO (avec service_role pour bypass RLS)
const aploSupabase = createClient(APLO_SUPABASE_URL, APLO_SUPABASE_SERVICE_KEY);

// Interface pour les événements APLO (selon le schéma de la DB)
export interface AploEvent {
  id?: number;
  title: string;
  description?: string;
  location: string;
  address?: string;
  date_start: string;
  date_end?: string;
  time_start?: string;
  time_end?: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: string;
  price_min?: number;
  price_max?: number;
  event_url?: string;
  creator_id?: string;
  is_silver?: boolean;
  is_gold?: boolean;
  created_at?: string;
}

// Interface pour les événements de notre dashboard
export interface DashboardEvent {
  id: string;
  title: string;
  description?: string;
  location: string;
  date_debut: string;
  date_fin?: string;
  heure_debut?: string;
  heure_fin?: string;
  image_url?: string;
  gps_lat?: number;
  gps_lng?: number;
  coordinate?: string;
  commune_id?: string;
  commune_name?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  adresse?: string; // Ajout de l'adresse
}

export const aploService = {
  /**
   * Convertit un événement du dashboard vers le format APLO
   */
  convertToAploEvent(dashboardEvent: DashboardEvent): AploEvent {
    // Validation des champs obligatoires - gérer les deux formats
    const dateDebut = dashboardEvent.date_debut || (dashboardEvent as any).date_start;
    const imageUrl = dashboardEvent.image_url || (dashboardEvent as any).uploaded_image_url;

    if (!dateDebut) {
      throw new Error('Date de début obligatoire');
    }
    if (!imageUrl) {
      throw new Error('Image obligatoire');
    }

    // Fonction pour extraire la date d'un datetime
    const extractDate = (datetime: string): string => {
      return datetime.split('T')[0]; // Prend juste la partie date
    };

    // Fonction pour extraire l'heure d'un datetime
    const extractTime = (datetime: string): string => {
      const timePart = datetime.split('T')[1];
      return timePart.substring(0, 5); // Format HH:MM
    };

    return {
      title: dashboardEvent.title,
      description: dashboardEvent.description,
      location: dashboardEvent.location,
      address: dashboardEvent.adresse, // Ajout de l'adresse
      date_start: extractDate(dateDebut),
      date_end: (dashboardEvent.date_fin || (dashboardEvent as any).date_end) ? extractDate(dashboardEvent.date_fin || (dashboardEvent as any).date_end) : undefined,
      time_start: extractTime(dateDebut), // Utiliser dateDebut pour l'heure
      time_end: (dashboardEvent.heure_fin || (dashboardEvent as any).heure_end) ? extractTime(dashboardEvent.heure_fin || (dashboardEvent as any).heure_end) : undefined,
      image_url: imageUrl, // URL du bucket
      latitude: dashboardEvent.gps_lat,
      longitude: dashboardEvent.gps_lng,
      coordinates: dashboardEvent.coordinate, // Format WKB déjà correct
      price_min: undefined, // Gratuit = undefined
      price_max: undefined, // Gratuit = undefined
      event_url: undefined, // Toujours undefined
      creator_id: 'dashboard-ot',
      is_silver: true, // Tous les événements du dashboard sont silver
      is_gold: false, // Pas gold
      created_at: new Date().toISOString()
    };
  },

  /**
   * Pousse un événement vers la base de données APLO
   */
  async pushEvent(dashboardEvent: DashboardEvent): Promise<{ success: boolean; error?: string; data?: any; isDuplicate?: boolean }> {
    try {
      console.log('🚀 Pushing event to APLO:', dashboardEvent);

      const aploEvent = this.convertToAploEvent(dashboardEvent);
      console.log('📋 Converted to APLO format:', aploEvent);

      // Récupérer le dernier ID d'APLO
      const { data: lastEvent, error: lastError } = await aploSupabase
        .from('events')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (lastError) {
        console.error('❌ Error getting last ID from APLO:', lastError);
        return { success: false, error: lastError.message };
      }

      const nextId = (lastEvent?.id || 0) + 1;
      console.log('🔍 Next available ID:', nextId);

      // Ajouter l'ID manuellement
      const eventWithId = { ...aploEvent, id: nextId };
      
      console.log('🔍 Event with ID:', eventWithId);
      
      const { data, error } = await aploSupabase
        .from('events')
        .insert([eventWithId]);

      if (error) {
        console.error('❌ Error pushing event to APLO:', error);
        
        // Vérifier si c'est une erreur de doublon
        const isDuplicate = error.message.includes('duplicate') || 
                           error.message.includes('unique') ||
                           error.code === '23505'; // Code PostgreSQL pour violation de contrainte unique
        
        return { 
          success: false, 
          error: error.message,
          isDuplicate 
        };
      }

      console.log('✅ Event pushed to APLO successfully:', data);
      return { success: true, data };

    } catch (error) {
      console.error('❌ Exception pushing event to APLO:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Retire un événement de la base de données APLO
   */
  async removeEventFromAplo(dashboardEvent: DashboardEvent): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Removing event from APLO:', dashboardEvent.title);

      // Rechercher l'événement dans APLO par titre, date et lieu
      const { data: existingEvents, error: searchError } = await aploSupabase
        .from('events')
        .select('id')
        .eq('title', dashboardEvent.title)
        .eq('date_start', dashboardEvent.date_debut)
        .eq('location', dashboardEvent.location)
        .eq('creator_id', 'dashboard-ot');

      if (searchError) {
        console.error('❌ Error searching event in APLO:', searchError);
        return { success: false, error: searchError.message };
      }

      if (!existingEvents || existingEvents.length === 0) {
        console.log('⚠️ Event not found in APLO');
        return { success: false, error: 'Événement non trouvé dans APLO' };
      }

      // Supprimer l'événement
      const { error: deleteError } = await aploSupabase
        .from('events')
        .delete()
        .eq('id', existingEvents[0].id);

      if (deleteError) {
        console.error('❌ Error deleting event from APLO:', deleteError);
        return { success: false, error: deleteError.message };
      }

      console.log('✅ Event removed from APLO successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Exception removing event from APLO:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Pousse plusieurs événements vers APLO
   */
  async pushMultipleEvents(dashboardEvents: DashboardEvent[]): Promise<{ success: boolean; errors?: string[]; data?: any[]; duplicates?: number }> {
    try {
      console.log(`🚀 Pushing ${dashboardEvents.length} events to APLO`);

      const aploEvents = dashboardEvents.map(event => this.convertToAploEvent(event));
      console.log('📋 Converted events to APLO format:', aploEvents);

      const { data, error } = await aploSupabase
        .from('events')
        .insert(aploEvents)
        .select();

      if (error) {
        console.error('❌ Error pushing multiple events to APLO:', error);
        
        // Compter les doublons potentiels
        const isDuplicate = error.message.includes('duplicate') || 
                           error.message.includes('unique') ||
                           error.code === '23505';
        
        return { 
          success: false, 
          errors: [error.message],
          duplicates: isDuplicate ? dashboardEvents.length : 0
        };
      }

      console.log(`✅ ${dashboardEvents.length} events pushed to APLO successfully`);
      return { success: true, data };

    } catch (error) {
      console.error('❌ Exception pushing multiple events to APLO:', error);
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  },

  /**
   * Vérifie la connexion à la base APLO
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await aploSupabase
        .from('events')
        .select('count')
        .limit(1);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}; 