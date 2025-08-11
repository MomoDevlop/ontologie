const neo4jConnection = require('../config/neo4j');
const neo4j = require('neo4j-driver');

class SearchService {
  // Recherche globale dans toute l'ontologie
  async globalSearch(searchTerm, limit = 50) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        throw new Error('Terme de recherche requis');
      }

      const query = `
        CALL {
          MATCH (i:Instrument)
          WHERE toLower(i.nomInstrument) CONTAINS toLower($searchTerm)
             OR toLower(i.description) CONTAINS toLower($searchTerm)
          RETURN i as entity, labels(i) as labels, i.nomInstrument as name, 'Instrument' as type
          
          UNION ALL
          
          MATCH (f:Famille)
          WHERE toLower(f.nomFamille) CONTAINS toLower($searchTerm)
          RETURN f as entity, labels(f) as labels, f.nomFamille as name, 'Famille' as type
          
          UNION ALL
          
          MATCH (g:GroupeEthnique)
          WHERE toLower(g.nomGroupe) CONTAINS toLower($searchTerm)
             OR toLower(g.langue) CONTAINS toLower($searchTerm)
          RETURN g as entity, labels(g) as labels, g.nomGroupe as name, 'GroupeEthnique' as type
          
          UNION ALL
          
          MATCH (r:Rythme)
          WHERE toLower(r.nomRythme) CONTAINS toLower($searchTerm)
          RETURN r as entity, labels(r) as labels, r.nomRythme as name, 'Rythme' as type
          
          UNION ALL
          
          MATCH (l:Localite)
          WHERE toLower(l.nomLocalite) CONTAINS toLower($searchTerm)
          RETURN l as entity, labels(l) as labels, l.nomLocalite as name, 'Localite' as type
          
          UNION ALL
          
          MATCH (a:Artisan)
          WHERE toLower(a.nomArtisan) CONTAINS toLower($searchTerm)
          RETURN a as entity, labels(a) as labels, a.nomArtisan as name, 'Artisan' as type
        }
        RETURN entity, labels, name, type
        ORDER BY name
        LIMIT $limit
      `;

      const result = await neo4jConnection.executeQuery(query, { 
        searchTerm: searchTerm.trim(),
        limit: neo4j.int(parseInt(limit))
      });

      return result.records.map(record => ({
        entity: this.formatNode(record.get('entity')),
        labels: record.get('labels'),
        name: record.get('name'),
        type: record.get('type')
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche globale: ${error.message}`);
    }
  }

  // Recherche par critères géographiques
  async searchByLocation(latitude, longitude, radius = 100) {
    try {
      const query = `
        MATCH (l:Localite)
        WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL
        
        WITH l, 
             point({latitude: l.latitude, longitude: l.longitude}) as locationPoint,
             point({latitude: $latitude, longitude: $longitude}) as searchPoint
             
        WHERE point.distance(locationPoint, searchPoint) <= $radius * 1000
        
        OPTIONAL MATCH (i:Instrument)-[:localiseA]->(l)
        OPTIONAL MATCH (g:GroupeEthnique)-[:localiseA]->(l)
        OPTIONAL MATCH (r:Rythme)-[:localiseA]->(l)
        
        RETURN l,
               point.distance(locationPoint, searchPoint) / 1000 as distanceKm,
               collect(DISTINCT i) as instruments,
               collect(DISTINCT g) as groupesEthniques,
               collect(DISTINCT r) as rythmes
        ORDER BY distanceKm
      `;

      const result = await neo4jConnection.executeQuery(query, {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius)
      });

      return result.records.map(record => {
        const distance = record.get('distanceKm');
        return {
          localite: this.formatNode(record.get('l')),
          distance: neo4j.isInt(distance) ? distance.toNumber() : parseFloat(distance),
          instruments: record.get('instruments').filter(i => i).map(i => this.formatNode(i)),
          groupesEthniques: record.get('groupesEthniques').filter(g => g).map(g => this.formatNode(g)),
          rythmes: record.get('rythmes').filter(r => r).map(r => this.formatNode(r))
        };
      });
    } catch (error) {
      throw new Error(`Erreur lors de la recherche géographique: ${error.message}`);
    }
  }

  // Recherche par similarité sémantique
  async findSimilarEntities(entityId, entityType, limit = 10) {
    try {
      let query;
      
      switch (entityType.toLowerCase()) {
        case 'instrument':
          query = `
            MATCH (i:Instrument)
            WHERE ID(i) = $entityId
            
            // Similarité par famille
            MATCH (i)-[:appartientA]->(f:Famille)<-[:appartientA]-(similar:Instrument)
            WHERE ID(similar) <> ID(i)
            
            // Facteurs de similarité
            OPTIONAL MATCH (i)-[:utilisePar]->(g:GroupeEthnique)<-[:utilisePar]-(similar)
            OPTIONAL MATCH (i)-[:localiseA]->(l:Localite)<-[:localiseA]-(similar)
            OPTIONAL MATCH (i)-[:constitueDe]->(m:Materiau)<-[:constitueDe]-(similar)
            OPTIONAL MATCH (i)-[:produitRythme]->(r:Rythme)<-[:produitRythme]-(similar)
            
            WITH similar,
                 count(DISTINCT g) as commonGroups,
                 count(DISTINCT l) as commonLocations,
                 count(DISTINCT m) as commonMaterials,
                 count(DISTINCT r) as commonRhythms
                 
            RETURN similar,
                   (commonGroups * 3 + commonLocations * 2 + commonMaterials + commonRhythms) as similarity
            ORDER BY similarity DESC, similar.nomInstrument
            LIMIT $limit
          `;
          break;
          
        case 'groupeethnique':
          query = `
            MATCH (g:GroupeEthnique)
            WHERE ID(g) = $entityId
            
            MATCH (g)-[:localiseA]->(l:Localite)<-[:localiseA]-(similar:GroupeEthnique)
            WHERE ID(similar) <> ID(g)
            
            OPTIONAL MATCH (g)<-[:utilisePar]-(i:Instrument)-[:utilisePar]->(similar)
            OPTIONAL MATCH (g)<-[:englobe]-(p:PatrimoineCulturel)-[:englobe]->(similar)
            
            WITH similar,
                 count(DISTINCT i) as commonInstruments,
                 count(DISTINCT p) as commonPatrimoine
                 
            RETURN similar,
                   (commonInstruments * 2 + commonPatrimoine * 3) as similarity
            ORDER BY similarity DESC, similar.nomGroupe
            LIMIT $limit
          `;
          break;
          
        default:
          throw new Error(`Type d'entité non supporté pour la recherche de similarité: ${entityType}`);
      }

      const result = await neo4jConnection.executeQuery(query, {
        entityId: parseInt(entityId),
        limit: neo4j.int(parseInt(limit))
      });

      return result.records.map(record => ({
        entity: this.formatNode(record.get('similar')),
        similarity: record.get('similarity').toNumber()
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de similarité: ${error.message}`);
    }
  }

  // Recherche de patterns culturels
  async findCulturalPatterns() {
    try {
      const query = `
        MATCH (p:PatrimoineCulturel)-[:englobe]->(g:GroupeEthnique)
        MATCH (g)<-[:utilisePar]-(i:Instrument)
        MATCH (g)-[:localiseA]->(l:Localite)
        
        OPTIONAL MATCH (i)-[:produitRythme]->(r:Rythme)
        OPTIONAL MATCH (i)-[:constitueDe]->(m:Materiau)
        OPTIONAL MATCH (i)-[:appartientA]->(f:Famille)
        
        RETURN p.nomPatrimoine as patrimoine,
               g.nomGroupe as groupe,
               l.nomLocalite as localite,
               collect(DISTINCT i.nomInstrument) as instruments,
               collect(DISTINCT r.nomRythme) as rythmes,
               collect(DISTINCT m.nomMateriau) as materiaux,
               collect(DISTINCT f.nomFamille) as familles
        ORDER BY patrimoine, groupe
      `;

      const result = await neo4jConnection.executeQuery(query);

      return result.records.map(record => ({
        patrimoine: record.get('patrimoine'),
        groupe: record.get('groupe'),
        localite: record.get('localite'),
        instruments: record.get('instruments').filter(i => i),
        rythmes: record.get('rythmes').filter(r => r),
        materiaux: record.get('materiaux').filter(m => m),
        familles: record.get('familles').filter(f => f)
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de patterns culturels: ${error.message}`);
    }
  }

  // Recherche par chemin sémantique
  async findSemanticPaths(startEntity, endEntity, maxDepth = 4) {
    try {
      const query = `
        MATCH startNode = (start)
        WHERE ID(start) = $startEntity
        
        MATCH endNode = (end)
        WHERE ID(end) = $endEntity
        
        MATCH path = shortestPath((start)-[*1..${maxDepth}]-(end))
        WHERE start <> end
        
        UNWIND relationships(path) as rel
        UNWIND nodes(path) as node
        
        RETURN path,
               [n in nodes(path) | {
                 id: ID(n),
                 labels: labels(n),
                 properties: properties(n)
               }] as pathNodes,
               [r in relationships(path) | {
                 type: type(r),
                 properties: properties(r)
               }] as pathRelations,
               length(path) as pathLength
        ORDER BY pathLength
        LIMIT 5
      `;

      const result = await neo4jConnection.executeQuery(query, {
        startEntity: parseInt(startEntity),
        endEntity: parseInt(endEntity)
      });

      return result.records.map(record => ({
        nodes: record.get('pathNodes'),
        relations: record.get('pathRelations'),
        length: record.get('pathLength').toNumber()
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de chemins sémantiques: ${error.message}`);
    }
  }

  // Recommandations basées sur l'ontologie
  async getRecommendations(entityId, entityType, limit = 5) {
    try {
      const query = `
        MATCH (entity)
        WHERE ID(entity) = $entityId
        
        // Trouver des entités connexes via différents chemins
        MATCH (entity)-[*1..2]-(recommended)
        WHERE ID(recommended) <> ID(entity)
          AND recommended:Instrument OR recommended:GroupeEthnique OR recommended:Rythme
        
        WITH recommended, count(*) as connections
        
        // Enrichir avec des informations contextuelles
        OPTIONAL MATCH (recommended)-[:appartientA]->(f:Famille)
        OPTIONAL MATCH (recommended)-[:localiseA]->(l:Localite)
        OPTIONAL MATCH (recommended)-[:utilisePar]->(g:GroupeEthnique)
        
        RETURN recommended,
               labels(recommended) as types,
               connections,
               f.nomFamille as famille,
               l.nomLocalite as localite,
               g.nomGroupe as groupe
        ORDER BY connections DESC, random()
        LIMIT $limit
      `;

      const result = await neo4jConnection.executeQuery(query, {
        entityId: parseInt(entityId),
        limit: neo4j.int(parseInt(limit))
      });

      return result.records.map(record => ({
        entity: this.formatNode(record.get('recommended')),
        types: record.get('types'),
        connections: record.get('connections').toNumber(),
        context: {
          famille: record.get('famille'),
          localite: record.get('localite'),
          groupe: record.get('groupe')
        }
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la génération de recommandations: ${error.message}`);
    }
  }

  // Analyse de centralité dans le réseau
  async getCentralityAnalysis(limit = 20) {
    try {
      const query = `
        MATCH (n)
        WHERE n:Instrument OR n:GroupeEthnique OR n:Localite OR n:Rythme
        
        OPTIONAL MATCH (n)-[r]-()
        WITH n, count(r) as degree
        
        OPTIONAL MATCH (n:Instrument)
        WITH n, degree, 
             CASE WHEN n:Instrument THEN 'Instrument'
                  WHEN n:GroupeEthnique THEN 'GroupeEthnique'
                  WHEN n:Localite THEN 'Localite'
                  WHEN n:Rythme THEN 'Rythme'
                  ELSE 'Autre' END as nodeType
        
        RETURN n, nodeType, degree
        ORDER BY degree DESC
        LIMIT $limit
      `;

      const result = await neo4jConnection.executeQuery(query, {
        limit: neo4j.int(parseInt(limit))
      });

      return result.records.map(record => ({
        entity: this.formatNode(record.get('n')),
        type: record.get('nodeType'),
        centrality: record.get('degree').toNumber()
      }));
    } catch (error) {
      throw new Error(`Erreur lors de l'analyse de centralité: ${error.message}`);
    }
  }

  // Exécution de requêtes Cypher brutes
  async executeCypherQuery(query, parameters = {}) {
    try {
      console.log('Executing Cypher query:', query);
      console.log('With parameters:', parameters);
      
      const result = await neo4jConnection.executeQuery(query, parameters);
      
      return result.records.map(record => {
        const recordData = {};
        record.keys.forEach((key, index) => {
          const value = record._fields[index];
          recordData[key] = this.formatValue(value);
        });
        return recordData;
      });
    } catch (error) {
      throw new Error(`Erreur lors de l'exécution de la requête Cypher: ${error.message}`);
    }
  }

  // Formatter une valeur Neo4j
  formatValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    
    // Cas des entiers Neo4j
    if (neo4j.isInt && neo4j.isInt(value)) {
      return value.toNumber();
    }
    
    // Cas des nœuds
    if (value && typeof value === 'object' && value.identity !== undefined) {
      return this.formatNode(value);
    }
    
    // Cas des relations
    if (value && typeof value === 'object' && value.type !== undefined && value.start !== undefined) {
      return {
        id: value.identity.toNumber(),
        type: value.type,
        startId: value.start.toNumber(),
        endId: value.end.toNumber(),
        properties: value.properties
      };
    }
    
    // Cas des tableaux
    if (Array.isArray(value)) {
      return value.map(item => this.formatValue(item));
    }
    
    // Cas des objets simples
    if (typeof value === 'object') {
      const formatted = {};
      Object.keys(value).forEach(key => {
        formatted[key] = this.formatValue(value[key]);
      });
      return formatted;
    }
    
    return value;
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

module.exports = new SearchService();