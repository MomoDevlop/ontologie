/**
 * Graph Visualization Component
 * 
 * This component provides interactive graph visualization for Neo4j relationships
 * using Cytoscape.js. Features include:
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
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import { relationsApi, instrumentsApi } from '../../services/api';
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
  onNodeSelect?: (node: any) => void;
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
  const cyRef = useRef<cytoscape.Core | null>(null);
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<RelationGraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [openNodeDialog, setOpenNodeDialog] = useState(false);
  
  // Visualization settings
  const [settings, setSettings] = useState({
    showLabels: true,
    layout: 'cose',
    nodeSize: 1.0,
    filterByType: 'all',
    filterByRelation: 'all',
  });

  // Layout options for Cytoscape
  const layoutOptions = {
    'cose': { 
      name: 'cose', 
      idealEdgeLength: 100, 
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
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 30
    },
  };

  // Cytoscape stylesheet for relations graph
  const cytoscapeStylesheet = [
    // Base node style
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '12px',
        'font-family': 'Arial, sans-serif',
        'color': '#000',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        'width': 'data(size)',
        'height': 'data(size)',
        'border-width': '2px',
        'border-color': '#666',
        'overlay-opacity': 0,
        'cursor': 'grab',
      } as any,
    },
    // Node when being dragged
    {
      selector: 'node:grabbed',
      style: {
        'cursor': 'grabbing',
        'border-width': '3px',
        'border-color': '#FF5722',
      } as any,
    },
    // Base edge style
    {
      selector: 'edge',
      style: {
        'width': '2px',
        'line-color': 'data(color)',
        'target-arrow-color': 'data(color)',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'edge-text-rotation': 'autorotate',
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
      selector: 'node:hover',
      style: {
        'border-width': '3px',
        'border-color': '#FF9800',
        'cursor': 'grab',
      } as any,
    },
    // Highlighted elements
    {
      selector: '.highlighted',
      style: {
        'border-width': '4px',
        'border-color': '#2196F3',
        'line-color': '#2196F3',
        'target-arrow-color': '#2196F3',
        'line-style': 'solid',
        'width': '3px',
      } as any,
    },
  ];

  /**
   * Load graph data
   */
  useEffect(() => {
    loadGraphData();
  }, [focusEntity]);

  /**
   * Initialize when data changes
   */
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      console.log('Graph data ready for visualization:', graphData);
    }
  }, [graphData, settings]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (cyRef.current) {
        try {
          cyRef.current.removeAllListeners();
          cyRef.current.destroy();
        } catch (err) {
          console.warn('Error cleaning up cytoscape instance:', err);
        }
        cyRef.current = null;
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
      console.log('Relations response:', relationsResponse);
      if (!relationsResponse.success) {
        throw new Error(relationsResponse.error || 'Failed to load relations');
      }

      // Load all entities from different endpoints
      const [instrumentsResponse, famillesResponse, groupesResponse, localitesResponse] = await Promise.all([
        instrumentsApi.getAll({ limit: 1000 }),
        fetch('/api/familles').then(r => r.json()),
        fetch('/api/groupes-ethniques').then(r => r.json()),
        fetch('/api/localites').then(r => r.json())
      ]);

      console.log('Loaded entities:', {
        instruments: instrumentsResponse.data?.data?.length || 0,
        familles: famillesResponse.data?.data?.length || 0,
        groupes: groupesResponse.data?.data?.length || 0,
        localites: localitesResponse.data?.data?.length || 0
      });

      // Process relations data
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

      // Process data into Cytoscape format
      const processedData = processRelationGraphData(
        validRelations,
        {
          instruments: instrumentsResponse.data?.data || [],
          familles: famillesResponse.data?.data || [],
          groupes: groupesResponse.data?.data || [],
          localites: localitesResponse.data?.data || []
        }
      );

      console.log('Processed graph data:', processedData);
      setGraphData(processedData);
    } catch (err) {
      console.error('Error loading graph data:', err);
      setError('Erreur lors du chargement des données du graphe');
    } finally {
      setLoading(false);
    }
  };"

  /**
   * Process raw data into graph format
   */
  /**
   * Process relations and entities into Cytoscape format
   */
  const processRelationGraphData = (relations: any[], allEntities: any): RelationGraphData => {
    const nodes: CytoscapeNode[] = [];
    const edges: CytoscapeEdge[] = [];
    const nodeIds = new Set<string>();

    // Entity configurations
    const entityConfigs = {
      'Instrument': { color: '#1976d2', size: 40 },
      'Famille': { color: '#dc004e', size: 35 },
      'GroupeEthnique': { color: '#2e7d32', size: 30 },
      'Localite': { color: '#0288d1', size: 30 },
      'Materiau': { color: '#ed6c02', size: 25 },
      'Timbre': { color: '#9c27b0', size: 25 },
      'TechniqueDeJeu': { color: '#795548', size: 25 },
      'Artisan': { color: '#ff5722', size: 30 },
      'PatrimoineCulturel': { color: '#607d8b', size: 35 },
      'Rythme': { color: '#4caf50', size: 30 },
      'Unknown': { color: '#999', size: 25 },
    };

    // Relation configurations
    const relationConfigs = {
      'appartientA': { color: '#1976d2' },
      'utilisePar': { color: '#2e7d32' },
      'produitRythme': { color: '#ff9800' },
      'localiseA': { color: '#03a9f4' },
      'constitueDe': { color: '#795548' },
      'joueAvec': { color: '#9c27b0' },
      'fabrique': { color: '#ff5722' },
      'caracterise': { color: '#e91e63' },
      'englobe': { color: '#607d8b' },
      'appliqueA': { color: '#8bc34a' },
      'default': { color: '#666' },
    };

    // Create a comprehensive entity map
    const allEntitiesMap = new Map<string, any>();
    
    // Add instruments
    allEntities.instruments.forEach((entity: any) => {
      const key = `instrument_${entity.id}`;
      allEntitiesMap.set(key, {
        ...entity,
        entityType: 'Instrument',
        displayName: entity.nomInstrument || `Instrument ${entity.id}`
      });
    });

    // Add familles
    allEntities.familles.forEach((entity: any) => {
      const key = `famille_${entity.id}`;
      allEntitiesMap.set(key, {
        ...entity,
        entityType: 'Famille',
        displayName: entity.nomFamille || `Famille ${entity.id}`
      });
    });

    // Add groupes ethniques
    allEntities.groupes.forEach((entity: any) => {
      const key = `groupeethnique_${entity.id}`;
      allEntitiesMap.set(key, {
        ...entity,
        entityType: 'GroupeEthnique',
        displayName: entity.nomGroupe || `Groupe ${entity.id}`
      });
    });

    // Add localites
    allEntities.localites.forEach((entity: any) => {
      const key = `localite_${entity.id}`;
      allEntitiesMap.set(key, {
        ...entity,
        entityType: 'Localite',
        displayName: entity.nomLocalite || `Localité ${entity.id}`
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

    // Create Cytoscape nodes for all referenced entities
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
      
      const config = entityConfigs[entityType as keyof typeof entityConfigs] || entityConfigs.Unknown;
      
      if (!nodeIds.has(entityKey)) {
        nodes.push({
          data: {
            id: entityKey,
            label: entity.displayName || `${entityType} ${id}`,
            type: entityType,
            entityType: entityType,
            size: config.size * settings.nodeSize,
            color: config.color,
            originalData: entity,
          },
        });
        nodeIds.add(entityKey);
      }
    });

    // Create Cytoscape edges from relations
    relations.forEach((relation) => {
      const sourceKey = relation.sourceType && relation.sourceId ? 
        `${relation.sourceType.toLowerCase()}_${relation.sourceId}` : null;
      const targetKey = relation.targetType && relation.targetId ? 
        `${relation.targetType.toLowerCase()}_${relation.targetId}` : null;
      
      if (sourceKey && targetKey && nodeIds.has(sourceKey) && nodeIds.has(targetKey)) {
        const config = relationConfigs[relation.relationType as keyof typeof relationConfigs] || relationConfigs.default;
        
        edges.push({
          data: {
            id: `${sourceKey}_${targetKey}_${relation.relationType}`,
            source: sourceKey,
            target: targetKey,
            label: relation.relationType,
            relationType: relation.relationType,
            color: config.color,
            originalData: relation,
          },
        });
      }
    });

    console.log('Processed relation graph data:', { nodes: nodes.length, edges: edges.length });
    return { nodes, edges };
  };"

  /**
   * Handle Cytoscape events
   */
  const handleCytoscapeEvents = useCallback((cy: cytoscape.Core) => {
    if (!cy || !isMountedRef.current) return;
    
    // Clean up previous instance
    if (cyRef.current) {
      try {
        cyRef.current.removeAllListeners();
      } catch (err) {
        console.warn('Error cleaning up previous cytoscape instance:', err);
      }
    }
    
    cyRef.current = cy;
    let isMounted = true;

    // Clean up previous listeners
    try {
      cy.removeAllListeners();
    } catch (err) {
      console.warn('Error removing previous listeners:', err);
    }

    cy.startBatch();

    cy.ready(() => {
      if (!isMounted || !cyRef.current) {
        console.warn('Cytoscape instance is null or component unmounted');
        return;
      }

      // Node selection
      cy.on('tap', 'node', (event) => {
        if (!isMounted || !cyRef.current) return;
        const node = event.target;
        if (!node || !node.data) return;

        const nodeData = node.data();
        setSelectedNode(nodeData);
        if (onNodeSelect) onNodeSelect(nodeData);
        setOpenNodeDialog(true);

        try {
          cy.elements().removeClass('highlighted');
          node.addClass('highlighted');
          node.connectedEdges().addClass('highlighted');
          node.connectedEdges().connectedNodes().addClass('highlighted');
        } catch (err) {
          console.warn('Error highlighting elements:', err);
        }
      });

      // Dragging events
      cy.on('grab', 'node', (event) => {
        if (!isMounted) return;
        const node = event.target;
        if (node && node.addClass) {
          node.addClass('dragging');
        }
      });

      cy.on('free', 'node', (event) => {
        if (!isMounted) return;
        const node = event.target;
        if (node && node.removeClass) {
          node.removeClass('dragging');
        }
      });

      // Background tap
      cy.on('tap', (event) => {
        if (!isMounted || event.target !== cy) return;
        try {
          cy.elements().removeClass('highlighted');
          setSelectedNode(null);
          setOpenNodeDialog(false);
        } catch (err) {
          console.warn('Error deselecting elements:', err);
        }
      });

      // Apply layout
      if (cy.nodes().length > 0) {
        setTimeout(() => {
          if (!isMounted || !cyRef.current || cyRef.current.nodes().length === 0) {
            console.warn('Skipping layout: instance null, unmounted, or no nodes');
            return;
          }
          try {
            const layoutConfig = {
              ...layoutOptions[settings.layout as keyof typeof layoutOptions],
              stop: () => {
                if (!isMounted || !cyRef.current) return;
                try {
                  cyRef.current.nodes().forEach(node => {
                    if (node && node.grabify) node.grabify();
                  });
                } catch (err) {
                  console.warn('Error in layout stop:', err);
                }
              },
            };
            const layout = cyRef.current.layout(layoutConfig);
            layout.run();
          } catch (err) {
            console.warn('Error applying layout:', err);
          }
        }, 200);
      }

      try {
        cy.endBatch();
      } catch (err) {
        console.warn('Error ending batch:', err);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [settings.layout, onNodeSelect]);
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
  const handleZoom = (factor: number) => {
    if (cyRef.current) {
      try {
        const currentZoom = cyRef.current.zoom();
        const newZoom = currentZoom * factor;
        const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
        cyRef.current.zoom({ level: clampedZoom });
      } catch (err) {
        console.warn('Error during zoom:', err);
      }
    }
  };

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
   * Export graph as PNG
   */
  const handleExport = () => {
    if (cyRef.current) {
      try {
        const png64 = cyRef.current.png({ scale: 2 });
        const link = document.createElement('a');
        link.href = png64;
        link.download = 'relations-graph.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.warn('Error exporting graph:', err);
      }
    }
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

            <Grid item>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Layout</InputLabel>
                <Select
                  value={settings.layout}
                  onChange={(e) => setSettings(prev => ({ ...prev, layout: e.target.value }))}
                  label="Layout"
                >
                  <MenuItem value="cose">Cose (Défaut)</MenuItem>
                  <MenuItem value="circle">Circulaire</MenuItem>
                  <MenuItem value="grid">Grille</MenuItem>
                  <MenuItem value="breadthfirst">Hiérarchique</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs>
              <Typography variant="body2" color="text.secondary">
                {graphData.nodes.length} nœuds, {graphData.edges.length} relations
              </Typography>
            </Grid>
          </Grid>

          {/* Advanced Settings */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
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
          </Grid>
        </Paper>
      )}

      {/* Graph Visualization */}
      <Paper sx={{ position: 'relative', overflow: 'hidden' }}>
        {graphData && graphData.nodes && graphData.nodes.length > 0 ? (
          <CytoscapeComponent
            elements={[...graphData.nodes, ...graphData.edges]}
            style={{ 
              width: '100%', 
              height: `${height}px`,
              cursor: 'default'
            }}
            wheelSensitivity={0.1}
            minZoom={0.1}
            maxZoom={5}
            userZoomingEnabled={true}
            userPanningEnabled={true}
            boxSelectionEnabled={false}
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
            height: `${height}px`,
            bgcolor: '#f5f5f5'
          }}>
            <Typography variant="h6" color="text.secondary">
              Aucune relation trouvée
            </Typography>
          </Box>
        )}
        
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
          {[
            { name: 'Instrument', color: '#1976d2' },
            { name: 'Famille', color: '#dc004e' },
            { name: 'GroupeEthnique', color: '#2e7d32' },
            { name: 'Localite', color: '#0288d1' },
            { name: 'Materiau', color: '#ed6c02' },
            { name: 'Timbre', color: '#9c27b0' },
            { name: 'TechniqueDeJeu', color: '#795548' },
            { name: 'Artisan', color: '#ff5722' },
            { name: 'PatrimoineCulturel', color: '#607d8b' },
            { name: 'Rythme', color: '#4caf50' },
          ].map(({ name, color }) => (
            <Box key={name} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: color,
                  borderRadius: '50%',
                  mr: 1,
                }}
              />
              <Typography variant="caption">
                {name}
              </Typography>
            </Box>
          ))}
          
          {/* Relation types */}
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 2 }}>
            Types de relations:
          </Typography>
          {[
            { name: 'appartientA', color: '#1976d2' },
            { name: 'utilisePar', color: '#2e7d32' },
            { name: 'produitRythme', color: '#ff9800' },
            { name: 'localiseA', color: '#03a9f4' },
            { name: 'constitueDe', color: '#795548' },
            { name: 'joueAvec', color: '#9c27b0' },
            { name: 'fabrique', color: '#ff5722' },
            { name: 'caracterise', color: '#e91e63' },
            { name: 'englobe', color: '#607d8b' },
            { name: 'appliqueA', color: '#8bc34a' },
          ].map(({ name, color }) => (
            <Box key={name} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 2,
                  height: 12,
                  bgcolor: color,
                  mr: 1,
                }}
              />
              <Typography variant="caption">
                {name}
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
                  {selectedNode.label}
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
                
                {selectedNode.originalData && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Données
                    </Typography>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                      {JSON.stringify(selectedNode.originalData, null, 2)}
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