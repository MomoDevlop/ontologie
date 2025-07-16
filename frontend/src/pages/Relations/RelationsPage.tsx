/**
 * Relations Page Component
 * 
 * This page provides comprehensive ontology visualization and relationship management.
 * Features a complete interactive graph of the ontology with classes, properties and instances.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import { Timeline, AccountTree, Analytics } from '@mui/icons-material';
import RelationshipManager from '../../components/Relations/RelationshipManager';
import GraphVisualization from '../../components/Visualization/GraphVisualization';
import OntologyTree from '../../components/Visualization/OntologyTree';
import OntologyGraphVisualization from '../../components/Visualization/OntologyGraphVisualization';

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

/**
 * Comprehensive relations management page
 */
const RelationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedEntity, setSelectedEntity] = useState<{ id: number; type: string; name: string } | undefined>();
  const [visualizationMode, setVisualizationMode] = useState<'graph' | 'ontology' | 'protege'>('protege');

  /**
   * Handle entity selection from various components
   */
  const handleEntitySelect = (entity: any) => {
    setSelectedEntity({
      id: entity.id,
      type: entity.type,
      name: entity.name || entity.displayName || `Entity ${entity.id}`,
    });
  };

  /**
   * Handle node selection from graph
   */
  const handleGraphNodeSelect = (node: any) => {
    setSelectedEntity({
      id: parseInt(node.id),
      type: node.type,
      name: node.name,
    });
    setActiveTab(0); // Switch to relationship manager to show details
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Ontologie des Instruments de Musique
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visualisation interactive complète de l'ontologie avec classes, propriétés et relations
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Visualisation Ontologique
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Graphe interactif complet avec classes (cercles bleus), propriétés (rectangles jaunes) et instances (cercles verts)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Navigation Interactive
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cliquez sur les nœuds pour voir les détails, zoomez et explorez la structure sémantique
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper>
        <Tabs 
          value={activeTab} 
          onChange={(e, v) => setActiveTab(v)}
          variant="fullWidth"
        >
          <Tab 
            label="Visualisation Ontologique" 
            icon={<AccountTree />}
            iconPosition="start"
          />
          <Tab 
            label="Gestionnaire" 
            icon={<Timeline />}
            iconPosition="start"
          />
          <Tab 
            label="Analyse" 
            icon={<Analytics />}
            iconPosition="start"
          />
        </Tabs>

        {/* Ontology Visualization Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box>
            {/* Visualization Mode Toggle */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="h6">Mode de visualisation:</Typography>
                <Tabs 
                  value={visualizationMode} 
                  onChange={(e, v) => setVisualizationMode(v)}
                  variant="standard"
                >
                  <Tab value="protege" label="Ontologie Complète" />
                  <Tab value="graph" label="Graphe Relations" />
                  <Tab value="ontology" label="Arbre Hiérarchique" />
                </Tabs>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {visualizationMode === 'protege' 
                  ? "Visualisation complète de l'ontologie avec classes (cercles bleus), propriétés (rectangles jaunes) et instances (cercles verts)"
                  : visualizationMode === 'graph'
                  ? "Explorez les relations entre entités sous forme de graphe interactif"
                  : "Visualisez la structure hiérarchique de l'ontologie sous forme d'arbre"}
              </Typography>
            </Paper>

            {selectedEntity && visualizationMode === 'graph' && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2">
                  Visualisation centrée sur: <strong>{selectedEntity.name}</strong>
                </Typography>
              </Alert>
            )}
            
            {visualizationMode === 'protege' ? (
              <OntologyGraphVisualization
                height={700}
                showControls={true}
                onNodeSelect={(node) => {
                  console.log('Ontology node selected:', node);
                  // Handle node selection from complete ontology graph
                }}
              />
            ) : visualizationMode === 'graph' ? (
              <GraphVisualization
                height={700}
                showControls={true}
                focusEntity={selectedEntity}
                onNodeSelect={handleGraphNodeSelect}
              />
            ) : (
              <OntologyTree
                height={700}
                showControls={true}
                onNodeSelect={(node) => {
                  console.log('Ontology tree node selected:', node);
                  // Could switch to graph mode and focus on this node type
                }}
              />
            )}
          </Box>
        </TabPanel>

        {/* Relationship Manager Tab */}
        <TabPanel value={activeTab} index={1}>
          <RelationshipManager
            currentEntity={selectedEntity}
            onEntitySelect={handleEntitySelect}
          />
        </TabPanel>

        {/* Advanced Analysis Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="h6" gutterBottom>
                  Analyse Avancée en Développement
                </Typography>
                <Typography variant="body2">
                  Cette section inclura bientôt :
                </Typography>
                <ul>
                  <li>Analyse de centralité (betweenness, closeness, pagerank)</li>
                  <li>Détection de communautés</li>
                  <li>Chemins les plus courts entre entités</li>
                  <li>Métriques de densité du graphe</li>
                  <li>Analyse des patterns de connexion</li>
                  <li>Recommandations de nouvelles relations</li>
                </ul>
              </Alert>
            </Grid>

            {/* Placeholder for future analytics */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Métriques du Graphe
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Statistiques globales sur la structure du graphe
                  </Typography>
                  {/* Future: Graph metrics visualization */}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Communautés Détectées
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Groupes d'entités fortement connectées
                  </Typography>
                  {/* Future: Community detection results */}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Chemins Sémantiques
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Explorez les chemins entre deux entités
                  </Typography>
                  {/* Future: Path finding interface */}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default RelationsPage;