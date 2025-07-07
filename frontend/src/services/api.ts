/**
 * API Service Layer
 * 
 * This service handles all HTTP requests to the music ontology backend API.
 * It provides a clean interface for all CRUD operations and search functionality.
 */

import axios, { AxiosResponse } from 'axios';

// Base configuration for API requests
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and error handling
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ Response received from ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Generic types for API responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  skip: number;
}

export interface ApiListResponse<T> extends ApiResponse<PaginatedResponse<T>> {
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Entity interfaces based on the backend models
export interface Instrument {
  id: number;
  nomInstrument: string;
  description?: string;
  anneeCreation?: number;
}

export interface Famille {
  id: number;
  nomFamille: 'Cordes' | 'Vents' | 'Percussions' | 'Electrophones';
}

export interface GroupeEthnique {
  id: number;
  nomGroupe: string;
  langue?: string;
}

export interface Rythme {
  id: number;
  nomRythme: string;
  tempoBPM?: number;
}

export interface Localite {
  id: number;
  nomLocalite: string;
  latitude: number;
  longitude: number;
}

export interface Materiau {
  id: number;
  nomMateriau: string;
  typeMateriau?: string;
}

export interface Timbre {
  id: number;
  descriptionTimbre: string;
}

export interface TechniqueDeJeu {
  id: number;
  nomTechnique: string;
  descriptionTechnique?: string;
}

export interface Artisan {
  id: number;
  nomArtisan: string;
  anneesExperience?: number;
}

export interface PatrimoineCulturel {
  id: number;
  nomPatrimoine: string;
  descriptionPatrimoine?: string;
}

export interface Relation {
  sourceId: string;
  targetId: string;
  relationType: 'appartientA' | 'utilisePar' | 'produitRythme' | 'localiseA' | 
                'constitueDe' | 'joueAvec' | 'fabrique' | 'caracterise' | 
                'appliqueA' | 'englobe';
}

export interface SearchResult {
  entity: any;
  labels: string[];
  name: string;
  type: string;
}

export interface RelationResult {
  entity: any;
  labels: string[];
  relationType: string;
}

/**
 * Health Check Services
 */
export const healthApi = {
  /**
   * Check server health status
   */
  getHealth: async (): Promise<AxiosResponse> => {
    return apiClient.get('/health');
  },

  /**
   * Check database connection health
   */
  getDbHealth: async (): Promise<AxiosResponse> => {
    return apiClient.get('/db-health');
  },
};

/**
 * Generic Entity Services
 * 
 * These services provide CRUD operations for all entity types
 */
export const createEntityService = <T>(entityPath: string) => ({
  /**
   * Get all entities with optional filters and pagination
   */
  getAll: async (params?: {
    page?: number;
    limit?: number;
    filters?: Record<string, any>;
  }): Promise<ApiListResponse<T>> => {
    const response = await apiClient.get(`/api/${entityPath}`, { params });
    return response.data;
  },

  /**
   * Get entity by ID
   */
  getById: async (id: number): Promise<ApiResponse<T>> => {
    const response = await apiClient.get(`/api/${entityPath}/${id}`);
    return response.data;
  },

  /**
   * Create new entity
   */
  create: async (data: Partial<T>): Promise<ApiResponse<T>> => {
    const response = await apiClient.post(`/api/${entityPath}`, data);
    return response.data;
  },

  /**
   * Update existing entity
   */
  update: async (id: number, data: Partial<T>): Promise<ApiResponse<T>> => {
    const response = await apiClient.put(`/api/${entityPath}/${id}`, data);
    return response.data;
  },

  /**
   * Delete entity
   */
  delete: async (id: number): Promise<ApiResponse<{ deleted: boolean; entity: T }>> => {
    const response = await apiClient.delete(`/api/${entityPath}/${id}`);
    return response.data;
  },

  /**
   * Get entity statistics
   */
  getStatistics: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/api/${entityPath}/statistics`);
    return response.data;
  },

  /**
   * Get entity relations
   */
  getRelations: async (id: number): Promise<ApiResponse<RelationResult[]>> => {
    const response = await apiClient.get(`/api/${entityPath}/${id}/relations`);
    return response.data;
  },
});

/**
 * Specific Entity Services
 */
export const instrumentsApi = {
  ...createEntityService<Instrument>('instruments'),
  
  /**
   * Advanced search for instruments
   */
  search: async (params: Record<string, any>): Promise<ApiResponse<Instrument[]>> => {
    const response = await apiClient.get('/api/instruments/search', { params });
    return response.data;
  },

  /**
   * Get instruments by family
   */
  getByFamily: async (family: string): Promise<ApiResponse<Instrument[]>> => {
    const response = await apiClient.get(`/api/instruments/by-family/${family}`);
    return response.data;
  },

  /**
   * Get instruments by ethnic group
   */
  getByGroup: async (group: string): Promise<ApiResponse<Instrument[]>> => {
    const response = await apiClient.get(`/api/instruments/by-group/${group}`);
    return response.data;
  },

  /**
   * Get instruments by location
   */
  getByLocation: async (location: string): Promise<ApiResponse<Instrument[]>> => {
    const response = await apiClient.get(`/api/instruments/by-location/${location}`);
    return response.data;
  },

  /**
   * Get similar instruments
   */
  getSimilar: async (id: number): Promise<ApiResponse<Instrument[]>> => {
    const response = await apiClient.get(`/api/instruments/${id}/similar`);
    return response.data;
  },
};

export const famillesApi = createEntityService<Famille>('familles');
export const groupesEthniquesApi = createEntityService<GroupeEthnique>('groupes-ethniques');
export const rythmesApi = createEntityService<Rythme>('rythmes');
export const localitesApi = createEntityService<Localite>('localites');
export const materiauxApi = createEntityService<Materiau>('materiaux');
export const timbresApi = createEntityService<Timbre>('timbres');
export const techniquesApi = createEntityService<TechniqueDeJeu>('techniques');
export const artisansApi = createEntityService<Artisan>('artisans');
export const patrimoinesApi = createEntityService<PatrimoineCulturel>('patrimoines');

/**
 * Relations Services
 */
export const relationsApi = {
  /**
   * Get all relations
   */
  getAll: async (): Promise<ApiResponse<Relation[]>> => {
    const response = await apiClient.get('/api/relations');
    return response.data;
  },

  /**
   * Create new relation
   */
  create: async (data: Relation): Promise<ApiResponse<Relation>> => {
    const response = await apiClient.post('/api/relations', data);
    return response.data;
  },

  /**
   * Delete relation
   */
  delete: async (sourceId: string, targetId: string, relationType: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete('/api/relations', {
      data: { sourceId, targetId, relationType }
    });
    return response.data;
  },

  /**
   * Get relation types
   */
  getTypes: async (): Promise<ApiResponse<string[]>> => {
    const response = await apiClient.get('/api/relations/types');
    return response.data;
  },

  /**
   * Get relations statistics
   */
  getStatistics: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/api/relations/statistics');
    return response.data;
  },

  /**
   * Get relations for entity
   */
  getForEntity: async (id: string): Promise<ApiResponse<RelationResult[]>> => {
    const response = await apiClient.get(`/api/relations/entity/${id}`);
    return response.data;
  },

  /**
   * Get relations by type
   */
  getByType: async (type: string): Promise<ApiResponse<Relation[]>> => {
    const response = await apiClient.get(`/api/relations/type/${type}`);
    return response.data;
  },

  /**
   * Get paths between entities
   */
  getPaths: async (startId: string, endId: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get(`/api/relations/paths/${startId}/${endId}`);
    return response.data;
  },
};

/**
 * Search Services
 */
export const searchApi = {
  /**
   * Global search across all entities
   */
  global: async (query: string): Promise<ApiResponse<SearchResult[]>> => {
    const response = await apiClient.get('/api/search/global', { 
      params: { q: query } 
    });
    return response.data;
  },

  /**
   * Geographic search
   */
  geographic: async (params: {
    lat: number;
    lng: number;
    radius?: number;
  }): Promise<ApiResponse<SearchResult[]>> => {
    const response = await apiClient.get('/api/search/geographic', { params });
    return response.data;
  },

  /**
   * Find similar entities
   */
  similar: async (id: string, type: string): Promise<ApiResponse<SearchResult[]>> => {
    const response = await apiClient.get(`/api/search/similar/${id}`, {
      params: { type }
    });
    return response.data;
  },

  /**
   * Get cultural patterns
   */
  culturalPatterns: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/api/search/cultural-patterns');
    return response.data;
  },

  /**
   * Get semantic paths
   */
  semanticPaths: async (startId: string, endId: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get(`/api/search/semantic-paths/${startId}/${endId}`);
    return response.data;
  },

  /**
   * Get recommendations
   */
  recommendations: async (id: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get(`/api/search/recommendations/${id}`);
    return response.data;
  },

  /**
   * Get centrality analysis
   */
  centrality: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/api/search/centrality');
    return response.data;
  },
};

// Export the configured axios instance for custom requests
export default apiClient;