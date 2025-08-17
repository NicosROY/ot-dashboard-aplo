import supabaseService from './supabase';

export interface OnboardingProgress {
  id: string;
  current_step: number;
  admin_info?: any;
  commune_data?: any;
  kyc_data?: any;
  team_data?: any;
  legal_data?: any;
  subscription_data?: any;
  created_at: string;
  updated_at: string;
}

class OnboardingService {
  // Récupérer la progression d'onboarding d'un utilisateur
  async getProgress(userId: string): Promise<OnboardingProgress | null> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('onboarding_progress')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Aucune progression trouvée
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la progression:', error);
      throw error;
    }
  }

  // Mettre à jour la progression d'onboarding
  async updateProgress(userId: string, step: number, data: any): Promise<void> {
    try {
      const updateData: any = {
        current_step: step,
        updated_at: new Date().toISOString()
      };

      // Ajouter les données selon l'étape
      switch (step) {
        case 1:
          updateData.admin_info = data;
          break;
        case 2:
          updateData.commune_data = data;
          break;
        case 3:
          updateData.kyc_data = data;
          break;
        case 4:
          updateData.team_data = data;
          break;
        case 5:
          updateData.legal_data = data;
          break;
        case 6:
          updateData.subscription_data = data;
          break;
      }

      const { error } = await supabaseService.getClient()
        .from('onboarding_progress')
        .upsert({
          id: userId,
          ...updateData
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression:', error);
      throw error;
    }
  }

  // Finaliser l'onboarding (transférer vers user_profiles et supprimer la progression)
  async completeOnboarding(userId: string): Promise<void> {
    try {
      // Récupérer toutes les données d'onboarding
      const { data: progress, error: progressError } = await supabaseService.getClient()
        .from('onboarding_progress')
        .select('*')
        .eq('id', userId)
        .single();

      if (progressError) throw progressError;

      // Mettre à jour le profil utilisateur avec les données finales
      const { error: profileError } = await supabaseService.getClient()
        .from('user_profiles')
        .update({
          first_name: progress.admin_info?.firstName,
          last_name: progress.admin_info?.lastName,
          commune_id: progress.commune_data?.id,
          is_active: true // Activer le compte
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Supprimer la progression d'onboarding
      const { error: deleteError } = await supabaseService.getClient()
        .from('onboarding_progress')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Erreur lors de la finalisation de l\'onboarding:', error);
      throw error;
    }
  }

  // Vérifier si un utilisateur a un onboarding en cours
  async hasIncompleteOnboarding(userId: string): Promise<boolean> {
    try {
      const progress = await this.getProgress(userId);
      // Si pas de progression ou étape < 7, l'onboarding est incomplet
      return progress !== null && progress.current_step < 7;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'onboarding:', error);
      return false;
    }
  }

  // Vérifier si l'onboarding est complètement terminé
  async isOnboardingComplete(userId: string): Promise<boolean> {
    try {
      const progress = await this.getProgress(userId);
      // Si pas de progression dans la table OU étape = 7, l'onboarding est terminé
      return progress === null || progress.current_step === 7;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'onboarding terminé:', error);
      return false;
    }
  }
}

const onboardingService = new OnboardingService();
export default onboardingService; 