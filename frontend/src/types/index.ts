// Types pour l'authentification
export interface User {
  id: string; // UUID from auth.users
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  commune_id?: number;
  commune_name?: string; // Ajouté pour accès direct au nom de la commune
  commune?: {
    id: number;
    name: string;
    logo_url: string;
  };
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  expiresIn: string;
}

// Types pour les communes
export interface Commune {
  id: number;
  name: string;
  codeInsee: string;
  population: number;
  logoUrl: string;
}

// Types pour les catégories
export interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
}

// Types pour les événements
export interface Event {
  id: number;
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  location: string;
  gpsLat: number | null;
  gpsLng: number | null;
  categoryIds: number[];
  categoryNames: string[];
  categoryColors: string[];
  images: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: 'draft' | 'published' | 'cancelled';
  aploSyncStatus: 'pending' | 'synced' | 'error';
  aploEventId: string | null;
  commune: {
    id: number;
    name: string;
    logo: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EventFormData {
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  location: string;
  adresse: string;
  categoryId: number;
  isFree: boolean;
  price?: number;
  imageUrl?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

// Types pour les statistiques
export interface MonthlyStats {
  month: string;
  totalEvents: number;
  publishedEvents: number;
  syncedEvents: number;
}

export interface CategoryStats {
  name: string;
  color: string;
  eventCount: number;
}

export interface GeneralStats {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  syncedEvents: number;
  syncErrors: number;
}

export interface Stats {
  monthly: MonthlyStats[];
  byCategory: CategoryStats[];
  general: GeneralStats;
}

// Types pour la pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Types pour les réponses API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface ApiError {
  error: string;
  code: string;
  details?: any;
}

// Types pour les filtres
export interface EventFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Types pour les logs
export interface EventLog {
  id: number;
  eventId: number;
  action: string;
  userId: number;
  dateAction: string;
  details: any;
  aploResponse: any;
}

// Types pour les notifications
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

// Types pour le contexte d'authentification
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingStatus: 'checking' | 'complete' | 'incomplete';
  isOnboardingComplete: boolean;
  refreshOnboardingStatus: () => Promise<void>;
}

// Types pour les props des composants
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
} 