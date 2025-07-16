/**
 * API Service Client
 * 
 * Comprehensive API client for the musical instruments ontology backend.
 * Provides type-safe interfaces and error handling for all endpoints.
 */

import axios, { AxiosResponse } from 'axios';

// Base configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Response Error:', error);
    if (error.response?.status === 404) {
      return Promise.resolve({
        data: {
          success: false,
          error: 'Resource not found',
          data: null
        }
      });
    }
    return Promise.reject(error);
  }
);

// Common interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface ApiListResponse<T = any> {
  success: boolean;
  data: {
    data: T[];
    total: number;
    limit?: number;
    skip?: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
  error?: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, any>;
}

// Entity interfaces
export interface Instrument {
  id: number;
  nomInstrument: string;
  description?: string;
  anneeCreation?: number;
}

export interface Famille {
  id: number;
  nomFamille: string;
  descriptionFamille?: string;
}

export interface GroupeEthnique {
  id: number;
  nomGroupe: string;
  langue?: string;
  description?: string;
}

export interface Localite {
  id: number;
  nomLocalite: string;
  coordonnees?: string;
  description?: string;
}

export interface Materiau {
  id: number;
  nomMateriau: string;
  type?: string;
  description?: string;
}

export interface Timbre {
  id: number;
  descriptionTimbre: string;
  frequence?: number;
  intensite?: number;
}

export interface TechniqueDeJeu {
  id: number;
  nomTechnique: string;
  description?: string;
  difficulte?: string;
}

export interface Artisan {
  id: number;
  nomArtisan: string;
  specialite?: string;
  region?: string;
}

export interface PatrimoineCulturel {
  id: number;
  nomPatrimoine: string;
  type?: string;
  description?: string;
}

// Relation interfaces
export interface RelationType {
  type: string;
  constraints: {
    from: string[];
    to: string[];
    cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
    description?: string;
  };
}

export interface Relation {
  sourceId: number;
  targetId: number;
  relationType: string;
  source?: {
    id: number;
    type: string;
    displayName: string;
    [key: string]: any;
  };
  target?: {
    id: number;
    type: string;
    displayName: string;
    [key: string]: any;
  };
}

export interface RelationResult {
  source: any;
  target: any;
  relationType: string;
  sourceLabels: string[];
  targetLabels: string[];
}

export interface CreateRelationData {
  sourceId: string | number;
  targetId: string | number;
  relationType: string;
}

// Search interfaces
export interface SearchResult {
  entity: any;
  labels: string[];
  name: string;
  type: string;
}

export interface GlobalSearchResponse {
  searchTerm: string;
  totalResults: number;
  results: Record<string, SearchResult[]>;
  allResults: SearchResult[];
}

export interface GeographicSearchParams {
  lat: number;
  lng: number;
  radius: number;
}

// Generic service interface
interface CrudService<T> {
  getAll: (params?: ListParams) => Promise<ApiListResponse<T>>;
  getById: (id: number) => Promise<ApiResponse<T>>;
  create: (data: Partial<T>) => Promise<ApiResponse<T>>;
  update: (id: number, data: Partial<T>) => Promise<ApiResponse<T>>;
  delete: (id: number) => Promise<ApiResponse<void>>;
  getStatistics?: () => Promise<ApiResponse<any>>;
}

// Generic CRUD service factory
function createCrudService<T>(endpoint: string): CrudService<T> {
  return {
    async getAll(params: ListParams = {}): Promise<ApiListResponse<T>> {
      try {
        const response: AxiosResponse<ApiListResponse<T>> = await apiClient.get(endpoint, {
          params: {
            page: params.page || 1,
            limit: params.limit || 10,
            search: params.search,
            ...params.filters,
          },
        });
        return response.data;
      } catch (error: any) {
        console.error(`Error fetching ${endpoint}:`, error);
        return {
          success: false,
          error: error.message || `Failed to fetch ${endpoint}`,
          data: { data: [], total: 0 }
        };
      }
    },

    async getById(id: number): Promise<ApiResponse<T>> {
      try {
        const response: AxiosResponse<ApiResponse<T>> = await apiClient.get(`${endpoint}/${id}`);
        return response.data;
      } catch (error: any) {
        console.error(`Error fetching ${endpoint}/${id}:`, error);
        return {
          success: false,
          error: error.message || `Failed to fetch ${endpoint}/${id}`,
          data: null
        };
      }
    },

    async create(data: Partial<T>): Promise<ApiResponse<T>> {
      try {
        const response: AxiosResponse<ApiResponse<T>> = await apiClient.post(endpoint, data);
        return response.data;
      } catch (error: any) {
        console.error(`Error creating ${endpoint}:`, error);
        return {
          success: false,
          error: error.response?.data?.message || error.message || `Failed to create ${endpoint}`,
          data: null
        };
      }
    },

    async update(id: number, data: Partial<T>): Promise<ApiResponse<T>> {
      try {
        const response: AxiosResponse<ApiResponse<T>> = await apiClient.put(`${endpoint}/${id}`, data);
        return response.data;
      } catch (error: any) {
        console.error(`Error updating ${endpoint}/${id}:`, error);
        return {
          success: false,
          error: error.response?.data?.message || error.message || `Failed to update ${endpoint}/${id}`,
          data: null
        };
      }
    },

    async delete(id: number): Promise<ApiResponse<void>> {
      try {
        const response: AxiosResponse<ApiResponse<void>> = await apiClient.delete(`${endpoint}/${id}`);
        return response.data;
      } catch (error: any) {
        console.error(`Error deleting ${endpoint}/${id}:`, error);
        return {
          success: false,
          error: error.response?.data?.message || error.message || `Failed to delete ${endpoint}/${id}`,
          data: null
        };
      }
    },

    async getStatistics(): Promise<ApiResponse<any>> {
      try {
        const response: AxiosResponse<ApiResponse<any>> = await apiClient.get(`${endpoint}/statistics`);
        return response.data;
      } catch (error: any) {
        console.error(`Error fetching ${endpoint}/statistics:`, error);
        return {
          success: false,
          error: error.message || `Failed to fetch ${endpoint}/statistics`,
          data: null
        };
      }
    },
  };
}

// Entity services
export const instrumentsApi = createCrudService<Instrument>('/instruments');
export const famillesApi = createCrudService<Famille>('/familles');
export const groupesEthniquesApi = createCrudService<GroupeEthnique>('/groupes-ethniques');
export const localitesApi = createCrudService<Localite>('/localites');
export const materiauxApi = createCrudService<Materiau>('/materiaux');
export const timbresApi = createCrudService<Timbre>('/timbres');
export const techniquesApi = createCrudService<TechniqueDeJeu>('/techniques');
export const artisansApi = createCrudService<Artisan>('/artisans');
export const patrimoinesApi = createCrudService<PatrimoineCulturel>('/patrimoines');

// Relations API service
export const relationsApi = {
  async getAll(params: ListParams = {}): Promise<ApiResponse<Relation[]>> {
    try {
      const response: AxiosResponse<ApiResponse<Relation[]>> = await apiClient.get('/relations', {
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          relationType: params.filters?.relationType,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching relations:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch relations',
        data: []
      };
    }
  },

  async getForEntity(entityId: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.get(`/relations/entity/${entityId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching relations for entity ${entityId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to fetch relations for entity ${entityId}`,
        data: null
      };
    }
  },

  async getByType(relationType: string, limit: number = 100): Promise<ApiResponse<RelationResult[]>> {
    try {
      const response: AxiosResponse<ApiResponse<RelationResult[]>> = await apiClient.get(`/relations/type/${relationType}`, {
        params: { limit }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching relations by type ${relationType}:`, error);
      return {
        success: false,
        error: error.message || `Failed to fetch relations by type ${relationType}`,
        data: []
      };
    }
  },

  async getTypes(): Promise<ApiResponse<RelationType[]>> {
    try {
      const response: AxiosResponse<ApiResponse<RelationType[]>> = await apiClient.get('/relations/types');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching relation types:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch relation types',
        data: []
      };
    }
  },

  async getStatistics(): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.get('/relations/statistics');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching relation statistics:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch relation statistics',
        data: null
      };
    }
  },

  async create(data: CreateRelationData): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post('/relations', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating relation:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create relation',
        data: null
      };
    }
  },

  async delete(sourceId: number | string, targetId: number | string, relationType: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> = await apiClient.delete(
        `/relations/${sourceId}/${targetId}/${relationType}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error deleting relation:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to delete relation',
        data: null
      };
    }
  },

  async validate(data: CreateRelationData): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post('/relations/validate', data);
      return response.data;
    } catch (error: any) {
      console.error('Error validating relation:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to validate relation',
        data: null
      };
    }
  },

  async getOntology(): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.get('/relations/ontology');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching ontology structure:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch ontology structure',
        data: null
      };
    }
  },

  async findPaths(sourceId: number, targetId: number, maxDepth: number = 3): Promise<ApiResponse<any[]>> {
    try {
      const response: AxiosResponse<ApiResponse<any[]>> = await apiClient.get(
        `/relations/paths/${sourceId}/${targetId}`,
        { params: { maxDepth } }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error finding paths:', error);
      return {
        success: false,
        error: error.message || 'Failed to find paths',
        data: []
      };
    }
  },
};

// Search API service
export const searchApi = {
  async global(query: string, limit: number = 20): Promise<ApiResponse<SearchResult[]>> {
    try {
      const response: AxiosResponse<ApiResponse<GlobalSearchResponse>> = await apiClient.get('/search/global', {
        params: { q: query, limit }
      });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data.allResults || [],
          totalResults: response.data.data.totalResults || 0
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Search failed',
          data: []
        };
      }
    } catch (error: any) {
      console.error('Error performing global search:', error);
      return {
        success: false,
        error: error.message || 'Failed to perform global search',
        data: []
      };
    }
  },

  async geographic(params: GeographicSearchParams): Promise<ApiResponse<SearchResult[]>> {
    try {
      const response: AxiosResponse<ApiResponse<SearchResult[]>> = await apiClient.get('/search/geographic', {
        params
      });
      return response.data;
    } catch (error: any) {
      console.error('Error performing geographic search:', error);
      return {
        success: false,
        error: error.message || 'Failed to perform geographic search',
        data: []
      };
    }
  },

  async similar(entityId: string, entityType: string = 'instrument'): Promise<ApiResponse<SearchResult[]>> {
    try {
      const response: AxiosResponse<ApiResponse<SearchResult[]>> = await apiClient.get(`/search/similar/${entityId}`, {
        params: { type: entityType }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error performing similarity search:', error);
      return {
        success: false,
        error: error.message || 'Failed to perform similarity search',
        data: []
      };
    }
  },

  async culturalPatterns(): Promise<ApiResponse<any[]>> {
    try {
      const response: AxiosResponse<ApiResponse<{patterns: any[], count: number}>> = await apiClient.get('/search/cultural-patterns');
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data.patterns || [],
          count: response.data.data.count || 0
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to load cultural patterns',
          data: []
        };
      }
    } catch (error: any) {
      console.error('Error loading cultural patterns:', error);
      return {
        success: false,
        error: error.message || 'Failed to load cultural patterns',
        data: []
      };
    }
  },

  async centrality(): Promise<ApiResponse<any[]>> {
    try {
      const response: AxiosResponse<ApiResponse<{centralityAnalysis: any[], count: number}>> = await apiClient.get('/search/centrality');
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data.centralityAnalysis || [],
          count: response.data.data.count || 0
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to load centrality analysis',
          data: []
        };
      }
    } catch (error: any) {
      console.error('Error loading centrality analysis:', error);
      return {
        success: false,
        error: error.message || 'Failed to load centrality analysis',
        data: []
      };
    }
  },
};

// Health check API
export const healthApi = {
  async check(): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.get('/health');
      return response.data;
    } catch (error: any) {
      console.error('Error checking health:', error);
      return {
        success: false,
        error: error.message || 'Failed to check health',
        data: null
      };
    }
  },

  async dbHealth(): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.get('/db-health');
      return response.data;
    } catch (error: any) {
      console.error('Error checking database health:', error);
      return {
        success: false,
        error: error.message || 'Failed to check database health',
        data: null
      };
    }
  },

  async getHealth(): Promise<AxiosResponse<any>> {
    try {
      return await apiClient.get('/health');
    } catch (error) {
      return { status: 500, data: { success: false } } as AxiosResponse<any>;
    }
  },

  async getDbHealth(): Promise<AxiosResponse<any>> {
    try {
      return await apiClient.get('/db-health');
    } catch (error) {
      return { status: 500, data: { success: false } } as AxiosResponse<any>;
    }
  },
};

export default {
  instruments: instrumentsApi,
  familles: famillesApi,
  groupesEthniques: groupesEthniquesApi,
  localites: localitesApi,
  materiaux: materiauxApi,
  timbres: timbresApi,
  techniques: techniquesApi,
  artisans: artisansApi,
  patrimoines: patrimoinesApi,
  relations: relationsApi,
  search: searchApi,
  health: healthApi,
};