import supabaseService from './supabase';

export interface AdminNotification {
  id: string;
  type: 'new_commune' | 'subscription' | 'support';
  title: string;
  message: string;
  data?: any;
  created_at: string;
  read: boolean;
}

class AdminNotificationService {
  async sendNotification(notification: Omit<AdminNotification, 'id' | 'created_at' | 'read'>) {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('admin_notifications')
        .insert([{
          ...notification,
          read: false
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending admin notification:', error);
      throw error;
    }
  }

  async getNotifications() {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting admin notifications:', error);
      throw error;
    }
  }

  async markAsRead(id: string) {
    try {
      const { error } = await supabaseService.getClient()
        .from('admin_notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
}

export default new AdminNotificationService(); 