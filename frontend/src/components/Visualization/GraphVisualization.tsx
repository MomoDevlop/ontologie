/**
 * Graph Visualization Component
 * 
 * This component provides interactive graph visualization for Neo4j relationships
 * using D3.js force-directed graphs. Features include:
 * - Interactive node and link exploration
 * - Entity type-based coloring and sizing
 * - Zoom and pan capabilities
 * - Node selection and highlighting
 * - Relationship filtering
 * - Export capabilities
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
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Download,
  Fullscreen,
  Settings,
  Info,
  FilterList,
  Refresh,
} from '@mui/icons-material';
import * as d3 from 'd3';
import { relationsApi, instrumentsApi } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';
import ErrorMessage from '../Common/ErrorMessage';

// Graph data interfaces
interface GraphNode {
  id: string;
  name: string;
  type: string;
  group: number;
  size: number;
  color: string;
  data: any;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  strength: number;
  color: string;
  data: any;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Entity type configurations
const ENTITY_CONFIGS = {
  'Instrument': { color: '#1976d2', size: 12, icon: '🎵' },
  'Famille': { color: '#dc004e', size: 10, icon: '🎼' },
  'GroupeEthnique': { color: '#2e7d32', size: 8, icon: '🌍' },
  'Localite': { color: '#0288d1', size: 8, icon: '📍' },
  'Materiau': { color: '#ed6c02', size: 6, icon: '🔧' },
  'Timbre': { color: '#9c27b0', size: 6, icon: '🎶' },
  'TechniqueDeJeu': { color: '#795548', size: 6, icon: '✋' },
  'Artisan': { color: '#ff5722', size: 8, icon: '👨‍🎨' },
  'PatrimoineCulturel': { color: '#607d8b', size: 10, icon: '🏛️' },
  'Rythme': { color: '#4caf50', size: 8, icon: '🥁' },
  'Unknown': { color: '#999', size: 6, icon: '?' },
};

// Relation type configurations
const RELATION_CONFIGS = {
  'appartientA': { color: '#1976d2', strength: 0.8 },
  'utilisePar': { color: '#2e7d32', strength: 0.6 },
  'produitRythme': { color: '#ff9800', strength: 0.5 },
  'localiseA': { color: '#03a9f4', strength: 0.4 },
  'constitueDe': { color: '#795548', strength: 0.3 },
  'joueAvec': { color: '#9c27b0', strength: 0.7 },
  'fabrique': { color: '#ff5722', strength: 0.6 },
  'caracterise': { color: '#e91e63', strength: 0.5 },
  'englobe': { color: '#607d8b', strength: 0.4 },
  'appliqueA': { color: '#8bc34a', strength: 0.5 },
  'default': { color: '#666', strength: 0.5 },
};

interface GraphVisualizationProps {
  /** Height of the visualization */
  height?: number;
  /** Whether to show controls */
  showControls?: boolean;
  /** Initial entity to focus on */
  focusEntity?: { id: number; type: string };
  /** Callback when node is selected */
  onNodeSelect?: (node: GraphNode) => void;
}

/**
 * Interactive graph visualization component
 */
const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  height = 600,
  showControls = true,
  focusEntity,
  onNodeSelect,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [openNodeDialog, setOpenNodeDialog] = useState(false);
  
  // Visualization settings
  const [settings, setSettings] = useState({
    showLabels: true,
    linkStrength: 0.5,
    nodeSize: 1.0,
    chargeStrength: -300,
    filterByType: 'all',
    filterByRelation: 'all',
  });

  // D3 simulation and elements
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  /**
   * Load graph data
   */
  useEffect(() => {
    loadGraphData();
  }, [focusEntity]);

  /**
   * Initialize D3 visualization when data changes
   */
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      initializeVisualization();
    }
  }, [graphData, settings]);

  /**
   * Cleanup simulation on unmount
   */
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, []);

  /**
   * Load graph data from API
   */
  const loadGraphData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load relations
      const relationsResponse = await relationsApi.getAll();
      if (!relationsResponse.success) {
        throw new Error(relationsResponse.error || 'Failed to load relations');
      }

      // Load entities (load more to get a comprehensive view)
      const entitiesResponse = await instrumentsApi.getAll({ limit: 200 });
      if (!entitiesResponse.success) {
        throw new Error(entitiesResponse.error || 'Failed to load entities');
      }

      // Process relations data to ensure we have valid relation objects
      const validRelations = (relationsResponse.data || []).filter(relation => 
        relation && 
        relation.sourceId && 
        relation.targetId && 
        relation.relationType &&
        relation.sourceType && 
        relation.targetType
      );

      console.log('Loaded relations:', validRelations.length);
      console.log('Sample relation:', validRelations[0]);

      // Process data into graph format
      const processedData = processGraphData(
        validRelations,
        entitiesResponse.data.data || []
      );

      console.log('Processed graph data:', processedData);
      setGraphData(processedData);
    } catch (err) {
      console.error('Error loading graph data:', err);
      setError('Erreur lors du chargement des données du graphe');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process raw data into graph format
   */
  const processGraphData = (relations: any[], entities: any[]): GraphData => {
    const nodeMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    // Load all types of entities, not just instruments
    const loadAllEntities = async () => {
      try {
        const allEntities = new Map<string, any>();
        
        // Add instruments
        entities.forEach((entity) => {
          allEntities.set(`instrument_${entity.id}`, {
            ...entity,
            entityType: 'Instrument',
            displayName: entity.nomInstrument || `Instrument ${entity.id}`
          });
        });
        
        return allEntities;
      } catch (error) {
        console.error('Error loading entities:', error);
        return new Map();
      }
    };

    // Create a comprehensive entity map
    const allEntitiesMap = new Map<string, any>();
    entities.forEach((entity) => {
      allEntitiesMap.set(`instrument_${entity.id}`, {
        ...entity,
        entityType: 'Instrument',
        displayName: entity.nomInstrument || `Instrument ${entity.id}`
      });
    });

    // Create nodes from relations to get all referenced entities
    const referencedEntities = new Set<string>();
    relations.forEach((relation) => {
      if (relation.sourceId && relation.sourceType) {
        referencedEntities.add(`${relation.sourceType.toLowerCase()}_${relation.sourceId}`);
      }
      if (relation.targetId && relation.targetType) {
        referencedEntities.add(`${relation.targetType.toLowerCase()}_${relation.targetId}`);
      }
    });

    // Create nodes for all referenced entities
    referencedEntities.forEach((entityKey) => {
      const [type, id] = entityKey.split('_');
      const entityType = type.charAt(0).toUpperCase() + type.slice(1);
      
      let entity = allEntitiesMap.get(entityKey);
      if (!entity) {
        // Create placeholder entity if not found
        entity = {
          id: parseInt(id),
          entityType,
          displayName: `${entityType} ${id}`,
        };
      }
      
      const config = ENTITY_CONFIGS[entityType as keyof typeof ENTITY_CONFIGS] || 
                    { color: '#999', size: 8, icon: '?' };
      
      nodeMap.set(entityKey, {
        id: entityKey,
        name: entity.displayName || `${entityType} ${id}`,
        type: entityType,
        group: Object.keys(ENTITY_CONFIGS).indexOf(entityType),
        size: config.size * settings.nodeSize,
        color: config.color,
        data: entity,
      });
    });

    // Create links from relations
    relations.forEach((relation) => {
      const sourceKey = relation.sourceType && relation.sourceId ? 
        `${relation.sourceType.toLowerCase()}_${relation.sourceId}` : null;
      const targetKey = relation.targetType && relation.targetId ? 
        `${relation.targetType.toLowerCase()}_${relation.targetId}` : null;
      
      if (sourceKey && targetKey && nodeMap.has(sourceKey) && nodeMap.has(targetKey)) {
        const config = RELATION_CONFIGS[relation.relationType as keyof typeof RELATION_CONFIGS] || 
                      RELATION_CONFIGS.default;
        
        links.push({
          source: sourceKey,
          target: targetKey,
          type: relation.relationType,
          strength: config.strength * settings.linkStrength,
          color: config.color,
          data: relation,
        });
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links,
    };
  };

  /**
   * Initialize D3 force simulation and visualization
   */
  const initializeVisualization = useCallback(() => {
    if (!svgRef.current || !graphData.nodes.length) return;

    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content

    const width = svg.node()?.getBoundingClientRect().width || 800;
    const height = svg.node()?.getBoundingClientRect().height || 600;

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation with error handling
    try {
      const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
        .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links)
          .id(d => d.id)
          .strength(d => d.strength)
        )
        .force('charge', d3.forceManyBody().strength(settings.chargeStrength))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.size + 2));

      simulationRef.current = simulation;
    } catch (error) {
      console.error('Error creating D3 simulation:', error);
      return;
    }

    // Create arrow markers for directed edges
    const defs = svg.append('defs');
    
    // Create different arrow markers for different relation types
    Object.entries(RELATION_CONFIGS).forEach(([relationType, config]) => {
      defs.append('marker')
        .attr('id', `arrow-${relationType}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', config.color)
        .attr('stroke', config.color);
    });
    
    // Default arrow marker
    defs.append('marker')
      .attr('id', 'arrow-default')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#666')
      .attr('stroke', '#666');

    // Create links with arrows
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .enter().append('line')
      .attr('stroke', d => d.color)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.strength * 10))
      .attr('marker-end', d => `url(#arrow-${d.type})`);
    
    // Add relation labels on links
    const linkLabels = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(graphData.links)
      .enter().append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'Arial')
      .attr('fill', '#333')
      .attr('background', 'white')
      .style('pointer-events', 'none')
      .text(d => d.type);

    // Create nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(graphData.nodes)
      .enter().append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
        setOpenNodeDialog(true);
        if (onNodeSelect) {
          onNodeSelect(d);
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 3)
          .attr('stroke', '#333');
        
        // Show tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'graph-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('pointer-events', 'none')
          .style('font-size', '12px')
          .style('z-index', 1000)
          .html(`
            <strong>${d.name}</strong><br/>
            Type: ${d.type}<br/>
            ID: ${d.id}
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');

        setTimeout(() => tooltip.remove(), 3000);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 1.5)
          .attr('stroke', '#fff');
        
        d3.selectAll('.graph-tooltip').remove();
      })
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add labels if enabled
    if (settings.showLabels) {
      const labels = g.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(graphData.nodes)
        .enter().append('text')
        .text(d => d.name)
        .attr('font-size', '10px')
        .attr('font-family', 'Arial')
        .attr('fill', '#333')
        .attr('text-anchor', 'middle')
        .attr('dy', d => d.size + 12)
        .style('pointer-events', 'none');

      simulationRef.current.on('tick', () => {
        try {
          // Update links with proper arrow positioning
          link
            .attr('x1', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.x || !target.x) return 0;
              const dx = target.x! - source.x!;
              const dy = target.y! - source.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance > 0 ? source.x! + (dx * source.size / distance) : source.x!;
            })
            .attr('y1', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.y || !target.y) return 0;
              const dx = target.x! - source.x!;
              const dy = target.y! - source.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance > 0 ? source.y! + (dy * source.size / distance) : source.y!;
            })
            .attr('x2', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.x || !target.x) return 0;
              const dx = target.x! - source.x!;
              const dy = target.y! - source.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance > 0 ? target.x! - (dx * target.size / distance) : target.x!;
            })
            .attr('y2', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.y || !target.y) return 0;
              const dx = target.x! - source.x!;
              const dy = target.y! - source.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance > 0 ? target.y! - (dy * target.size / distance) : target.y!;
            });

          // Update link labels position
          linkLabels
            .attr('x', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.x || !target.x) return 0;
              return (source.x! + target.x!) / 2;
            })
            .attr('y', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.y || !target.y) return 0;
              return (source.y! + target.y!) / 2;
            });

          node
            .attr('cx', d => d.x || 0)
            .attr('cy', d => d.y || 0);

          labels
            .attr('x', d => d.x || 0)
            .attr('y', d => d.y || 0);
        } catch (error) {
          console.warn('Error in simulation tick:', error);
        }
      });
    } else {
      simulationRef.current.on('tick', () => {
        try {
          // Update links with proper arrow positioning
          link
            .attr('x1', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.x || !target.x) return 0;
              const dx = target.x! - source.x!;
              const dy = target.y! - source.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance > 0 ? source.x! + (dx * source.size / distance) : source.x!;
            })
            .attr('y1', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.y || !target.y) return 0;
              const dx = target.x! - source.x!;
              const dy = target.y! - source.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance > 0 ? source.y! + (dy * source.size / distance) : source.y!;
            })
            .attr('x2', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.x || !target.x) return 0;
              const dx = target.x! - source.x!;
              const dy = target.y! - source.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance > 0 ? target.x! - (dx * target.size / distance) : target.x!;
            })
            .attr('y2', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.y || !target.y) return 0;
              const dx = target.x! - source.x!;
              const dy = target.y! - source.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance > 0 ? target.y! - (dy * target.size / distance) : target.y!;
            });

          // Update link labels position
          linkLabels
            .attr('x', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.x || !target.x) return 0;
              return (source.x! + target.x!) / 2;
            })
            .attr('y', d => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (!source || !target || !source.y || !target.y) return 0;
              return (source.y! + target.y!) / 2;
            });

          node
            .attr('cx', d => d.x || 0)
            .attr('cy', d => d.y || 0);

          labels
            .attr('x', d => d.x || 0)
            .attr('y', d => d.y || 0);
        } catch (error) {
          console.warn('Error in simulation tick:', error);
        }
      });
    }

    // Focus on specific entity if provided
    if (focusEntity) {
      const focusNode = graphData.nodes.find(n => 
        n.id === focusEntity.id.toString() && n.type === focusEntity.type
      );
      
      if (focusNode) {
        setTimeout(() => {
          const scale = 2;
          const x = width / 2 - focusNode.x! * scale;
          const y = height / 2 - focusNode.y! * scale;
          const transform = d3.zoomIdentity.translate(x, y).scale(scale);
          
          svg.transition()
            .duration(750)
            .call(zoom.transform, transform);
        }, 1000);
      }
    }

  }, [graphData, settings, focusEntity, onNodeSelect]);

  /**
   * Handle zoom controls
   */
  const handleZoom = (scale: number) => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const newTransform = transformRef.current.scale(scale);
    
    svg.transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().transform, newTransform);
  };

  /**
   * Center the graph
   */
  const handleCenter = () => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(500)
      .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
  };

  /**
   * Export graph as SVG
   */
  const handleExport = () => {
    if (!svgRef.current) return;
    
    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'graph-visualization.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <LoadingSpinner message="Chargement de la visualisation..." />
      </Box>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Box sx={{ height }}>
        <ErrorMessage message={error} showRetry onRetry={loadGraphData} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Controls */}
      {showControls && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Zoom avant">
                  <IconButton onClick={() => handleZoom(1.5)} size="small">
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom arrière">
                  <IconButton onClick={() => handleZoom(0.75)} size="small">
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Centrer">
                  <IconButton onClick={handleCenter} size="small">
                    <CenterFocusStrong />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Exporter SVG">
                  <IconButton onClick={handleExport} size="small">
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Actualiser">
                  <IconButton onClick={loadGraphData} size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            
            <Grid item>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showLabels}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      showLabels: e.target.checked 
                    }))}
                  />
                }
                label="Étiquettes"
              />
            </Grid>

            <Grid item xs>
              <Typography variant="body2" color="text.secondary">
                {graphData.nodes.length} nœuds, {graphData.links.length} liens
              </Typography>
            </Grid>
          </Grid>

          {/* Advanced Settings */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={3}>
              <Typography gutterBottom>Force des liens</Typography>
              <Slider
                value={settings.linkStrength}
                onChange={(e, value) => setSettings(prev => ({ 
                  ...prev, 
                  linkStrength: value as number 
                }))}
                min={0.1}
                max={2.0}
                step={0.1}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography gutterBottom>Taille des nœuds</Typography>
              <Slider
                value={settings.nodeSize}
                onChange={(e, value) => setSettings(prev => ({ 
                  ...prev, 
                  nodeSize: value as number 
                }))}
                min={0.5}
                max={3.0}
                step={0.1}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography gutterBottom>Force de répulsion</Typography>
              <Slider
                value={Math.abs(settings.chargeStrength)}
                onChange={(e, value) => setSettings(prev => ({ 
                  ...prev, 
                  chargeStrength: -(value as number) 
                }))}
                min={100}
                max={1000}
                step={50}
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Graph Visualization */}
      <Paper sx={{ position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          style={{ border: '1px solid #e0e0e0' }}
        />
        
        {/* Legend */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            p: 2,
            borderRadius: 1,
            maxWidth: 250,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Légende
          </Typography>
          
          {/* Entity types */}
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 1 }}>
            Types d'entités:
          </Typography>
          {Object.entries(ENTITY_CONFIGS).filter(([type]) => type !== 'Unknown').map(([type, config]) => (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: config.color,
                  borderRadius: '50%',
                  mr: 1,
                }}
              />
              <Typography variant="caption">
                {config.icon} {type}
              </Typography>
            </Box>
          ))}
          
          {/* Relation types */}
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 2 }}>
            Types de relations:
          </Typography>
          {Object.entries(RELATION_CONFIGS).filter(([type]) => type !== 'default').map(([type, config]) => (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 2,
                  height: 12,
                  bgcolor: config.color,
                  mr: 1,
                }}
              />
              <Typography variant="caption">
                {type}
              </Typography>
            </Box>
          ))}
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            💡 Les flèches indiquent la direction des relations
          </Typography>
        </Box>
      </Paper>

      {/* Node Details Dialog */}
      <Dialog
        open={openNodeDialog}
        onClose={() => setOpenNodeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Détails du Nœud
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedNode.name}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Type
                    </Typography>
                    <Chip label={selectedNode.type} size="small" />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      ID
                    </Typography>
                    <Typography variant="body2">
                      {selectedNode.id}
                    </Typography>
                  </Grid>
                </Grid>
                
                {selectedNode.data && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Données
                    </Typography>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                      {JSON.stringify(selectedNode.data, null, 2)}
                    </pre>
                  </Box>
                )}
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  onClick={() => console.log('View full entity:', selectedNode)}
                >
                  Voir Détails Complets
                </Button>
              </CardActions>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default GraphVisualization;