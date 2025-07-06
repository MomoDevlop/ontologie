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
      const sourceResult = await neo4jConnection.executeQuery(sourceQuery, { id: parseInt(sourceId) });
      const targetResult = await neo4jConnection.executeQuery(sourceQuery, { id: parseInt(targetId) });

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

      // Vérifier les contraintes de cardinalité pour les relations 1:1
      if (constraints.cardinality === '1:1') {
        const existingRelationQuery = `
          MATCH (s)-[r:${relationType}]->(t)
          WHERE ID(s) = $sourceId OR ID(t) = $targetId
          RETURN count(r) as count
        `;
        const existingResult = await neo4jConnection.executeQuery(existingRelationQuery, {
          sourceId: parseInt(sourceId),
          targetId: parseInt(targetId)
        });

        if (existingResult.records[0].get('count').toNumber() > 0) {
          throw new Error(`Relation ${relationType} déjà existante (contrainte 1:1)`);
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
        sourceId: parseInt(sourceId),
        targetId: parseInt(targetId)
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

      const result = await neo4jConnection.executeQuery(query, { limit: parseInt(limit) });

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