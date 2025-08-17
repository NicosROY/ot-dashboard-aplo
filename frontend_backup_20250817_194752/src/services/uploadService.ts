import supabaseService from './supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

class UploadService {
  private bucketName = 'event-images';

  async uploadImage(file: File): Promise<UploadResult> {
    try {
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log('[UPLOAD DEBUG] filePath:', filePath, 'file:', file);

      // Upload vers Supabase Storage
      const { data, error } = await supabaseService.getClient().storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      console.log('[UPLOAD DEBUG] upload result:', { data, error });

      if (error) {
        console.error('Erreur upload:', error);
        return { url: '', path: '', error: error.message };
      }

      // Récupérer l'URL publique
      const { data: urlData } = supabaseService.getClient().storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Erreur upload image:', error);
      return { url: '', path: '', error: 'Erreur lors de l\'upload' };
    }
  }

  async deleteImage(path: string): Promise<boolean> {
    try {
      const { error } = await supabaseService.getClient().storage
        .from(this.bucketName)
        .remove([path]);

      if (error) {
        console.error('Erreur suppression:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur suppression image:', error);
      return false;
    }
  }

  // Validation des types de fichiers
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (file.size > maxSize) {
      return { valid: false, error: 'Le fichier est trop volumineux (max 5MB)' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Type de fichier non autorisé (JPG, PNG, WebP uniquement)' };
    }

    return { valid: true };
  }
}

export default new UploadService(); 