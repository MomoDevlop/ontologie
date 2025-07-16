/**
 * Advanced Analytics Dashboard Component
 * 
 * This component provides comprehensive analytics and insights for the ontology:
 * - Entity distribution charts
 * - Relationship network metrics
 * - Growth trends over time
 * - Most connected entities
 * - Geographic distribution
 * - Cultural pattern analysis
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  ScatterPlot,
  Scatter,
} from 'recharts';
import {
  Analytics,
  TrendingUp,
  PieChart as PieChartIcon,
  Timeline,
  Language,
  LocationOn,
  MusicNote,
  Assessment,
} from '@mui/icons-material';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ErrorMessage from '../../components/Common/ErrorMessage';
import {
  instrumentsApi,
  famillesApi,
  groupesEthniquesApi,
  localitesApi,
  relationsApi,
  searchApi,
} from '../../services/api';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

// Stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  trend?: {
    value: number;
    label: string;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color = 'primary', trend }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ color: `${color}.main`, mr: 2 }}>
          {icon}
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {trend && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TrendingUp 
            sx={{ 
              color: trend.value > 0 ? 'success.main' : 'error.main',
              mr: 0.5,
              fontSize: 16 
            }} 
          />
          <Typography 
            variant="caption" 
            color={trend.value > 0 ? 'success.main' : 'error.main'}
          >
            {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

/**
 * Advanced analytics dashboard component
 */
const AnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  
  // Analytics data state
  const [stats, setStats] = useState({
    totalInstruments: 0,
    totalFamilles: 0,
    totalGroupes: 0,
    totalLocalites: 0,
    totalRelations: 0,
    avgConnectionsPerEntity: 0,
  });

  const [entityDistribution, setEntityDistribution] = useState<any[]>([]);
  const [familyDistribution, setFamilyDistribution] = useState<any[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<any[]>([]);
  const [topConnectedEntities, setTopConnectedEntities] = useState<any[]>([]);
  const [geographicDistribution, setGeographicDistribution] = useState<any[]>([]);
  const [growthTrends, setGrowthTrends] = useState<any[]>([]);

  /**
   * Load all analytics data
   */
  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  /**
   * Load comprehensive analytics data
   */
  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load basic statistics
      const [
        instrumentsRes,
        famillesRes,
        groupesRes,
        localitesRes,
        relationsRes,
      ] = await Promise.all([
        instrumentsApi.getStatistics(),
        famillesApi.getStatistics(),
        groupesEthniquesApi.getStatistics(),
        localitesApi.getStatistics(),
        relationsApi.getStatistics(),
      ]);

      // Process statistics
      const instrumentsTotal = instrumentsRes.success ? instrumentsRes.data?.total || 0 : 0;
      const famillesTotal = famillesRes.success ? famillesRes.data?.total || 0 : 0;
      const groupesTotal = groupesRes.success ? groupesRes.data?.total || 0 : 0;
      const localitesTotal = localitesRes.success ? localitesRes.data?.total || 0 : 0;
      const relationsTotal = relationsRes.success ? relationsRes.data?.total || 0 : 0;

      setStats({
        totalInstruments: instrumentsTotal,
        totalFamilles: famillesTotal,
        totalGroupes: groupesTotal,
        totalLocalites: localitesTotal,
        totalRelations: relationsTotal,
        avgConnectionsPerEntity: instrumentsTotal > 0 ? Math.round((relationsTotal * 2) / instrumentsTotal * 10) / 10 : 0,
      });

      // Process entity distribution
      const entityDist = [
        { name: 'Instruments', value: instrumentsTotal, color: COLORS[0] },
        { name: 'Familles', value: famillesTotal, color: COLORS[1] },
        { name: 'Groupes Ethniques', value: groupesTotal, color: COLORS[2] },
        { name: 'Localités', value: localitesTotal, color: COLORS[3] },
      ];
      setEntityDistribution(entityDist);

      // Simulate family distribution (in real app, get from API)
      const familyDist = [
        { name: 'Cordes', value: Math.floor(instrumentsTotal * 0.4), color: COLORS[0] },
        { name: 'Vents', value: Math.floor(instrumentsTotal * 0.3), color: COLORS[1] },
        { name: 'Percussions', value: Math.floor(instrumentsTotal * 0.25), color: COLORS[2] },
        { name: 'Électrophones', value: Math.floor(instrumentsTotal * 0.05), color: COLORS[3] },
      ];
      setFamilyDistribution(familyDist);

      // Simulate relationship types distribution
      const relationTypes = [
        { name: 'appartientA', value: Math.floor(relationsTotal * 0.3), color: COLORS[0] },
        { name: 'utilisePar', value: Math.floor(relationsTotal * 0.25), color: COLORS[1] },
        { name: 'localiseA', value: Math.floor(relationsTotal * 0.2), color: COLORS[2] },
        { name: 'constitueDe', value: Math.floor(relationsTotal * 0.15), color: COLORS[3] },
        { name: 'Autres', value: Math.floor(relationsTotal * 0.1), color: COLORS[4] },
      ];
      setRelationshipTypes(relationTypes);

      // Generate mock top connected entities
      const topEntities = [
        { name: 'Djembe', type: 'Instrument', connections: 12, description: 'Tambour traditionnel africain' },
        { name: 'Kora', type: 'Instrument', connections: 10, description: 'Harpe-luth à 21 cordes' },
        { name: 'Balafon', type: 'Instrument', connections: 9, description: 'Xylophone traditionnel' },
        { name: 'Afrique de l\'Ouest', type: 'Localité', connections: 15, description: 'Région géographique' },
        { name: 'Mandingues', type: 'Groupe Ethnique', connections: 8, description: 'Groupe ethnique traditionnel' },
      ];
      setTopConnectedEntities(topEntities);

      // Generate mock geographic distribution
      const geoDist = [
        { region: 'Afrique de l\'Ouest', instruments: Math.floor(instrumentsTotal * 0.4), lat: 12, lng: -8 },
        { region: 'Afrique Centrale', instruments: Math.floor(instrumentsTotal * 0.25), lat: 0, lng: 15 },
        { region: 'Afrique de l\'Est', instruments: Math.floor(instrumentsTotal * 0.2), lat: 0, lng: 35 },
        { region: 'Afrique du Nord', instruments: Math.floor(instrumentsTotal * 0.1), lat: 25, lng: 10 },
        { region: 'Afrique Australe', instruments: Math.floor(instrumentsTotal * 0.05), lat: -25, lng: 25 },
      ];
      setGeographicDistribution(geoDist);

      // Generate mock growth trends
      const trends = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(2024, i).toLocaleDateString('fr-FR', { month: 'short' }),
        instruments: Math.floor(instrumentsTotal * (0.6 + i * 0.033)),
        relations: Math.floor(relationsTotal * (0.5 + i * 0.042)),
      }));
      setGrowthTrends(trends);

    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Erreur lors du chargement des données analytiques');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Custom tooltip for charts
   */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <LoadingSpinner message="Chargement des analytiques..." />
      </Box>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <ErrorMessage message={error} showRetry onRetry={loadAnalyticsData} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Tableau de Bord Analytique
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Analyses avancées et métriques de votre ontologie musicale
          </Typography>
        </Box>
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Période"
          >
            <MenuItem value="7d">7 jours</MenuItem>
            <MenuItem value="30d">30 jours</MenuItem>
            <MenuItem value="90d">90 jours</MenuItem>
            <MenuItem value="1y">1 an</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Instruments"
            value={stats.totalInstruments}
            icon={<MusicNote />}
            color="primary"
            trend={{ value: 12, label: 'ce mois' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Relations"
            value={stats.totalRelations}
            icon={<Timeline />}
            color="secondary"
            trend={{ value: 8, label: 'ce mois' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Groupes"
            value={stats.totalGroupes}
            icon={<Language />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Localités"
            value={stats.totalLocalites}
            icon={<LocationOn />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Connexions Moy."
            value={stats.avgConnectionsPerEntity}
            subtitle="par entité"
            icon={<Assessment />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Densité"
            value="68%"
            subtitle="du graphe"
            icon={<Analytics />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Main Analytics Tabs */}
      <Paper>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable">
          <Tab label="Vue d'Ensemble" icon={<Analytics />} />
          <Tab label="Distribution" icon={<PieChartIcon />} />
          <Tab label="Tendances" icon={<TrendingUp />} />
          <Tab label="Géographie" icon={<LocationOn />} />
          <Tab label="Réseau" icon={<Timeline />} />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader title="Évolution Temporelle" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={growthTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="instruments" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Instruments"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="relations" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="Relations"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="Entités les Plus Connectées" />
                <CardContent>
                  <List>
                    {topConnectedEntities.slice(0, 5).map((entity, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Chip 
                            label={entity.connections} 
                            size="small" 
                            color="primary"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={entity.name}
                          secondary={`${entity.type} - ${entity.description}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Distribution Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Distribution des Entités" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={entityDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {entityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Répartition par Famille" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={familyDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardHeader title="Types de Relations" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={relationshipTypes} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Trends Tab */}
        <TabPanel value={activeTab} index={2}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Analyse des Tendances
            </Typography>
            <Typography variant="body2">
              Cette section analyse l'évolution temporelle de votre ontologie et identifie les patterns de croissance.
            </Typography>
          </Alert>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Croissance Mensuelle" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={growthTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="instruments" 
                        stroke="#1976d2" 
                        strokeWidth={3}
                        name="Nouveaux Instruments"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="relations" 
                        stroke="#dc004e" 
                        strokeWidth={3}
                        name="Nouvelles Relations"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Geography Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader title="Distribution Géographique" />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Région</TableCell>
                          <TableCell align="right">Instruments</TableCell>
                          <TableCell align="right">Pourcentage</TableCell>
                          <TableCell align="right">Coordonnées</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {geographicDistribution.map((region) => (
                          <TableRow key={region.region}>
                            <TableCell component="th" scope="row">
                              {region.region}
                            </TableCell>
                            <TableCell align="right">{region.instruments}</TableCell>
                            <TableCell align="right">
                              {((region.instruments / stats.totalInstruments) * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell align="right">
                              {region.lat}°, {region.lng}°
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="Répartition Régionale" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={geographicDistribution.map(g => ({ name: g.region, value: g.instruments }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {geographicDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Network Tab */}
        <TabPanel value={activeTab} index={4}>
          <Alert severity="info">
            <Typography variant="h6" gutterBottom>
              Analyse du Réseau Sémantique
            </Typography>
            <Typography variant="body2">
              Cette section fournira des métriques avancées sur la structure du graphe :
            </Typography>
            <ul>
              <li>Coefficient de clustering</li>
              <li>Diamètre du réseau</li>
              <li>Centralité d'intermédiarité</li>
              <li>Détection de communautés</li>
              <li>Analyse des chemins les plus courts</li>
            </ul>
          </Alert>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AnalyticsDashboard;