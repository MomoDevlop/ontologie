const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const neo4jConnection = require('./config/neo4j');

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
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
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

// Import des routes (nous les créerons dans les prochaines étapes)
// app.use('/api/instruments', require('./routes/instruments'));
// app.use('/api/familles', require('./routes/familles'));
// app.use('/api/groupes-ethniques', require('./routes/groupesEthniques'));
// app.use('/api/rythmes', require('./routes/rythmes'));
// app.use('/api/localites', require('./routes/localites'));
// app.use('/api/materiaux', require('./routes/materiaux'));
// app.use('/api/timbres', require('./routes/timbres'));
// app.use('/api/techniques', require('./routes/techniques'));
// app.use('/api/artisans', require('./routes/artisans'));
// app.use('/api/patrimoines', require('./routes/patrimoines'));
// app.use('/api/relations', require('./routes/relations'));
// app.use('/api/search', require('./routes/search'));

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    message: 'API Ontologie des Instruments de Musique',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      dbHealth: '/db-health',
      api: '/api/*'
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
    
    // Démarrage du serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Base de données: ${process.env.NEO4J_URI}`);
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