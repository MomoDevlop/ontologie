const Joi = require('joi');

// Schémas de validation pour chaque entité de l'ontologie

const InstrumentSchema = Joi.object({
  nomInstrument: Joi.string().required().min(2).max(100),
  description: Joi.string().optional().max(500),
  anneeCreation: Joi.number().integer().min(1).max(new Date().getFullYear()).optional()
});

const FamilleSchema = Joi.object({
  nomFamille: Joi.string().required().min(2).max(50),
  descriptionFamille: Joi.string().optional().max(200)
});

const GroupeEthniqueSchema = Joi.object({
  nomGroupe: Joi.string().required().min(2).max(100),
  langue: Joi.string().optional().max(50)
});

const RythmeSchema = Joi.object({
  nomRythme: Joi.string().required().min(2).max(100),
  tempoBPM: Joi.number().integer().min(20).max(300).optional()
});

const LocaliteSchema = Joi.object({
  nomLocalite: Joi.string().required().min(2).max(100),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

const MateriauSchema = Joi.object({
  nomMateriau: Joi.string().required().min(2).max(50),
  typeMateriau: Joi.string().optional().max(50)
});

const TimbreSchema = Joi.object({
  descriptionTimbre: Joi.string().required().min(2).max(100)
});

const TechniqueDeJeuSchema = Joi.object({
  nomTechnique: Joi.string().required().min(2).max(50),
  descriptionTechnique: Joi.string().optional().max(200)
});

const ArtisanSchema = Joi.object({
  nomArtisan: Joi.string().required().min(2).max(100),
  anneesExperience: Joi.number().integer().min(0).max(80).optional()
});

const PatrimoineCulturelSchema = Joi.object({
  nomPatrimoine: Joi.string().required().min(2).max(100),
  descriptionPatrimoine: Joi.string().optional().max(500)
});

// Relations de l'ontologie
const RelationSchema = Joi.object({
  sourceId: Joi.string().required(),
  targetId: Joi.string().required(),
  relationType: Joi.string().required().valid(
    'appartientA', 'utilisePar', 'produitRythme', 'localiseA',
    'constitueDe', 'joueAvec', 'fabrique', 'caracterise',
    'appliqueA', 'englobe'
  )
});

// Mapping des labels Neo4j pour chaque type d'entité
const EntityLabels = {
  'Instrument': 'Instrument',
  'Famille': 'Famille',
  'GroupeEthnique': 'GroupeEthnique',
  'Rythme': 'Rythme',
  'Localite': 'Localite',
  'Materiau': 'Materiau',
  'Timbre': 'Timbre',
  'TechniqueDeJeu': 'TechniqueDeJeu',
  'Artisan': 'Artisan',
  'PatrimoineCulturel': 'PatrimoineCulturel'
};

// Relations et leurs contraintes - Version améliorée pour la réalité musicale
const RelationConstraints = {
  'appartientA': {
    from: ['Instrument'],
    to: ['Famille'],
    cardinality: 'N:1',
    description: 'Plusieurs instruments appartiennent à une famille'
  },
  'utilisePar': {
    from: ['Instrument'],
    to: ['GroupeEthnique'],
    cardinality: 'N:N',
    description: 'Un instrument peut être utilisé par plusieurs groupes ethniques'
  },
  'produitRythme': {
    from: ['Instrument'],
    to: ['Rythme'],
    cardinality: 'N:N',
    description: 'Un instrument peut produire plusieurs rythmes, un rythme peut être produit par plusieurs instruments'
  },
  'localiseA': {
    from: ['Instrument', 'GroupeEthnique', 'Rythme'],
    to: ['Localite'],
    cardinality: 'N:N',
    description: 'Éléments peuvent être présents dans plusieurs localités'
  },
  'constitueDe': {
    from: ['Instrument'],
    to: ['Materiau'],
    cardinality: '1:N',
    description: 'Un instrument peut être constitué de plusieurs matériaux'
  },
  'joueAvec': {
    from: ['Instrument'],
    to: ['TechniqueDeJeu'],
    cardinality: '1:N',
    description: 'Un instrument peut être joué avec plusieurs techniques'
  },
  'fabrique': {
    from: ['Artisan'],
    to: ['Instrument'],
    cardinality: 'N:N',
    description: 'Un artisan peut fabriquer plusieurs instruments, un instrument peut être fabriqué par plusieurs artisans'
  },
  'caracterise': {
    from: ['Timbre'],
    to: ['Instrument'],
    cardinality: 'N:N',
    description: 'Un instrument peut avoir plusieurs timbres, un timbre peut caractériser plusieurs instruments'
  },
  'appliqueA': {
    from: ['TechniqueDeJeu'],
    to: ['Instrument'],
    cardinality: 'N:N',
    description: 'Une technique peut s\'appliquer à plusieurs instruments'
  },
  'englobe': {
    from: ['PatrimoineCulturel'],
    to: ['Instrument', 'GroupeEthnique', 'Rythme'],
    cardinality: '1:N',
    description: 'Un patrimoine culturel englobe plusieurs éléments'
  }
};

module.exports = {
  InstrumentSchema,
  FamilleSchema,
  GroupeEthniqueSchema,
  RythmeSchema,
  LocaliteSchema,
  MateriauSchema,
  TimbreSchema,
  TechniqueDeJeuSchema,
  ArtisanSchema,
  PatrimoineCulturelSchema,
  RelationSchema,
  EntityLabels,
  RelationConstraints
};