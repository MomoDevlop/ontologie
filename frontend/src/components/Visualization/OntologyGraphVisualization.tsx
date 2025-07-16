/**
 * Ontology Graph Visualization Component using Cytoscape.js
 * 
 * This component provides a Protégé-style ontology visualization with:
 * - Classes as blue circles
 * - Properties as yellow rectangles  
 * - Relations with labeled edges (Subclass, etc.)
 * - Interactive nodes and edges
 * - Layout algorithms for clear visualization
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Slider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  Chip,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Download,
  Refresh,
  AccountTree,
  Settings,
  FilterList,
  Fullscreen,
  FullscreenExit,
  ZoomInMap,
  ZoomOutMap,
} from '@mui/icons-material';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import { relationsApi, instrumentsApi } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';
import ErrorMessage from '../Common/ErrorMessage';

// Cytoscape element interfaces
interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    type: 'class' | 'property' | 'individual';
    nodeType: string;
    description?: string;
    properties?: any;
  };
  position?: { x: number; y: number };
}

interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    relationType: string;
    relationship: string;
  };
}

interface OntologyGraphData {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

interface OntologyGraphVisualizationProps {
  /** Height of the visualization */
  height?: number;
  /** Whether to show controls */
  showControls?: boolean;
  /** Callback when node is selected */
  onNodeSelect?: (node: any) => void;
}

/**
 * Protégé-style ontology graph visualization
 */
const OntologyGraphVisualization: React.FC<OntologyGraphVisualizationProps> = ({
  height = 600,
  showControls = true,
  onNodeSelect,
}) => {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<OntologyGraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Visualization settings
  const [settings, setSettings] = useState({
    layout: 'cose',
    showLabels: true,
    showProperties: true,
    showClasses: true,
    showRelations: true,
    nodeSpacing: 100,
    edgeLength: 150,
    autoLayout: true,
  });

  // Layout options for Cytoscape
  const layoutOptions = {
    'cose': { 
      name: 'cose', 
      idealEdgeLength: settings.edgeLength, 
      nodeOverlap: 20,
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 30
    },
    'circle': { 
      name: 'circle', 
      radius: 200,
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 30
    },
    'grid': { 
      name: 'grid', 
      rows: 3,
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 30
    },
    'breadthfirst': { 
      name: 'breadthfirst', 
      directed: true, 
      roots: ['class_Instrument'],
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 30
    },
    'concentric': { 
      name: 'concentric', 
      concentric: (node: any) => node.degree(),
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 30
    },
  };

  // Cytoscape stylesheet for Protégé-like appearance
  const cytoscapeStylesheet = [
    // Nodes styles
    {
      selector: 'node',
      style: {
        'background-color': '#2196F3',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '12px',
        'font-family': 'Arial, sans-serif',
        'color': '#000',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        'width': '60px',
        'height': '60px',
        'border-width': '2px',
        'border-color': '#1976D2',
        'overlay-opacity': 0,
        'cursor': 'grab',
      } as any,
    },
    // Nodes when being dragged
    {
      selector: 'node:grabbed',
      style: {
        'cursor': 'grabbing',
        'border-width': '3px',
        'border-color': '#FF5722',
      } as any,
    },
    // Class nodes (blue circles)
    {
      selector: 'node[type="class"]',
      style: {
        'shape': 'ellipse',
        'background-color': '#2196F3',
        'border-color': '#1976D2',
        'width': '70px',
        'height': '70px',
        'font-weight': 'bold',
      } as any,
    },
    // Property nodes (yellow rectangles)
    {
      selector: 'node[type="property"]',
      style: {
        'shape': 'rectangle',
        'background-color': '#FFC107',
        'border-color': '#FF8F00',
        'width': '80px',
        'height': '30px',
        'font-size': '10px',
      } as any,
    },
    // Individual nodes (smaller circles)
    {
      selector: 'node[type="individual"]',
      style: {
        'shape': 'ellipse',
        'background-color': '#4CAF50',
        'border-color': '#388E3C',
        'width': '50px',
        'height': '50px',
      } as any,
    },
    // Edges styles
    {
      selector: 'edge',
      style: {
        'width': '2px',
        'line-color': '#666',
        'target-arrow-color': '#666',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'edge-text-rotation': 'autorotate',
      } as any,
    },
    // Subclass relationships (dotted lines)
    {
      selector: 'edge[relationship="subclass"]',
      style: {
        'line-style': 'dashed',
        'line-color': '#333',
        'target-arrow-color': '#333',
      } as any,
    },
    // Property relationships (solid lines)
    {
      selector: 'edge[relationship="property"]',
      style: {
        'line-color': '#2196F3',
        'target-arrow-color': '#2196F3',
      } as any,
    },
    // Semantic relationships (colored lines)
    {
      selector: 'edge[relationship="semantic"]',
      style: {
        'line-color': '#FF5722',
        'target-arrow-color': '#FF5722',
        'width': '3px',
      } as any,
    },
    // Selected elements
    {
      selector: ':selected',
      style: {
        'border-width': '4px',
        'border-color': '#FF5722',
        'line-color': '#FF5722',
        'target-arrow-color': '#FF5722',
      } as any,
    },
    // Hover effects
    {
      selector: 'node:active',
      style: {
        'overlay-opacity': 0.2,
        'overlay-color': '#FF5722',
      } as any,
    },
    // Mouse hover on nodes
    {
      selector: 'node:hover',
      style: {
        'border-width': '3px',
        'border-color': '#FF9800',
        'cursor': 'grab',
      } as any,
    },
    // Nodes being dragged
    {
      selector: 'node.dragging',
      style: {
        'cursor': 'grabbing',
        'border-width': '4px',
        'border-color': '#FF5722',
        'opacity': 0.8,
      } as any,
    },
  ];

  /**
   * Load ontology data and convert to Cytoscape format
   */
  useEffect(() => {
    loadOntologyGraphData();
  }, []);

  /**
   * Load and process ontology data
   */
  const loadOntologyGraphData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load ontology structure
      const ontologyResponse = await relationsApi.getOntology();
      if (!ontologyResponse.success) {
        throw new Error(ontologyResponse.error || 'Failed to load ontology');
      }

      // Load actual relations
      const relationsResponse = await relationsApi.getAll();
      if (!relationsResponse.success) {
        throw new Error(relationsResponse.error || 'Failed to load relations');
      }

      // Load entities for individual nodes
      const entitiesResponse = await instrumentsApi.getAll({ limit: 50 });
      const entities = entitiesResponse.success ? entitiesResponse.data?.data || [] : [];

      // Validate data before processing
      const ontologyData = ontologyResponse.data || {};
      const relationsData = Array.isArray(relationsResponse.data) ? relationsResponse.data : [];
      const entitiesData = Array.isArray(entities) ? entities : [];

      // Process data
      const processedData = processOntologyToCytoscape(
        ontologyData,
        relationsData,
        entitiesData
      );

      // Validate processed data
      if (!processedData || !Array.isArray(processedData.nodes) || !Array.isArray(processedData.edges)) {
        throw new Error('Invalid processed data format');
      }

      setGraphData(processedData);
    } catch (err) {
      console.error('Error loading ontology graph data:', err);
      setError('Erreur lors du chargement des données ontologiques');
      // Set empty data on error
      setGraphData({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process ontology data into Cytoscape format
   */
  const processOntologyToCytoscape = (
    ontology: any,
    relations: any[],
    entities: any[]
  ): OntologyGraphData => {
    const nodes: CytoscapeNode[] = [];
    const edges: CytoscapeEdge[] = [];
    const nodeIds = new Set<string>();

    // Validate input data
    if (!ontology || !Array.isArray(relations) || !Array.isArray(entities)) {
      console.warn('Invalid data provided to processOntologyToCytoscape');
      return { nodes: [], edges: [] };
    }

    // Add entity type nodes (classes) from ontology metadata
    const entityTypes = ontology.metadata && ontology.metadata.entitiesCount 
      ? Object.keys(ontology.metadata.entitiesCount)
      : ['Instrument', 'Famille', 'GroupeEthnique', 'Localite', 
         'Materiau', 'Timbre', 'TechniqueDeJeu', 'Artisan', 'PatrimoineCulturel', 'Rythme'];

    entityTypes.forEach(entityType => {
      if (!entityType || typeof entityType !== 'string') return;
      
      const nodeId = `class_${entityType}`;
      if (!nodeIds.has(nodeId)) {
        nodes.push({
          data: {
            id: nodeId,
            label: entityType,
            type: 'class',
            nodeType: entityType,
            description: `Classe ${entityType}`,
          }
        });
        nodeIds.add(nodeId);
      }
    });

    // Add property nodes from relations - get from actual ontology
    const relationTypes = ontology.children && ontology.children.length > 0 
      ? ontology.children.find(c => c.name === 'Relations Sémantiques')?.children?.map(r => r.name) || []
      : ['appartientA', 'utilisePar', 'produitRythme', 'localiseA',
         'constitueDe', 'joueAvec', 'fabrique', 'caracterise', 'appliqueA', 'englobe'];

    relationTypes.forEach(relationType => {
      if (!relationType || typeof relationType !== 'string') return;
      
      const propertyId = `property_${relationType}`;
      if (!nodeIds.has(propertyId)) {
        nodes.push({
          data: {
            id: propertyId,
            label: relationType,
            type: 'property',
            nodeType: 'Property',
            description: `Propriété ${relationType}`,
          }
        });
        nodeIds.add(propertyId);
      }
    });

    // Add some individual instances
    entities.slice(0, 10).forEach((entity, index) => {
      if (!entity || entity.id === undefined) return;
      
      const individualId = `individual_${entity.id}`;
      if (!nodeIds.has(individualId)) {
        nodes.push({
          data: {
            id: individualId,
            label: entity.nomInstrument || `Entity ${entity.id}`,
            type: 'individual',
            nodeType: 'Individual',
            description: entity.description || 'Instance individuelle',
            properties: entity,
          }
        });
        nodeIds.add(individualId);
      }
    });

    // Add class hierarchy edges (subclass relationships) - create logical hierarchy
    const classHierarchy = [
      { from: 'Instrument', to: 'Famille', relation: 'subclass' },
      { from: 'Rythme', to: 'Instrument', relation: 'related' },
      { from: 'TechniqueDeJeu', to: 'Instrument', relation: 'related' },
      { from: 'Timbre', to: 'Instrument', relation: 'related' },
      { from: 'Materiau', to: 'Instrument', relation: 'composes' },
      { from: 'Artisan', to: 'Instrument', relation: 'creates' },
      { from: 'GroupeEthnique', to: 'PatrimoineCulturel', relation: 'subclass' },
      { from: 'Localite', to: 'GroupeEthnique', relation: 'contains' },
    ];

    classHierarchy.forEach(({ from, to, relation }) => {
      if (!from || !to || !relation) return;
      
      const fromId = `class_${from}`;
      const toId = `class_${to}`;
      if (nodeIds.has(fromId) && nodeIds.has(toId)) {
        edges.push({
          data: {
            id: `${fromId}_${toId}_${relation}`,
            source: fromId,
            target: toId,
            label: relation === 'subclass' ? 'Subclass' : relation,
            relationType: relation,
            relationship: relation === 'subclass' ? 'subclass' : 'semantic',
          }
        });
      }
    });

    // Add property relationships - create comprehensive mapping
    const propertyRelations = [
      { property: 'appartientA', domain: 'Instrument', range: 'Famille' },
      { property: 'utilisePar', domain: 'Instrument', range: 'GroupeEthnique' },
      { property: 'constitueDe', domain: 'Instrument', range: 'Materiau' },
      { property: 'localiseA', domain: 'Instrument', range: 'Localite' },
      { property: 'produitRythme', domain: 'Instrument', range: 'Rythme' },
      { property: 'joueAvec', domain: 'Instrument', range: 'TechniqueDeJeu' },
      { property: 'fabrique', domain: 'Artisan', range: 'Instrument' },
      { property: 'caracterise', domain: 'Timbre', range: 'Instrument' },
      { property: 'appliqueA', domain: 'TechniqueDeJeu', range: 'Instrument' },
      { property: 'englobe', domain: 'PatrimoineCulturel', range: 'GroupeEthnique' },
    ];

    propertyRelations.forEach(({ property, domain, range }) => {
      if (!property || !domain || !range) return;
      
      const propertyId = `property_${property}`;
      const domainId = `class_${domain}`;
      const rangeId = `class_${range}`;

      if (nodeIds.has(propertyId) && nodeIds.has(domainId) && nodeIds.has(rangeId)) {
        // Domain to property edge
        edges.push({
          data: {
            id: `${domainId}_${propertyId}`,
            source: domainId,
            target: propertyId,
            label: 'domain',
            relationType: 'domain',
            relationship: 'property',
          }
        });

        // Property to range edge
        edges.push({
          data: {
            id: `${propertyId}_${rangeId}`,
            source: propertyId,
            target: rangeId,
            label: 'range',
            relationType: 'range',
            relationship: 'property',
          }
        });
      }
    });

    // Add individual to class relationships
    entities.slice(0, 5).forEach((entity) => {
      if (!entity || entity.id === undefined) return;
      
      const individualId = `individual_${entity.id}`;
      const classId = 'class_Instrument';
      if (nodeIds.has(individualId) && nodeIds.has(classId)) {
        edges.push({
          data: {
            id: `${individualId}_${classId}_instanceof`,
            source: individualId,
            target: classId,
            label: 'instanceof',
            relationType: 'instanceof',
            relationship: 'semantic',
          }
        });
      }
    });

    return { nodes, edges };
  };

  /**
   * Handle Cytoscape events
   */
  const handleCytoscapeEvents = useCallback((cy: cytoscape.Core) => {
    if (!cy) return;
    
    // Clean up previous instance if exists
    if (cyRef.current) {
      try {
        cyRef.current.removeAllListeners();
      } catch (err) {
        console.warn('Error cleaning up previous cytoscape instance:', err);
      }
    }
    
    cyRef.current = cy;
    
    // Batch operations to prevent concurrent updates
    cy.startBatch();

    // Wait for cytoscape to be ready
    cy.ready(() => {
      // Additional safety check
      if (!cy) {
        console.warn('Cytoscape instance is null');
        return;
      }
      // Node selection (only on single click, not drag)
      cy.on('tap', 'node', (event) => {
        const node = event.target;
        if (!node || !node.data) return;
        
        const nodeData = node.data();
        
        setSelectedNode(nodeData);
        if (onNodeSelect) {
          onNodeSelect(nodeData);
        }
        
        // Highlight connected elements
        try {
          cy.elements().removeClass('highlighted');
          node.addClass('highlighted');
          node.connectedEdges().addClass('highlighted');
          node.connectedEdges().connectedNodes().addClass('highlighted');
        } catch (err) {
          console.warn('Error highlighting elements:', err);
        }
      });
      
      // Handle node dragging events
      cy.on('grab', 'node', (event) => {
        const node = event.target;
        node.addClass('dragging');
        console.log('Node grab started:', node.data('label'));
      });
      
      cy.on('drag', 'node', (event) => {
        const node = event.target;
        // Update node position during drag
        console.log('Node dragging:', node.data('label'), node.position());
      });
      
      cy.on('free', 'node', (event) => {
        const node = event.target;
        node.removeClass('dragging');
        console.log('Node drag ended:', node.data('label'), node.position());
      });

      // Background tap to deselect
      cy.on('tap', (event) => {
        if (event.target === cy) {
          try {
            cy.elements().removeClass('highlighted');
            setSelectedNode(null);
          } catch (err) {
            console.warn('Error deselecting elements:', err);
          }
        }
      });

      // Ensure all nodes are draggable
      try {
        cy.nodes().forEach(node => {
          if (node && node.grabify) {
            node.grabify();
          }
        });
      } catch (err) {
        console.warn('Error making nodes draggable:', err);
      }
      
      // Enable better mouse interactions
      cy.on('cxttap', 'node', (event) => {
        // Right click on node - could add context menu later
        event.preventDefault();
      });
      
      // Double click to fit node
      cy.on('dblclick', 'node', (event) => {
        const node = event.target;
        cy.fit(node, 50);
      });
      

      // Apply layout safely with delay (only if auto-layout is enabled)
      if (settings.autoLayout) {
        setTimeout(() => {
          try {
            // Check if cytoscape is still valid
            if (!cy || cy.nodes().length === 0) {
              return;
            }
            
            const layoutConfig = {
              ...layoutOptions[settings.layout as keyof typeof layoutOptions],
              // Ensure layout doesn't override manual node positioning
              stop: () => {
                setTimeout(() => {
                  try {
                    if (cy && cy.nodes) {
                      cy.nodes().forEach(node => {
                        if (node && node.grabify) {
                          node.grabify();
                        }
                      });
                    }
                  } catch (err) {
                    console.warn('Error in layout stop callback:', err);
                  }
                }, 50);
              }
            };
            
            if (layoutConfig) {
              const layout = cy.layout(layoutConfig);
              if (layout) {
                layout.run();
              }
            }
          } catch (err) {
            console.warn('Error applying layout:', err);
          }
        }, 200);
      }
      
      // End batch operations
      try {
        cy.endBatch();
      } catch (err) {
        console.warn('Error ending batch:', err);
      }
    });
  }, [settings.layout, onNodeSelect]);

  /**
   * Handle zoom controls
   */
  const handleZoom = (factor: number) => {
    if (cyRef.current) {
      try {
        const currentZoom = cyRef.current.zoom();
        const newZoom = currentZoom * factor;
        // Limit zoom levels
        const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
        cyRef.current.zoom({ level: clampedZoom, position: cyRef.current.extent().x1y1 });
      } catch (err) {
        console.warn('Error during zoom:', err);
      }
    }
  };

  /**
   * Handle zoom to specific level
   */
  const handleZoomToLevel = (zoomLevel: number) => {
    if (cyRef.current) {
      try {
        cyRef.current.zoom({ level: zoomLevel, position: cyRef.current.extent().x1y1 });
      } catch (err) {
        console.warn('Error during zoom to level:', err);
      }
    }
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyPress = (event: KeyboardEvent) => {
    if (!cyRef.current) return;
    
    switch (event.key) {
      case 'f':
      case 'F':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          toggleFullscreen();
        }
        break;
      case '+':
      case '=':
        event.preventDefault();
        handleZoom(1.2);
        break;
      case '-':
      case '_':
        event.preventDefault();
        handleZoom(0.8);
        break;
      case '0':
        event.preventDefault();
        handleZoomToLevel(1);
        break;
      case 'Escape':
        if (isFullscreen) {
          event.preventDefault();
          setIsFullscreen(false);
        }
        break;
    }
  };

  // Add keyboard event listeners
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isFullscreen]);

  // Cleanup effect to prevent memory leaks
  React.useEffect(() => {
    return () => {
      if (cyRef.current) {
        try {
          cyRef.current.removeAllListeners();
        } catch (err) {
          console.warn('Error cleaning up cytoscape instance:', err);
        }
      }
    };
  }, []);

  /**
   * Center the graph
   */
  const handleCenter = () => {
    if (cyRef.current) {
      try {
        cyRef.current.fit();
        cyRef.current.center();
      } catch (err) {
        console.warn('Error centering graph:', err);
      }
    }
  };

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Recenter and resize after fullscreen toggle
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit();
      }
    }, 100);
  };

  /**
   * Export as PNG
   */
  const handleExport = () => {
    if (cyRef.current) {
      try {
        const png64 = cyRef.current.png({ scale: 2 });
        const link = document.createElement('a');
        link.href = png64;
        link.download = 'ontology-graph.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.warn('Error exporting graph:', err);
      }
    }
  };

  /**
   * Apply new layout
   */
  const handleLayoutChange = (newLayout: string) => {
    setSettings(prev => ({ ...prev, layout: newLayout }));
    if (cyRef.current) {
      setTimeout(() => {
        try {
          const layoutConfig = layoutOptions[newLayout as keyof typeof layoutOptions];
          if (layoutConfig && cyRef.current && cyRef.current.nodes().length > 0) {
            cyRef.current.layout(layoutConfig).run();
          }
        } catch (err) {
          console.warn('Error applying new layout:', err);
        }
      }, 100);
    }
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <LoadingSpinner message="Chargement du graphe ontologique..." />
      </Box>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Box sx={{ height }}>
        <ErrorMessage message={error} showRetry onRetry={loadOntologyGraphData} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      {!isFullscreen && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            <AccountTree sx={{ mr: 1, verticalAlign: 'middle' }} />
            Graphe Ontologique (Style Protégé)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualisation interactive des classes, propriétés et relations ontologiques
          </Typography>
        </Box>
      )}

      {/* Legend */}
      {!isFullscreen && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Légende:
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: '#2196F3', borderRadius: '50%' }} />
              <Typography variant="caption">Classes</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 12, bgcolor: '#FFC107' }} />
              <Typography variant="caption">Propriétés</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: '#4CAF50', borderRadius: '50%' }} />
              <Typography variant="caption">Instances</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 2, bgcolor: '#333', borderTop: '2px dashed #333' }} />
              <Typography variant="caption">Subclass</Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            💡 Astuce: Cliquez et glissez les nœuds pour les réorganiser. Désactivez "Auto-layout" pour un positionnement manuel.
          </Typography>
        </Paper>
      )}

      {/* Controls */}
      {showControls && !isFullscreen && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Zoom avant (+)">
                  <IconButton onClick={() => handleZoom(1.5)} size="small">
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom arrière (-)">
                  <IconButton onClick={() => handleZoom(0.75)} size="small">
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom 100% (0)">
                  <IconButton onClick={() => handleZoomToLevel(1)} size="small">
                    <ZoomInMap />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom optimal">
                  <IconButton onClick={handleCenter} size="small">
                    <CenterFocusStrong />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Plein écran (Ctrl+F)">
                  <IconButton onClick={toggleFullscreen} size="small">
                    <Fullscreen />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Exporter PNG">
                  <IconButton onClick={handleExport} size="small">
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Actualiser">
                  <IconButton onClick={loadOntologyGraphData} size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            
            <Grid item>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Layout</InputLabel>
                <Select
                  value={settings.layout}
                  onChange={(e) => handleLayoutChange(e.target.value)}
                  label="Layout"
                >
                  <MenuItem value="cose">Cose (Défaut)</MenuItem>
                  <MenuItem value="circle">Circulaire</MenuItem>
                  <MenuItem value="grid">Grille</MenuItem>
                  <MenuItem value="breadthfirst">Hiérarchique</MenuItem>
                  <MenuItem value="concentric">Concentrique</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoLayout}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoLayout: e.target.checked }))}
                    size="small"
                  />
                }
                label="Auto-layout"
              />
              {!settings.autoLayout && (
                <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
                  Mode déplacement manuel activé
                </Typography>
              )}
            </Grid>

            <Grid item>
              <Typography variant="body2" color="text.secondary">
                {graphData.nodes.length} nœuds, {graphData.edges.length} arêtes
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Cytoscape Graph */}
      <Paper sx={{ 
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : `${height}px`,
        zIndex: isFullscreen ? 9999 : 'auto',
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}>
        {/* Fullscreen Controls */}
        {isFullscreen && (
          <Box sx={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            zIndex: 10000,
            display: 'flex',
            gap: 1,
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: 1,
            boxShadow: 3
          }}>
            <Tooltip title="Zoom avant (+)">
              <IconButton onClick={() => handleZoom(1.5)} size="small">
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom arrière (-)">
              <IconButton onClick={() => handleZoom(0.75)} size="small">
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom 100% (0)">
              <IconButton onClick={() => handleZoomToLevel(1)} size="small">
                <ZoomInMap />
              </IconButton>
            </Tooltip>
            <Tooltip title="Centrer et ajuster">
              <IconButton onClick={handleCenter} size="small">
                <CenterFocusStrong />
              </IconButton>
            </Tooltip>
            <Tooltip title="Quitter plein écran (Echap)">
              <IconButton onClick={toggleFullscreen} size="small">
                <FullscreenExit />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        
        {/* Fullscreen Info */}
        {isFullscreen && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: 16, 
            left: 16, 
            zIndex: 10000,
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: 1,
            boxShadow: 3,
            opacity: 0.8
          }}>
            <Typography variant="caption" color="text.secondary">
              Raccourcis: + (zoom+) | - (zoom-) | 0 (100%) | Echap (quitter)
            </Typography>
          </Box>
        )}
        
        {graphData.nodes.length > 0 ? (
          <CytoscapeComponent
            elements={[...graphData.nodes, ...graphData.edges]}
            style={{ 
              width: '100%', 
              height: isFullscreen ? '100vh' : `${height}px`,
              cursor: 'default'
            }}
            wheelSensitivity={0.1}
            minZoom={0.1}
            maxZoom={5}
            userZoomingEnabled={true}
            userPanningEnabled={true}
            boxSelectionEnabled={true}
            autoungrabify={false}
            autounselectify={false}
            grabbable={true}
            panningEnabled={true}
            zoomingEnabled={true}
            selectionType={'single'}
            stylesheet={cytoscapeStylesheet}
            cy={handleCytoscapeEvents}
            layout={{ name: 'preset' }}
          />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: isFullscreen ? '100vh' : `${height}px`
          }}>
            <Typography variant="h6" color="text.secondary">
              Aucune donnée d'ontologie disponible
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Selected Node Details */}
      {selectedNode && !isFullscreen && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Détails du nœud sélectionné
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Nom:</Typography>
              <Typography variant="body2">{selectedNode.label}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Type:</Typography>
              <Chip 
                label={selectedNode.type} 
                size="small" 
                color={selectedNode.type === 'class' ? 'primary' : selectedNode.type === 'property' ? 'warning' : 'success'}
              />
            </Grid>
            {selectedNode.description && (
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description:</Typography>
                <Typography variant="body2">{selectedNode.description}</Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
      
      {/* Fullscreen Selected Node Details */}
      {selectedNode && isFullscreen && (
        <Box sx={{ 
          position: 'absolute', 
          top: 16, 
          left: 16, 
          zIndex: 10000,
          bgcolor: 'background.paper',
          borderRadius: 1,
          p: 2,
          boxShadow: 3,
          maxWidth: 300
        }}>
          <Typography variant="subtitle1" gutterBottom>
            {selectedNode.label}
          </Typography>
          <Chip 
            label={selectedNode.type} 
            size="small" 
            color={selectedNode.type === 'class' ? 'primary' : selectedNode.type === 'property' ? 'warning' : 'success'}
          />
          {selectedNode.description && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {selectedNode.description}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default OntologyGraphVisualization;