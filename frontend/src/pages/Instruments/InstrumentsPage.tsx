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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  MusicNote,
  Search,
  FilterList,
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
        },
      };

      const response = await instrumentsApi.getAll(params);
      
      if (response.success) {
        setInstruments(response.data.data);
        setTotalCount(response.pagination.total);
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
        setFamilles(response.data.data);
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
   * Open create dialog
   */
  const handleCreate = () => {
    setDialogMode('create');
    setFormData({
      nomInstrument: '',
      description: '',
      anneeCreation: '',
    });
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
    setOpenDialog(true);
  };

  /**
   * Open view dialog
   */
  const handleView = (instrument: Instrument) => {
    setDialogMode('view');
    setSelectedInstrument(instrument);
    setOpenDialog(true);
  };

  /**
   * Handle form input changes
   */
  const handleFormChange = (field: keyof InstrumentFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handle form submission
   */
  const handleFormSubmit = async () => {
    if (!formData.nomInstrument.trim()) {
      alert('Le nom de l\'instrument est requis');
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
        } else {
          alert(response.error || 'Erreur lors de la création');
        }
      } else if (dialogMode === 'edit' && selectedInstrument) {
        const response = await instrumentsApi.update(selectedInstrument.id, submitData);
        if (response.success) {
          setOpenDialog(false);
          loadInstruments();
        } else {
          alert(response.error || 'Erreur lors de la modification');
        }
      }
    } catch (err) {
      console.error('Form submission error:', err);
      alert('Erreur lors de la soumission du formulaire');
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
      } else {
        alert(response.error || 'Erreur lors de la suppression');
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                {familles.map((famille) => (
                  <MenuItem key={famille.id} value={famille.nomFamille}>
                    {famille.nomFamille}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              {totalCount} instrument{totalCount > 1 ? 's' : ''} trouvé{totalCount > 1 ? 's' : ''}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Instruments Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Année de Création</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {instruments.map((instrument) => (
              <TableRow key={instrument.id} hover>
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
            ))}
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

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
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
                    required
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
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Année de création"
                    type="number"
                    value={formData.anneeCreation}
                    onChange={(e) => handleFormChange('anneeCreation', e.target.value)}
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