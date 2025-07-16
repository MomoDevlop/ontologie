const neo4jConnection = require('../config/neo4j');

// Requêtes pour créer les contraintes et index
const initQueries = [
  // Contraintes d'unicité pour les identifiants
  'CREATE CONSTRAINT instrument_nom IF NOT EXISTS FOR (i:Instrument) REQUIRE i.nomInstrument IS UNIQUE',
  'CREATE CONSTRAINT famille_nom IF NOT EXISTS FOR (f:Famille) REQUIRE f.nomFamille IS UNIQUE',
  'CREATE CONSTRAINT groupe_nom IF NOT EXISTS FOR (g:GroupeEthnique) REQUIRE g.nomGroupe IS UNIQUE',
  'CREATE CONSTRAINT rythme_nom IF NOT EXISTS FOR (r:Rythme) REQUIRE r.nomRythme IS UNIQUE',
  'CREATE CONSTRAINT localite_nom IF NOT EXISTS FOR (l:Localite) REQUIRE l.nomLocalite IS UNIQUE',
  'CREATE CONSTRAINT materiau_nom IF NOT EXISTS FOR (m:Materiau) REQUIRE m.nomMateriau IS UNIQUE',
  'CREATE CONSTRAINT technique_nom IF NOT EXISTS FOR (t:TechniqueDeJeu) REQUIRE t.nomTechnique IS UNIQUE',
  'CREATE CONSTRAINT artisan_nom IF NOT EXISTS FOR (a:Artisan) REQUIRE a.nomArtisan IS UNIQUE',
  'CREATE CONSTRAINT patrimoine_nom IF NOT EXISTS FOR (p:PatrimoineCulturel) REQUIRE p.nomPatrimoine IS UNIQUE',

  // Index pour améliorer les performances de recherche
  'CREATE INDEX instrument_description IF NOT EXISTS FOR (i:Instrument) ON (i.description)',
  'CREATE INDEX localite_coords IF NOT EXISTS FOR (l:Localite) ON (l.latitude, l.longitude)',
  'CREATE INDEX rythme_tempo IF NOT EXISTS FOR (r:Rythme) ON (r.tempoBPM)',

  // Vérification de la structure
  'CALL db.schema.visualization()'
];

// Données d'exemple basées sur l'ontologie
const sampleData = [
  // Familles d'instruments
  'CREATE (f1:Famille:Percussions {nomFamille: "Percussions"})',
  'CREATE (f2:Famille:Cordes {nomFamille: "Cordes"})',
  'CREATE (f3:Famille:Vents {nomFamille: "Vents"})',
  'CREATE (f4:Famille:Electrophones {nomFamille: "Electrophones"})',

  // Localités avec coordonnées
  'CREATE (l1:Localite {nomLocalite: "Dakar", latitude: 14.6928, longitude: -17.4467})',
  'CREATE (l2:Localite {nomLocalite: "Bamako", latitude: 12.6392, longitude: -8.0029})',
  'CREATE (l3:Localite {nomLocalite: "Accra", latitude: 5.6037, longitude: -0.1870})',

  // Groupes ethniques
  'CREATE (g1:GroupeEthnique {nomGroupe: "Mandingue", langue: "Mandé"})',
  'CREATE (g2:GroupeEthnique {nomGroupe: "Yoruba", langue: "Yoruba"})',
  'CREATE (g3:GroupeEthnique {nomGroupe: "Akan", langue: "Akan"})',

  // Rythmes
  'CREATE (r1:Rythme {nomRythme: "Soukous", tempoBPM: 120})',
  'CREATE (r2:Rythme {nomRythme: "Rumba", tempoBPM: 100})',
  'CREATE (r3:Rythme {nomRythme: "Gnaoua", tempoBPM: 90})',

  // Matériaux
  'CREATE (m1:Materiau {nomMateriau: "Bois", typeMateriau: "Naturel"})',
  'CREATE (m2:Materiau {nomMateriau: "Cuir", typeMateriau: "Naturel"})',
  'CREATE (m3:Materiau {nomMateriau: "Métal", typeMateriau: "Synthétique"})',

  // Techniques de jeu
  'CREATE (t1:TechniqueDeJeu {nomTechnique: "Pincé", descriptionTechnique: "Technique utilisant les doigts pour pincer les cordes"})',
  'CREATE (t2:TechniqueDeJeu {nomTechnique: "Frappé", descriptionTechnique: "Technique utilisant les mains ou baguettes pour frapper"})',
  'CREATE (t3:TechniqueDeJeu {nomTechnique: "Soufflé", descriptionTechnique: "Technique utilisant le souffle pour produire le son"})',

  // Timbres
  'CREATE (ti1:Timbre {descriptionTimbre: "Grave"})',
  'CREATE (ti2:Timbre {descriptionTimbre: "Clair"})',
  'CREATE (ti3:Timbre {descriptionTimbre: "Métallique"})',

  // Artisans
  'CREATE (a1:Artisan {nomArtisan: "Amadou Traore", anneesExperience: 25})',
  'CREATE (a2:Artisan {nomArtisan: "Sekou Kone", anneesExperience: 30})',
  'CREATE (a3:Artisan {nomArtisan: "Fatou Diabate", anneesExperience: 20})',

  // Patrimoine culturel
  'CREATE (p1:PatrimoineCulturel {nomPatrimoine: "Musique Mandingue", descriptionPatrimoine: "Tradition musicale des peuples Mandingue"})',
  'CREATE (p2:PatrimoineCulturel {nomPatrimoine: "Culture Yoruba", descriptionPatrimoine: "Patrimoine culturel du peuple Yoruba"})',
  'CREATE (p3:PatrimoineCulturel {nomPatrimoine: "Traditions Akan", descriptionPatrimoine: "Héritage culturel des peuples Akan"})',

  // Instruments avec leurs propriétés
  'CREATE (i1:Instrument {nomInstrument: "Djembe", description: "Tambour en forme de calice", anneeCreation: 1200})',
  'CREATE (i2:Instrument {nomInstrument: "Kora", description: "Harpe-luth à 21 cordes", anneeCreation: 1300})',
  'CREATE (i3:Instrument {nomInstrument: "Balafon", description: "Xylophone traditionnel africain", anneeCreation: 1400})'
];

// Relations selon l'ontologie
const sampleRelations = [
  // Relations appartientA
  'MATCH (i:Instrument {nomInstrument: "Djembe"}), (f:Famille {nomFamille: "Percussions"}) CREATE (i)-[:appartientA]->(f)',
  'MATCH (i:Instrument {nomInstrument: "Kora"}), (f:Famille {nomFamille: "Cordes"}) CREATE (i)-[:appartientA]->(f)',
  'MATCH (i:Instrument {nomInstrument: "Balafon"}), (f:Famille {nomFamille: "Percussions"}) CREATE (i)-[:appartientA]->(f)',

  // Relations utilisePar
  'MATCH (i:Instrument {nomInstrument: "Djembe"}), (g:GroupeEthnique {nomGroupe: "Mandingue"}) CREATE (i)-[:utilisePar]->(g)',
  'MATCH (i:Instrument {nomInstrument: "Kora"}), (g:GroupeEthnique {nomGroupe: "Mandingue"}) CREATE (i)-[:utilisePar]->(g)',

  // Relations localiseA
  'MATCH (i:Instrument {nomInstrument: "Djembe"}), (l:Localite {nomLocalite: "Bamako"}) CREATE (i)-[:localiseA]->(l)',
  'MATCH (i:Instrument {nomInstrument: "Kora"}), (l:Localite {nomLocalite: "Dakar"}) CREATE (i)-[:localiseA]->(l)',

  // Relations produitRythme
  'MATCH (i:Instrument {nomInstrument: "Djembe"}), (r:Rythme {nomRythme: "Gnaoua"}) CREATE (i)-[:produitRythme]->(r)',
  'MATCH (i:Instrument {nomInstrument: "Kora"}), (r:Rythme {nomRythme: "Soukous"}) CREATE (i)-[:produitRythme]->(r)',

  // Relations constitueDe
  'MATCH (i:Instrument {nomInstrument: "Djembe"}), (m:Materiau {nomMateriau: "Bois"}) CREATE (i)-[:constitueDe]->(m)',
  'MATCH (i:Instrument {nomInstrument: "Djembe"}), (m:Materiau {nomMateriau: "Cuir"}) CREATE (i)-[:constitueDe]->(m)',
  'MATCH (i:Instrument {nomInstrument: "Kora"}), (m:Materiau {nomMateriau: "Bois"}) CREATE (i)-[:constitueDe]->(m)',

  // Relations joueAvec
  'MATCH (i:Instrument {nomInstrument: "Kora"}), (t:TechniqueDeJeu {nomTechnique: "Pincé"}) CREATE (i)-[:joueAvec]->(t)',
  'MATCH (i:Instrument {nomInstrument: "Djembe"}), (t:TechniqueDeJeu {nomTechnique: "Frappé"}) CREATE (i)-[:joueAvec]->(t)',

  // Relations fabrique
  'MATCH (a:Artisan {nomArtisan: "Amadou Traore"}), (i:Instrument {nomInstrument: "Djembe"}) CREATE (a)-[:fabrique]->(i)',
  'MATCH (a:Artisan {nomArtisan: "Sekou Kone"}), (i:Instrument {nomInstrument: "Kora"}) CREATE (a)-[:fabrique]->(i)',

  // Relations caracterise
  'MATCH (ti:Timbre {descriptionTimbre: "Grave"}), (i:Instrument {nomInstrument: "Djembe"}) CREATE (ti)-[:caracterise]->(i)',
  'MATCH (ti:Timbre {descriptionTimbre: "Clair"}), (i:Instrument {nomInstrument: "Kora"}) CREATE (ti)-[:caracterise]->(i)',

  // Relations englobe
  'MATCH (p:PatrimoineCulturel {nomPatrimoine: "Musique Mandingue"}), (i:Instrument {nomInstrument: "Kora"}) CREATE (p)-[:englobe]->(i)',
  'MATCH (p:PatrimoineCulturel {nomPatrimoine: "Musique Mandingue"}), (g:GroupeEthnique {nomGroupe: "Mandingue"}) CREATE (p)-[:englobe]->(g)'
];

async function initializeDatabase() {
  try {
    console.log('🔄 Initialisation de la base de données...');
    
    // Connexion à Neo4j
    await neo4jConnection.connect();
    
    // Création des contraintes et index
    console.log('📋 Création des contraintes et index...');
    for (const query of initQueries) {
      try {
        await neo4jConnection.executeQuery(query);
        console.log(`✅ ${query.substring(0, 50)}...`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.warn(`⚠️  ${query.substring(0, 50)}...: ${error.message}`);
        }
      }
    }
    
    // Suppression des données existantes (optionnel)
    console.log('🧹 Nettoyage des données existantes...');
    await neo4jConnection.executeQuery('MATCH (n) DETACH DELETE n');
    
    // Insertion des données d'exemple
    console.log('📦 Insertion des données d\'exemple...');
    for (const query of [...sampleData, ...sampleRelations]) {
      await neo4jConnection.executeQuery(query);
      console.log(`✅ ${query.substring(0, 50)}...`);
    }
    
    // Vérification des données
    const result = await neo4jConnection.executeQuery(`
      MATCH (n) 
      RETURN labels(n)[0] as type, count(n) as count 
      ORDER BY type
    `);
    
    console.log('\n📊 Résumé des données créées :');
    result.records.forEach(record => {
      console.log(`   ${record.get('type')}: ${record.get('count')} éléments`);
    });
    
    console.log('\n🎉 Base de données initialisée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation :', error.message);
  } finally {
    await neo4jConnection.close();
  }
}

// Exécution si appelé directement
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };