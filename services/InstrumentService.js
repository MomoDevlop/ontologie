const BaseService = require('./BaseService');
const { InstrumentSchema } = require('../models/ontologyModels');
const neo4jConnection = require('../config/neo4j');
const neo4j = require('neo4j-driver');

class InstrumentService extends BaseService {
  constructor() {
    super('Instrument', InstrumentSchema, 'nomInstrument');
  }

  // Récupérer les instruments avec leurs relations complètes
  async findWithRelations(id) {
    try {
      const query = `
        MATCH (i:Instrument)
        WHERE ID(i) = $id
        OPTIONAL MATCH (i)-[:appartientA]->(f:Famille)
        OPTIONAL MATCH (i)-[:utilisePar]->(g:GroupeEthnique)
        OPTIONAL MATCH (i)-[:produitRythme]->(r:Rythme)
        OPTIONAL MATCH (i)-[:localiseA]->(l:Localite)
        OPTIONAL MATCH (i)-[:constitueDe]->(m:Materiau)
        OPTIONAL MATCH (i)-[:joueAvec]->(t:TechniqueDeJeu)
        OPTIONAL MATCH (a:Artisan)-[:fabrique]->(i)
        OPTIONAL MATCH (ti:Timbre)-[:caracterise]->(i)
        OPTIONAL MATCH (p:PatrimoineCulturel)-[:englobe]->(i)
        
        RETURN i,
               collect(DISTINCT f) as familles,
               collect(DISTINCT g) as groupesEthniques,
               collect(DISTINCT r) as rythmes,
               collect(DISTINCT l) as localites,
               collect(DISTINCT m) as materiaux,
               collect(DISTINCT t) as techniques,
               collect(DISTINCT a) as artisans,
               collect(DISTINCT ti) as timbres,
               collect(DISTINCT p) as patrimoines
      `;

      const result = await neo4jConnection.executeQuery(query, { id: neo4j.int(parseInt(id)) });
      
      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const instrument = this.formatNode(record.get('i'));
      
      return {
        ...instrument,
        relations: {
          familles: record.get('familles').filter(f => f).map(f => this.formatNode(f)),
          groupesEthniques: record.get('groupesEthniques').filter(g => g).map(g => this.formatNode(g)),
          rythmes: record.get('rythmes').filter(r => r).map(r => this.formatNode(r)),
          localites: record.get('localites').filter(l => l).map(l => this.formatNode(l)),
          materiaux: record.get('materiaux').filter(m => m).map(m => this.formatNode(m)),
          techniques: record.get('techniques').filter(t => t).map(t => this.formatNode(t)),
          artisans: record.get('artisans').filter(a => a).map(a => this.formatNode(a)),
          timbres: record.get('timbres').filter(ti => ti).map(ti => this.formatNode(ti)),
          patrimoines: record.get('patrimoines').filter(p => p).map(p => this.formatNode(p))
        }
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération avec relations: ${error.message}`);
    }
  }

  // Rechercher des instruments par famille
  async findByFamily(familyName) {
    try {
      const query = `
        MATCH (i:Instrument)-[:appartientA]->(f:Famille)
        WHERE toLower(f.nomFamille) = toLower($familyName)
        RETURN i, f
        ORDER BY i.nomInstrument
      `;

      const result = await neo4jConnection.executeQuery(query, { familyName });
      
      return result.records.map(record => ({
        instrument: this.formatNode(record.get('i')),
        famille: this.formatNode(record.get('f'))
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par famille: ${error.message}`);
    }
  }

  // Rechercher des instruments par groupe ethnique
  async findByEthnicGroup(groupName) {
    try {
      const query = `
        MATCH (i:Instrument)-[:utilisePar]->(g:GroupeEthnique)
        WHERE toLower(g.nomGroupe) = toLower($groupName)
        RETURN i, g
        ORDER BY i.nomInstrument
      `;

      const result = await neo4jConnection.executeQuery(query, { groupName });
      
      return result.records.map(record => ({
        instrument: this.formatNode(record.get('i')),
        groupeEthnique: this.formatNode(record.get('g'))
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par groupe ethnique: ${error.message}`);
    }
  }

  // Rechercher des instruments par localité
  async findByLocation(locationName) {
    try {
      const query = `
        MATCH (i:Instrument)-[:localiseA]->(l:Localite)
        WHERE toLower(l.nomLocalite) = toLower($locationName)
        RETURN i, l
        ORDER BY i.nomInstrument
      `;

      const result = await neo4jConnection.executeQuery(query, { locationName });
      
      return result.records.map(record => ({
        instrument: this.formatNode(record.get('i')),
        localite: this.formatNode(record.get('l'))
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par localité: ${error.message}`);
    }
  }

  // Rechercher des instruments par matériau
  async findByMaterial(materialName) {
    try {
      const query = `
        MATCH (i:Instrument)-[:constitueDe]->(m:Materiau)
        WHERE toLower(m.nomMateriau) = toLower($materialName)
        RETURN i, m
        ORDER BY i.nomInstrument
      `;

      const result = await neo4jConnection.executeQuery(query, { materialName });
      
      return result.records.map(record => ({
        instrument: this.formatNode(record.get('i')),
        materiau: this.formatNode(record.get('m'))
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par matériau: ${error.message}`);
    }
  }

  // Rechercher des instruments par artisan
  async findByArtisan(artisanName) {
    try {
      const query = `
        MATCH (a:Artisan)-[:fabrique]->(i:Instrument)
        WHERE toLower(a.nomArtisan) = toLower($artisanName)
        RETURN i, a
        ORDER BY i.nomInstrument
      `;

      const result = await neo4jConnection.executeQuery(query, { artisanName });
      
      return result.records.map(record => ({
        instrument: this.formatNode(record.get('i')),
        artisan: this.formatNode(record.get('a'))
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par artisan: ${error.message}`);
    }
  }

  // Obtenir des recommandations d'instruments similaires
  async getSimilarInstruments(id, limit = 5) {
    try {
      const query = `
        MATCH (i:Instrument)
        WHERE ID(i) = $id
        
        MATCH (i)-[:appartientA]->(f:Famille)<-[:appartientA]-(similar:Instrument)
        WHERE ID(similar) <> ID(i)
        
        OPTIONAL MATCH (i)-[:utilisePar]->(g:GroupeEthnique)<-[:utilisePar]-(similar)
        OPTIONAL MATCH (i)-[:constitueDe]->(m:Materiau)<-[:constitueDe]-(similar)
        OPTIONAL MATCH (i)-[:localiseA]->(l:Localite)<-[:localiseA]-(similar)
        
        WITH similar, 
             count(DISTINCT g) as commonGroups,
             count(DISTINCT m) as commonMaterials,
             count(DISTINCT l) as commonLocations
             
        RETURN similar, 
               (commonGroups + commonMaterials + commonLocations) as similarity
        ORDER BY similarity DESC, similar.nomInstrument
        LIMIT $limit
      `;

      const result = await neo4jConnection.executeQuery(query, { 
        id: neo4j.int(parseInt(id)), 
        limit: neo4j.int(parseInt(limit))
      });
      
      return result.records.map(record => ({
        instrument: this.formatNode(record.get('similar')),
        similarity: record.get('similarity').toNumber()
      }));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche d'instruments similaires: ${error.message}`);
    }
  }

  // Statistiques des instruments
  async getStatistics() {
    try {
      const query = `
        MATCH (i:Instrument)
        OPTIONAL MATCH (i)-[:appartientA]->(f:Famille)
        OPTIONAL MATCH (i)-[:localiseA]->(l:Localite)
        OPTIONAL MATCH (i)-[:constitueDe]->(m:Materiau)
        
        RETURN 
          count(DISTINCT i) as totalInstruments,
          count(DISTINCT f) as totalFamilles,
          count(DISTINCT l) as totalLocalites,
          count(DISTINCT m) as totalMateriaux,
          collect(DISTINCT f.nomFamille) as familles,
          collect(DISTINCT l.nomLocalite) as localites,
          collect(DISTINCT m.nomMateriau) as materiaux
      `;

      const result = await neo4jConnection.executeQuery(query);
      const record = result.records[0];
      
      return {
        total: record.get('totalInstruments').toNumber(),
        totalInstruments: record.get('totalInstruments').toNumber(),
        totalFamilles: record.get('totalFamilles').toNumber(),
        totalLocalites: record.get('totalLocalites').toNumber(),
        totalMateriaux: record.get('totalMateriaux').toNumber(),
        familles: record.get('familles').filter(f => f),
        localites: record.get('localites').filter(l => l),
        materiaux: record.get('materiaux').filter(m => m)
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
  }

  // Recherche avancée avec filtres multiples - Version qui marche
  async advancedSearch(filters) {
    try {
      console.log('🔍 advancedSearch called with filters:', filters);
      
      // TEMPORAIRE: utiliser toujours findByFamily pour les tests
      if (filters.famille) {
        console.log('🎯 Using findByFamily for famille filter:', filters.famille);
        try {
          const results = await this.findByFamily(filters.famille);
          console.log('🎯 findByFamily returned:', results.length, 'results');
          const instruments = results.map(r => r.instrument);
          console.log('✅ Returning', instruments.length, 'instruments from famille filter');
          return instruments;
        } catch (err) {
          console.error('❌ Error in findByFamily:', err);
          throw err;
        }
      }
      
      if (filters.groupeEthnique) {
        console.log('🌍 Using findByEthnicGroup for groupe filter:', filters.groupeEthnique);
        try {
          const results = await this.findByEthnicGroup(filters.groupeEthnique);
          console.log('🌍 findByEthnicGroup returned:', results.length, 'results');
          const instruments = results.map(r => r.instrument);
          console.log('✅ Returning', instruments.length, 'instruments from groupe filter');
          return instruments;
        } catch (err) {
          console.error('❌ Error in findByEthnicGroup:', err);
          throw err;
        }
      }

      // Pour les filtres d'année simples
      if (filters.anneeMin || filters.anneeMax) {
        console.log('📅 Using year filter');
        let whereClauses = [];
        let parameters = {};
        
        if (filters.anneeMin) {
          whereClauses.push('i.anneeCreation >= $anneeMin');
          parameters.anneeMin = parseInt(filters.anneeMin);
        }

        if (filters.anneeMax) {
          whereClauses.push('i.anneeCreation <= $anneeMax');
          parameters.anneeMax = parseInt(filters.anneeMax);
        }
        
        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const query = `
          MATCH (i:Instrument)
          ${whereClause}
          RETURN i
          ORDER BY i.nomInstrument
          LIMIT 100
        `;
        
        console.log('📅 Year query:', query, parameters);
        const result = await neo4jConnection.executeQuery(query, parameters);
        const instruments = result.records.map(record => this.formatNode(record.get('i')));
        console.log('✅ Returning', instruments.length, 'instruments from year filter');
        return instruments;
      }
      
      // Si aucun filtre supporté, retourner tous les instruments
      console.log('📋 No supported filters, returning all instruments');
      const allInstruments = await this.findAll({}, 100, 0);
      return allInstruments.data || [];
      
    } catch (error) {
      console.error('❌ Error in advancedSearch:', error);
      throw new Error(`Erreur lors de la recherche avancée: ${error.message}`);
    }
  }
}

module.exports = new InstrumentService();