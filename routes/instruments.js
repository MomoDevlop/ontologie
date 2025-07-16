const express = require('express');
const router = express.Router();
const instrumentService = require('../services/InstrumentService');

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
    const { page = 1, limit = 10, search, ...filters } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let instruments;
    
    if (search) {
      // Recherche textuelle
      instruments = await instrumentService.search(search, ['nomInstrument', 'description']);
    } else {
      // Récupération avec filtres
      instruments = await instrumentService.findAll(filters, parseInt(limit), skip);
    }

    res.json({
      success: true,
      data: instruments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: instruments.total || instruments.length
      }
    });
  } catch (error) {
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