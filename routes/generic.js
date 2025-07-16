const express = require('express');
const BaseService = require('../services/BaseService');
const {
  FamilleSchema,
  GroupeEthniqueSchema,
  RythmeSchema,
  LocaliteSchema,
  MateriauSchema,
  TimbreSchema,
  TechniqueDeJeuSchema,
  ArtisanSchema,
  PatrimoineCulturelSchema
} = require('../models/ontologyModels');

// Factory pour créer des routes génériques pour chaque entité
function createGenericRoutes(label, schema, uniqueProperty) {
  const router = express.Router();
  const service = new BaseService(label, schema, uniqueProperty);

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

  // GET - Récupérer toutes les entités
  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 20, search, ...filters } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      let entities;
      
      if (search) {
        entities = await service.search(search, [uniqueProperty]);
        entities = {
          data: entities,
          total: entities.length
        };
      } else {
        entities = await service.findAll(filters, parseInt(limit), skip);
      }

      res.json({
        success: true,
        data: entities.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: entities.total
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Erreur lors de la récupération des ${label.toLowerCase()}s`,
        message: error.message
      });
    }
  });

  // GET - Statistiques
  router.get('/statistics', async (req, res) => {
    try {
      const total = await service.count();
      res.json({
        success: true,
        data: {
          total,
          label
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques',
        message: error.message
      });
    }
  });

  // GET /:id - Récupérer une entité par ID
  router.get('/:id', validateId, async (req, res) => {
    try {
      const entity = await service.findById(req.params.id);
      
      if (!entity) {
        return res.status(404).json({
          success: false,
          error: `${label} non trouvé(e)`
        });
      }

      res.json({
        success: true,
        data: entity
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Erreur lors de la récupération du/de la ${label.toLowerCase()}`,
        message: error.message
      });
    }
  });

  // GET /:id/relations - Relations d'une entité
  router.get('/:id/relations', validateId, async (req, res) => {
    try {
      const { relationType, direction = 'BOTH' } = req.query;
      const relations = await service.getRelations(req.params.id, relationType, direction);
      
      res.json({
        success: true,
        data: relations,
        count: relations.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des relations',
        message: error.message
      });
    }
  });

  // POST - Créer une nouvelle entité
  router.post('/', async (req, res) => {
    try {
      const entity = await service.create(req.body);
      
      res.status(201).json({
        success: true,
        data: entity,
        message: `${label} créé(e) avec succès`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: `Erreur lors de la création du/de la ${label.toLowerCase()}`,
        message: error.message
      });
    }
  });

  // PUT /:id - Mettre à jour une entité
  router.put('/:id', validateId, async (req, res) => {
    try {
      const entity = await service.update(req.params.id, req.body);
      
      res.json({
        success: true,
        data: entity,
        message: `${label} mis(e) à jour avec succès`
      });
    } catch (error) {
      if (error.message.includes('non trouvé')) {
        res.status(404).json({
          success: false,
          error: `${label} non trouvé(e)`
        });
      } else {
        res.status(400).json({
          success: false,
          error: `Erreur lors de la mise à jour du/de la ${label.toLowerCase()}`,
          message: error.message
        });
      }
    }
  });

  // DELETE /:id - Supprimer une entité
  router.delete('/:id', validateId, async (req, res) => {
    try {
      const result = await service.delete(req.params.id);
      
      if (!result.deleted) {
        return res.status(404).json({
          success: false,
          error: `${label} non trouvé(e)`
        });
      }

      res.json({
        success: true,
        data: result.entity,
        message: `${label} supprimé(e) avec succès`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Erreur lors de la suppression du/de la ${label.toLowerCase()}`,
        message: error.message
      });
    }
  });

  return router;
}

// Export des routes pour chaque entité
module.exports = {
  familles: createGenericRoutes('Famille', FamilleSchema, 'nomFamille'),
  groupesEthniques: createGenericRoutes('GroupeEthnique', GroupeEthniqueSchema, 'nomGroupe'),
  rythmes: createGenericRoutes('Rythme', RythmeSchema, 'nomRythme'),
  localites: createGenericRoutes('Localite', LocaliteSchema, 'nomLocalite'),
  materiaux: createGenericRoutes('Materiau', MateriauSchema, 'nomMateriau'),
  timbres: createGenericRoutes('Timbre', TimbreSchema, 'descriptionTimbre'),
  techniques: createGenericRoutes('TechniqueDeJeu', TechniqueDeJeuSchema, 'nomTechnique'),
  artisans: createGenericRoutes('Artisan', ArtisanSchema, 'nomArtisan'),
  patrimoines: createGenericRoutes('PatrimoineCulturel', PatrimoineCulturelSchema, 'nomPatrimoine')
};