const express = require('express');
const router = express.Router();
const searchService = require('../services/SearchService');

// GET /api/search/global - Recherche globale dans l'ontologie
router.get('/global', async (req, res) => {
  try {
    const { q: searchTerm, limit = 50 } = req.query;
    
    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Paramètre de recherche requis',
        message: 'Utilisez le paramètre "q" pour spécifier le terme de recherche'
      });
    }

    const results = await searchService.globalSearch(searchTerm, limit);
    
    // Grouper les résultats par type
    const groupedResults = results.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        searchTerm,
        totalResults: results.length,
        results: groupedResults,
        allResults: results
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche globale',
      message: error.message
    });
  }
});

// GET /api/search/geographic - Recherche géographique
router.get('/geographic', async (req, res) => {
  try {
    const { lat, lng, radius = 100 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Coordonnées géographiques requises',
        message: 'Utilisez les paramètres "lat" et "lng" pour spécifier les coordonnées'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Coordonnées invalides',
        message: 'Les coordonnées doivent être des nombres valides'
      });
    }

    const results = await searchService.searchByLocation(latitude, longitude, radius);
    
    res.json({
      success: true,
      data: {
        searchCenter: { latitude, longitude },
        radius: parseFloat(radius),
        results,
        count: results.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche géographique',
      message: error.message
    });
  }
});

// GET /api/search/similar/:entityId - Recherche d'entités similaires
router.get('/similar/:entityId', async (req, res) => {
  try {
    const entityId = parseInt(req.params.entityId);
    const { type: entityType, limit = 10 } = req.query;
    
    if (isNaN(entityId) || entityId < 0) {
      return res.status(400).json({
        success: false,
        error: 'ID d\'entité invalide'
      });
    }

    if (!entityType) {
      return res.status(400).json({
        success: false,
        error: 'Type d\'entité requis',
        message: 'Utilisez le paramètre "type" pour spécifier le type d\'entité (instrument, groupeethnique, etc.)'
      });
    }

    const results = await searchService.findSimilarEntities(entityId, entityType, limit);
    
    res.json({
      success: true,
      data: {
        entityId,
        entityType,
        similarEntities: results,
        count: results.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche d\'entités similaires',
      message: error.message
    });
  }
});

// GET /api/search/cultural-patterns - Recherche de patterns culturels
router.get('/cultural-patterns', async (req, res) => {
  try {
    const patterns = await searchService.findCulturalPatterns();
    
    res.json({
      success: true,
      data: {
        patterns,
        count: patterns.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche de patterns culturels',
      message: error.message
    });
  }
});

// GET /api/search/semantic-paths/:startId/:endId - Chemins sémantiques
router.get('/semantic-paths/:startId/:endId', async (req, res) => {
  try {
    const startId = parseInt(req.params.startId);
    const endId = parseInt(req.params.endId);
    const { maxDepth = 4 } = req.query;
    
    if (isNaN(startId) || isNaN(endId) || startId < 0 || endId < 0) {
      return res.status(400).json({
        success: false,
        error: 'IDs d\'entités invalides'
      });
    }

    if (startId === endId) {
      return res.status(400).json({
        success: false,
        error: 'Les entités de départ et d\'arrivée doivent être différentes'
      });
    }

    const paths = await searchService.findSemanticPaths(startId, endId, maxDepth);
    
    res.json({
      success: true,
      data: {
        startId,
        endId,
        maxDepth: parseInt(maxDepth),
        paths,
        count: paths.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche de chemins sémantiques',
      message: error.message
    });
  }
});

// GET /api/search/recommendations/:entityId - Recommandations
router.get('/recommendations/:entityId', async (req, res) => {
  try {
    const entityId = parseInt(req.params.entityId);
    const { type: entityType, limit = 5 } = req.query;
    
    if (isNaN(entityId) || entityId < 0) {
      return res.status(400).json({
        success: false,
        error: 'ID d\'entité invalide'
      });
    }

    const recommendations = await searchService.getRecommendations(entityId, entityType, limit);
    
    res.json({
      success: true,
      data: {
        entityId,
        recommendations,
        count: recommendations.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de recommandations',
      message: error.message
    });
  }
});

// GET /api/search/centrality - Analyse de centralité
router.get('/centrality', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const analysis = await searchService.getCentralityAnalysis(limit);
    
    res.json({
      success: true,
      data: {
        centralityAnalysis: analysis,
        count: analysis.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'analyse de centralité',
      message: error.message
    });
  }
});

module.exports = router;