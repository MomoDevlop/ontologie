/**
 * Generic Entity CRUD Page Component
 * 
 * A reusable component that provides complete CRUD functionality for any entity type.
 * This factory component reduces code duplication and ensures consistency across all entity pages.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  CardActions,
  Fab,
  Zoom,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Timeline,
  Search,
  FilterList,
  Download,
  Upload,
} from '@mui/icons-material';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import SearchBar from './SearchBar';

// Generic interfaces
export interface EntityField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'date';
  required?: boolean;
  options?: Array<{ value: any; label: string }>;
  validation?: (value: any) => string | null;
}

export interface EntityConfig {
  name: string;
  pluralName: string;
  icon: React.ReactNode;
  color: string;
  fields: EntityField[];
  displayField: string;
  searchFields: string[];
}

export interface CrudService<T> {
  getAll: (params?: any) => Promise<{ success: boolean; data: { data: T[]; total: number }; pagination?: any; error?: string }>;
  getById: (id: number) => Promise<{ success: boolean; data: T; error?: string }>;
  create: (data: Partial<T>) => Promise<{ success: boolean; data: T; error?: string }>;
  update: (id: number, data: Partial<T>) => Promise<{ success: boolean; data: T; error?: string }>;
  delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  getStatistics?: () => Promise<{ success: boolean; data: any; error?: string }>;
  getRelations?: (id: number) => Promise<{ success: boolean; data: any[]; error?: string }>;
}

interface EntityCrudPageProps<T extends { id: number }> {
  config: EntityConfig;
  service: CrudService<T>;
  onViewRelations?: (entity: T) => void;
  children?: React.ReactNode;
}

/**
 * Generic Entity CRUD Page Component
 */
function EntityCrudPage<T extends { id: number }>({
  config,
  service,
  onViewRelations,
  children,
}: EntityCrudPageProps<T>) {
  const [entities, setEntities] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statistics, setStatistics] = useState<any>(null);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /**
   * Load entities data
   */
  useEffect(() => {
    loadEntities();
    loadStatistics();
  }, [page, rowsPerPage, searchQuery]);

  /**
   * Load entities with filters and pagination
   */
  const loadEntities = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        filters: searchQuery ? { [config.searchFields[0]]: searchQuery } : {},
      };

      const response = await service.getAll(params);
      
      if (response.success) {
        // Handle different response structures
        const data = response.data?.data || response.data || [];
        const entities = Array.isArray(data) ? data : [];
        setEntities(entities);
        setTotalCount(
          response.pagination?.total || 
          response.data?.total || 
          entities.length || 
          0
        );
      } else {
        setError(response.error || `Erreur lors du chargement des ${config?.pluralName?.toLowerCase() || 'entités'}`);
      }
    } catch (err) {
      console.error(`Error loading ${config.pluralName}:`, err);
      setError(`Erreur lors du chargement des ${config.pluralName.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load statistics if available
   */
  const loadStatistics = async () => {
    if (!service.getStatistics) return;

    try {
      const response = await service.getStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  /**
   * Initialize form data based on entity fields
   */
  const initializeFormData = (entity?: T) => {
    const data: Record<string, any> = {};
    (config.fields || []).forEach(field => {
      data[field.name] = entity ? (entity as any)[field.name] || '' : '';
    });
    return data;
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    (config.fields || []).forEach(field => {
      const value = formData[field.name];
      
      // Required field validation
      if (field.required && (!value || value.toString().trim() === '')) {
        errors[field.name] = `${field.label} est requis`;
      }
      
      // Custom validation
      if (field.validation && value) {
        const validationError = field.validation(value);
        if (validationError) {
          errors[field.name] = validationError;
        }
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle page change
   */
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  /**
   * Handle rows per page change
   */
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Handle search
   */
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(0);
  };

  /**
   * Open create dialog
   */
  const handleCreate = () => {
    setDialogMode('create');
    setFormData(initializeFormData());
    setFormErrors({});
    setOpenDialog(true);
  };

  /**
   * Open edit dialog
   */
  const handleEdit = (entity: T) => {
    setDialogMode('edit');
    setSelectedEntity(entity);
    setFormData(initializeFormData(entity));
    setFormErrors({});
    setOpenDialog(true);
  };

  /**
   * Open view dialog
   */
  const handleView = (entity: T) => {
    setDialogMode('view');
    setSelectedEntity(entity);
    setFormData(initializeFormData(entity));
    setOpenDialog(true);
  };

  /**
   * Handle form input changes
   */
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  /**
   * Handle form submission
   */
  const handleFormSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setFormLoading(true);

    try {
      // Clean form data (remove empty strings, convert numbers)
      const cleanData = { ...formData };
      (config.fields || []).forEach(field => {
        if (field.type === 'number' && cleanData[field.name] === '') {
          delete cleanData[field.name];
        }
      });

      if (dialogMode === 'create') {
        const response = await service.create(cleanData);
        if (response.success) {
          setOpenDialog(false);
          loadEntities();
        } else {
          setError(response.error || 'Erreur lors de la création');
        }
      } else if (dialogMode === 'edit' && selectedEntity) {
        const response = await service.update(selectedEntity.id, cleanData);
        if (response.success) {
          setOpenDialog(false);
          loadEntities();
        } else {
          setError(response.error || 'Erreur lors de la modification');
        }
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError('Erreur lors de la soumission du formulaire');
    } finally {
      setFormLoading(false);
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async (entity: T) => {
    const entityName = (entity as any)[config.displayField] || `${config.name} #${entity.id}`;
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${entityName}" ?`)) {
      return;
    }

    try {
      const response = await service.delete(entity.id);
      if (response.success) {
        loadEntities();
      } else {
        setError(response.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Erreur lors de la suppression');
    }
  };

  /**
   * Render field input based on type
   */
  const renderFieldInput = (field: EntityField) => {
    const value = formData[field.name] || '';
    const error = formErrors[field.name];
    const disabled = dialogMode === 'view';

    const commonProps = {
      fullWidth: true,
      label: field.label,
      value: value,
      onChange: (e: any) => handleFormChange(field.name, e.target.value),
      error: !!error,
      helperText: error,
      disabled,
      required: field.required,
    };

    switch (field.type) {
      case 'textarea':
        return (
          <TextField
            {...commonProps}
            multiline
            rows={3}
          />
        );
      
      case 'number':
        return (
          <TextField
            {...commonProps}
            type="number"
          />
        );
      
      case 'date':
        return (
          <TextField
            {...commonProps}
            type="date"
            InputLabelProps={{ shrink: true }}
          />
        );
      
      case 'select':
        return (
          <FormControl fullWidth error={!!error} disabled={disabled}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleFormChange(field.name, e.target.value)}
              label={field.label}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {error && <Typography variant="caption" color="error">{error}</Typography>}
          </FormControl>
        );
      
      default:
        return <TextField {...commonProps} />;
    }
  };

  /**
   * Render entity value for display
   */
  const renderEntityValue = (entity: T, field: EntityField) => {
    const value = (entity as any)[field.name];
    
    if (value === null || value === undefined || value === '') {
      return (
        <Typography variant="body2" color="text.secondary">
          Non spécifié
        </Typography>
      );
    }

    if (field.type === 'select' && field.options) {
      const option = field.options.find(opt => opt.value === value);
      return option ? option.label : value;
    }

    if (field.type === 'number') {
      return (
        <Chip 
          label={value} 
          size="small" 
          variant="outlined" 
        />
      );
    }

    return value;
  };

  /**
   * Render loading state
   */
  if (loading && entities.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <LoadingSpinner message={`Chargement des ${config?.pluralName?.toLowerCase() || 'données'}...`} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {config?.pluralName || 'Entités'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gérez les {config?.pluralName?.toLowerCase() || 'entités'} de votre ontologie
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreate}
          size="large"
          color={(config?.color as any) || 'primary'}
        >
          Ajouter {config?.name || 'Entité'}
        </Button>
      </Box>

      {/* Statistics Card */}
      {statistics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                {config.icon}
              </Grid>
              <Grid item xs>
                <Typography variant="h6">
                  {totalCount} {config.pluralName.toLowerCase()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total dans la base de données
                </Typography>
              </Grid>
              {statistics.lastCreated && (
                <Grid item>
                  <Typography variant="caption" color="text.secondary">
                    Dernière création: {new Date(statistics.lastCreated).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Box sx={{ mb: 3 }}>
          <ErrorMessage
            message={error}
            showRetry
            onRetry={loadEntities}
          />
        </Box>
      )}

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <SearchBar
              placeholder={`Rechercher des ${config.pluralName.toLowerCase()}...`}
              onSearch={handleSearch}
              fullWidth
              enableAutocomplete={false}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Tooltip title="Exporter les données">
                <IconButton>
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title="Importer les données">
                <IconButton>
                  <Upload />
                </IconButton>
              </Tooltip>
              <Tooltip title="Filtres avancés">
                <IconButton>
                  <FilterList />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Additional Children Components */}
      {children}

      {/* Entities Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {config.fields && config.fields.slice(0, 4).map((field) => (
                <TableCell key={field.name}>{field.label}</TableCell>
              ))}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entities && entities.length > 0 ? entities.map((entity) => (
              <TableRow key={entity.id} hover>
                {config.fields && config.fields.slice(0, 4).map((field) => (
                  <TableCell key={field.name}>
                    {field.name === config.displayField ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {config.icon}
                        <Typography variant="subtitle2" sx={{ ml: 1 }}>
                          {renderEntityValue(entity, field)}
                        </Typography>
                      </Box>
                    ) : (
                      renderEntityValue(entity, field)
                    )}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Tooltip title="Voir les détails">
                    <IconButton 
                      onClick={() => handleView(entity)}
                      size="small"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifier">
                    <IconButton 
                      onClick={() => handleEdit(entity)}
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  {onViewRelations && (
                    <Tooltip title="Voir les relations">
                      <IconButton 
                        onClick={() => onViewRelations(entity)}
                        size="small"
                        color="info"
                      >
                        <Timeline />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Supprimer">
                    <IconButton 
                      onClick={() => handleDelete(entity)}
                      size="small"
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={config.fields ? config.fields.slice(0, 4).length + 1 : 5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Aucune donnée disponible
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Lignes par page:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
          }
        />
      </TableContainer>

      {/* Floating Action Button for Mobile */}
      <Zoom in={true}>
        <Fab
          color={config.color as any}
          aria-label="add"
          onClick={handleCreate}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', sm: 'none' },
          }}
        >
          <Add />
        </Fab>
      </Zoom>

      {/* Create/Edit/View Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' && `Créer ${config.name}`}
          {dialogMode === 'edit' && `Modifier ${config.name}`}
          {dialogMode === 'view' && `Détails de ${config.name}`}
        </DialogTitle>
        
        <DialogContent dividers>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {config.fields && config.fields.map((field) => (
                <Grid item xs={12} sm={field.type === 'textarea' ? 12 : 6} key={field.name}>
                  {renderFieldInput(field)}
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {dialogMode === 'view' ? 'Fermer' : 'Annuler'}
          </Button>
          {dialogMode !== 'view' && (
            <Button
              onClick={handleFormSubmit}
              variant="contained"
              disabled={formLoading}
              color={config.color as any}
            >
              {formLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EntityCrudPage;