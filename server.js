const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const neo4jConnection = require('./config/neo4j');
const DatabasePopulator = require('./scripts/populateDatabase');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de sécurité
app.use(helmet());

// Configuration CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Trop de requêtes, veuillez réessayer plus tard.'
  }
});
app.use(limiter);

// Middleware de logging
app.use(morgan('combined'));

// Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Route de test de connexion Neo4j
app.get('/db-health', async (req, res) => {
  try {
    const result = await neo4jConnection.executeQuery('RETURN "Neo4j connecté!" as message');
    res.json({
      status: 'OK',
      database: 'Neo4j',
      message: result.records[0].get('message')
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'Neo4j',
      error: error.message
    });
  }
});

// Route pour populer la base de données
app.post('/populate-database', async (req, res) => {
  try {
    console.log('🚀 Début de la population de la base de données...');
    const populator = new DatabasePopulator();
    await populator.populateDatabase();
    
    res.json({
      status: 'SUCCESS',
      message: 'Base de données peuplée avec succès!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur lors de la population:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur lors de la population de la base de données',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Route pour vérifier si la base de données est vide
app.get('/database-status', async (req, res) => {
  try {
    const result = await neo4jConnection.executeQuery('MATCH (n) RETURN count(n) as nodeCount', {}, 'READ');
    const nodeCount = result.records[0].get('nodeCount').toNumber();
    
    res.json({
      status: 'OK',
      isEmpty: nodeCount === 0,
      nodeCount: nodeCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Route pour vider complètement la base de données
app.delete('/clear-database', async (req, res) => {
  try {
    console.log('🗑️ Début du nettoyage de la base de données...');
    
    // Compter les nœuds avant suppression
    const countResult = await neo4jConnection.executeQuery('MATCH (n) RETURN count(n) as nodeCount', {}, 'READ');
    const nodeCountBefore = countResult.records[0].get('nodeCount').toNumber();
    
    if (nodeCountBefore === 0) {
      return res.json({
        status: 'INFO',
        message: 'La base de données est déjà vide',
        nodesDeleted: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // Supprimer tous les nœuds et relations
    await neo4jConnection.executeQuery('MATCH (n) DETACH DELETE n', {}, 'WRITE');
    
    // Vérifier que la base est maintenant vide
    const verifyResult = await neo4jConnection.executeQuery('MATCH (n) RETURN count(n) as nodeCount', {}, 'READ');
    const nodeCountAfter = verifyResult.records[0].get('nodeCount').toNumber();
    
    console.log('✅ Base de données vidée avec succès');
    
    res.json({
      status: 'SUCCESS',
      message: 'Base de données vidée avec succès!',
      nodesDeleted: nodeCountBefore,
      nodeCountAfter: nodeCountAfter,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur lors du nettoyage de la base de données',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Import des routes
const instrumentRoutes = require('./routes/instruments');
const relationRoutes = require('./routes/relations');
const searchRoutes = require('./routes/search');
const genericRoutes = require('./routes/generic');

// Routes API
app.use('/api/instruments', instrumentRoutes);
app.use('/api/relations', relationRoutes);
app.use('/api/search', searchRoutes);

// Routes génériques pour les autres entités
app.use('/api/familles', genericRoutes.familles);
app.use('/api/groupes-ethniques', genericRoutes.groupesEthniques);
app.use('/api/rythmes', genericRoutes.rythmes);
app.use('/api/localites', genericRoutes.localites);
app.use('/api/materiaux', genericRoutes.materiaux);
app.use('/api/timbres', genericRoutes.timbres);
app.use('/api/techniques', genericRoutes.techniques);
app.use('/api/artisans', genericRoutes.artisans);
app.use('/api/patrimoines', genericRoutes.patrimoines);

// Endpoints de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/db-health', async (req, res) => {
  try {
    await neo4jConnection.verifyConnectivity();
    res.json({
      status: 'OK',
      database: 'Neo4j',
      connection: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'Neo4j',
      connection: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/db-health', async (req, res) => {
  try {
    await neo4jConnection.verifyConnectivity();
    res.json({
      status: 'OK',
      database: 'Neo4j',
      connection: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'Neo4j',
      connection: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Route par défaut avec documentation API
app.get('/', (req, res) => {
  res.json({
    message: 'API Ontologie des Instruments de Musique',
    version: '1.0.0',
    description: 'API RESTful pour l\'exploration sémantique des instruments de musique',
    endpoints: {
      health: {
        path: '/health',
        description: 'Santé du serveur'
      },
      dbHealth: {
        path: '/db-health',
        description: 'Santé de la base de données Neo4j'
      },
      databaseStatus: {
        path: '/database-status',
        description: 'Statut et nombre de nœuds dans la base de données'
      },
      populateDatabase: {
        path: '/populate-database',
        method: 'POST',
        description: 'Peupler la base de données avec des données réelles d\'instruments africains'
      },
      clearDatabase: {
        path: '/clear-database',
        method: 'DELETE',
        description: 'Vider complètement la base de données (ATTENTION: Supprime toutes les données!)'
      },
      instruments: {
        path: '/api/instruments',
        description: 'CRUD des instruments de musique',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        special: [
          '/api/instruments/search - Recherche avancée',
          '/api/instruments/statistics - Statistiques',
          '/api/instruments/by-family/:family - Par famille',
          '/api/instruments/by-group/:group - Par groupe ethnique',
          '/api/instruments/by-location/:location - Par localité',
          '/api/instruments/:id/relations - Relations d\'un instrument',
          '/api/instruments/:id/similar - Instruments similaires'
        ]
      },
      relations: {
        path: '/api/relations',
        description: 'Gestion des relations entre entités',
        methods: ['GET', 'POST', 'DELETE'],
        special: [
          '/api/relations/types - Types de relations disponibles',
          '/api/relations/statistics - Statistiques des relations',
          '/api/relations/entity/:id - Relations d\'une entité',
          '/api/relations/type/:type - Relations par type',
          '/api/relations/paths/:startId/:endId - Chemins entre entités'
        ]
      },
      search: {
        path: '/api/search',
        description: 'Recherche sémantique avancée',
        endpoints: [
          '/api/search/global?q=terme - Recherche globale',
          '/api/search/geographic?lat=x&lng=y&radius=z - Recherche géographique',
          '/api/search/similar/:id?type=instrument - Entités similaires',
          '/api/search/cultural-patterns - Patterns culturels',
          '/api/search/semantic-paths/:startId/:endId - Chemins sémantiques',
          '/api/search/recommendations/:id - Recommandations',
          '/api/search/centrality - Analyse de centralité'
        ]
      },
      entities: {
        description: 'CRUD pour toutes les entités de l\'ontologie',
        paths: [
          '/api/familles - Familles d\'instruments',
          '/api/groupes-ethniques - Groupes ethniques',
          '/api/rythmes - Rythmes musicaux',
          '/api/localites - Localités géographiques',
          '/api/materiaux - Matériaux de construction',
          '/api/timbres - Timbres sonores',
          '/api/techniques - Techniques de jeu',
          '/api/artisans - Artisans fabricants',
          '/api/patrimoines - Patrimoine culturel'
        ],
        commonEndpoints: [
          'GET / - Liste paginée',
          'GET /statistics - Statistiques',
          'GET /:id - Détails d\'une entité',
          'GET /:id/relations - Relations d\'une entité',
          'POST / - Créer une entité',
          'PUT /:id - Modifier une entité',
          'DELETE /:id - Supprimer une entité'
        ]
      }
    },
    examples: {
      createInstrument: 'POST /api/instruments {"nomInstrument": "Balafon", "description": "Xylophone africain"}',
      createRelation: 'POST /api/relations {"sourceId": 1, "targetId": 2, "relationType": "appartientA"}',
      globalSearch: 'GET /api/search/global?q=djembe',
      geoSearch: 'GET /api/search/geographic?lat=14.6928&lng=-17.4467&radius=50'
    }
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Middleware de gestion d'erreurs globales
app.use((error, req, res, next) => {
  console.error('Erreur serveur:', error);
  
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erreur interne du serveur' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// Fonction de démarrage du serveur
async function startServer() {
  try {
    // Vérification des variables d'environnement
    if (!process.env.NEO4J_URI || !process.env.NEO4J_USERNAME || !process.env.NEO4J_PASSWORD) {
      throw new Error('Variables d\'environnement Neo4j manquantes. Vérifiez votre fichier .env');
    }

    // Connexion à Neo4j
    console.log('🔄 Connexion à Neo4j en cours...');
    await neo4jConnection.connect();
    
    // Vérifier si la base de données est vide et la peupler si nécessaire
    try {
      const result = await neo4jConnection.executeQuery('MATCH (n) RETURN count(n) as nodeCount', {}, 'READ');
      const nodeCount = result.records[0].get('nodeCount').toNumber();
      
      if (nodeCount === 0) {
        console.log('🗄️  Base de données vide détectée');
        console.log('🚀 Début de la population automatique...');
        const populator = new DatabasePopulator();
        await populator.populateDatabase();
        console.log('✅ Population automatique terminée');
      } else {
        console.log(`🗄️  Base de données contient déjà ${nodeCount} nœuds`);
      }
    } catch (error) {
      console.warn('⚠️  Impossible de vérifier l\'état de la base de données:', error.message);
      console.log('💡 Vous pouvez toujours peupler manuellement avec POST /populate-database');
    }
    
    // Démarrage du serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Base de données: ${process.env.NEO4J_URI}`);
      console.log('');
      console.log('📚 Documentation API disponible sur: http://localhost:' + PORT);
      console.log('🔍 Test de santé: http://localhost:' + PORT + '/health');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    console.error('💡 Vérifiez que Neo4j est démarré et que les variables d\'environnement sont correctes');
    process.exit(1);
  }
}

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur en cours...');
  await neo4jConnection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur en cours...');
  await neo4jConnection.close();
  process.exit(0);
});

// Démarrage
startServer();

module.exports = app;