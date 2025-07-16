const neo4j = require('neo4j-driver');
require('dotenv').config();

class Neo4jConnection {
  constructor() {
    this.driver = null;
    this.session = null;
  }

  async connect() {
    try {
      this.driver = neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
      );

      // Test de connexion
      await this.driver.verifyConnectivity();
      console.log('✅ Connexion Neo4j établie avec succès');
      
      return this.driver;
    } catch (error) {
      console.error('❌ Erreur de connexion Neo4j:', error);
      throw error;
    }
  }

  getSession() {
    if (!this.driver) {
      throw new Error('Driver Neo4j non initialisé');
    }
    return this.driver.session();
  }

  async close() {
    if (this.driver) {
      await this.driver.close();
      console.log('🔒 Connexion Neo4j fermée');
    }
  }

  // Méthode pour exécuter une requête Cypher
  async executeQuery(query, parameters = {}) {
    const session = this.getSession();
    try {
      const result = await session.run(query, parameters);
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la requête:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // Méthode pour exécuter une transaction
  async executeTransaction(queries) {
    const session = this.getSession();
    const transaction = session.beginTransaction();
    
    try {
      const results = [];
      for (const { query, parameters } of queries) {
        const result = await transaction.run(query, parameters);
        results.push(result);
      }
      
      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la transaction:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // Méthode pour vérifier la connectivité
  async verifyConnectivity() {
    if (!this.driver) {
      throw new Error('Driver Neo4j non initialisé');
    }
    return await this.driver.verifyConnectivity();
  }
}

// Instance singleton
const neo4jInstance = new Neo4jConnection();

module.exports = neo4jInstance;