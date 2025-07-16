/**
 * Dashboard Page Component
 * 
 * The main dashboard page that provides an overview of the music ontology system
 * with statistics, recent activity, and quick access to main features.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  MusicNote,
  Category,
  Language,
  LocationOn,
  Build,
  Timeline,
  TrendingUp,
  Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ErrorMessage from '../../components/Common/ErrorMessage';
import SearchBar from '../../components/Common/SearchBar';
import { 
  instrumentsApi, 
  famillesApi, 
  groupesEthniquesApi, 
  localitesApi, 
  relationsApi,
  healthApi,
  SearchResult 
} from '../../services/api';

// Statistics interface
interface Statistics {
  instruments: number;
  familles: number;
  groupesEthniques: number;
  localites: number;
  relations: number;
}

// Quick stats card component
interface QuickStatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}

const QuickStatsCard: React.FC<QuickStatsCardProps> = ({
  title,
  value,
  icon,
  color,
  loading = false,
  onClick,
}) => (
  <Card
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease-in-out',
      '&:hover': onClick ? {
        transform: 'translateY(-2px)',
        boxShadow: 4,
      } : {},
    }}
    onClick={onClick}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            color: `${color}.contrastText`,
            borderRadius: 2,
            p: 1,
            mr: 2,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      
      {loading ? (
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
        </Box>
      ) : (
        <Typography variant="h4" component="div" color={color}>
          {value.toLocaleString()}
        </Typography>
      )}
    </CardContent>
  </Card>
);

/**
 * Main Dashboard component
 */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<Statistics>({
    instruments: 0,
    familles: 0,
    groupesEthniques: 0,
    localites: 0,
    relations: 0,
  });
  const [systemHealth, setSystemHealth] = useState<{
    api: boolean;
    database: boolean;
  }>({
    api: false,
    database: false,
  });

  /**
   * Load dashboard data
   */
  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * Load all dashboard data
   */
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check system health
      await checkSystemHealth();

      // Load statistics in parallel
      const [
        instrumentsResponse,
        famillesResponse,
        groupesResponse,
        localitesResponse,
        relationsResponse,
      ] = await Promise.all([
        instrumentsApi.getStatistics(),
        famillesApi.getStatistics(),
        groupesEthniquesApi.getStatistics(),
        localitesApi.getStatistics(),
        relationsApi.getStatistics(),
      ]);

      setStatistics({
        instruments: instrumentsResponse.data?.total || 0,
        familles: famillesResponse.data?.total || 0,
        groupesEthniques: groupesResponse.data?.total || 0,
        localites: localitesResponse.data?.total || 0,
        relations: relationsResponse.data?.total || 0,
      });

    } catch (err) {
      console.error('Dashboard loading error:', err);
      setError('Erreur lors du chargement des données du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check system health
   */
  const checkSystemHealth = async () => {
    try {
      const [healthResponse, dbHealthResponse] = await Promise.all([
        healthApi.getHealth(),
        healthApi.getDbHealth(),
      ]);

      setSystemHealth({
        api: healthResponse.status === 200,
        database: dbHealthResponse.status === 200,
      });
    } catch (err) {
      console.error('Health check error:', err);
      setSystemHealth({
        api: false,
        database: false,
      });
    }
  };

  /**
   * Handle search
   */
  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  /**
   * Handle search result selection
   */
  const handleSearchResultSelect = (result: SearchResult) => {
    // Navigate to the appropriate page based on result type
    const pathMap: Record<string, string> = {
      'Instrument': '/instruments',
      'Famille': '/familles',
      'GroupeEthnique': '/groupes-ethniques',
      'Localite': '/localites',
      'Artisan': '/artisans',
    };

    const path = pathMap[result.type] || '/search';
    navigate(path);
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <LoadingSpinner message="Chargement du tableau de bord..." />
      </Box>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <ErrorMessage
          message={error}
          showRetry
          onRetry={loadDashboardData}
        />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tableau de Bord
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Vue d'ensemble de l'ontologie des instruments de musique
        </Typography>
      </Box>

      {/* System Health Alert */}
      {(!systemHealth.api || !systemHealth.database) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            État du système : {systemHealth.api ? '✅ API' : '❌ API'} | {systemHealth.database ? '✅ Base de données' : '❌ Base de données'}
          </Typography>
        </Alert>
      )}

      {/* Search Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Recherche Rapide
        </Typography>
        <SearchBar
          placeholder="Rechercher des instruments, familles, groupes ethniques..."
          fullWidth
          enableAutocomplete
          onSearch={handleSearch}
          onResultSelect={handleSearchResultSelect}
        />
      </Paper>

      {/* Quick Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4 as any}>
          <QuickStatsCard
            title="Instruments"
            value={statistics.instruments}
            icon={<MusicNote />}
            color="primary"
            onClick={() => navigate('/instruments')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4 as any}>
          <QuickStatsCard
            title="Familles"
            value={statistics.familles}
            icon={<Category />}
            color="secondary"
            onClick={() => navigate('/familles')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4 as any}>
          <QuickStatsCard
            title="Groupes"
            value={statistics.groupesEthniques}
            icon={<Language />}
            color="success"
            onClick={() => navigate('/groupes-ethniques')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4 as any}>
          <QuickStatsCard
            title="Localités"
            value={statistics.localites}
            icon={<LocationOn />}
            color="info"
            onClick={() => navigate('/localites')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4 as any}>
          <QuickStatsCard
            title="Relations"
            value={statistics.relations}
            icon={<Timeline />}
            color="warning"
            onClick={() => navigate('/relations')}
          />
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Aperçu des Données
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Données Chargées"
                    secondary={`${statistics.instruments} instruments catalogués dans la base de données`}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <Assessment color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Relations Sémantiques"
                    secondary={`${statistics.relations} relations établies entre les entités`}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <Build color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Couverture Géographique"
                    secondary={`${statistics.localites} localités référencées`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions Rapides
              </Typography>
              <List>
                <ListItem
                  button
                  onClick={() => navigate('/instruments')}
                  sx={{ borderRadius: 1, mb: 1 }}
                >
                  <ListItemIcon>
                    <MusicNote />
                  </ListItemIcon>
                  <ListItemText
                    primary="Gérer les Instruments"
                    secondary="Ajouter, modifier ou supprimer"
                  />
                </ListItem>
                <ListItem
                  button
                  onClick={() => navigate('/search')}
                  sx={{ borderRadius: 1, mb: 1 }}
                >
                  <ListItemIcon>
                    <Assessment />
                  </ListItemIcon>
                  <ListItemText
                    primary="Recherche Avancée"
                    secondary="Explorer les relations"
                  />
                </ListItem>
                <ListItem
                  button
                  onClick={() => navigate('/relations')}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon>
                    <Timeline />
                  </ListItemIcon>
                  <ListItemText
                    primary="Visualiser Relations"
                    secondary="Graphique des connections"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;