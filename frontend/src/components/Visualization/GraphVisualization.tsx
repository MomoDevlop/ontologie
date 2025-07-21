/**
 * Graph Visualization Component for Relations
 * 
 * This component provides interactive graph visualization for Neo4j relationships
 * using react-cytoscapejs. Features include:
 * - All entity instances linked with their relations
 * - Interactive node and edge exploration
 * - Entity type-based coloring and styling
 * - Multiple layout algorithms
 * - Zoom, pan, and selection capabilities
 * - Filtering and search functionality
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Download,
  Refresh,
  Settings,
  FilterList,
  Search,
  ExpandMore,
  AccountTree,
  ViewModule,
  Timeline,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import { relationsApi } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';
import ErrorMessage from '../Common/ErrorMessage';

// Cytoscape data interfaces
interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    type: string;
    entityType: string;
    size: number;
    color: string;
    originalData: any;
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
    color: string;
    originalData: any;
  };
}

interface RelationGraphData {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

interface GraphVisualizationProps {
  height?: number;
  showControls?: boolean;
  onNodeSelect?: (node: any) => void;
  onEdgeSelect?: (edge: any) => void;
}

// Entity type configurations
const ENTITY_CONFIGS = {
  'Instrument': { color: '#1976d2', size: 12, icon: 'I' },
  'Famille': { color: '#dc004e', size: 10, icon: 'F' },
  'GroupeEthnique': { color: '#2e7d32', size: 8, icon: 'G' },
  'Localite': { color: '#0288d1', size: 8, icon: 'L' },
  'Materiau': { color: '#ed6c02', size: 6, icon: 'M' },
  'Timbre': { color: '#9c27b0', size: 6, icon: 'T' },
  'TechniqueDeJeu': { color: '#795548', size: 6, icon: 'J' },
  'Artisan': { color: '#ff5722', size: 8, icon: 'A' },
  'PatrimoineCulturel': { color: '#607d8b', size: 8, icon: 'P' },
  'Rythme': { color: '#e91e63', size: 6, icon: 'R' },
};

// Relation type configurations
const RELATION_CONFIGS = {
  'appartientA': { color: '#1976d2', label: 'appartient à' },
  'utilisePar': { color: '#2e7d32', label: 'utilisé par' },
  'produitRythme': { color: '#e91e63', label: 'produit rythme' },
  'localiseA': { color: '#0288d1', label: 'localisé à' },
  'constitueDe': { color: '#ed6c02', label: 'constitué de' },
  'joueAvec': { color: '#795548', label: 'joué avec' },
  'fabrique': { color: '#ff5722', label: 'fabriqué par' },
  'caracterise': { color: '#9c27b0', label: 'caractérise' },
  'englobe': { color: '#607d8b', label: 'englobe' },
  'appliqueA': { color: '#f57c00', label: 'appliqué à' },
};

// Cytoscape stylesheet
const cytoscapeStylesheet = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'label': 'data(label)',
      'width': 'data(size)',
      'height': 'data(size)',
      'font-size': '10px',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '80px',
      'color': '#000',
      'border-width': 2,
      'border-color': '#fff',
      'border-opacity': 0.8,
      'overlay-padding': '4px',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#ff6b00',
      'border-opacity': 1,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': '8px',
      'text-rotation': 'autorotate',
      'text-margin-y': -10,
      'color': '#666',
    },
  },
  {
    selector: 'edge:selected',
    style: {
      'width': 3,
      'line-color': '#ff6b00',
      'target-arrow-color': '#ff6b00',
    },
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': 4,
      'border-color': '#ff6b00',
      'border-opacity': 1,
    },
  },
  {
    selector: 'edge.highlighted',
    style: {
      'width': 4,
      'line-color': '#ff6b00',
      'target-arrow-color': '#ff6b00',
    },
  },
];

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  height = 600,
  showControls = true,
  onNodeSelect,
  onEdgeSelect,
}) => {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<RelationGraphData>({ nodes: [], edges: [] });
  const [selectedLayout, setSelectedLayout] = useState('cose');
  const [nodeSize, setNodeSize] = useState(1);
  const [edgeWidth, setEdgeWidth] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>(Object.keys(ENTITY_CONFIGS));
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<string[]>(Object.keys(RELATION_CONFIGS));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Process relations data for graph visualization
  const processRelationGraphData = useCallback(async () => {
    try {
      const response = await relationsApi.getAll();
      
      // Validate API response
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch relations');
      }

      const relations = response.data || [];
      console.log('Raw relations data:', relations);

      // Validate relations array
      if (!Array.isArray(relations)) {
        console.warn('Relations data is not an array:', relations);
        return { nodes: [], edges: [] };
      }

      const nodesMap = new Map<string, CytoscapeNode>();
      const edges: CytoscapeEdge[] = [];

      // Process each relation to create nodes and edges
      relations.forEach((relation: any) => {
        // Validate relation structure
        if (!relation || !relation.source || !relation.target || !relation.relationType) {
          console.warn('Invalid relation structure:', relation);
          return;
        }

        const sourceKey = `${relation.source.type}_${relation.sourceId}`;
        const targetKey = `${relation.target.type}_${relation.targetId}`;

        // Validate source and target data
        if (!relation.source.type || !relation.sourceId || !relation.target.type || !relation.targetId) {
          console.warn('Missing source or target data:', relation);
          return;
        }

        // Create source node if not exists
        if (!nodesMap.has(sourceKey)) {
          const config = ENTITY_CONFIGS[relation.source.type as keyof typeof ENTITY_CONFIGS] || ENTITY_CONFIGS['Instrument'];
          nodesMap.set(sourceKey, {
            data: {
              id: sourceKey,
              label: relation.source.displayName || `${relation.source.type} ${relation.sourceId}`,
              type: 'entity',
              entityType: relation.source.type,
              size: config.size * 3,
              color: config.color,
              originalData: relation.source,
            },
          });
        }

        // Create target node if not exists
        if (!nodesMap.has(targetKey)) {
          const config = ENTITY_CONFIGS[relation.target.type as keyof typeof ENTITY_CONFIGS] || ENTITY_CONFIGS['Instrument'];
          nodesMap.set(targetKey, {
            data: {
              id: targetKey,
              label: relation.target.displayName || `${relation.target.type} ${relation.targetId}`,
              type: 'entity',
              entityType: relation.target.type,
              size: config.size * 3,
              color: config.color,
              originalData: relation.target,
            },
          });
        }

        // Create edge
        const relationConfig = RELATION_CONFIGS[relation.relationType as keyof typeof RELATION_CONFIGS] || 
                             { color: '#666', label: relation.relationType };
        edges.push({
          data: {
            id: `${sourceKey}_${targetKey}_${relation.relationType}`,
            source: sourceKey,
            target: targetKey,
            label: relationConfig.label,
            relationType: relation.relationType,
            color: relationConfig.color,
            originalData: relation,
          },
        });
      });

      const result = {
        nodes: Array.from(nodesMap.values()),
        edges,
      };

      console.log('Processed graph data:', {
        nodes: result.nodes.length,
        edges: result.edges.length,
        sampleNode: result.nodes[0],
        sampleEdge: result.edges[0]
      });

      return result;
    } catch (error) {
      console.error('Error processing relation graph data:', error);
      throw error;
    }
  }, []);

  // Load graph data
  const loadGraphData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await processRelationGraphData();
      if (isMountedRef.current) {
        setGraphData(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load graph data');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [processRelationGraphData]);

  // Filter graph data based on selected filters
  const filteredGraphData = React.useMemo(() => {
    let filteredNodes = graphData.nodes.filter(node => {
      const matchesEntityType = selectedEntityTypes.includes(node.data.entityType);
      const matchesFilter = !filterText || 
        node.data.label.toLowerCase().includes(filterText.toLowerCase());
      return matchesEntityType && matchesFilter;
    });

    let filteredEdges = graphData.edges.filter(edge => {
      const matchesRelationType = selectedRelationTypes.includes(edge.data.relationType);
      const sourceExists = filteredNodes.some(node => node.data.id === edge.data.source);
      const targetExists = filteredNodes.some(node => node.data.id === edge.data.target);
      return matchesRelationType && sourceExists && targetExists;
    });

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, selectedEntityTypes, selectedRelationTypes, filterText]);

  // Handle Cytoscape events
  const handleCytoscapeEvents = useCallback((cy: cytoscape.Core) => {
    if (!cy || !isMountedRef.current) {
      console.warn('Cytoscape instance is null or component unmounted');
      return;
    }
    
    // Clean up previous instance
    if (cyRef.current) {
      try {
        cyRef.current.removeAllListeners();
        cyRef.current.destroy();
      } catch (error) {
        console.warn('Error cleaning up previous cytoscape instance:', error);
      }
    }
    
    cyRef.current = cy;

    // Ensure we have nodes before proceeding
    if (!cy.nodes() || cy.nodes().length === 0) {
      console.warn('No nodes found in cytoscape instance');
      return;
    }

    // Use batch operations to prevent notify errors
    cy.startBatch();

    try {
      // Node selection
      cy.on('tap', 'node', (event) => {
        if (!isMountedRef.current || !cyRef.current) return;
        const node = event.target;
        if (onNodeSelect) {
          onNodeSelect(node.data());
        }
      });

      // Edge selection
      cy.on('tap', 'edge', (event) => {
        if (!isMountedRef.current || !cyRef.current) return;
        const edge = event.target;
        if (onEdgeSelect) {
          onEdgeSelect(edge.data());
        }
      });

      // Hover effects
      cy.on('mouseover', 'node', (event) => {
        if (!isMountedRef.current || !cyRef.current) return;
        const node = event.target;
        node.addClass('highlighted');
        // Highlight connected edges
        node.connectedEdges().addClass('highlighted');
      });

      cy.on('mouseout', 'node', (event) => {
        if (!isMountedRef.current || !cyRef.current) return;
        const node = event.target;
        node.removeClass('highlighted');
        node.connectedEdges().removeClass('highlighted');
      });

      // Make nodes draggable
      cy.nodes().forEach(node => {
        if (node && node.grabify) {
          node.grabify();
        }
      });

      // Apply layout with delay to ensure DOM is ready
      setTimeout(() => {
        if (!isMountedRef.current || !cyRef.current || cyRef.current.nodes().length === 0) {
          console.warn('Skipping layout: instance null, unmounted, or no nodes');
          return;
        }
        
        try {
          const layoutOptions = {
            name: selectedLayout,
            animate: true,
            animationDuration: 500,
            fit: true,
            padding: 50,
            stop: () => {
              if (isMountedRef.current && cyRef.current) {
                try {
                  cyRef.current.endBatch();
                } catch (error) {
                  console.warn('Error ending batch in layout stop:', error);
                }
              }
            }
          };
          
          const layout = cyRef.current.layout(layoutOptions);
          layout.run();
        } catch (error) {
          console.warn('Error applying layout:', error);
          // Ensure batch is ended even if layout fails
          if (isMountedRef.current && cyRef.current) {
            try {
              cyRef.current.endBatch();
            } catch (batchError) {
              console.warn('Error ending batch after layout error:', batchError);
            }
          }
        }
      }, 100);

    } catch (error) {
      console.warn('Error setting up cytoscape events:', error);
      // Ensure batch is ended even if setup fails
      if (isMountedRef.current && cyRef.current) {
        try {
          cyRef.current.endBatch();
        } catch (batchError) {
          console.warn('Error ending batch after setup error:', batchError);
        }
      }
    }

    // Return cleanup function
    return () => {
      if (cyRef.current) {
        try {
          cyRef.current.removeAllListeners();
          cyRef.current.destroy();
        } catch (error) {
          console.warn('Error in cleanup function:', error);
        }
      }
      cyRef.current = null;
    };
  }, [onNodeSelect, onEdgeSelect, selectedLayout]);

  // Control functions
  const handleZoomIn = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit();
    }
  }, []);

  const handleLayoutChange = useCallback((layout: string) => {
    if (cyRef.current) {
      const layoutOptions = {
        name: layout,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50,
      };
      cyRef.current.layout(layoutOptions).run();
    }
    setSelectedLayout(layout);
  }, []);

  const handleExport = useCallback(() => {
    if (cyRef.current) {
      const png = cyRef.current.png({ scale: 2 });
      const link = document.createElement('a');
      link.download = 'relations-graph.png';
      link.href = png;
      link.click();
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Initialize component
  useEffect(() => {
    isMountedRef.current = true;
    loadGraphData();
    return () => {
      isMountedRef.current = false;
      // Cleanup cytoscape instance on unmount
      if (cyRef.current) {
        try {
          cyRef.current.removeAllListeners();
          cyRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying cytoscape instance on unmount:', error);
        }
        cyRef.current = null;
      }
    };
  }, [loadGraphData]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Apply style changes
  useEffect(() => {
    if (cyRef.current && isMountedRef.current) {
      try {
        cyRef.current.style()
          .selector('node')
          .style({
            'width': (ele: any) => ele.data('size') * nodeSize,
            'height': (ele: any) => ele.data('size') * nodeSize,
            'font-size': showLabels ? '10px' : '0px',
          })
          .selector('edge')
          .style({
            'width': 2 * edgeWidth,
            'font-size': showLabels ? '8px' : '0px',
          })
          .update();
      } catch (error) {
        console.warn('Error updating cytoscape styles:', error);
      }
    }
  }, [nodeSize, edgeWidth, showLabels]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width: '100%', 
        height: '100%',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        backgroundColor: isFullscreen ? '#fff' : 'transparent',
      }}
    >
      {showControls && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Relations Graph ({filteredGraphData.nodes.length} nodes, {filteredGraphData.edges.length} edges)
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Tooltip title="Zoom In">
                  <IconButton onClick={handleZoomIn}>
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out">
                  <IconButton onClick={handleZoomOut}>
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Fit to Screen">
                  <IconButton onClick={handleFitToScreen}>
                    <CenterFocusStrong />
                  </IconButton>
                </Tooltip>
                <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                  <IconButton onClick={handleFullscreen}>
                    {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export">
                  <IconButton onClick={handleExport}>
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Refresh">
                  <IconButton onClick={loadGraphData}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1">Controls & Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Layout</InputLabel>
                    <Select
                      value={selectedLayout}
                      onChange={(e) => handleLayoutChange(e.target.value)}
                    >
                      <MenuItem value="cose">Cose</MenuItem>
                      <MenuItem value="circle">Circle</MenuItem>
                      <MenuItem value="grid">Grid</MenuItem>
                      <MenuItem value="breadthfirst">Breadth First</MenuItem>
                      <MenuItem value="concentric">Concentric</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Filter nodes"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    InputProps={{
                      startAdornment: <Search />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2">Node Size</Typography>
                  <Slider
                    value={nodeSize}
                    onChange={(_, value) => setNodeSize(value as number)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2">Edge Width</Typography>
                  <Slider
                    value={edgeWidth}
                    onChange={(_, value) => setEdgeWidth(value as number)}
                    min={0.5}
                    max={3}
                    step={0.1}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showLabels}
                        onChange={(e) => setShowLabels(e.target.checked)}
                      />
                    }
                    label="Show Labels"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Entity Types</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {Object.entries(ENTITY_CONFIGS).map(([type, config]) => (
                <Chip
                  key={type}
                  label={`${config.icon} ${type}`}
                  size="small"
                  variant={selectedEntityTypes.includes(type) ? 'filled' : 'outlined'}
                  onClick={() => {
                    setSelectedEntityTypes(prev =>
                      prev.includes(type)
                        ? prev.filter(t => t !== type)
                        : [...prev, type]
                    );
                  }}
                  sx={{ backgroundColor: selectedEntityTypes.includes(type) ? config.color : undefined }}
                />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>Relation Types</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(RELATION_CONFIGS).map(([type, config]) => (
                <Chip
                  key={type}
                  label={config.label}
                  size="small"
                  variant={selectedRelationTypes.includes(type) ? 'filled' : 'outlined'}
                  onClick={() => {
                    setSelectedRelationTypes(prev =>
                      prev.includes(type)
                        ? prev.filter(t => t !== type)
                        : [...prev, type]
                    );
                  }}
                  sx={{ backgroundColor: selectedRelationTypes.includes(type) ? config.color : undefined }}
                />
              ))}
            </Box>
          </Box>
        </Paper>
      )}

      <Paper sx={{ 
        height: isFullscreen ? 'calc(100vh - 200px)' : height, 
        position: 'relative',
        flex: isFullscreen ? 1 : 'none'
      }}>
        <CytoscapeComponent
          elements={[...filteredGraphData.nodes, ...filteredGraphData.edges]}
          style={{ width: '100%', height: '100%' }}
          stylesheet={cytoscapeStylesheet}
          cy={handleCytoscapeEvents}
          layout={{
            name: selectedLayout,
            animate: true,
            fit: true,
            padding: 50,
          }}
          autoungrabify={false}
          autounselectify={false}
          boxSelectionEnabled={true}
          wheelSensitivity={0.2}
        />
      </Paper>
    </Box>
  );
};

export default GraphVisualization;