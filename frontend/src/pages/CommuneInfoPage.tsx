import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface CommuneUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  function: string;
  is_active: boolean;
  created_at: string;
}

const CommuneInfoPage: React.FC = () => {
  const { user } = useAuth();
  const [communeUsers, setCommuneUsers] = useState<CommuneUser[]>([]);
  const [communeInfo, setCommuneInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  // Toutes les fonctionnalités d'invitation d'équipe et multi-user sont désactivées pour la version mono-user.
  // Supprimer ou commenter :
  // - showInviteForm, inviteForm, isInviting, pendingInvitations, handleInviteSubmit, handleResendInvitation, handleCancelInvitation
  // - Affichage du formulaire d'invitation et du tableau des invitations
  // - Appels à team_invitations

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 CommuneInfoPage: Début fetchData');
        console.log('👤 User:', user);
        console.log('🏘️ Commune ID:', user?.commune_id);

        // Vérifier que l'utilisateur est authentifié
        const { data: { session } } = await supabaseService.getClient().auth.getSession();
        if (!session) {
          console.log('❌ Pas de session active');
          setIsLoading(false);
          return;
        }

        console.log('✅ Session active:', session.user.email);

        if (!user?.commune_id) {
          console.log('❌ Pas de commune_id, arrêt du fetch');
          setIsLoading(false);
          return;
        }

        // Récupérer les informations de la commune
        console.log('🏘️ Récupération des infos de la commune...');
        const { data: commune, error: communeError } = await supabaseService.getClient()
          .from('communes')
          .select('*')
          .eq('id', user.commune_id)
          .single();

        if (communeError) {
          console.error('❌ Erreur lors de la récupération des informations de la commune:', communeError);
        } else {
          console.log('✅ Infos commune récupérées:', commune);
          setCommuneInfo(commune);
        }

        // Récupérer tous les utilisateurs de la commune
        console.log('👥 Récupération des utilisateurs de la commune...');
        const { data: users, error: usersError } = await supabaseService.getClient()
          .from('user_profiles')
          .select('*')
          .eq('commune_id', user.commune_id)
          .order('created_at', { ascending: false });

        if (usersError) {
          console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError);
          console.error('🔍 Détails de l\'erreur:', {
            message: usersError.message,
            details: usersError.details,
            hint: usersError.hint
          });
          setCommuneUsers([]);
        } else {
          console.log('✅ Utilisateurs récupérés:', users);
          setCommuneUsers(users || []);
        }

        // Récupérer les invitations en attente
        // const { data: invitations, error: invitationsError } = await supabaseService.getClient()
        //   .from('team_invitations')
        //   .select('*')
        //   .eq('commune_id', user.commune_id)
        //   .eq('status', 'pending')
        //   .order('created_at', { ascending: false });
        // if (!invitationsError) setPendingInvitations(invitations || []);
      } catch (error) {
        console.error('❌ Erreur générale:', error);
        setCommuneUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    } else {
      console.log('⏳ En attente de l\'utilisateur...');
      setIsLoading(false);
    }
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsChangingPassword(true);
    
    try {
      const { error } = await supabaseService.getClient().auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        toast.error('Erreur lors du changement de mot de passe');
        return;
      }

      toast.success('Mot de passe modifié avec succès');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      if (action === 'delete') {
        const { error } = await supabaseService.getClient()
          .from('user_profiles')
          .delete()
          .eq('id', userId);

        if (error) {
          toast.error('Erreur lors de la suppression');
          return;
        }

        toast.success('Utilisateur supprimé');
      } else {
        const { error } = await supabaseService.getClient()
          .from('user_profiles')
          .update({ is_active: action === 'activate' })
          .eq('id', userId);

        if (error) {
          toast.error('Erreur lors de la modification');
          return;
        }

        toast.success(`Utilisateur ${action === 'activate' ? 'activé' : 'désactivé'}`);
      }

      // Recharger la liste
      const { data: users } = await supabaseService.getClient()
        .from('user_profiles')
        .select('*')
        .eq('commune_id', user?.commune_id)
        .order('created_at', { ascending: false });

      setCommuneUsers(users || []);
    } catch (error) {
      toast.error('Erreur lors de l\'action');
    }
  };

  // Toutes les fonctionnalités d'invitation d'équipe et multi-user sont désactivées pour la version mono-user.
  // Supprimer ou commenter :
  // - showInviteForm, inviteForm, isInviting, pendingInvitations, handleInviteSubmit, handleResendInvitation, handleCancelInvitation
  // - Affichage du formulaire d'invitation et du tableau des invitations
  // - Appels à team_invitations

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const canAddUser = communeUsers.length + 0 < 5; // 0 car pendingInvitations est supprimé

  return (
    <>
      {/* Page Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Informations commune
                </h1>
                <p className="text-gray-600 mt-1">
                  Gérez les informations de votre commune
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Modifier mot de passe */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <div className="p-8">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-xl border border-red-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Sécurité
                </h3>
                
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                      Mot de passe actuel
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-transparent border-gray-200 hover:border-gray-300 focus:border-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-transparent border-gray-200 hover:border-gray-300 focus:border-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirmer le nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-transparent border-gray-200 hover:border-gray-300 focus:border-red-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="btn btn-primary w-full"
                  >
                    {isChangingPassword ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Modification...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Modifier le mot de passe
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Informations de base */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <div className="p-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Informations de base
                </h3>
                
                <dl className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <dt className="text-sm font-semibold text-gray-700 mb-1">Nom de la commune</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {communeInfo?.name || user?.commune?.name || 'Non défini'}
                    </dd>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <dt className="text-sm font-semibold text-gray-700 mb-1">Population</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {communeInfo?.population ? `${communeInfo.population.toLocaleString('fr-FR')} habitants` : 'Non défini'}
                    </dd>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <dt className="text-sm font-semibold text-gray-700 mb-1">Votre fonction</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {communeUsers.find(u => u.id === user?.id)?.function || 'Non défini'}
                    </dd>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <dt className="text-sm font-semibold text-gray-700 mb-1">Votre rôle</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommuneInfoPage; 