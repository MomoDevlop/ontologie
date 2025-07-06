const express = require('express');
const router = express.Router();
const relationService = require('../services/RelationService');
const { RelationConstraints } = require('../models/ontologyModels');

// Middleware de validation des IDs
const validateIds = (req, res, next) => {
  const sourceId = parseInt(req.body.sourceId || req.params.sourceId);
  const targetId = parseInt(req.body.targetId || req.params.targetId);
  
  if (isNaN(sourceId) || sourceId < 0) {
    return res.status(400).json({
      error: 'ID source invalide',
      message: 'L\'ID source doit être un nombre entier positif'
    });
  }
  
  if (isNaN(targetId) || targetId < 0) {
    return res.status(400).json({
      error: 'ID cible invalide',
      message: 'L\'ID cible doit être un nombre entier positif'
    });
  }
  
  req.sourceId = sourceId;
  req.targetId = targetId;
  next();
};

const validateRelationType = (req, res, next) => {
  const relationType = req.body.relationType || req.params.relationType;
  
  if (!relationType) {
    return res.status(400).json({
      error: 'Type de relation manquant'
    });
  }
  
  if (!RelationConstraints[relationType]) {
    return res.status(400).json({
      error: 'Type de relation invalide',
      message: `Types valides: ${Object.keys(RelationConstraints).join(', ')}`
    });
  }
  
  req.relationType = relationType;
  next();
};

// GET /api/relations/types - Liste des types de relations disponibles
router.get('/types', (req, res) => {
  try {
    const relationTypes = Object.keys(RelationConstraints).map(type => ({
      type,
      constraints: RelationConstraints[type]
    }));

    res.json({
      success: true,
      data: relationTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des types de relations',
      message: error.message
    });
  }
});

// GET /api/relations/statistics - Statistiques des relations
router.get('/statistics', async (req, res) => {
  try {
    const stats = await relationService.getRelationStatistics();
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

// GET /api/relations/entity/:id - Relations d'une entité
router.get('/entity/:id', async (req, res) => {
  try {
    const entityId = parseInt(req.params.id);
    if (isNaN(entityId) || entityId < 0) {
      return res.status(400).json({
        error: 'ID invalide',
        message: 'L\'ID doit être un nombre entier positif'
      });
    }

    const relations = await relationService.getEntityRelations(entityId);
    res.json({
      success: true,
      data: relations
    });
  } catch (error) {
    if (error.message.includes('non trouvée')) {
      res.status(404).json({
        success: false,
        error: 'Entité non trouvée'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des relations',
        message: error.message
      });
    }
  }
});

// GET /api/relations/type/:relationType - Relations par type
router.get('/type/:relationType', validateRelationType, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const relations = await relationService.getRelationsByType(req.relationType, limit);
    
    res.json({
      success: true,
      data: relations,
      count: relations.length,
      relationType: req.relationType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des relations par type',
      message: error.message
    });
  }
});

// GET /api/relations/paths/:sourceId/:targetId - Chemins entre deux entités
router.get('/paths/:sourceId/:targetId', async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const targetId = parseInt(req.params.targetId);
    const { maxDepth = 3 } = req.query;

    if (isNaN(sourceId) || isNaN(targetId)) {
      return res.status(400).json({
        error: 'IDs invalides',
        message: 'Les IDs doivent être des nombres entiers'
      });
    }

    const paths = await relationService.findPaths(sourceId, targetId, maxDepth);
    
    res.json({
      success: true,
      data: paths,
      count: paths.length,
      sourceId,
      targetId,
      maxDepth: parseInt(maxDepth)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche de chemins',
      message: error.message
    });
  }
});

// POST /api/relations/validate - Valider une relation
router.post('/validate', validateIds, validateRelationType, async (req, res) => {
  try {
    const validation = await relationService.validateRelation(
      req.sourceId,
      req.targetId,
      req.relationType
    );
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la validation',
      message: error.message
    });
  }
});

// POST /api/relations - Créer une nouvelle relation
router.post('/', validateIds, validateRelationType, async (req, res) => {
  try {
    const relation = await relationService.createRelation(
      req.sourceId,
      req.targetId,
      req.relationType
    );
    
    res.status(201).json({
      success: true,
      data: relation,
      message: 'Relation créée avec succès'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Erreur lors de la création de la relation',
      message: error.message
    });
  }
});

// DELETE /api/relations/:sourceId/:targetId/:relationType - Supprimer une relation
router.delete('/:sourceId/:targetId/:relationType', async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const targetId = parseInt(req.params.targetId);
    const relationType = req.params.relationType;

    if (isNaN(sourceId) || isNaN(targetId)) {
      return res.status(400).json({
        error: 'IDs invalides',
        message: 'Les IDs doivent être des nombres entiers'
      });
    }

    if (!RelationConstraints[relationType]) {
      return res.status(400).json({
        error: 'Type de relation invalide',
        message: `Types valides: ${Object.keys(RelationConstraints).join(', ')}`
      });
    }

    const result = await relationService.deleteRelation(sourceId, targetId, relationType);
    
    if (!result.deleted) {
      return res.status(404).json({
        success: false,
        error: 'Relation non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Relation supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la relation',
      message: error.message
    });
  }
});

module.exports = router;