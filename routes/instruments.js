const express = require('express');
const router = express.Router();
const instrumentService = require('../services/InstrumentService');
const neo4jConnection = require('../config/neo4j');
const neo4j = require('neo4j-driver');

// Middleware de validation d'ID
const validateId = (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 0) {
    return res.status(400).json({
      error: 'ID invalide',
      message: 'L\'ID doit être un nombre entier positif'
    });
  }
  req.params.id = id;
  next();
};

// GET /api/instruments - Récupérer tous les instruments
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, famille, groupeEthnique, artisan, localite, materiau, anneeMin, anneeMax, ...otherFilters } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let instruments;
    
    // Check if we have any filters (including the new ones)
    const hasFilters = famille || groupeEthnique || artisan || localite || materiau || anneeMin || anneeMax || Object.keys(otherFilters).length > 0;
    
    console.log('🔍 Backend filter check:', {
      famille, groupeEthnique, artisan, localite, materiau, anneeMin, anneeMax,
      hasFilters,
      otherFilters
    });
    
    if (search) {
      console.log('📝 Using search method');
      // Recherche textuelle
      instruments = await instrumentService.search(search, ['nomInstrument', 'description']);
    } else if (famille) {
      console.log('🎯 Using findByFamily method for family filter:', famille);
      // Filtre par famille - utilise la méthode qui fonctionne
      const results = await instrumentService.findByFamily(famille);
      console.log('🎯 findByFamily returned:', results.length, 'results');
      instruments = results.map(r => r.instrument);
    } else if (groupeEthnique) {
      console.log('🌍 Using findByEthnicGroup method for single groupe filter');
      // Filtre par groupe ethnique uniquement
      const results = await instrumentService.findByEthnicGroup(groupeEthnique);
      instruments = results.map(r => r.instrument);
    } else if (localite && !famille && !groupeEthnique && !artisan && !materiau) {
      console.log('🏠 Using findByLocation method for single localite filter');
      // Filtre par localité uniquement
      const results = await instrumentService.findByLocation(localite);
      instruments = results.map(r => r.instrument);
    } else if (materiau && !famille && !groupeEthnique && !artisan && !localite) {
      console.log('🔧 Using findByMaterial method for single materiau filter');
      // Filtre par matériau uniquement
      const results = await instrumentService.findByMaterial(materiau);
      instruments = results.map(r => r.instrument);
    } else if (artisan && !famille && !groupeEthnique && !localite && !materiau) {
      console.log('👨‍🎨 Using findByArtisan method for single artisan filter');
      // Filtre par artisan uniquement
      const results = await instrumentService.findByArtisan(artisan);
      instruments = results.map(r => r.instrument);
    } else if ((anneeMin || anneeMax) && !famille && !groupeEthnique && !artisan && !localite && !materiau) {
      console.log('📅 Using year filter');
      // Filtre par année uniquement - requête simple qui fonctionne
      let whereClauses = [];
      let parameters = { 
        limit: neo4j.int(parseInt(limit)), 
        skip: neo4j.int(parseInt(skip)) 
      };
      
      if (anneeMin) {
        whereClauses.push('i.anneeCreation >= $anneeMin');
        parameters.anneeMin = parseInt(anneeMin);
      }
      if (anneeMax) {
        whereClauses.push('i.anneeCreation <= $anneeMax');
        parameters.anneeMax = parseInt(anneeMax);
      }
      
      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const query = `
        MATCH (i:Instrument)
        ${whereClause}
        RETURN i
        ORDER BY i.nomInstrument
        SKIP $skip
        LIMIT $limit
      `;
      
      const result = await neo4jConnection.executeQuery(query, parameters);
      instruments = {
        data: result.records.map(record => instrumentService.formatNode(record.get('i'))),
        total: result.records.length // Approximation
      };
    } else if (hasFilters) {
      console.log('⚠️ Multiple filters not supported yet, showing all instruments');
      // Pour les filtres multiples, on montre tous les instruments pour le moment
      instruments = await instrumentService.findAll({}, parseInt(limit), skip);
    } else {
      console.log('📋 Using findAll method (no filters)');
      // Récupération standard sans filtres
      instruments = await instrumentService.findAll({}, parseInt(limit), skip);
    }

    // Handle different response formats and normalize structure
    let normalizedResponse;
    
    console.log('📊 Instruments type:', typeof instruments, 'isArray:', Array.isArray(instruments));
    console.log('📊 Instruments structure keys:', instruments ? Object.keys(instruments) : 'null/undefined');
    
    if (search) {
      // search returns array
      const instrumentsArray = Array.isArray(instruments) ? instruments : [];
      normalizedResponse = {
        data: instrumentsArray,
        total: instrumentsArray.length
      };
    } else if (Array.isArray(instruments)) {
      // Direct array from findByFamily, findByEthnicGroup, etc.
      // Need to paginate client-side
      const total = instruments.length;
      const startIndex = skip;
      const endIndex = startIndex + parseInt(limit);
      const paginatedInstruments = instruments.slice(startIndex, endIndex);
      
      normalizedResponse = {
        data: paginatedInstruments,
        total: total
      };
    } else if (instruments && instruments.data) {
      // Object with data property (from findAll or year filter)
      const instrumentsArray = Array.isArray(instruments.data) ? instruments.data : [];
      normalizedResponse = {
        data: instrumentsArray,
        total: instruments.total || instrumentsArray.length
      };
    } else {
      // Fallback
      console.log('⚠️ Unknown instruments format, using fallback');
      normalizedResponse = {
        data: [],
        total: 0
      };
    }

    res.json({
      success: true,
      data: normalizedResponse.data,
      total: normalizedResponse.total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: normalizedResponse.total
      }
    });
  } catch (error) {
    console.error('Error in GET /instruments:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des instruments',
      message: error.message
    });
  }
});

// GET /api/instruments/statistics - Statistiques des instruments
router.get('/statistics', async (req, res) => {
  try {
    const stats = await instrumentService.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      message: error.message
    });
  }
});

// GET /api/instruments/search - Recherche avancée
router.get('/search', async (req, res) => {
  try {
    const instruments = await instrumentService.advancedSearch(req.query);
    res.json({
      success: true,
      data: instruments,
      count: instruments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche avancée',
      message: error.message
    });
  }
});

// GET /api/instruments/by-family/:family - Instruments par famille
router.get('/by-family/:family', async (req, res) => {
  try {
    const instruments = await instrumentService.findByFamily(req.params.family);
    res.json({
      success: true,
      data: instruments,
      count: instruments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche par famille',
      message: error.message
    });
  }
});

// GET /api/instruments/filter - Endpoint de filtrage simple qui fonctionne
router.get('/filter', async (req, res) => {
  try {
    const { famille, groupeEthnique, localite, materiau, artisan, page = 1, limit = 10 } = req.query;
    
    console.log('🔧 Filter endpoint called with:', { famille, groupeEthnique, localite, materiau, artisan });
    
    let results = [];
    
    if (famille) {
      console.log('🎯 Filtering by famille:', famille);
      const familleResults = await instrumentService.findByFamily(famille);
      results = familleResults.map(r => r.instrument);
    } else if (groupeEthnique) {
      console.log('🌍 Filtering by groupe ethnique:', groupeEthnique);
      const groupeResults = await instrumentService.findByEthnicGroup(groupeEthnique);
      results = groupeResults.map(r => r.instrument);
    } else if (localite) {
      console.log('🏠 Filtering by localite:', localite);
      const localiteResults = await instrumentService.findByLocation(localite);
      results = localiteResults.map(r => r.instrument);
    } else if (materiau) {
      console.log('🔧 Filtering by materiau:', materiau);
      const materiauResults = await instrumentService.findByMaterial(materiau);
      results = materiauResults.map(r => r.instrument);
    } else {
      console.log('📋 No filter, returning all');
      const allResults = await instrumentService.findAll({}, parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
      results = allResults.data || [];
    }
    
    console.log('✅ Filter results:', results.length, 'instruments');
    
    // Pagination côté serveur
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = results.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedResults,
      total: results.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.length
      }
    });
  } catch (error) {
    console.error('❌ Filter endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du filtrage',
      message: error.message
    });
  }
});

// GET /api/instruments/by-group/:group - Instruments par groupe ethnique
router.get('/by-group/:group', async (req, res) => {
  try {
    const instruments = await instrumentService.findByEthnicGroup(req.params.group);
    res.json({
      success: true,
      data: instruments,
      count: instruments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche par groupe ethnique',
      message: error.message
    });
  }
});

// GET /api/instruments/by-location/:location - Instruments par localité
router.get('/by-location/:location', async (req, res) => {
  try {
    const instruments = await instrumentService.findByLocation(req.params.location);
    res.json({
      success: true,
      data: instruments,
      count: instruments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche par localité',
      message: error.message
    });
  }
});

// GET /api/instruments/by-material/:material - Instruments par matériau
router.get('/by-material/:material', async (req, res) => {
  try {
    const instruments = await instrumentService.findByMaterial(req.params.material);
    res.json({
      success: true,
      data: instruments,
      count: instruments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche par matériau',
      message: error.message
    });
  }
});

// GET /api/instruments/by-artisan/:artisan - Instruments par artisan
router.get('/by-artisan/:artisan', async (req, res) => {
  try {
    const instruments = await instrumentService.findByArtisan(req.params.artisan);
    res.json({
      success: true,
      data: instruments,
      count: instruments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche par artisan',
      message: error.message
    });
  }
});

// GET /api/instruments/:id - Récupérer un instrument par ID
router.get('/:id', validateId, async (req, res) => {
  try {
    const instrument = await instrumentService.findById(req.params.id);
    
    if (!instrument) {
      return res.status(404).json({
        success: false,
        error: 'Instrument non trouvé'
      });
    }

    res.json({
      success: true,
      data: instrument
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'instrument',
      message: error.message
    });
  }
});

// GET /api/instruments/:id/relations - Relations d'un instrument
router.get('/:id/relations', validateId, async (req, res) => {
  try {
    const instrument = await instrumentService.findWithRelations(req.params.id);
    
    if (!instrument) {
      return res.status(404).json({
        success: false,
        error: 'Instrument non trouvé'
      });
    }

    res.json({
      success: true,
      data: instrument
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des relations',
      message: error.message
    });
  }
});

// GET /api/instruments/:id/similar - Instruments similaires
router.get('/:id/similar', validateId, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const similarInstruments = await instrumentService.getSimilarInstruments(req.params.id, limit);
    
    res.json({
      success: true,
      data: similarInstruments,
      count: similarInstruments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche d\'instruments similaires',
      message: error.message
    });
  }
});

// POST /api/instruments - Créer un nouvel instrument
router.post('/', async (req, res) => {
  try {
    const instrument = await instrumentService.create(req.body);
    
    res.status(201).json({
      success: true,
      data: instrument,
      message: 'Instrument créé avec succès'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Erreur lors de la création de l\'instrument',
      message: error.message
    });
  }
});

// PUT /api/instruments/:id - Mettre à jour un instrument
router.put('/:id', validateId, async (req, res) => {
  try {
    const instrument = await instrumentService.update(req.params.id, req.body);
    
    res.json({
      success: true,
      data: instrument,
      message: 'Instrument mis à jour avec succès'
    });
  } catch (error) {
    if (error.message.includes('non trouvé')) {
      res.status(404).json({
        success: false,
        error: 'Instrument non trouvé'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Erreur lors de la mise à jour de l\'instrument',
        message: error.message
      });
    }
  }
});

// DELETE /api/instruments/:id - Supprimer un instrument
router.delete('/:id', validateId, async (req, res) => {
  try {
    const result = await instrumentService.delete(req.params.id);
    
    if (!result.deleted) {
      return res.status(404).json({
        success: false,
        error: 'Instrument non trouvé'
      });
    }

    res.json({
      success: true,
      data: result.entity,
      message: 'Instrument supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'instrument',
      message: error.message
    });
  }
});

module.exports = router;