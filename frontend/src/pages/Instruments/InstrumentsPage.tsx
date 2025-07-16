/**
 * Instruments Page Component
 * 
 * This page provides a comprehensive interface for managing musical instruments
 * including listing, creating, editing, and viewing instrument details.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
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
  Alert,
  Checkbox,
  Collapse,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  MusicNote,
  Search,
  FilterList,
  Timeline,
} from '@mui/icons-material';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ErrorMessage from '../../components/Common/ErrorMessage';
import SearchBar from '../../components/Common/SearchBar';
import { 
  instrumentsApi, 
  famillesApi, 
  Instrument, 
  Famille,
  ApiListResponse 
} from '../../services/api';

// Form data interface for create/edit
interface InstrumentFormData {
  nomInstrument: string;
  description: string;
  anneeCreation: number | '';
}

// Form validation errors
interface FormErrors {
  nomInstrument?: string;
  description?: string;
  anneeCreation?: string;
}

/**
 * Instruments management page
 */
const InstrumentsPage: React.FC = () => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');
  const [selectedInstruments, setSelectedInstruments] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [formData, setFormData] = useState<InstrumentFormData>({
    nomInstrument: '',
    description: '',
    anneeCreation: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [relations, setRelations] = useState<any[]>([]);
  const [showRelations, setShowRelations] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Load instruments data
   */
  useEffect(() => {
    loadInstruments();
    loadFamilles();
  }, [page, rowsPerPage, searchQuery, selectedFamily]);

  /**
   * Load instruments with filters and pagination
   */
  const loadInstruments = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        filters: {
          ...(searchQuery && { nomInstrument: searchQuery }),
          ...(selectedFamily && { famille: selectedFamily }),
          ...(yearFrom && { anneeMin: parseInt(yearFrom) }),
          ...(yearTo && { anneeMax: parseInt(yearTo) }),
        },
      };

      const response = await instrumentsApi.getAll(params);
      
      if (response.success) {
        // Handle different response structures safely
        const data = response.data?.data || response.data || [];
        const instruments = Array.isArray(data) ? data : [];
        setInstruments(instruments);
        setTotalCount(
          response.pagination?.total || 
          response.data?.total || 
          instruments.length || 
          0
        );
      } else {
        setError(response.error || 'Erreur lors du chargement des instruments');
      }
    } catch (err) {
      console.error('Error loading instruments:', err);
      setError('Erreur lors du chargement des instruments');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load families for filtering
   */
  const loadFamilles = async () => {
    try {
      const response = await famillesApi.getAll();
      if (response.success) {
        // Handle different response structures safely
        const data = response.data?.data || response.data || [];
        const familles = Array.isArray(data) ? data : [];
        setFamilles(familles);
      }
    } catch (err) {
      console.error('Error loading families:', err);
    }
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
   * Handle family filter change
   */
  const handleFamilyFilterChange = (family: string) => {
    setSelectedFamily(family);
    setPage(0);
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedFamily('');
    setYearFrom('');
    setYearTo('');
    setPage(0);
  };

  /**
   * Apply advanced filters
   */
  const handleApplyFilters = () => {
    setPage(0);
    loadInstruments();
  };

  /**
   * Handle instrument selection
   */
  const handleSelectInstrument = (instrumentId: number) => {
    setSelectedInstruments(prev => 
      prev.includes(instrumentId)
        ? prev.filter(id => id !== instrumentId)
        : [...prev, instrumentId]
    );
  };

  /**
   * Handle select all instruments
   */
  const handleSelectAll = () => {
    if (selectedInstruments.length === instruments.length) {
      setSelectedInstruments([]);
    } else {
      setSelectedInstruments(instruments.map(i => i.id));
    }
  };

  /**
   * Handle bulk delete
   */
  const handleBulkDelete = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedInstruments.length} instruments ?`)) {
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const id of selectedInstruments) {
        try {
          await instrumentsApi.delete(id);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      setSelectedInstruments([]);
      loadInstruments();
      
      if (errorCount === 0) {
        setSuccessMessage(`${successCount} instruments supprimés avec succès`);
      } else {
        setError(`${successCount} instruments supprimés, ${errorCount} erreurs`);
      }
      
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    } catch (err) {
      setError('Erreur lors de la suppression en lot');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load instrument relations
   */
  const loadInstrumentRelations = async (instrumentId: number) => {
    try {
      const response = await instrumentsApi.getById(instrumentId);
      if (response.success) {
        // TODO: Implement relations API call
        // const relationsResponse = await instrumentsApi.getRelations(instrumentId);
        setRelations([]);
      }
    } catch (err) {
      console.error('Error loading relations:', err);
    }
  };

  /**
   * Open create dialog
   */
  const handleCreate = () => {
    setDialogMode('create');
    setFormData({
      nomInstrument: '',
      description: '',
      anneeCreation: '',
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  /**
   * Open edit dialog
   */
  const handleEdit = (instrument: Instrument) => {
    setDialogMode('edit');
    setSelectedInstrument(instrument);
    setFormData({
      nomInstrument: instrument.nomInstrument,
      description: instrument.description || '',
      anneeCreation: instrument.anneeCreation || '',
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  /**
   * Open view dialog
   */
  const handleView = (instrument: Instrument) => {
    setDialogMode('view');
    setSelectedInstrument(instrument);
    setFormData({
      nomInstrument: instrument.nomInstrument,
      description: instrument.description || '',
      anneeCreation: instrument.anneeCreation || '',
    });
    setFormErrors({});
    loadInstrumentRelations(instrument.id);
    setOpenDialog(true);
  };

  /**
   * Handle view relations
   */
  const handleViewRelations = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    loadInstrumentRelations(instrument.id);
    setShowRelations(true);
  };

  /**
   * Handle form input changes
   */
  const handleFormChange = (field: keyof InstrumentFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    // Validate instrument name
    if (!formData.nomInstrument.trim()) {
      errors.nomInstrument = 'Le nom de l\'instrument est requis';
    } else if (formData.nomInstrument.trim().length < 2) {
      errors.nomInstrument = 'Le nom doit contenir au moins 2 caractères';
    } else if (formData.nomInstrument.trim().length > 100) {
      errors.nomInstrument = 'Le nom ne peut pas dépasser 100 caractères';
    }
    
    // Validate description
    if (formData.description && formData.description.length > 500) {
      errors.description = 'La description ne peut pas dépasser 500 caractères';
    }
    
    // Validate year
    if (formData.anneeCreation !== '') {
      const year = Number(formData.anneeCreation);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1 || year > currentYear) {
        errors.anneeCreation = `L'année doit être entre 1 et ${currentYear}`;
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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
      const submitData = {
        ...formData,
        anneeCreation: formData.anneeCreation === '' ? undefined : Number(formData.anneeCreation),
      };

      if (dialogMode === 'create') {
        const response = await instrumentsApi.create(submitData);
        if (response.success) {
          setOpenDialog(false);
          loadInstruments();
          setFormData({ nomInstrument: '', description: '', anneeCreation: '' });
          setFormErrors({});
          setSuccessMessage(`Instrument "${response.data.nomInstrument}" créé avec succès`);
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          setFormErrors({ nomInstrument: response.error || 'Erreur lors de la création' });
        }
      } else if (dialogMode === 'edit' && selectedInstrument) {
        const response = await instrumentsApi.update(selectedInstrument.id, submitData);
        if (response.success) {
          setOpenDialog(false);
          loadInstruments();
          setFormData({ nomInstrument: '', description: '', anneeCreation: '' });
          setFormErrors({});
          setSuccessMessage(`Instrument "${response.data.nomInstrument}" modifié avec succès`);
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          setFormErrors({ nomInstrument: response.error || 'Erreur lors de la modification' });
        }
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setFormErrors({ nomInstrument: 'Erreur lors de la soumission du formulaire' });
    } finally {
      setFormLoading(false);
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async (instrument: Instrument) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${instrument.nomInstrument}" ?`)) {
      return;
    }

    try {
      const response = await instrumentsApi.delete(instrument.id);
      if (response.success) {
        loadInstruments();
        setSuccessMessage(`Instrument "${instrument.nomInstrument}" supprimé avec succès`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(response.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Erreur lors de la suppression');
    }
  };

  /**
   * Render loading state
   */
  if (loading && instruments.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <LoadingSpinner message="Chargement des instruments..." />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Instruments de Musique
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gérez les instruments de musique de votre ontologie
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreate}
            size="large"
          >
            Ajouter un Instrument
          </Button>
        </Box>
        
        {/* Quick Stats */}
        <Card sx={{ background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)', color: 'white' }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item>
                <MusicNote sx={{ fontSize: 40, opacity: 0.8 }} />
              </Grid>
              <Grid item xs>
                <Typography variant="h6">
                  {totalCount} instruments au total
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {familles.length > 0 ? `Répartis dans ${familles.length} familles` : 'Chargement des familles...'}
                </Typography>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  sx={{ color: 'white', borderColor: 'white' }}
                  onClick={() => handleFamilyFilterChange('')}
                >
                  Voir tout
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

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
          <ErrorMessage
            message={error}
            showRetry
            onRetry={loadInstruments}
          />
        </Box>
      )}

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <SearchBar
              placeholder="Rechercher par nom d'instrument..."
              onSearch={handleSearch}
              fullWidth
              enableAutocomplete={false}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Famille</InputLabel>
              <Select
                value={selectedFamily}
                onChange={(e) => handleFamilyFilterChange(e.target.value)}
                label="Famille"
              >
                <MenuItem value="">Toutes les familles</MenuItem>
                {familles && familles.length > 0 ? familles.map((famille) => (
                  <MenuItem key={famille.id} value={famille.nomFamille}>
                    {famille.nomFamille}
                  </MenuItem>
                )) : null}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <Button
                variant={showAdvancedFilters ? 'contained' : 'outlined'}
                size="small"
                startIcon={<FilterList />}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                Filtres
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearFilters}
                disabled={!searchQuery && !selectedFamily && !yearFrom && !yearTo}
              >
                Effacer
              </Button>
            </Box>
            <Box sx={{ textAlign: 'right', mt: 1 }}>
              <Typography variant="h6" color="primary">
                {totalCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                résultat{totalCount > 1 ? 's' : ''}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <Box sx={{ mt: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Filtres avancés
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Année minimum"
                  type="number"
                  size="small"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  inputProps={{ min: 1, max: new Date().getFullYear() }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Année maximum"
                  type="number"
                  size="small"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  inputProps={{ min: 1, max: new Date().getFullYear() }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  onClick={handleApplyFilters}
                  fullWidth
                >
                  Appliquer les filtres
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Bulk Actions Bar */}
      <Collapse in={selectedInstruments.length > 0}>
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">
              {selectedInstruments.length} instrument{selectedInstruments.length > 1 ? 's' : ''} sélectionné{selectedInstruments.length > 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedInstruments([])}
                sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
              >
                Désélectionner
              </Button>
              <Button
                variant="contained"
                size="small"
                color="error"
                startIcon={<Delete />}
                onClick={handleBulkDelete}
              >
                Supprimer
              </Button>
            </Box>
          </Box>
        </Paper>
      </Collapse>

      {/* Instruments Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 'bold', width: '48px' }}>
                <Checkbox
                  checked={instruments.length > 0 && selectedInstruments.length === instruments.length}
                  indeterminate={selectedInstruments.length > 0 && selectedInstruments.length < instruments.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Nom</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Année de Création</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {instruments && instruments.length > 0 ? instruments.map((instrument) => (
              <TableRow key={instrument.id} hover selected={selectedInstruments.includes(instrument.id)}>
                <TableCell>
                  <Checkbox
                    checked={selectedInstruments.includes(instrument.id)}
                    onChange={() => handleSelectInstrument(instrument.id)}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MusicNote sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle2">
                      {instrument.nomInstrument}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {instrument.description || 'Aucune description'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {instrument.anneeCreation ? (
                    <Chip 
                      label={instrument.anneeCreation} 
                      size="small" 
                      variant="outlined" 
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Non spécifiée
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Voir les détails">
                    <IconButton 
                      onClick={() => handleView(instrument)}
                      size="small"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifier">
                    <IconButton 
                      onClick={() => handleEdit(instrument)}
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Voir les relations">
                    <IconButton 
                      onClick={() => handleViewRelations(instrument)}
                      size="small"
                      color="info"
                    >
                      <Timeline />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton 
                      onClick={() => handleDelete(instrument)}
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
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Aucun instrument trouvé
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

      {/* Relations Dialog */}
      <Dialog
        open={showRelations}
        onClose={() => setShowRelations(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Relations - {selectedInstrument?.nomInstrument}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Fonctionnalité de visualisation des relations en cours de développement.
            Les relations sémantiques de cet instrument seront affichées ici.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRelations(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '500px' }
        }}
      >
        <DialogTitle>
          {dialogMode === 'create' && 'Créer un Instrument'}
          {dialogMode === 'edit' && 'Modifier l\'Instrument'}
          {dialogMode === 'view' && 'Détails de l\'Instrument'}
        </DialogTitle>
        
        <DialogContent dividers>
          {dialogMode === 'view' && selectedInstrument ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedInstrument.nomInstrument}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedInstrument.description || 'Aucune description disponible'}
              </Typography>
              {selectedInstrument.anneeCreation && (
                <Typography variant="body2" color="text.secondary">
                  Année de création: {selectedInstrument.anneeCreation}
                </Typography>
              )}
            </Box>
          ) : (
            <Box component="form" sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nom de l'instrument"
                    value={formData.nomInstrument}
                    onChange={(e) => handleFormChange('nomInstrument', e.target.value)}
                    error={!!formErrors.nomInstrument}
                    helperText={formErrors.nomInstrument || 'Nom unique de l\'instrument'}
                    required
                    disabled={dialogMode === 'view'}
                    inputProps={{ maxLength: 100 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    error={!!formErrors.description}
                    helperText={formErrors.description || `${formData.description.length}/500 caractères`}
                    disabled={dialogMode === 'view'}
                    inputProps={{ maxLength: 500 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Année de création"
                    type="number"
                    value={formData.anneeCreation}
                    onChange={(e) => handleFormChange('anneeCreation', e.target.value)}
                    error={!!formErrors.anneeCreation}
                    helperText={formErrors.anneeCreation || 'Année de création ou de première utilisation (optionnel)'}
                    disabled={dialogMode === 'view'}
                    inputProps={{ min: 1, max: new Date().getFullYear() }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
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
            >
              {formLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstrumentsPage;