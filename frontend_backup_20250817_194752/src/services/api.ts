import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
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

// Configuration de l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour ajouter le token d'authentification
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Intercepteur pour gérer les erreurs
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expiré ou invalide
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Méthodes d'authentification
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async verifyToken(): Promise<{ success: boolean; user: User }> {
    const response = await this.api.get<{ success: boolean; user: User }>('/api/auth/verify');
    return response.data;
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post<{ success: boolean; message: string }>('/api/auth/logout');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.put<{ success: boolean; message: string }>('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  async getProfile(): Promise<{ success: boolean; user: User }> {
    const response = await this.api.get<{ success: boolean; user: User }>('/api/auth/profile');
    return response.data;
  }

  // Méthodes pour les événements
  async getEvents(filters: EventFilters = {}): Promise<ApiResponse<Event[]>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await this.api.get<ApiResponse<Event[]>>(`/api/events?${params.toString()}`);
    return response.data;
  }

  async getEvent(id: number): Promise<ApiResponse<Event>> {
    const response = await this.api.get<ApiResponse<Event>>(`/api/events/${id}`);
    return response.data;
  }

  async createEvent(eventData: EventFormData): Promise<ApiResponse<{ id: number }>> {
    const response = await this.api.post<ApiResponse<{ id: number }>>('/api/events', eventData);
    return response.data;
  }

  async updateEvent(id: number, eventData: Partial<EventFormData>): Promise<ApiResponse<{ id: number }>> {
    const response = await this.api.put<ApiResponse<{ id: number }>>(`/api/events/${id}`, eventData);
    return response.data;
  }

  async deleteEvent(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await this.api.delete<ApiResponse<{ message: string }>>(`/api/events/${id}`);
    return response.data;
  }

  async syncEventWithAplo(id: number): Promise<ApiResponse<any>> {
    const response = await this.api.post<ApiResponse<any>>(`/api/events/${id}/sync-aplo`);
    return response.data;
  }

  // Méthodes pour les communes et catégories
  async getCommunes(): Promise<ApiResponse<Commune[]>> {
    const response = await this.api.get<ApiResponse<Commune[]>>('/api/communes');
    return response.data;
  }

  async getCategories(): Promise<ApiResponse<Category[]>> {
    const response = await this.api.get<ApiResponse<Category[]>>('/api/categories');
    return response.data;
  }

  // Méthodes pour les statistiques
  async getStats(): Promise<ApiResponse<Stats>> {
    const response = await this.api.get<ApiResponse<Stats>>('/api/stats');
    return response.data;
  }

  // Méthode utilitaire pour gérer les erreurs
  handleError(error: AxiosError): ApiError {
    if (error.response) {
      const data = error.response.data as any;
      return {
        error: data.error || 'Une erreur est survenue',
        code: data.code || 'UNKNOWN_ERROR',
        details: data.details,
      };
    } else if (error.request) {
      return {
        error: 'Impossible de joindre le serveur',
        code: 'NETWORK_ERROR',
      };
    } else {
      return {
        error: 'Une erreur inattendue est survenue',
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  // Méthode pour tester la connexion
  async healthCheck(): Promise<{ status: string; services: any }> {
    const response = await this.api.get('/health');
    return response.data;
  }
}

// Instance singleton
const apiService = new ApiService();
export default apiService; 