const Joi = require('joi');

// Schémas de validation pour chaque entité de l'ontologie

const InstrumentSchema = Joi.object({
  nomInstrument: Joi.string().required().min(2).max(100),
  description: Joi.string().optional().max(500),
  anneeCreation: Joi.number().integer().min(1).max(new Date().getFullYear()).optional()
});

const FamilleSchema = Joi.object({
  nomFamille: Joi.string().required().valid('Cordes', 'Vents', 'Percussions', 'Electrophones')
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
  'Cordes': 'Cordes',
  'Vents': 'Vents', 
  'Percussions': 'Percussions',
  'Electrophones': 'Electrophones',
  'GroupeEthnique': 'GroupeEthnique',
  'Rythme': 'Rythme',
  'Localite': 'Localite',
  'Materiau': 'Materiau',
  'Timbre': 'Timbre',
  'TechniqueDeJeu': 'TechniqueDeJeu',
  'Artisan': 'Artisan',
  'PatrimoineCulturel': 'PatrimoineCulturel'
};

// Relations et leurs contraintes
const RelationConstraints = {
  'appartientA': {
    from: ['Instrument'],
    to: ['Famille', 'Cordes', 'Vents', 'Percussions', 'Electrophones'],
    cardinality: '1:1'
  },
  'utilisePar': {
    from: ['Instrument'],
    to: ['GroupeEthnique'],
    cardinality: '1:N'
  },
  'produitRythme': {
    from: ['Instrument'],
    to: ['Rythme'],
    cardinality: '1:N'
  },
  'localiseA': {
    from: ['Instrument', 'GroupeEthnique', 'Rythme'],
    to: ['Localite'],
    cardinality: '1:N'
  },
  'constitueDe': {
    from: ['Instrument'],
    to: ['Materiau'],
    cardinality: '1:N'
  },
  'joueAvec': {
    from: ['Instrument'],
    to: ['TechniqueDeJeu'],
    cardinality: '1:1'
  },
  'fabrique': {
    from: ['Artisan'],
    to: ['Instrument'],
    cardinality: 'N:1'
  },
  'caracterise': {
    from: ['Timbre'],
    to: ['Instrument'],
    cardinality: '1:1'
  },
  'appliqueA': {
    from: ['TechniqueDeJeu'],
    to: ['Instrument'],
    cardinality: '1:1'
  },
  'englobe': {
    from: ['PatrimoineCulturel'],
    to: ['Instrument', 'GroupeEthnique', 'Rythme'],
    cardinality: '1:N'
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