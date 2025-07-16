/**
 * Relationship Manager Component
 * 
 * This component provides comprehensive relationship management for Neo4j graph database:
 * - View existing relationships
 * - Create new relationships between entities
 * - Delete relationships
 * - Visual graph representation
 * - Relationship validation based on ontology rules
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Alert,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from '@mui/material';
import {
  Timeline,
  Add,
  Delete,
  Visibility,
  AccountTree,
  TrendingUp,
  Language,
  MusicNote,
  Category,
  LocationOn,
  Build,
  Palette,
  Person,
  AccountBalance,
  Link,
  LinkOff,
} from '@mui/icons-material';
import LoadingSpinner from '../Common/LoadingSpinner';
import ErrorMessage from '../Common/ErrorMessage';
import { 
  relationsApi, 
  instrumentsApi,
  famillesApi,
  groupesEthniquesApi,
  localitesApi,
  materiauxApi,
  timbresApi,
  techniquesApi,
  artisansApi,
  patrimoinesApi,
  Relation,
  RelationResult 
} from '../../services/api';

// Relation type definitions with their constraints - Updated for new cardinality
const RELATION_TYPES = {
  'appartientA': {
    label: 'Appartient à',
    description: 'Plusieurs instruments appartiennent à une famille (N:1)',
    from: ['Instrument'],
    to: ['Famille'],
    cardinality: 'N:1',
    icon: <Category />,
    color: 'primary',
  },
  'utilisePar': {
    label: 'Utilisé par',
    description: 'Un instrument peut être utilisé par plusieurs groupes ethniques (N:N)',
    from: ['Instrument'],
    to: ['GroupeEthnique'],
    cardinality: 'N:N',
    icon: <Language />,
    color: 'secondary',
  },
  'produitRythme': {
    label: 'Produit rythme',
    description: 'Un instrument peut produire plusieurs rythmes (N:N)',
    from: ['Instrument'],
    to: ['Rythme'],
    cardinality: 'N:N',
    icon: <TrendingUp />,
    color: 'success',
  },
  'localiseA': {
    label: 'Localisé à',
    description: 'Une entité peut être présente dans plusieurs localités (N:N)',
    from: ['Instrument', 'GroupeEthnique', 'Rythme'],
    to: ['Localite'],
    cardinality: 'N:N',
    icon: <LocationOn />,
    color: 'info',
  },
  'constitueDe': {
    label: 'Constitué de',
    description: 'Un instrument peut être constitué de plusieurs matériaux (1:N)',
    from: ['Instrument'],
    to: ['Materiau'],
    cardinality: '1:N',
    icon: <Build />,
    color: 'warning',
  },
  'joueAvec': {
    label: 'Joué avec',
    description: 'Un instrument peut être joué avec plusieurs techniques (1:N)',
    from: ['Instrument'],
    to: ['TechniqueDeJeu'],
    cardinality: '1:N',
    icon: <Palette />,
    color: 'error',
  },
  'fabrique': {
    label: 'Fabriqué par',
    description: 'Un artisan peut fabriquer plusieurs instruments (N:N)',
    from: ['Artisan'],
    to: ['Instrument'],
    cardinality: 'N:N',
    icon: <Person />,
    color: 'primary',
  },
  'caracterise': {
    label: 'Caractérisé par',
    description: 'Un instrument peut avoir plusieurs timbres (N:N)',
    from: ['Timbre'],
    to: ['Instrument'],
    cardinality: 'N:N',
    icon: <MusicNote />,
    color: 'secondary',
  },
  'appliqueA': {
    label: 'S\'applique à',
    description: 'Une technique peut s\'appliquer à plusieurs instruments (N:N)',
    from: ['TechniqueDeJeu'],
    to: ['Instrument'],
    cardinality: 'N:N',
    icon: <Palette />,
    color: 'info',
  },
  'englobe': {
    label: 'Englobe',
    description: 'Un patrimoine englobe plusieurs éléments culturels (1:N)',
    from: ['PatrimoineCulturel'],
    to: ['Instrument', 'GroupeEthnique', 'Rythme'],
    cardinality: '1:N',
    icon: <AccountBalance />,
    color: 'success',
  },
};

// Entity type services mapping
const ENTITY_SERVICES = {
  'Instrument': instrumentsApi,
  'Famille': famillesApi,
  'GroupeEthnique': groupesEthniquesApi,
  'Localite': localitesApi,
  'Materiau': materiauxApi,
  'Timbre': timbresApi,
  'TechniqueDeJeu': techniquesApi,
  'Artisan': artisansApi,
  'PatrimoineCulturel': patrimoinesApi,
};

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

interface RelationshipManagerProps {
  /** Current entity to show relationships for */
  currentEntity?: { id: number; type: string; name: string };
  /** Callback when entity is selected for relationship viewing */
  onEntitySelect?: (entity: any) => void;
}

/**
 * Comprehensive relationship management component
 */
const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  currentEntity,
  onEntitySelect,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Relations state
  const [relations, setRelations] = useState<any[]>([]);
  const [relationStats, setRelationStats] = useState<any>(null);
  
  // Create relationship state
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    sourceType: '',
    sourceId: '',
    targetType: '',
    targetId: '',
    relationType: '',
  });
  const [sourceEntities, setSourceEntities] = useState<any[]>([]);
  const [targetEntities, setTargetEntities] = useState<any[]>([]);
  const [availableRelationTypes, setAvailableRelationTypes] = useState<string[]>([]);

  /**
   * Load initial data
   */
  useEffect(() => {
    loadRelations();
    loadRelationStatistics();
  }, []);

  /**
   * Load entity relations when currentEntity changes
   */
  useEffect(() => {
    if (currentEntity) {
      loadEntityRelations(currentEntity.id);
    }
  }, [currentEntity]);

  /**
   * Update available relation types when source/target types change
   */
  useEffect(() => {
    updateAvailableRelationTypes();
  }, [createForm.sourceType, createForm.targetType]);

  /**
   * Load all relations
   */
  const loadRelations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await relationsApi.getAll();
      if (response.success) {
        setRelations(response.data);
      } else {
        setError(response.error || 'Erreur lors du chargement des relations');
      }
    } catch (err) {
      console.error('Error loading relations:', err);
      setError('Erreur lors du chargement des relations');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load relation statistics
   */
  const loadRelationStatistics = async () => {
    try {
      const response = await relationsApi.getStatistics();
      if (response.success) {
        setRelationStats(response.data);
      }
    } catch (err) {
      console.error('Error loading relation statistics:', err);
    }
  };

  /**
   * Load relations for specific entity
   */
  const loadEntityRelations = async (entityId: number) => {
    setLoading(true);
    try {
      const response = await relationsApi.getForEntity(entityId.toString());
      if (response.success) {
        setRelations(response.data);
      }
    } catch (err) {
      console.error('Error loading entity relations:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load entities for source/target selection
   */
  const loadEntitiesForType = async (entityType: string, field: 'source' | 'target') => {
    if (!entityType || !ENTITY_SERVICES[entityType as keyof typeof ENTITY_SERVICES]) return;

    try {
      const service = ENTITY_SERVICES[entityType as keyof typeof ENTITY_SERVICES];
      const response = await service.getAll({ limit: 200 });
      
      if (response.success) {
        // Handle different response structures
        const data = response.data?.data || response.data || [];
        const entities = Array.isArray(data) ? data.map((entity: any) => ({
          ...entity,
          type: entityType,
          displayName: entity.nomInstrument || entity.nomFamille || entity.nomGroupe || 
                      entity.nomLocalite || entity.nomMateriau || entity.descriptionTimbre ||
                      entity.nomTechnique || entity.nomArtisan || entity.nomPatrimoine ||
                      entity.nom || `${entityType} #${entity.id}`,
        })) : [];
        
        if (field === 'source') {
          setSourceEntities(entities);
        } else {
          setTargetEntities(entities);
        }
      }
    } catch (err) {
      console.error(`Error loading ${entityType} entities:`, err);
    }
  };

  /**
   * Update available relation types based on source and target types
   */
  const updateAvailableRelationTypes = () => {
    const { sourceType, targetType } = createForm;
    
    if (!sourceType || !targetType) {
      setAvailableRelationTypes([]);
      return;
    }

    const available = Object.entries(RELATION_TYPES).filter(([type, config]) => {
      return config.from.includes(sourceType) && config.to.includes(targetType);
    }).map(([type]) => type);

    setAvailableRelationTypes(available);
    
    // Reset relation type if it's no longer valid
    if (createForm.relationType && !available.includes(createForm.relationType)) {
      setCreateForm(prev => ({ ...prev, relationType: '' }));
    }
  };

  /**
   * Handle create relationship form changes
   */
  const handleCreateFormChange = (field: string, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value,
    }));

    // Load entities when type changes
    if (field === 'sourceType') {
      loadEntitiesForType(value, 'source');
    } else if (field === 'targetType') {
      loadEntitiesForType(value, 'target');
    }
  };

  /**
   * Handle create relationship
   */
  const handleCreateRelation = async () => {
    const { sourceId, targetId, relationType } = createForm;
    
    if (!sourceId || !targetId || !relationType) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await relationsApi.create({
        sourceId,
        targetId,
        relationType: relationType as any,
      });

      if (response.success) {
        setOpenCreateDialog(false);
        setCreateForm({
          sourceType: '',
          sourceId: '',
          targetType: '',
          targetId: '',
          relationType: '',
        });
        setSourceEntities([]);
        setTargetEntities([]);
        setAvailableRelationTypes([]);
        loadRelations();
        loadRelationStatistics();
        setError(null);
        setSuccessMessage('Relation créée avec succès !');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(response.error || 'Erreur lors de la création de la relation');
      }
    } catch (err) {
      console.error('Error creating relation:', err);
      setError('Erreur lors de la création de la relation');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle delete relationship
   */
  const handleDeleteRelation = async (relation: any) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette relation ?')) {
      return;
    }

    try {
      const response = await relationsApi.delete(
        relation.sourceId,
        relation.targetId,
        relation.relationType
      );

      if (response.success) {
        loadRelations();
        loadRelationStatistics();
        setSuccessMessage('Relation supprimée avec succès !');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(response.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Error deleting relation:', err);
      setError('Erreur lors de la suppression');
    }
  };

  /**
   * Get relation type config
   */
  const getRelationTypeConfig = (type: string) => {
    return RELATION_TYPES[type as keyof typeof RELATION_TYPES] || {
      label: type,
      description: 'Relation personnalisée',
      icon: <Link />,
      color: 'default',
    };
  };

  /**
   * Render relation card
   */
  const renderRelationCard = (relation: any, index: number) => {
    const config = getRelationTypeConfig(relation.relationType);
    
    return (
      <Card key={`${relation.sourceId}-${relation.targetId}-${relation.relationType}`} sx={{ mb: 2, boxShadow: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ mr: 1, color: `${config.color}.main` }}>
              {config.icon}
            </Box>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {config.label}
            </Typography>
            <Chip 
              label={relation.relationType} 
              size="small" 
              color={config.color as any}
              variant="outlined"
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            {config.description}
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={4}>
              <Paper sx={{ p: 2, bgcolor: 'primary.50', border: 1, borderColor: 'primary.200' }}>
                <Typography variant="subtitle2" color="primary.main" gutterBottom>
                  📍 Source
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {relation.source?.displayName || `Entité #${relation.sourceId}`}
                </Typography>
                <Chip 
                  label={relation.source?.type || 'Type inconnu'} 
                  size="small" 
                  variant="filled"
                  color="primary"
                  sx={{ mt: 1 }}
                />
              </Paper>
            </Grid>
            
            <Grid item xs={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ 
                bgcolor: 'grey.100', 
                border: 2, 
                borderColor: 'grey.300',
                borderRadius: '50%',
                p: 1.5,
                mb: 1
              }}>
                <Link color="action" fontSize="large" />
              </Box>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Relation: {config.label}
              </Typography>
            </Grid>
            
            <Grid item xs={4}>
              <Paper sx={{ p: 2, bgcolor: 'secondary.50', border: 1, borderColor: 'secondary.200' }}>
                <Typography variant="subtitle2" color="secondary.main" gutterBottom>
                  🎯 Cible
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {relation.target?.displayName || `Entité #${relation.targetId}`}
                </Typography>
                <Chip 
                  label={relation.target?.type || 'Type inconnu'} 
                  size="small" 
                  variant="filled"
                  color="secondary"
                  sx={{ mt: 1 }}
                />
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
        
        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              ID: {relation.sourceId} → {relation.targetId}
            </Typography>
          </Box>
          <Box>
            <Button
              size="small"
              startIcon={<Visibility />}
              onClick={() => {
                if (onEntitySelect) {
                  onEntitySelect(relation.source);
                }
              }}
              sx={{ mr: 1 }}
            >
              Voir Source
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<Delete />}
              onClick={() => handleDeleteRelation(relation)}
            >
              Supprimer
            </Button>
          </Box>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Gestionnaire de Relations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gérez les relations sémantiques de votre graphe Neo4j
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenCreateDialog(true)}
          size="large"
        >
          Créer une Relation
        </Button>
      </Box>

      {/* Current Entity Info */}
      {currentEntity && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Relations pour: <strong>{currentEntity.name}</strong> ({currentEntity.type})
          </Typography>
        </Alert>
      )}

      {/* Statistics Cards */}
      {relationStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary">
                  {relationStats.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Relations totales
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="secondary">
                  {Object.keys(RELATION_TYPES).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Types de relations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="success.main">
                  {relationStats.mostConnected?.connections || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Entité la plus connectée
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="warning.main">
                  {relationStats.averageConnections || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connexions moyennes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Success Alert */}
      {successMessage && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Main Content Tabs */}
      <Paper>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Relations Actives" icon={<Timeline />} />
          <Tab label="Types de Relations" icon={<Category />} />
          <Tab label="Analyse du Graphe" icon={<AccountTree />} />
        </Tabs>

        {/* Relations List Tab */}
        <TabPanel value={activeTab} index={0}>
          {loading ? (
            <LoadingSpinner message="Chargement des relations..." />
          ) : relations.length > 0 ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  {relations.length} relation{relations.length > 1 ? 's' : ''} trouvée{relations.length > 1 ? 's' : ''}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => loadRelations()}
                  startIcon={<Timeline />}
                >
                  Actualiser
                </Button>
              </Box>
              
              {/* Relations Cards */}
              {relations.map((relation, index) => renderRelationCard(relation, index))}
              
              {/* Quick Table View */}
              <Paper sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  Vue Tableau
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Source</TableCell>
                        <TableCell>Relation</TableCell>
                        <TableCell>Cible</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relations.map((relation, index) => (
                        <TableRow key={`table-${relation.sourceId}-${relation.targetId}-${relation.relationType}`} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {relation.source?.displayName || `#${relation.sourceId}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {relation.source?.type}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={getRelationTypeConfig(relation.relationType).label}
                              size="small"
                              color={getRelationTypeConfig(relation.relationType).color as any}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {relation.target?.displayName || `#${relation.targetId}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {relation.target?.type}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRelation(relation)}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          ) : (
            <Alert severity="info">
              <Typography variant="h6" gutterBottom>
                Aucune relation trouvée
              </Typography>
              <Typography variant="body2">
                Créez votre première relation pour commencer à construire le graphe de connaissances.
              </Typography>
            </Alert>
          )}
        </TabPanel>

        {/* Relation Types Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {Object.entries(RELATION_TYPES).map(([type, config]) => (
              <Grid item xs={12} md={6} key={type}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {config.icon}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {config.label}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {config.description}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        De: {config.from.join(', ')}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        Vers: {config.to.join(', ')}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Graph Analysis Tab */}
        <TabPanel value={activeTab} index={2}>
          <Alert severity="info">
            L'analyse du graphe et la visualisation sont en cours de développement.
            Cette section affichera bientôt des graphiques interactifs des relations.
          </Alert>
        </TabPanel>
      </Paper>

      {/* Create Relationship Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Créer une Nouvelle Relation</DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Source Entity Selection */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Entité Source
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Type d'entité source</InputLabel>
                <Select
                  value={createForm.sourceType}
                  onChange={(e) => handleCreateFormChange('sourceType', e.target.value)}
                  label="Type d'entité source"
                >
                  {Object.keys(ENTITY_SERVICES).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {createForm.sourceType && (
                <Autocomplete
                  options={sourceEntities}
                  getOptionLabel={(option) => option.displayName}
                  onChange={(e, value) => handleCreateFormChange('sourceId', value?.id || '')}
                  renderInput={(params) => (
                    <TextField {...params} label="Sélectionner l'entité source" />
                  )}
                />
              )}
            </Grid>

            {/* Target Entity Selection */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Entité Cible
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Type d'entité cible</InputLabel>
                <Select
                  value={createForm.targetType}
                  onChange={(e) => handleCreateFormChange('targetType', e.target.value)}
                  label="Type d'entité cible"
                >
                  {Object.keys(ENTITY_SERVICES).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {createForm.targetType && (
                <Autocomplete
                  options={targetEntities}
                  getOptionLabel={(option) => option.displayName}
                  onChange={(e, value) => handleCreateFormChange('targetId', value?.id || '')}
                  renderInput={(params) => (
                    <TextField {...params} label="Sélectionner l'entité cible" />
                  )}
                />
              )}
            </Grid>

            {/* Relation Type Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Type de relation</InputLabel>
                <Select
                  value={createForm.relationType}
                  onChange={(e) => handleCreateFormChange('relationType', e.target.value)}
                  label="Type de relation"
                  disabled={availableRelationTypes.length === 0}
                >
                  {availableRelationTypes.map((type) => {
                    const config = getRelationTypeConfig(type);
                    return (
                      <MenuItem key={type} value={type}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {config.icon}
                          <Box sx={{ ml: 1 }}>
                            <Typography variant="body2">
                              {config.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {config.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              
              {availableRelationTypes.length === 0 && createForm.sourceType && createForm.targetType && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Aucun type de relation disponible entre {createForm.sourceType} et {createForm.targetType}.
                  Vérifiez les contraintes de l'ontologie.
                </Alert>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleCreateRelation}
            variant="contained"
            disabled={!createForm.sourceId || !createForm.targetId || !createForm.relationType || loading}
          >
            {loading ? 'Création...' : 'Créer la Relation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RelationshipManager;