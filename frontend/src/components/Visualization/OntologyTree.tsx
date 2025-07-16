/**
 * Ontology Tree Visualization Component
 * 
 * This component provides a hierarchical tree visualization of the ontology
 * structure similar to Protégé application. Features include:
 * - D3.js tree layout for hierarchical display
 * - Interactive node expansion/collapse
 * - Entity and relation type visualization
 * - Zoom and pan capabilities
 * - Legend and metadata display
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControlLabel,
  Switch,
  Slider,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Alert,
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
  ExpandMore,
  AccountTree,
  Info,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import * as d3 from 'd3';
import { relationsApi } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';
import ErrorMessage from '../Common/ErrorMessage';

// Interfaces for ontology data
interface OntologyNode {
  name: string;
  type: string;
  description?: string;
  icon?: string;
  color?: string;
  children?: OntologyNode[];
  relations?: {
    outgoing?: string[];
    incoming?: string[];
  };
  from?: string[];
  to?: string[];
  cardinality?: string;
  x?: number;
  y?: number;
  x0?: number;
  y0?: number;
  _children?: OntologyNode[];
  depth?: number;
  parent?: OntologyNode;
}

interface OntologyData {
  name: string;
  description: string;
  children: OntologyNode[];
  metadata?: {
    totalRelations: number;
    activeRelationTypes: number;
    entitiesCount: { [key: string]: number };
    lastUpdated: string;
  };
}

interface OntologyTreeProps {
  /** Height of the visualization */
  height?: number;
  /** Whether to show controls */
  showControls?: boolean;
  /** Callback when node is selected */
  onNodeSelect?: (node: OntologyNode) => void;
}

/**
 * Ontology tree visualization component
 */
const OntologyTree: React.FC<OntologyTreeProps> = ({
  height = 800,
  showControls = true,
  onNodeSelect,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ontologyData, setOntologyData] = useState<OntologyData | null>(null);
  const [selectedNode, setSelectedNode] = useState<OntologyNode | null>(null);
  
  // Visualization settings
  const [settings, setSettings] = useState({
    showLabels: true,
    showIcons: true,
    nodeSize: 1.0,
    linkLength: 150,
    showRelations: true,
    showEntities: true,
    expandAll: false,
  });

  // D3 tree and elements
  const treeRef = useRef<d3.TreeLayout<OntologyNode> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const rootNodeRef = useRef<d3.HierarchyNode<OntologyNode> | null>(null);

  /**
   * Load ontology data
   */
  useEffect(() => {
    loadOntologyData();
  }, []);

  /**
   * Initialize D3 visualization when data changes
   */
  useEffect(() => {
    if (ontologyData) {
      initializeVisualization();
    }
  }, [ontologyData, settings]);

  /**
   * Load ontology data from API
   */
  const loadOntologyData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await relationsApi.getOntology();
      if (response.success) {
        setOntologyData(response.data);
      } else {
        setError(response.error || 'Erreur lors du chargement de l\'ontologie');
      }
    } catch (err) {
      console.error('Error loading ontology data:', err);
      setError('Erreur lors du chargement de l\'ontologie');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initialize D3 tree visualization
   */
  const initializeVisualization = useCallback(() => {
    if (!svgRef.current || !ontologyData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content

    const width = svg.node()?.getBoundingClientRect().width || 1000;
    const treeHeight = height - 100;

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create tree layout
    const tree = d3.tree<OntologyNode>()
      .size([width - 200, treeHeight - 100])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) * settings.nodeSize);

    treeRef.current = tree;

    // Create hierarchy from ontology data
    const root = d3.hierarchy<OntologyNode>(ontologyData as any);
    
    // Initialize collapsed state
    if (!settings.expandAll) {
      root.children?.forEach(collapse);
    }
    
    rootNodeRef.current = root;

    // Function to collapse nodes
    function collapse(d: d3.HierarchyNode<OntologyNode>) {
      if (d.children) {
        d.data._children = d.children.map(child => child.data);
        d.children.forEach(collapse);
        d.children = undefined;
      }
    }

    // Function to toggle node
    function toggle(d: d3.HierarchyNode<OntologyNode>) {
      if (d.children) {
        d.data._children = d.children.map(child => child.data);
        d.children = undefined;
      } else if (d.data._children) {
        d.children = d.data._children.map(child => d3.hierarchy(child));
        d.data._children = undefined;
      }
    }

    // Update tree function
    function update(source: d3.HierarchyNode<OntologyNode>) {
      const treeData = tree(root);
      const nodes = treeData.descendants();
      const links = treeData.descendants().slice(1);

      // Normalize for fixed-depth
      nodes.forEach(d => d.y = d.depth * settings.linkLength);

      // Update nodes
      const node = g.selectAll('.node')
        .data(nodes, (d: any) => d.id || (d.id = ++nodeId));

      const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${source.y0 || 0},${source.x0 || 0})`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          toggle(d);
          update(d);
          
          setSelectedNode(d.data);
          if (onNodeSelect) {
            onNodeSelect(d.data);
          }
        });

      // Add circles for nodes
      nodeEnter.append('circle')
        .attr('r', 1e-6)
        .style('fill', d => d.data.color || '#999')
        .style('stroke', '#fff')
        .style('stroke-width', '2px');

      // Add labels
      if (settings.showLabels) {
        nodeEnter.append('text')
          .attr('dy', '.35em')
          .attr('x', d => d.children || d.data._children ? -13 : 13)
          .attr('text-anchor', d => d.children || d.data._children ? 'end' : 'start')
          .text(d => d.data.name)
          .style('font-size', `${12 * settings.nodeSize}px`)
          .style('font-family', 'Arial, sans-serif')
          .style('fill', '#333');
      }

      // Add icons if enabled
      if (settings.showIcons && settings.showLabels) {
        nodeEnter.append('text')
          .attr('dy', '.35em')
          .attr('x', d => d.children || d.data._children ? -25 : 25)
          .attr('text-anchor', 'middle')
          .text(d => d.data.icon || '')
          .style('font-size', `${14 * settings.nodeSize}px`);
      }

      // Node update
      const nodeUpdate = nodeEnter.merge(node as any);

      nodeUpdate.transition()
        .duration(750)
        .attr('transform', d => `translate(${d.y},${d.x})`);

      nodeUpdate.select('circle')
        .attr('r', d => {
          if (d.data.type === 'category') return 8 * settings.nodeSize;
          if (d.data.type === 'entity') return 6 * settings.nodeSize;
          if (d.data.type === 'relation') return 4 * settings.nodeSize;
          return 5 * settings.nodeSize;
        })
        .style('fill', d => {
          if (d.data.type === 'category') return '#4caf50';
          return d.data.color || '#2196f3';
        })
        .style('stroke', d => selectedNode?.name === d.data.name ? '#ff5722' : '#fff')
        .style('stroke-width', d => selectedNode?.name === d.data.name ? '3px' : '2px');

      // Node exit
      const nodeExit = node.exit().transition()
        .duration(750)
        .attr('transform', d => `translate(${source.y},${source.x})`)
        .remove();

      nodeExit.select('circle')
        .attr('r', 1e-6);

      nodeExit.select('text')
        .style('fill-opacity', 1e-6);

      // Update links
      const link = g.selectAll('.link')
        .data(links, (d: any) => d.id);

      const linkEnter = link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('d', d => {
          const o = { x: source.x0 || 0, y: source.y0 || 0 };
          return diagonal(o, o);
        })
        .style('fill', 'none')
        .style('stroke', '#ccc')
        .style('stroke-width', '2px');

      const linkUpdate = linkEnter.merge(link as any);

      linkUpdate.transition()
        .duration(750)
        .attr('d', d => diagonal(d, d.parent!));

      const linkExit = link.exit().transition()
        .duration(750)
        .attr('d', d => {
          const o = { x: source.x, y: source.y };
          return diagonal(o, o);
        })
        .remove();

      // Store old positions for transition
      nodes.forEach(d => {
        d.data.x0 = d.x;
        d.data.y0 = d.y;
      });
    }

    // Diagonal path generator
    function diagonal(s: any, d: any) {
      return `M ${s.y} ${s.x}
              C ${(s.y + d.y) / 2} ${s.x},
                ${(s.y + d.y) / 2} ${d.x},
                ${d.y} ${d.x}`;
    }

    let nodeId = 0;

    // Initial render
    root.data.x0 = treeHeight / 2;
    root.data.y0 = 0;
    update(root);

    // Center the tree
    setTimeout(() => {
      const bounds = g.node()?.getBBox();
      if (bounds) {
        const fullWidth = width;
        const fullHeight = treeHeight;
        const scale = 0.8 / Math.max(bounds.width / fullWidth, bounds.height / fullHeight);
        const translate = [
          fullWidth / 2 - scale * (bounds.x + bounds.width / 2),
          fullHeight / 2 - scale * (bounds.y + bounds.height / 2)
        ];

        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      }
    }, 100);

  }, [ontologyData, settings, selectedNode, height, onNodeSelect]);

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
   * Center the tree
   */
  const handleCenter = () => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(500)
      .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
  };

  /**
   * Export tree as SVG
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
    link.download = 'ontology-tree.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Toggle expand all nodes
   */
  const handleExpandAll = () => {
    setSettings(prev => ({ ...prev, expandAll: !prev.expandAll }));
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <LoadingSpinner message="Chargement de l'ontologie..." />
      </Box>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Box sx={{ height }}>
        <ErrorMessage message={error} showRetry onRetry={loadOntologyData} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          <AccountTree sx={{ mr: 1, verticalAlign: 'middle' }} />
          Arbre Ontologique
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visualisation hiérarchique de l'ontologie des instruments musicaux
        </Typography>
      </Box>

      {/* Metadata */}
      {ontologyData?.metadata && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {ontologyData.metadata.totalRelations}
                </Typography>
                <Typography variant="caption">
                  Relations actives
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="secondary">
                  {ontologyData.metadata.activeRelationTypes}
                </Typography>
                <Typography variant="caption">
                  Types de relations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">
                  {Object.keys(ontologyData.metadata.entitiesCount || {}).length}
                </Typography>
                <Typography variant="caption">
                  Types d'entités
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="info.main">
                  {Object.values(ontologyData.metadata.entitiesCount || {}).reduce((a, b) => a + b, 0)}
                </Typography>
                <Typography variant="caption">
                  Total entités
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

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
                <Tooltip title="Tout déplier/replier">
                  <IconButton onClick={handleExpandAll} size="small">
                    {settings.expandAll ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Exporter SVG">
                  <IconButton onClick={handleExport} size="small">
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Actualiser">
                  <IconButton onClick={loadOntologyData} size="small">
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
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showIcons}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      showIcons: e.target.checked 
                    }))}
                  />
                }
                label="Icônes"
              />
            </Grid>
          </Grid>

          {/* Advanced Settings */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">Paramètres avancés</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography gutterBottom>Taille des nœuds</Typography>
                  <Slider
                    value={settings.nodeSize}
                    onChange={(e, value) => setSettings(prev => ({ 
                      ...prev, 
                      nodeSize: value as number 
                    }))}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography gutterBottom>Espacement vertical</Typography>
                  <Slider
                    value={settings.linkLength}
                    onChange={(e, value) => setSettings(prev => ({ 
                      ...prev, 
                      linkLength: value as number 
                    }))}
                    min={100}
                    max={300}
                    step={25}
                    size="small"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {/* Tree Visualization */}
      <Paper sx={{ position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          style={{ border: '1px solid #e0e0e0', background: '#fafafa' }}
        />
        
        {/* Legend */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            p: 2,
            borderRadius: 1,
            maxWidth: 250,
            border: '1px solid #e0e0e0',
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            <Info sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Légende
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                bgcolor: '#4caf50',
                borderRadius: '50%',
                mr: 1,
              }}
            />
            <Typography variant="caption">Catégorie</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                bgcolor: '#2196f3',
                borderRadius: '50%',
                mr: 1,
              }}
            />
            <Typography variant="caption">Entité</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                bgcolor: '#666',
                borderRadius: '50%',
                mr: 1,
              }}
            />
            <Typography variant="caption">Relation</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Cliquez sur les nœuds pour déplier/replier
          </Typography>
        </Box>
      </Paper>

      {/* Selected Node Details */}
      {selectedNode && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {selectedNode.icon} {selectedNode.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {selectedNode.description}
          </Typography>
          
          {selectedNode.type === 'entity' && selectedNode.relations && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Relations sortantes:</Typography>
                <Box sx={{ mt: 1 }}>
                  {selectedNode.relations.outgoing?.map(rel => (
                    <Chip key={rel} label={rel} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Relations entrantes:</Typography>
                <Box sx={{ mt: 1 }}>
                  {selectedNode.relations.incoming?.map(rel => (
                    <Chip key={rel} label={rel} size="small" color="secondary" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              </Grid>
            </Grid>
          )}
          
          {selectedNode.type === 'relation' && (
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="subtitle2">De:</Typography>
                <Typography variant="body2">{selectedNode.from?.join(', ')}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Vers:</Typography>
                <Typography variant="body2">{selectedNode.to?.join(', ')}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Cardinalité:</Typography>
                <Typography variant="body2">{selectedNode.cardinality}</Typography>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default OntologyTree;