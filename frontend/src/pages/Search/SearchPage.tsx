/**
 * Advanced Search Page Component
 * 
 * This page provides comprehensive search functionality including:
 * - Global text search across all entities
 * - Geographic search with map integration
 * - Semantic relationship exploration
 * - Cultural pattern analysis
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
} from '@mui/material';
import {
  Search,
  LocationOn,
  Timeline,
  TrendingUp,
  MusicNote,
  Language,
  Category,
  AccountBalance,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ErrorMessage from '../../components/Common/ErrorMessage';
import SearchBar from '../../components/Common/SearchBar';
import { 
  searchApi, 
  SearchResult,
  relationsApi 
} from '../../services/api';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`search-tabpanel-${index}`}
    aria-labelledby={`search-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

// Search result item component
interface SearchResultItemProps {
  result: SearchResult;
  onClick?: (result: SearchResult) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ result, onClick }) => {
  const getEntityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'Instrument': <MusicNote color="primary" />,
      'Famille': <Category color="secondary" />,
      'GroupeEthnique': <Language color="success" />,
      'Localite': <LocationOn color="info" />,
      'PatrimoineCulturel': <AccountBalance color="warning" />,
    };
    return icons[type] || <Search />;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, any> = {
      'Instrument': 'primary',
      'Famille': 'secondary',
      'GroupeEthnique': 'success',
      'Localite': 'info',
      'PatrimoineCulturel': 'warning',
    };
    return colors[type] || 'default';
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { 
          transform: 'translateY(-1px)',
          boxShadow: 2 
        } : {}
      }}
      onClick={() => onClick?.(result)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {getEntityIcon(result.type)}
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
            {result.name}
          </Typography>
          <Chip 
            label={result.type} 
            size="small" 
            color={getTypeColor(result.type)}
            variant="outlined"
          />
        </Box>
        
        {result.entity?.description && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {result.entity.description}
          </Typography>
        )}
        
        {result.entity?.anneeCreation && (
          <Typography variant="caption" color="text.secondary">
            Année: {result.entity.anneeCreation}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Advanced search page component
 */
const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Global search state
  const [globalQuery, setGlobalQuery] = useState(searchParams.get('q') || '');
  const [globalResults, setGlobalResults] = useState<SearchResult[]>([]);
  
  // Geographic search state
  const [geoParams, setGeoParams] = useState({
    latitude: '',
    longitude: '',
    radius: '100',
  });
  const [geoResults, setGeoResults] = useState<SearchResult[]>([]);
  
  // Semantic search state
  const [similarityParams, setSimilarityParams] = useState({
    entityId: '',
    entityType: 'Instrument',
  });
  const [similarResults, setSimilarResults] = useState<SearchResult[]>([]);
  
  // Cultural patterns state
  const [culturalPatterns, setCulturalPatterns] = useState<any[]>([]);
  
  // Centrality analysis state
  const [centralityData, setCentralityData] = useState<any[]>([]);

  /**
   * Load initial search if query parameter exists
   */
  useEffect(() => {
    if (globalQuery) {
      performGlobalSearch(globalQuery);
    }
  }, []);

  /**
   * Perform global search
   */
  const performGlobalSearch = async (query: string) => {
    if (!query.trim()) {
      setGlobalResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchApi.global(query);
      if (response.success) {
        setGlobalResults(response.data);
      } else {
        setError(response.error || 'Erreur lors de la recherche');
        setGlobalResults([]);
      }
    } catch (err) {
      console.error('Global search error:', err);
      setError('Erreur lors de la recherche globale');
      setGlobalResults([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Perform geographic search
   */
  const performGeographicSearch = async () => {
    const { latitude, longitude, radius } = geoParams;
    
    if (!latitude || !longitude) {
      alert('Veuillez saisir une latitude et une longitude');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchApi.geographic({
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        radius: parseInt(radius),
      });
      
      if (response.success) {
        setGeoResults(response.data);
      } else {
        setError(response.error || 'Erreur lors de la recherche géographique');
      }
    } catch (err) {
      console.error('Geographic search error:', err);
      setError('Erreur lors de la recherche géographique');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Perform similarity search
   */
  const performSimilaritySearch = async () => {
    const { entityId, entityType } = similarityParams;
    
    if (!entityId) {
      alert('Veuillez saisir un ID d\'entité');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchApi.similar(entityId, entityType);
      if (response.success) {
        setSimilarResults(response.data);
      } else {
        setError(response.error || 'Erreur lors de la recherche de similarité');
      }
    } catch (err) {
      console.error('Similarity search error:', err);
      setError('Erreur lors de la recherche de similarité');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load cultural patterns
   */
  const loadCulturalPatterns = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await searchApi.culturalPatterns();
      if (response.success) {
        setCulturalPatterns(response.data);
      } else {
        setError(response.error || 'Erreur lors du chargement des patterns culturels');
      }
    } catch (err) {
      console.error('Cultural patterns error:', err);
      setError('Erreur lors du chargement des patterns culturels');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load centrality analysis
   */
  const loadCentralityAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await searchApi.centrality();
      if (response.success) {
        setCentralityData(response.data);
      } else {
        setError(response.error || 'Erreur lors de l\'analyse de centralité');
      }
    } catch (err) {
      console.error('Centrality analysis error:', err);
      setError('Erreur lors de l\'analyse de centralité');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError(null);
    
    // Load data for specific tabs
    if (newValue === 3) {
      loadCulturalPatterns();
    } else if (newValue === 4) {
      loadCentralityAnalysis();
    }
  };

  /**
   * Handle search result selection
   */
  const handleResultSelect = (result: SearchResult) => {
    console.log('Selected result:', result);
    // You can navigate to a detailed view or show more information
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Recherche Avancée
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Explorez l'ontologie musicale avec nos outils de recherche sémantique
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Box sx={{ mb: 3 }}>
          <ErrorMessage message={error} />
        </Box>
      )}

      {/* Search Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Recherche Globale" icon={<Search />} />
          <Tab label="Recherche Géographique" icon={<LocationOn />} />
          <Tab label="Similarité" icon={<Timeline />} />
          <Tab label="Patterns Culturels" icon={<Language />} />
          <Tab label="Analyse de Centralité" icon={<TrendingUp />} />
        </Tabs>

        {/* Global Search Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ mb: 3 }}>
            <SearchBar
              placeholder="Rechercher dans toute l'ontologie..."
              initialValue={globalQuery}
              fullWidth
              enableAutocomplete={false}
              onSearch={(query) => {
                setGlobalQuery(query);
                performGlobalSearch(query);
                setSearchParams(query ? { q: query } : {});
              }}
            />
          </Box>

          {loading ? (
            <LoadingSpinner message="Recherche en cours..." />
          ) : (
            <Box>
              {globalResults.length > 0 ? (
                <>
                  <Typography variant="h6" gutterBottom>
                    {globalResults.length} résultat{globalResults.length > 1 ? 's' : ''} trouvé{globalResults.length > 1 ? 's' : ''}
                  </Typography>
                  {globalResults.map((result, index) => (
                    <SearchResultItem
                      key={index}
                      result={result}
                      onClick={handleResultSelect}
                    />
                  ))}
                </>
              ) : globalQuery ? (
                <Alert severity="info">
                  Aucun résultat trouvé pour "{globalQuery}"
                </Alert>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  Saisissez un terme de recherche pour explorer l'ontologie
                </Typography>
              )}
            </Box>
          )}
        </TabPanel>

        {/* Geographic Search Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Paramètres de Recherche
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Latitude"
                      type="number"
                      value={geoParams.latitude}
                      onChange={(e) => setGeoParams(prev => ({ ...prev, latitude: e.target.value }))}
                      inputProps={{ step: 'any' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Longitude"
                      type="number"
                      value={geoParams.longitude}
                      onChange={(e) => setGeoParams(prev => ({ ...prev, longitude: e.target.value }))}
                      inputProps={{ step: 'any' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Rayon (km)"
                      type="number"
                      value={geoParams.radius}
                      onChange={(e) => setGeoParams(prev => ({ ...prev, radius: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={performGeographicSearch}
                      disabled={loading}
                    >
                      Rechercher
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              {loading ? (
                <LoadingSpinner />
              ) : geoResults.length > 0 ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Résultats Géographiques
                  </Typography>
                  {geoResults.map((result, index) => (
                    <SearchResultItem
                      key={index}
                      result={result}
                      onClick={handleResultSelect}
                    />
                  ))}
                </Box>
              ) : (
                <Alert severity="info">
                  Aucun résultat géographique trouvé
                </Alert>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Similarity Search Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recherche de Similarité
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="ID de l'entité"
                      value={similarityParams.entityId}
                      onChange={(e) => setSimilarityParams(prev => ({ ...prev, entityId: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Type d'entité</InputLabel>
                      <Select
                        value={similarityParams.entityType}
                        onChange={(e) => setSimilarityParams(prev => ({ ...prev, entityType: e.target.value }))}
                        label="Type d'entité"
                      >
                        <MenuItem value="Instrument">Instrument</MenuItem>
                        <MenuItem value="Famille">Famille</MenuItem>
                        <MenuItem value="GroupeEthnique">Groupe Ethnique</MenuItem>
                        <MenuItem value="Localite">Localité</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={performSimilaritySearch}
                      disabled={loading}
                    >
                      Trouver Similaires
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              {loading ? (
                <LoadingSpinner />
              ) : similarResults.length > 0 ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Entités Similaires
                  </Typography>
                  {similarResults.map((result, index) => (
                    <SearchResultItem
                      key={index}
                      result={result}
                      onClick={handleResultSelect}
                    />
                  ))}
                </Box>
              ) : (
                <Alert severity="info">
                  Aucune entité similaire trouvée
                </Alert>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Cultural Patterns Tab */}
        <TabPanel value={activeTab} index={3}>
          {loading ? (
            <LoadingSpinner message="Chargement des patterns culturels..." />
          ) : culturalPatterns.length > 0 ? (
            <Grid container spacing={3}>
              {culturalPatterns.map((pattern, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Pattern #{index + 1}
                      </Typography>
                      <pre>{JSON.stringify(pattern, null, 2)}</pre>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              Aucun pattern culturel disponible
            </Alert>
          )}
        </TabPanel>

        {/* Centrality Analysis Tab */}
        <TabPanel value={activeTab} index={4}>
          {loading ? (
            <LoadingSpinner message="Analyse de centralité en cours..." />
          ) : centralityData.length > 0 ? (
            <Grid container spacing={3}>
              {centralityData.map((item, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Analyse #{index + 1}
                      </Typography>
                      <pre>{JSON.stringify(item, null, 2)}</pre>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              Aucune donnée de centralité disponible
            </Alert>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SearchPage;