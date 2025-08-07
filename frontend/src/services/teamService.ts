// FONCTIONNALITÉ D'INVITATION D'ÉQUIPE DÉSACTIVÉE POUR LA VERSION MONO-USER
// Tout le code ci-dessous est désactivé.
import supabaseService from './supabase';

export interface TeamInvitation {
  id: string;
  admin_user_id: string;
  commune_id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'editor' | 'moderator';
  invitation_token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: number;
  user_id: string;
  admin_user_id: string;
  commune_id: number;
  role: 'admin' | 'editor' | 'moderator';
  invitation_id?: string;
  joined_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class TeamService {
  // Créer une invitation d'équipe
  async createInvitation(invitationData: {
    admin_user_id: string;
    commune_id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'editor' | 'moderator';
  }): Promise<{ success: boolean; invitation?: TeamInvitation; error?: string }> {
    try {
      const invitationToken = crypto.randomUUID();
      
      const { data, error } = await supabaseService.getClient()
        .from('team_invitations')
        .insert({
          ...invitationData,
          invitation_token: invitationToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur création invitation:', error);
        return { success: false, error: error.message };
      }

      return { success: true, invitation: data };
    } catch (error) {
      console.error('Erreur service invitation:', error);
      return { success: false, error: 'Erreur lors de la création de l\'invitation' };
    }
  }

  // Récupérer les invitations d'une commune
  async getInvitationsByCommune(communeId: number): Promise<TeamInvitation[]> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('team_invitations')
        .select('*')
        .eq('commune_id', communeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération invitations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erreur service invitations:', error);
      return [];
    }
  }

  // Accepter une invitation
  async acceptInvitation(token: string, userData: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Récupérer l'invitation
      const { data: invitation, error: invitationError } = await supabaseService.getClient()
        .from('team_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitation) {
        return { success: false, error: 'Invitation invalide ou expirée' };
      }

      // 2. Vérifier que l'invitation n'a pas expiré
      if (new Date(invitation.expires_at) < new Date()) {
        return { success: false, error: 'Invitation expirée' };
      }

      // 3. Créer le membre d'équipe
      const { error: memberError } = await supabaseService.getClient()
        .from('team_members')
        .insert({
          user_id: userData.id,
          admin_user_id: invitation.admin_user_id,
          commune_id: invitation.commune_id,
          role: invitation.role,
          invitation_id: invitation.id
        });

      if (memberError) {
        console.error('Erreur création membre:', memberError);
        return { success: false, error: 'Erreur lors de l\'ajout au groupe' };
      }

      // 4. Marquer l'invitation comme acceptée
      const { error: updateError } = await supabaseService.getClient()
        .from('team_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Erreur mise à jour invitation:', updateError);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur acceptation invitation:', error);
      return { success: false, error: 'Erreur lors de l\'acceptation' };
    }
  }

  // Récupérer les membres d'une commune
  async getTeamMembers(communeId: number): Promise<TeamMember[]> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('team_members')
        .select(`
          *,
          user_profiles!inner(id, email, first_name, last_name)
        `)
        .eq('commune_id', communeId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération membres:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erreur service membres:', error);
      return [];
    }
  }

  // Supprimer un membre d'équipe
  async removeTeamMember(memberId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseService.getClient()
        .from('team_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) {
        console.error('Erreur suppression membre:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur service suppression:', error);
      return { success: false, error: 'Erreur lors de la suppression' };
    }
  }
}

const teamService = new TeamService();
export default teamService; 