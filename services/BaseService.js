const neo4jConnection = require('../config/neo4j');
const neo4j = require('neo4j-driver');

class BaseService {
  constructor(label, schema, uniqueProperty = 'nom') {
    this.label = label;
    this.schema = schema;
    this.uniqueProperty = uniqueProperty;
  }

  // Créer une nouvelle entité
  async create(data) {
    try {
      // Validation des données
      const { error, value } = this.schema.validate(data);
      if (error) {
        throw new Error(`Données invalides: ${error.details[0].message}`);
      }

      // Construction de la requête de création
      const properties = Object.keys(value)
        .map(key => `${key}: $${key}`)
        .join(', ');

      const query = `
        CREATE (n:${this.label} {${properties}})
        RETURN n
      `;

      const result = await neo4jConnection.executeQuery(query, value);
      
      if (result.records.length === 0) {
        throw new Error('Échec de la création');
      }

      return this.formatNode(result.records[0].get('n'));
    } catch (error) {
      throw new Error(`Erreur lors de la création: ${error.message}`);
    }
  }

  // Récupérer toutes les entités
  async findAll(filters = {}, limit = 100, skip = 0) {
    try {
      let whereClause = '';
      const parameters = { 
        limit: neo4j.int(parseInt(limit)), 
        skip: neo4j.int(parseInt(skip)) 
      };

      if (Object.keys(filters).length > 0) {
        const conditions = Object.keys(filters).map((key, index) => {
          const paramName = `filter${index}`;
          parameters[paramName] = filters[key];
          
          if (typeof filters[key] === 'string') {
            return `toLower(n.${key}) CONTAINS toLower(${paramName})`;
          } else {
            return `n.${key} = ${paramName}`;
          }
        });
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      const query = `
        MATCH (n:${this.label})
        ${whereClause}
        RETURN n
        ORDER BY n.${this.uniqueProperty}
        SKIP $skip
        LIMIT $limit
      `;

      const result = await neo4jConnection.executeQuery(query, parameters);
      
      return {
        data: result.records.map(record => this.formatNode(record.get('n'))),
        total: result.records.length,
        limit: parseInt(limit),
        skip: parseInt(skip)
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }
  }

  // Récupérer une entité par son identifiant unique
  async findByProperty(property, value) {
    try {
      const query = `
        MATCH (n:${this.label} {${property}: $value})
        RETURN n
      `;

      const result = await neo4jConnection.executeQuery(query, { value });
      
      if (result.records.length === 0) {
        return null;
      }

      return this.formatNode(result.records[0].get('n'));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche: ${error.message}`);
    }
  }

  // Récupérer par ID Neo4j
  async findById(id) {
    try {
      const query = `
        MATCH (n:${this.label})
        WHERE ID(n) = $id
        RETURN n
      `;

      const result = await neo4jConnection.executeQuery(query, { id: neo4j.int(parseInt(id)) });
      
      if (result.records.length === 0) {
        return null;
      }

      return this.formatNode(result.records[0].get('n'));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par ID: ${error.message}`);
    }
  }

  // Mettre à jour une entité
  async update(id, data) {
    try {
      // Validation des données
      const { error, value } = this.schema.validate(data, { allowUnknown: false });
      if (error) {
        throw new Error(`Données invalides: ${error.details[0].message}`);
      }

      // Vérifier que l'entité existe
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Entité non trouvée');
      }

      // Construction de la requête de mise à jour
      const setClause = Object.keys(value)
        .map(key => `n.${key} = ${key}`)
        .join(', ');

      const query = `
        MATCH (n:${this.label})
        WHERE ID(n) = $id
        SET ${setClause}
        RETURN n
      `;

      const parameters = { id: neo4j.int(parseInt(id)), ...value };
      const result = await neo4jConnection.executeQuery(query, parameters);
      
      return this.formatNode(result.records[0].get('n'));
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  }

  // Supprimer une entité
  async delete(id) {
    try {
      // Vérifier que l'entité existe
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Entité non trouvée');
      }

      const query = `
        MATCH (n:${this.label})
        WHERE ID(n) = $id
        DETACH DELETE n
        RETURN count(n) as deleted
      `;

      const result = await neo4jConnection.executeQuery(query, { id: neo4j.int(parseInt(id)) });
      
      return {
        deleted: result.records[0].get('deleted').toNumber() > 0,
        entity: existing
      };
    } catch (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  // Récupérer les relations d'une entité
  async getRelations(id, relationType = null, direction = 'BOTH') {
    try {
      let relationPattern = '';
      
      switch (direction.toUpperCase()) {
        case 'OUT':
          relationPattern = relationType ? `-[:${relationType}]->` : `-[]->`;
          break;
        case 'IN':
          relationPattern = relationType ? `<-[:${relationType}]-` : `<-[]-`;
          break;
        default: // BOTH
          relationPattern = relationType ? `-[:${relationType}]-` : `-[]-`;
      }

      const query = `
        MATCH (n:${this.label})${relationPattern}(related)
        WHERE ID(n) = $id
        RETURN related, labels(related) as labels, type(r) as relationType
      `;

      const result = await neo4jConnection.executeQuery(query, { id: neo4j.int(parseInt(id)) });
      
      return result.records.map(record => ({
        entity: this.formatNode(record.get('related')),
        labels: record.get('labels'),
        relationType: record.get('relationType')
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des relations: ${error.message}`);
    }
  }

  // Compter le nombre total d'entités
  async count(filters = {}) {
    try {
      let whereClause = '';
      const parameters = {};

      if (Object.keys(filters).length > 0) {
        const conditions = Object.keys(filters).map((key, index) => {
          const paramName = `filter${index}`;
          parameters[paramName] = filters[key];
          
          if (typeof filters[key] === 'string') {
            return `toLower(n.${key}) CONTAINS toLower($${paramName})`;
          } else {
            return `n.${key} = $${paramName}`;
          }
        });
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      const query = `
        MATCH (n:${this.label})
        ${whereClause}
        RETURN count(n) as total
      `;

      const result = await neo4jConnection.executeQuery(query, parameters);
      return result.records[0].get('total').toNumber();
    } catch (error) {
      throw new Error(`Erreur lors du comptage: ${error.message}`);
    }
  }

  // Formatter un nœud Neo4j en objet JavaScript
  formatNode(node) {
    if (!node) return null;
    
    const properties = node.properties;
    const formatted = { id: node.identity.toNumber() };
    
    // Convertir les propriétés Neo4j en types JavaScript
    Object.keys(properties).forEach(key => {
      const value = properties[key];
      if (neo4j.isInt(value)) {
        formatted[key] = value.toNumber();
      } else if (neo4j.isDate(value)) {
        formatted[key] = value.toString();
      } else {
        formatted[key] = value;
      }
    });
    
    return formatted;
  }

  // Recherche textuelle avancée
  async search(searchTerm, searchFields = []) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return await this.findAll();
      }

      const fields = searchFields.length > 0 ? searchFields : [this.uniqueProperty];
      const conditions = fields.map(field => 
        `toLower(n.${field}) CONTAINS toLower($searchTerm)`
      ).join(' OR ');

      const query = `
        MATCH (n:${this.label})
        WHERE ${conditions}
        RETURN n
        ORDER BY n.${this.uniqueProperty}
        LIMIT 50
      `;

      const result = await neo4jConnection.executeQuery(query, { 
        searchTerm: searchTerm.trim() 
      });
      
      return result.records.map(record => this.formatNode(record.get('n')));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche: ${error.message}`);
    }
  }
}

module.exports = BaseService;