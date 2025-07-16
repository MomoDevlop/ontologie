const neo4jConnection = require('../config/neo4j');
const neo4j = require('neo4j-driver');
const { RelationConstraints } = require('../models/ontologyModels');

class RelationService {
  // Créer une relation entre deux entités
  async createRelation(sourceId, targetId, relationType) {
    try {
      // Vérifier que le type de relation est valide
      if (!RelationConstraints[relationType]) {
        throw new Error(`Type de relation invalide: ${relationType}`);
      }

      // Vérifier que les entités existent
      const sourceQuery = 'MATCH (n) WHERE ID(n) = $id RETURN n, labels(n) as labels';
      const sourceResult = await neo4jConnection.executeQuery(sourceQuery, { id: neo4j.int(parseInt(sourceId)) });
      const targetResult = await neo4jConnection.executeQuery(sourceQuery, { id: neo4j.int(parseInt(targetId)) });

      if (sourceResult.records.length === 0) {
        throw new Error('Entité source non trouvée');
      }
      if (targetResult.records.length === 0) {
        throw new Error('Entité cible non trouvée');
      }

      const sourceLabels = sourceResult.records[0].get('labels');
      const targetLabels = targetResult.records[0].get('labels');

      // Vérifier les contraintes de relation
      const constraints = RelationConstraints[relationType];
      const sourceValid = sourceLabels.some(label => constraints.from.includes(label));
      const targetValid = targetLabels.some(label => constraints.to.includes(label));

      if (!sourceValid) {
        throw new Error(`Type d'entité source invalide pour la relation ${relationType}. Attendu: ${constraints.from.join(', ')}`);
      }
      if (!targetValid) {
        throw new Error(`Type d'entité cible invalide pour la relation ${relationType}. Attendu: ${constraints.to.join(', ')}`);
      }

      // Vérifier les contraintes de cardinalité
      if (constraints.cardinality === '1:1') {
        // Pour les relations 1:1, vérifier qu'aucune relation du même type n'existe déjà
        const existingRelationQuery = `
          MATCH (s)-[r:${relationType}]->(t)
          WHERE ID(s) = $sourceId OR ID(t) = $targetId
          RETURN count(r) as count
        `;
        const existingResult = await neo4jConnection.executeQuery(existingRelationQuery, {
          sourceId: neo4j.int(parseInt(sourceId)),
          targetId: neo4j.int(parseInt(targetId))
        });

        if (existingResult.records[0].get('count').toNumber() > 0) {
          throw new Error(`Relation ${relationType} déjà existante (contrainte 1:1)`);
        }
      } else if (constraints.cardinality === '1:N') {
        // Pour les relations 1:N, vérifier que la relation exacte n'existe pas déjà
        const existingSourceQuery = `
          MATCH (s)-[r:${relationType}]->(t)
          WHERE ID(s) = $sourceId AND ID(t) = $targetId
          RETURN count(r) as count
        `;
        const existingSourceResult = await neo4jConnection.executeQuery(existingSourceQuery, {
          sourceId: neo4j.int(parseInt(sourceId)),
          targetId: neo4j.int(parseInt(targetId))
        });

        if (existingSourceResult.records[0].get('count').toNumber() > 0) {
          throw new Error(`Relation ${relationType} déjà existante entre ces entités`);
        }
      } else if (constraints.cardinality === 'N:1') {
        // Pour les relations N:1, vérifier que la source n'a pas déjà une relation du même type vers une autre cible
        const existingSourceQuery = `
          MATCH (s)-[r:${relationType}]->(t)
          WHERE ID(s) = $sourceId AND ID(t) <> $targetId
          RETURN count(r) as count
        `;
        const existingSourceResult = await neo4jConnection.executeQuery(existingSourceQuery, {
          sourceId: neo4j.int(parseInt(sourceId)),
          targetId: neo4j.int(parseInt(targetId))
        });

        if (existingSourceResult.records[0].get('count').toNumber() > 0) {
          throw new Error(`Relation ${relationType} : la source ne peut avoir qu'une seule relation de ce type (contrainte N:1)`);
        }

        // Vérifier aussi que la relation exacte n'existe pas déjà
        const existingExactQuery = `
          MATCH (s)-[r:${relationType}]->(t)
          WHERE ID(s) = $sourceId AND ID(t) = $targetId
          RETURN count(r) as count
        `;
        const existingExactResult = await neo4jConnection.executeQuery(existingExactQuery, {
          sourceId: neo4j.int(parseInt(sourceId)),
          targetId: neo4j.int(parseInt(targetId))
        });

        if (existingExactResult.records[0].get('count').toNumber() > 0) {
          throw new Error(`Relation ${relationType} déjà existante entre ces entités`);
        }
      } else if (constraints.cardinality === 'N:N') {
        // Pour les relations N:N, vérifier seulement que la relation exacte n'existe pas déjà
        const existingExactQuery = `
          MATCH (s)-[r:${relationType}]->(t)
          WHERE ID(s) = $sourceId AND ID(t) = $targetId
          RETURN count(r) as count
        `;
        const existingExactResult = await neo4jConnection.executeQuery(existingExactQuery, {
          sourceId: neo4j.int(parseInt(sourceId)),
          targetId: neo4j.int(parseInt(targetId))
        });

        if (existingExactResult.records[0].get('count').toNumber() > 0) {
          throw new Error(`Relation ${relationType} déjà existante entre ces entités spécifiques`);
        }
      }

      // Créer la relation
      const createQuery = `
        MATCH (source), (target)
        WHERE ID(source) = $sourceId AND ID(target) = $targetId
        CREATE (source)-[r:${relationType}]->(target)
        RETURN r, source, target
      `;

      const result = await neo4jConnection.executeQuery(createQuery, {
        sourceId: neo4j.int(parseInt(sourceId)),
        targetId: neo4j.int(parseInt(targetId))
      });

      return {
        relation: {
          type: relationType,
          source: this.formatNode(result.records[0].get('source')),
          target: this.formatNode(result.records[0].get('target'))
        }
      };
    } catch (error) {
      throw new Error(`Erreur lors de la création de la relation: ${error.message}`);
    }
  }

  // Supprimer une relation
  async deleteRelation(sourceId, targetId, relationType) {
    try {
      const query = `
        MATCH (source)-[r:${relationType}]->(target)
        WHERE ID(source) = $sourceId AND ID(target) = $targetId
        DELETE r
        RETURN count(r) as deleted
      `;

      const result = await neo4jConnection.executeQuery(query, {
        sourceId: parseInt(sourceId),
        targetId: parseInt(targetId)
      });

      return {
        deleted: result.records[0].get('deleted').toNumber() > 0
      };
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de la relation: ${error.message}`);
    }
  }

  // Récupérer toutes les relations avec pagination
  async getAllRelations(limit = 50, skip = 0) {
    try {
      const query = `
        MATCH (source)-[r]->(target)
        RETURN source, r, target, labels(source) as sourceLabels, labels(target) as targetLabels
        ORDER BY type(r), source.nomInstrument, source.nom
        SKIP $skip
        LIMIT $limit
      `;

      const result = await neo4jConnection.executeQuery(query, { 
        limit: neo4j.int(parseInt(limit)), 
        skip: neo4j.int(parseInt(skip)) 
      });

      return result.records.map(record => {
        const relation = record.get('r');
        return {
          sourceId: record.get('source').identity.toNumber(),
          targetId: record.get('target').identity.toNumber(),
          relationType: relation.type,
          source: {
            ...this.formatNode(record.get('source')),
            type: record.get('sourceLabels')[0],
            displayName: this.getDisplayName(record.get('source'))
          },
          target: {
            ...this.formatNode(record.get('target')),
            type: record.get('targetLabels')[0],
            displayName: this.getDisplayName(record.get('target'))
          }
        };
      });
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des relations: ${error.message}`);
    }
  }

  // Récupérer toutes les relations d'une entité
  async getEntityRelations(entityId) {
    try {
      const query = `
        MATCH (entity)
        WHERE ID(entity) = $entityId
        
        OPTIONAL MATCH (entity)-[outRel]->(target)
        OPTIONAL MATCH (source)-[inRel]->(entity)
        
        RETURN entity,
               collect(DISTINCT {
                 type: type(outRel),
                 direction: 'OUT',
                 target: target,
                 targetLabels: labels(target)
               }) as outgoingRelations,
               collect(DISTINCT {
                 type: type(inRel),
                 direction: 'IN',
                 source: source,
                 sourceLabels: labels(source)
               }) as incomingRelations
      `;

      const result = await neo4jConnection.executeQuery(query, { entityId: parseInt(entityId) });

      if (result.records.length === 0) {
        throw new Error('Entité non trouvée');
      }

      const record = result.records[0];
      const entity = this.formatNode(record.get('entity'));
      
      const outgoingRelations = record.get('outgoingRelations')
        .filter(rel => rel.type && rel.target)
        .map(rel => ({
          type: rel.type,
          direction: rel.direction,
          entity: this.formatNode(rel.target),
          entityLabels: rel.targetLabels
        }));

      const incomingRelations = record.get('incomingRelations')
        .filter(rel => rel.type && rel.source)
        .map(rel => ({
          type: rel.type,
          direction: rel.direction,
          entity: this.formatNode(rel.source),
          entityLabels: rel.sourceLabels
        }));

      return {
        entity,
        relations: {
          outgoing: outgoingRelations,
          incoming: incomingRelations
        }
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des relations: ${error.message}`);
    }
  }

  // Récupérer toutes les relations d'un type spécifique
  async getRelationsByType(relationType, limit = 100) {
    try {
      if (!RelationConstraints[relationType]) {
        throw new Error(`Type de relation invalide: ${relationType}`);
      }

      const query = `
        MATCH (source)-[r:${relationType}]->(target)
        RETURN source, r, target, labels(source) as sourceLabels, labels(target) as targetLabels
        LIMIT $limit
      `;

      const result = await neo4jConnection.executeQuery(query, { limit: neo4j.int(parseInt(limit)) });

      return result.records.map(record => ({
        source: this.formatNode(record.get('source')),
        sourceLabels: record.get('sourceLabels'),
        target: this.formatNode(record.get('target')),
        targetLabels: record.get('targetLabels'),
        relationType
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des relations par type: ${error.message}`);
    }
  }

  // Rechercher des chemins entre deux entités
  async findPaths(sourceId, targetId, maxDepth = 3) {
    try {
      const query = `
        MATCH path = (source)-[*1..${maxDepth}]-(target)
        WHERE ID(source) = $sourceId AND ID(target) = $targetId
        RETURN path
        LIMIT 10
      `;

      const result = await neo4jConnection.executeQuery(query, {
        sourceId: parseInt(sourceId),
        targetId: parseInt(targetId)
      });

      return result.records.map(record => {
        const path = record.get('path');
        const nodes = path.segments.map(segment => ({
          start: this.formatNode(segment.start),
          relationship: {
            type: segment.relationship.type,
            direction: 'OUT'
          },
          end: this.formatNode(segment.end)
        }));
        
        return {
          length: path.length,
          nodes
        };
      });
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de chemins: ${error.message}`);
    }
  }

  // Statistiques des relations
  async getRelationStatistics() {
    try {
      const query = `
        MATCH ()-[r]->()
        RETURN type(r) as relationType, count(r) as count
        ORDER BY count DESC
      `;

      const result = await neo4jConnection.executeQuery(query);

      const stats = result.records.map(record => ({
        type: record.get('relationType'),
        count: record.get('count').toNumber()
      }));

      const totalRelations = stats.reduce((sum, stat) => sum + stat.count, 0);

      return {
        total: totalRelations,
        totalRelations,
        relationTypes: stats,
        availableRelationTypes: Object.keys(RelationConstraints)
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
  }

  // Valider une relation selon les contraintes de l'ontologie
  async validateRelation(sourceId, targetId, relationType) {
    try {
      const constraints = RelationConstraints[relationType];
      if (!constraints) {
        return {
          valid: false,
          error: `Type de relation invalide: ${relationType}`
        };
      }

      // Vérifier l'existence des entités
      const entityQuery = 'MATCH (n) WHERE ID(n) = $id RETURN labels(n) as labels';
      
      const sourceResult = await neo4jConnection.executeQuery(entityQuery, { id: parseInt(sourceId) });
      const targetResult = await neo4jConnection.executeQuery(entityQuery, { id: parseInt(targetId) });

      if (sourceResult.records.length === 0) {
        return { valid: false, error: 'Entité source non trouvée' };
      }
      if (targetResult.records.length === 0) {
        return { valid: false, error: 'Entité cible non trouvée' };
      }

      const sourceLabels = sourceResult.records[0].get('labels');
      const targetLabels = targetResult.records[0].get('labels');

      // Vérifier les contraintes de type
      const sourceValid = sourceLabels.some(label => constraints.from.includes(label));
      const targetValid = targetLabels.some(label => constraints.to.includes(label));

      if (!sourceValid) {
        return {
          valid: false,
          error: `Type d'entité source invalide. Attendu: ${constraints.from.join(', ')}, Reçu: ${sourceLabels.join(', ')}`
        };
      }

      if (!targetValid) {
        return {
          valid: false,
          error: `Type d'entité cible invalide. Attendu: ${constraints.to.join(', ')}, Reçu: ${targetLabels.join(', ')}`
        };
      }

      return {
        valid: true,
        constraints,
        sourceLabels,
        targetLabels
      };
    } catch (error) {
      return {
        valid: false,
        error: `Erreur lors de la validation: ${error.message}`
      };
    }
  }

  // Obtenir le nom d'affichage d'une entité
  getDisplayName(node) {
    if (!node) return 'Entité inconnue';
    
    const props = node.properties;
    return props.nomInstrument || props.nomFamille || props.nomGroupe || 
           props.nomLocalite || props.nomMateriau || props.descriptionTimbre ||
           props.nomTechnique || props.nomArtisan || props.nomPatrimoine ||
           props.nom || `ID: ${node.identity.toNumber()}`;
  }

  // Récupérer la structure ontologique pour visualisation
  async getOntologyStructure() {
    try {
      // Structure ontologique avec hiérarchie et contraintes
      const ontologyData = {
        name: "Ontologie Instruments Musicaux",
        description: "Taxonomie complète des instruments et leurs relations sémantiques",
        children: [
          {
            name: "Entités Principales",
            type: "category",
            children: [
              {
                name: "Instrument",
                type: "entity",
                description: "Instrument de musique",
                icon: "🎵",
                color: "#1976d2",
                children: [],
                relations: {
                  outgoing: ["appartientA", "localiseA", "constitueDe", "joueAvec"],
                  incoming: ["utilisePar", "fabrique", "caracterise", "englobe"]
                }
              },
              {
                name: "Famille",
                type: "entity", 
                description: "Famille d'instruments",
                icon: "🎼",
                color: "#dc004e",
                children: [],
                relations: {
                  outgoing: [],
                  incoming: ["appartientA"]
                }
              },
              {
                name: "GroupeEthnique",
                type: "entity",
                description: "Groupe ethnique utilisateur",
                icon: "🌍", 
                color: "#2e7d32",
                children: [],
                relations: {
                  outgoing: ["utilisePar", "localiseA"],
                  incoming: ["englobe"]
                }
              }
            ]
          },
          {
            name: "Attributs et Qualités",
            type: "category",
            children: [
              {
                name: "Materiau",
                type: "entity",
                description: "Matériau de fabrication",
                icon: "🔧",
                color: "#ed6c02",
                children: [],
                relations: {
                  outgoing: [],
                  incoming: ["constitueDe"]
                }
              },
              {
                name: "Timbre",
                type: "entity",
                description: "Qualité sonore",
                icon: "🎶",
                color: "#9c27b0",
                children: [],
                relations: {
                  outgoing: ["caracterise"],
                  incoming: []
                }
              },
              {
                name: "TechniqueDeJeu",
                type: "entity",
                description: "Technique de jeu",
                icon: "✋",
                color: "#795548",
                children: [],
                relations: {
                  outgoing: ["appliqueA"],
                  incoming: ["joueAvec"]
                }
              }
            ]
          },
          {
            name: "Contexte Culturel",
            type: "category",
            children: [
              {
                name: "Localite",
                type: "entity",
                description: "Localisation géographique",
                icon: "📍",
                color: "#0288d1",
                children: [],
                relations: {
                  outgoing: [],
                  incoming: ["localiseA"]
                }
              },
              {
                name: "Artisan",
                type: "entity",
                description: "Artisan fabricant",
                icon: "👨‍🎨",
                color: "#ff5722",
                children: [],
                relations: {
                  outgoing: ["fabrique"],
                  incoming: []
                }
              },
              {
                name: "PatrimoineCulturel",
                type: "entity",
                description: "Patrimoine culturel",
                icon: "🏛️",
                color: "#607d8b",
                children: [],
                relations: {
                  outgoing: ["englobe"],
                  incoming: []
                }
              }
            ]
          },
          {
            name: "Relations Sémantiques",
            type: "category",
            children: Object.entries(RelationConstraints).map(([relationType, constraints]) => ({
              name: relationType,
              type: "relation",
              description: this.getRelationDescription(relationType),
              icon: "🔗",
              color: this.getRelationColor(relationType),
              from: constraints.from,
              to: constraints.to,
              cardinality: constraints.cardinality || "1:N",
              children: []
            }))
          }
        ]
      };

      // Ajouter les statistiques en temps réel
      const stats = await this.getRelationStatistics();
      ontologyData.metadata = {
        totalRelations: stats.totalRelations,
        activeRelationTypes: stats.relationTypes.length,
        entitiesCount: await this.countEntitiesByType(),
        lastUpdated: new Date().toISOString()
      };

      return ontologyData;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de la structure ontologique: ${error.message}`);
    }
  }

  // Obtenir la description d'une relation
  getRelationDescription(relationType) {
    const descriptions = {
      'appartientA': 'Un instrument appartient à une famille principale (1:1)',
      'utilisePar': 'Un instrument peut être utilisé par plusieurs groupes ethniques (N:N)',
      'produitRythme': 'Un instrument peut produire plusieurs rythmes (N:N)',
      'localiseA': 'Une entité peut être présente dans plusieurs localités (N:N)',
      'constitueDe': 'Un instrument peut être constitué de plusieurs matériaux (1:N)',
      'joueAvec': 'Un instrument peut être joué avec plusieurs techniques (1:N)',
      'fabrique': 'Un artisan peut fabriquer plusieurs instruments (N:N)',
      'caracterise': 'Un instrument peut avoir plusieurs timbres (N:N)',
      'appliqueA': 'Une technique peut s\'appliquer à plusieurs instruments (N:N)',
      'englobe': 'Un patrimoine englobe plusieurs éléments culturels (1:N)'
    };
    return descriptions[relationType] || 'Relation personnalisée';
  }

  // Obtenir la couleur d'une relation
  getRelationColor(relationType) {
    const colors = {
      'appartientA': '#1976d2',
      'utilisePar': '#2e7d32', 
      'produitRythme': '#ff9800',
      'localiseA': '#03a9f4',
      'constitueDe': '#795548',
      'joueAvec': '#9c27b0',
      'fabrique': '#ff5722',
      'caracterise': '#e91e63',
      'appliqueA': '#8bc34a',
      'englobe': '#607d8b'
    };
    return colors[relationType] || '#666666';
  }

  // Compter les entités par type
  async countEntitiesByType() {
    try {
      const query = `
        MATCH (n)
        RETURN labels(n)[0] as entityType, count(n) as count
        ORDER BY count DESC
      `;
      
      const result = await neo4jConnection.executeQuery(query);
      
      return result.records.reduce((acc, record) => {
        const entityType = record.get('entityType');
        const count = record.get('count').toNumber();
        if (entityType) {
          acc[entityType] = count;
        }
        return acc;
      }, {});
    } catch (error) {
      console.error('Error counting entities by type:', error);
      return {};
    }
  }

  // Formatter un nœud Neo4j
  formatNode(node) {
    if (!node) return null;
    
    const properties = node.properties;
    const formatted = { id: node.identity.toNumber() };
    
    Object.keys(properties).forEach(key => {
      const value = properties[key];
      if (neo4j.isInt && neo4j.isInt(value)) {
        formatted[key] = value.toNumber();
      } else {
        formatted[key] = value;
      }
    });
    
    return formatted;
  }
}

module.exports = new RelationService();