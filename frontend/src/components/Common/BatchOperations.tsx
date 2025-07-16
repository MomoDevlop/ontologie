/**
 * Batch Operations Component
 * 
 * This component provides bulk operations for entity management:
 * - Bulk import from CSV/JSON files
 * - Bulk export to various formats
 * - Bulk delete operations
 * - Bulk update operations
 * - Progress tracking and error handling
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Divider,
  Card,
  CardContent,
  CardActions,
  TextField,
} from '@mui/material';
import {
  Upload,
  Download,
  Delete,
  Edit,
  CheckCircle,
  Error,
  Warning,
  CloudUpload,
  GetApp,
  DeleteSweep,
  Schedule,
} from '@mui/icons-material';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

// Batch operation types
type BatchOperationType = 'import' | 'export' | 'delete' | 'update';

// Import/Export formats
type DataFormat = 'csv' | 'json' | 'excel';

// Batch operation result
interface BatchResult {
  success: boolean;
  total: number;
  processed: number;
  errors: Array<{
    row: number;
    message: string;
    data?: any;
  }>;
  warnings: Array<{
    row: number;
    message: string;
    data?: any;
  }>;
}

// Batch operation progress
interface BatchProgress {
  total: number;
  current: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message: string;
}

interface BatchOperationsProps {
  /** Entity type for operations */
  entityType: string;
  /** Entity service for API calls */
  service: any;
  /** Available fields for the entity */
  fields: Array<{ name: string; label: string; required?: boolean }>;
  /** Callback when operation completes */
  onComplete?: (result: BatchResult) => void;
}

/**
 * Batch operations component for bulk entity management
 */
const BatchOperations: React.FC<BatchOperationsProps> = ({
  entityType,
  service,
  fields,
  onComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [operationType, setOperationType] = useState<BatchOperationType>('import');
  const [selectedFormat, setSelectedFormat] = useState<DataFormat>('csv');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      parseFile(file);
    }
  };

  /**
   * Parse uploaded file and preview data
   */
  const parseFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      let data: any[] = [];

      if (selectedFormat === 'csv') {
        data = parseCSV(text);
      } else if (selectedFormat === 'json') {
        data = JSON.parse(text);
      }

      // Limit preview to first 5 rows
      setPreviewData(data.slice(0, 5));
      
      // Auto-map fields if possible
      if (data.length > 0) {
        const autoMapping: Record<string, string> = {};
        const fileColumns = Object.keys(data[0]);
        
        fields.forEach(field => {
          const match = fileColumns.find(col => 
            col.toLowerCase().includes(field.name.toLowerCase()) ||
            field.name.toLowerCase().includes(col.toLowerCase())
          );
          if (match) {
            autoMapping[match] = field.name;
          }
        });
        
        setFieldMapping(autoMapping);
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Erreur lors de l\'analyse du fichier. Vérifiez le format.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Parse CSV text into array of objects
   */
  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }

    return data;
  };

  /**
   * Execute batch import operation
   */
  const executeBatchImport = async () => {
    if (!selectedFile || !service.create) {
      setError('Fichier ou service manquant');
      return;
    }

    setLoading(true);
    setProgress({
      total: previewData.length,
      current: 0,
      status: 'processing',
      message: 'Importation en cours...',
    });

    const results: BatchResult = {
      success: true,
      total: previewData.length,
      processed: 0,
      errors: [],
      warnings: [],
    };

    try {
      const text = await selectedFile.text();
      let allData: any[] = [];

      if (selectedFormat === 'csv') {
        allData = parseCSV(text);
      } else if (selectedFormat === 'json') {
        allData = JSON.parse(text);
      }

      for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        
        // Map file columns to entity fields
        const mappedData: any = {};
        Object.entries(fieldMapping).forEach(([fileCol, entityField]) => {
          if (row[fileCol] !== undefined) {
            mappedData[entityField] = row[fileCol];
          }
        });

        // Validate required fields
        const missingRequired = fields
          .filter(field => field.required && !mappedData[field.name])
          .map(field => field.label);

        if (missingRequired.length > 0) {
          results.errors.push({
            row: i + 1,
            message: `Champs requis manquants: ${missingRequired.join(', ')}`,
            data: row,
          });
          continue;
        }

        try {
          const response = await service.create(mappedData);
          if (response.success) {
            results.processed++;
          } else {
            results.errors.push({
              row: i + 1,
              message: response.error || 'Erreur lors de la création',
              data: mappedData,
            });
          }
        } catch (err) {
          results.errors.push({
            row: i + 1,
            message: 'Erreur réseau ou serveur',
            data: mappedData,
          });
        }

        // Update progress
        setProgress(prev => prev ? {
          ...prev,
          current: i + 1,
          message: `Traitement de l'élément ${i + 1}/${allData.length}`,
        } : null);

        // Small delay to prevent overwhelming the server
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      results.success = results.errors.length < results.total / 2;
      setResult(results);
      
      if (onComplete) {
        onComplete(results);
      }

    } catch (err) {
      console.error('Batch import error:', err);
      setError('Erreur lors de l\'importation');
      results.success = false;
      setResult(results);
    } finally {
      setLoading(false);
      setProgress(prev => prev ? {
        ...prev,
        status: 'completed',
        message: 'Importation terminée',
      } : null);
    }
  };

  /**
   * Execute batch export operation
   */
  const executeBatchExport = async () => {
    if (!service.getAll) {
      setError('Service d\'export non disponible');
      return;
    }

    setLoading(true);
    try {
      // Get all data
      const response = await service.getAll({ limit: 10000 });
      if (!response.success) {
        throw new Error(response.error || 'Erreur lors du chargement des données');
      }

      const data = response.data.data || response.data;
      let content = '';
      let filename = '';
      let mimeType = '';

      if (selectedFormat === 'csv') {
        content = convertToCSV(data);
        filename = `${entityType}_export.csv`;
        mimeType = 'text/csv';
      } else if (selectedFormat === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `${entityType}_export.json`;
        mimeType = 'application/json';
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setResult({
        success: true,
        total: data.length,
        processed: data.length,
        errors: [],
        warnings: [],
      });

    } catch (err) {
      console.error('Export error:', err);
      setError('Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Convert data array to CSV format
   */
  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  };

  /**
   * Reset dialog state
   */
  const resetDialog = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setFieldMapping({});
    setResult(null);
    setProgress(null);
    setError(null);
    setLoading(false);
  };

  /**
   * Handle dialog close
   */
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setTimeout(resetDialog, 300); // Allow dialog animation to complete
  };

  /**
   * Handle operation start
   */
  const handleStartOperation = (type: BatchOperationType) => {
    setOperationType(type);
    resetDialog();
    setOpenDialog(true);
  };

  return (
    <Box>
      {/* Batch Operations Menu */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Opérations par Lot
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CloudUpload sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Importer
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Importez des données depuis CSV ou JSON
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleStartOperation('import')}
                >
                  Importer
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <GetApp sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Exporter
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Exportez toutes les données
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  onClick={() => handleStartOperation('export')}
                >
                  Exporter
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Edit sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Modifier
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Modification en lot (bientôt)
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant="outlined"
                  disabled
                >
                  Bientôt
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <DeleteSweep sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Supprimer
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Suppression en lot (bientôt)
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  disabled
                >
                  Bientôt
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Batch Operation Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {operationType === 'import' && 'Importation par Lot'}
          {operationType === 'export' && 'Exportation des Données'}
          {operationType === 'update' && 'Modification par Lot'}
          {operationType === 'delete' && 'Suppression par Lot'}
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Progress Indicator */}
          {progress && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                {progress.message}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(progress.current / progress.total) * 100}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {progress.current} / {progress.total}
              </Typography>
            </Box>
          )}

          {/* Import/Export Operation */}
          {(operationType === 'import' || operationType === 'export') && !result && (
            <Box>
              {/* Format Selection */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Format de fichier</InputLabel>
                <Select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as DataFormat)}
                  label="Format de fichier"
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                </Select>
              </FormControl>

              {operationType === 'import' && (
                <Box>
                  {/* File Upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={selectedFormat === 'csv' ? '.csv' : '.json'}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  
                  <Button
                    variant="outlined"
                    startIcon={<Upload />}
                    onClick={() => fileInputRef.current?.click()}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Sélectionner un fichier {selectedFormat.toUpperCase()}
                  </Button>

                  {selectedFile && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Fichier sélectionné: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </Alert>
                  )}

                  {/* Data Preview */}
                  {previewData.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Aperçu des données (5 premières lignes)
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                        <pre style={{ fontSize: '12px', margin: 0 }}>
                          {JSON.stringify(previewData, null, 2)}
                        </pre>
                      </Paper>
                    </Box>
                  )}

                  {/* Field Mapping */}
                  {previewData.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Correspondance des champs
                      </Typography>
                      <Grid container spacing={2}>
                        {Object.keys(previewData[0]).map((fileColumn) => (
                          <Grid item xs={12} sm={6} key={fileColumn}>
                            <FormControl fullWidth size="small">
                              <InputLabel>{fileColumn}</InputLabel>
                              <Select
                                value={fieldMapping[fileColumn] || ''}
                                onChange={(e) => setFieldMapping(prev => ({
                                  ...prev,
                                  [fileColumn]: e.target.value,
                                }))}
                                label={fileColumn}
                              >
                                <MenuItem value="">-- Ignorer --</MenuItem>
                                {fields.map((field) => (
                                  <MenuItem key={field.name} value={field.name}>
                                    {field.label} {field.required && '*'}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Operation Results */}
          {result && (
            <Box>
              <Alert 
                severity={result.success ? 'success' : 'error'} 
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle2">
                  {result.success ? 'Opération réussie' : 'Opération partiellement échouée'}
                </Typography>
                <Typography variant="body2">
                  {result.processed} / {result.total} éléments traités avec succès
                </Typography>
              </Alert>

              {result.errors.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Erreurs ({result.errors.length})
                  </Typography>
                  <List dense>
                    {result.errors.slice(0, 5).map((error, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Error color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`Ligne ${error.row}: ${error.message}`}
                          secondary={error.data ? JSON.stringify(error.data) : undefined}
                        />
                      </ListItem>
                    ))}
                  </List>
                  {result.errors.length > 5 && (
                    <Typography variant="caption" color="text.secondary">
                      ... et {result.errors.length - 5} autres erreurs
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}

          {loading && !progress && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <LoadingSpinner message="Traitement en cours..." />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {result ? 'Fermer' : 'Annuler'}
          </Button>
          
          {!result && !loading && (
            <Button
              onClick={operationType === 'import' ? executeBatchImport : executeBatchExport}
              variant="contained"
              disabled={operationType === 'import' && (!selectedFile || Object.keys(fieldMapping).length === 0)}
            >
              {operationType === 'import' ? 'Importer' : 'Exporter'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BatchOperations;