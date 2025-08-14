const neo4j = require('neo4j-driver');
require('dotenv').config();

// Script de population avec des données réelles d'instruments africains
class DatabasePopulator {
  constructor() {
    const driverConfig = {};
    if (process.env.NEO4J_DATABASE) {
      driverConfig.database = process.env.NEO4J_DATABASE;
    }
    
    this.driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
      driverConfig
    );
  }

  async populateDatabase() {
    const session = this.driver.session();
    
    try {
      console.log('🔄 Début de la population de la base de données...');
      
      // Nettoyer la base de données
      await this.clearDatabase(session);
      
      // Créer les entités
      const entities = await this.createAllEntities(session);
      
      // Créer les relations
      await this.createAllRelations(session, entities);
      
      console.log('✅ Population de la base de données terminée avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur lors de la population:', error);
    } finally {
      await session.close();
      await this.driver.close();
    }
  }

  async clearDatabase(session) {
    console.log('🧹 Nettoyage de la base de données...');
    await session.run('MATCH (n) DETACH DELETE n');
  }

  async createAllEntities(session) {
    const entities = {};
    
    // 1. Créer les Localités (villes importantes d'Afrique)
    entities.localites = await this.createLocalites(session);
    
    // 2. Créer les Groupes Ethniques
    entities.groupesEthniques = await this.createGroupesEthniques(session);
    
    // 3. Créer les Familles d'instruments
    entities.familles = await this.createFamilles(session);
    
    // 4. Créer les Matériaux
    entities.materiaux = await this.createMateriaux(session);
    
    // 5. Créer les Timbres
    entities.timbres = await this.createTimbres(session);
    
    // 6. Créer les Techniques de Jeu
    entities.techniquesDeJeu = await this.createTechniquesDeJeu(session);
    
    // 7. Créer les Rythmes
    entities.rythmes = await this.createRythmes(session);
    
    // 8. Créer les Artisans
    entities.artisans = await this.createArtisans(session);
    
    // 9. Créer les Patrimoines Culturels
    entities.patrimoinesCulturels = await this.createPatrimoinesCulturels(session);
    
    // 10. Créer les Instruments (traditionnels et modernes)
    entities.instruments = await this.createInstruments(session);
    
    return entities;
  }

  async createLocalites(session) {
    console.log('📍 Création des localités...');
    
    const localitesData = [
      { nomLocalite: 'Bamako', latitude: 12.6392, longitude: -8.0029 }, // Mali
      { nomLocalite: 'Lagos', latitude: 6.5244, longitude: 3.3792 }, // Nigeria
      { nomLocalite: 'Dakar', latitude: 14.6937, longitude: -17.4441 }, // Sénégal
      { nomLocalite: 'Abidjan', latitude: 5.3600, longitude: -4.0083 }, // Côte d'Ivoire
      { nomLocalite: 'Conakry', latitude: 9.6412, longitude: -13.5784 }, // Guinée
      { nomLocalite: 'Ouagadougou', latitude: 12.3714, longitude: -1.5197 }, // Burkina Faso
      { nomLocalite: 'Accra', latitude: 5.6037, longitude: -0.1870 }, // Ghana
      { nomLocalite: 'Cotonou', latitude: 6.4531, longitude: 2.3958 }, // Bénin
      { nomLocalite: 'Niamey', latitude: 13.5116, longitude: 2.1254 }, // Niger
      { nomLocalite: 'Ségou', latitude: 13.4317, longitude: -6.2158 }, // Mali - Centre traditionnel
      { nomLocalite: 'Mopti', latitude: 14.4843, longitude: -4.1968 }, // Mali - Région Peul
      { nomLocalite: 'Kayes', latitude: 14.4463, longitude: -11.4458 }, // Mali - Région Mandingue
    ];

    const localites = [];
    for (const data of localitesData) {
      const result = await session.run(`
        CREATE (l:Localite {
          nomLocalite: $nomLocalite,
          latitude: $latitude,
          longitude: $longitude
        })
        RETURN l
      `, data);
      localites.push({ ...data, id: result.records[0].get('l').identity.low });
    }
    
    return localites;
  }

  async createGroupesEthniques(session) {
    console.log('👥 Création des groupes ethniques...');
    
    const groupesData = [
      { nomGroupe: 'Mandingue', langue: 'Mandé' },
      { nomGroupe: 'Yoruba', langue: 'Yoruba' },
      { nomGroupe: 'Hausa', langue: 'Haoussa' },
      { nomGroupe: 'Bambara', langue: 'Bambara' },
      { nomGroupe: 'Peul', langue: 'Peul' },
      { nomGroupe: 'Wolof', langue: 'Wolof' },
      { nomGroupe: 'Akan', langue: 'Akan' },
      { nomGroupe: 'Songhaï', langue: 'Songhaï' },
      { nomGroupe: 'Malinké', langue: 'Malinké' },
      { nomGroupe: 'Dioula', langue: 'Dioula' },
      { nomGroupe: 'Fon', langue: 'Fon' },
      { nomGroupe: 'Ewe', langue: 'Ewe' },
      // Groupes ethniques du Burkina Faso
      { nomGroupe: 'Mossi', langue: 'Mooré' },
      { nomGroupe: 'Bobo', langue: 'Bobo' },
      { nomGroupe: 'Lobi', langue: 'Lobi' },
      { nomGroupe: 'Gourmantché', langue: 'Gourmantchéma' },
      { nomGroupe: 'Bissa', langue: 'Bissa' },
      { nomGroupe: 'Sénoufo', langue: 'Sénoufo' },
      { nomGroupe: 'Dagara', langue: 'Dagara' },
      { nomGroupe: 'Bwaba', langue: 'Bwamu' },
    ];

    const groupes = [];
    for (const data of groupesData) {
      const result = await session.run(`
        CREATE (g:GroupeEthnique {
          nomGroupe: $nomGroupe,
          langue: $langue
        })
        RETURN g
      `, data);
      groupes.push({ ...data, id: result.records[0].get('g').identity.low });
    }
    
    return groupes;
  }

  async createFamilles(session) {
    console.log('🎵 Création des familles d\'instruments...');
    
    const famillesData = [
      { nomFamille: 'Membranophones', descriptionFamille: 'Instruments à membrane tendue (tambours)' },
      { nomFamille: 'Idiophones', descriptionFamille: 'Instruments produisant le son par leur propre matière' },
      { nomFamille: 'Cordophones', descriptionFamille: 'Instruments à cordes' },
      { nomFamille: 'Aérophones', descriptionFamille: 'Instruments à vent' },
      { nomFamille: 'Électrophones', descriptionFamille: 'Instruments électriques et électroniques' },
    ];

    const familles = [];
    for (const data of famillesData) {
      const result = await session.run(`
        CREATE (f:Famille {
          nomFamille: $nomFamille,
          descriptionFamille: $descriptionFamille
        })
        RETURN f
      `, data);
      familles.push({ ...data, id: result.records[0].get('f').identity.low });
    }
    
    return familles;
  }

  async createMateriaux(session) {
    console.log('🌿 Création des matériaux...');
    
    const materiauxData = [
      { nomMateriau: 'Bois de mahogany', typeMateriau: 'Bois dur' },
      { nomMateriau: 'Bois d\'acacia', typeMateriau: 'Bois dur' },
      { nomMateriau: 'Bois de lenke', typeMateriau: 'Bois dur' },
      { nomMateriau: 'Bois de padouk', typeMateriau: 'Bois dur' },
      { nomMateriau: 'Peau de chèvre', typeMateriau: 'Peau animale' },
      { nomMateriau: 'Peau de bœuf', typeMateriau: 'Peau animale' },
      { nomMateriau: 'Calabasse', typeMateriau: 'Courge séchée' },
      { nomMateriau: 'Métal', typeMateriau: 'Lames métalliques' },
      { nomMateriau: 'Corde en boyau', typeMateriau: 'Corde naturelle' },
      { nomMateriau: 'Corde en nylon', typeMateriau: 'Corde synthétique' },
      { nomMateriau: 'Bambou', typeMateriau: 'Roseau' },
      { nomMateriau: 'Cuivre', typeMateriau: 'Métal' },
      { nomMateriau: 'Laiton', typeMateriau: 'Alliage' },
      { nomMateriau: 'Acier', typeMateriau: 'Métal' },
      { nomMateriau: 'Nylon', typeMateriau: 'Synthétique' },
    ];

    const materiaux = [];
    for (const data of materiauxData) {
      const result = await session.run(`
        CREATE (m:Materiau {
          nomMateriau: $nomMateriau,
          typeMateriau: $typeMateriau
        })
        RETURN m
      `, data);
      materiaux.push({ ...data, id: result.records[0].get('m').identity.low });
    }
    
    return materiaux;
  }

  async createTimbres(session) {
    console.log('🎶 Création des timbres...');
    
    const timbresData = [
      { descriptionTimbre: 'Grave et profond' },
      { descriptionTimbre: 'Aigu et perçant' },
      { descriptionTimbre: 'Métallique et cristallin' },
      { descriptionTimbre: 'Chaud et rond' },
      { descriptionTimbre: 'Sec et claquant' },
      { descriptionTimbre: 'Résonnant et vibrant' },
      { descriptionTimbre: 'Doux et mélodieux' },
      { descriptionTimbre: 'Puissant et expressif' },
      { descriptionTimbre: 'Harmonique et complexe' },
      { descriptionTimbre: 'Percutant et rythmique' },
    ];

    const timbres = [];
    for (const data of timbresData) {
      const result = await session.run(`
        CREATE (t:Timbre {
          descriptionTimbre: $descriptionTimbre
        })
        RETURN t
      `, data);
      timbres.push({ ...data, id: result.records[0].get('t').identity.low });
    }
    
    return timbres;
  }

  async createTechniquesDeJeu(session) {
    console.log('🤲 Création des techniques de jeu...');
    
    const techniquesData = [
      { nomTechnique: 'Jeu aux mains nues', descriptionTechnique: 'Technique traditionnelle de percussion à mains nues' },
      { nomTechnique: 'Jeu aux baguettes', descriptionTechnique: 'Utilisation de baguettes en bois' },
      { nomTechnique: 'Pincement des cordes', descriptionTechnique: 'Technique pour instruments à cordes pincées' },
      { nomTechnique: 'Frappe aux mailloches', descriptionTechnique: 'Utilisation de mailloches rembourrées' },
      { nomTechnique: 'Souffle continu', descriptionTechnique: 'Technique respiratoire pour instruments à vent' },
      { nomTechnique: 'Glissando', descriptionTechnique: 'Glissement entre les notes' },
      { nomTechnique: 'Vibrato', descriptionTechnique: 'Modulation de la hauteur ou de l\'intensité' },
      { nomTechnique: 'Polyrythme', descriptionTechnique: 'Superposition de rythmes différents' },
      { nomTechnique: 'Jeu en arpège', descriptionTechnique: 'Notes jouées successivement' },
      { nomTechnique: 'Jeu percussif', descriptionTechnique: 'Frappe rythmique de l\'instrument' },
    ];

    const techniques = [];
    for (const data of techniquesData) {
      const result = await session.run(`
        CREATE (tech:TechniqueDeJeu {
          nomTechnique: $nomTechnique,
          descriptionTechnique: $descriptionTechnique
        })
        RETURN tech
      `, data);
      techniques.push({ ...data, id: result.records[0].get('tech').identity.low });
    }
    
    return techniques;
  }

  async createRythmes(session) {
    console.log('🥁 Création des rythmes...');
    
    const rythmesData = [
      { nomRythme: 'Djembe traditionnel', tempoBPM: 120 },
      { nomRythme: 'Balafon pentatonique', tempoBPM: 100 },
      { nomRythme: 'Afrobeat funk', tempoBPM: 110 },
      { nomRythme: 'Highlife ghanéen', tempoBPM: 130 },
      { nomRythme: 'Soukous congolais', tempoBPM: 140 },
      { nomRythme: 'Mbalax sénégalais', tempoBPM: 125 },
      { nomRythme: 'Griot traditionnel', tempoBPM: 90 },
      { nomRythme: 'Jazz africain', tempoBPM: 115 },
      { nomRythme: 'Ethio-jazz', tempoBPM: 105 },
      { nomRythme: 'Wassoulou malien', tempoBPM: 95 },
      { nomRythme: 'Makossa camerounais', tempoBPM: 135 },
      { nomRythme: 'Coupé-décalé ivoirien', tempoBPM: 150 },
      // Rythmes du Burkina Faso
      { nomRythme: 'Warba Mossi', tempoBPM: 108 },
      { nomRythme: 'Wiiré Mossi', tempoBPM: 92 },
      { nomRythme: 'Wenega Mossi', tempoBPM: 110 },
      { nomRythme: 'Balafon Bobo', tempoBPM: 85 },
      { nomRythme: 'Gyil Lobi', tempoBPM: 88 },
      { nomRythme: 'Bendré royal', tempoBPM: 75 },
    ];

    const rythmes = [];
    for (const data of rythmesData) {
      const result = await session.run(`
        CREATE (r:Rythme {
          nomRythme: $nomRythme,
          tempoBPM: $tempoBPM
        })
        RETURN r
      `, data);
      rythmes.push({ ...data, id: result.records[0].get('r').identity.low });
    }
    
    return rythmes;
  }

  async createArtisans(session) {
    console.log('👨‍🎨 Création des artisans...');
    
    const artisansData = [
      { nomArtisan: 'Mamadou Kouyaté', anneesExperience: 35 },
      { nomArtisan: 'Fatoumata Diabaté', anneesExperience: 28 },
      { nomArtisan: 'Ibrahim Sangaré', anneesExperience: 42 },
      { nomArtisan: 'Aminata Traoré', anneesExperience: 31 },
      { nomArtisan: 'Sekou Keita', anneesExperience: 39 },
      { nomArtisan: 'Nana Ampadu', anneesExperience: 45 },
      { nomArtisan: 'Kojo Antwi', anneesExperience: 33 },
      { nomArtisan: 'Salif Keita', anneesExperience: 38 },
      { nomArtisan: 'Youssou N\'Dour', anneesExperience: 40 },
      { nomArtisan: 'Alpha Blondy', anneesExperience: 36 },
      { nomArtisan: 'Baaba Maal', anneesExperience: 32 },
      { nomArtisan: 'Ali Farka Touré', anneesExperience: 44 },
      // Artisans du Burkina Faso
      { nomArtisan: 'Naaba Tigré', anneesExperience: 48 },
      { nomArtisan: 'Boukary Sawadogo', anneesExperience: 35 },
      { nomArtisan: 'Aminata Ouédraogo', anneesExperience: 29 },
      { nomArtisan: 'Ibrahim Kaboré', anneesExperience: 41 },
      { nomArtisan: 'Fatou Compaoré', anneesExperience: 26 },
    ];

    const artisans = [];
    for (const data of artisansData) {
      const result = await session.run(`
        CREATE (a:Artisan {
          nomArtisan: $nomArtisan,
          anneesExperience: $anneesExperience
        })
        RETURN a
      `, data);
      artisans.push({ ...data, id: result.records[0].get('a').identity.low });
    }
    
    return artisans;
  }

  async createPatrimoinesCulturels(session) {
    console.log('🏛️ Création des patrimoines culturels...');
    
    const patrimoinesData = [
      { nomPatrimoine: 'Tradition Griot Mandingue', descriptionPatrimoine: 'Art oral et musical des griots d\'Afrique de l\'Ouest' },
      { nomPatrimoine: 'Musique Yoruba', descriptionPatrimoine: 'Traditions musicales du peuple Yoruba' },
      { nomPatrimoine: 'Héritage Peul', descriptionPatrimoine: 'Culture pastorale et musicale des Peuls' },
      { nomPatrimoine: 'Art Bambara', descriptionPatrimoine: 'Expressions artistiques du peuple Bambara' },
      { nomPatrimoine: 'Patrimoine Akan', descriptionPatrimoine: 'Culture et musique du groupe Akan' },
      { nomPatrimoine: 'Traditions Hausa', descriptionPatrimoine: 'Héritage culturel et musical Hausa' },
      { nomPatrimoine: 'Afrobeat Heritage', descriptionPatrimoine: 'Fusion moderne des traditions africaines et jazz' },
      { nomPatrimoine: 'Highlife Legacy', descriptionPatrimoine: 'Patrimoine musical ghanéen moderne' },
      // Patrimoines culturels du Burkina Faso
      { nomPatrimoine: 'Royaume Mossi', descriptionPatrimoine: 'Traditions royales et musique sacrée des Mossi' },
      { nomPatrimoine: 'Culture Bobo', descriptionPatrimoine: 'Traditions musicales et masques des Bobo' },
      { nomPatrimoine: 'Héritage Lobi', descriptionPatrimoine: 'Cérémonies et xylophones des Lobi et Dagara' },
      { nomPatrimoine: 'Tradition Gourmantché', descriptionPatrimoine: 'Musique et tambours parlants des Gourmantché' },
    ];

    const patrimoines = [];
    for (const data of patrimoinesData) {
      const result = await session.run(`
        CREATE (p:PatrimoineCulturel {
          nomPatrimoine: $nomPatrimoine,
          descriptionPatrimoine: $descriptionPatrimoine
        })
        RETURN p
      `, data);
      patrimoines.push({ ...data, id: result.records[0].get('p').identity.low });
    }
    
    return patrimoines;
  }

  async createInstruments(session) {
    console.log('🎼 Création des instruments...');
    
    const instrumentsData = [
      // Instruments traditionnels
      { nomInstrument: 'Djembe', description: 'Tambour à membrane en forme de calice originaire d\'Afrique de l\'Ouest', anneeCreation: 1200 },
      { nomInstrument: 'Kora', description: 'Harpe-luth à 21 cordes utilisée par les griots mandingues', anneeCreation: 1300 },
      { nomInstrument: 'Balafon', description: 'Xylophone africain avec lames de bois et résonateurs en calebasse', anneeCreation: 1000 },
      { nomInstrument: 'Mbira', description: 'Piano à pouces avec lames métalliques sur support en bois', anneeCreation: 800 },
      { nomInstrument: 'Kalimba', description: 'Version moderne du mbira avec lames métalliques', anneeCreation: 1950 },
      { nomInstrument: 'Sanza', description: 'Piano à pouces traditionnel d\'Afrique centrale', anneeCreation: 900 },
      { nomInstrument: 'Dundun', description: 'Grand tambour grave accompagnant le djembe', anneeCreation: 1250 },
      { nomInstrument: 'Sangban', description: 'Tambour de taille moyenne dans l\'ensemble djembe', anneeCreation: 1250 },
      { nomInstrument: 'Kenkeni', description: 'Petit tambour aigu dans l\'ensemble djembe', anneeCreation: 1250 },
      { nomInstrument: 'Talking Drum', description: 'Tambour parlant pouvant imiter les intonations de la parole', anneeCreation: 1100 },
      { nomInstrument: 'Atumpan', description: 'Paire de tambours sacrés des Ashanti du Ghana', anneeCreation: 1400 },
      { nomInstrument: 'Fontomfrom', description: 'Grand tambour royal des Ashanti', anneeCreation: 1500 },
      
      // Instruments traditionnels du Burkina Faso
      { nomInstrument: 'Bendré', description: 'Tambour-calebasse sacré des Mossi, symbole de légitimité royale', anneeCreation: 1400 },
      { nomInstrument: 'Bara', description: 'Tambour à membrane en calebasse, équivalent malien du bendré', anneeCreation: 1350 },
      { nomInstrument: 'Gyil', description: 'Xylophone pentatonique des Lobi et Dagara avec résonateurs en calebasse', anneeCreation: 1200 },
      { nomInstrument: 'Kuor', description: 'Tambour en calebasse accompagnant le gyil chez les Dagara', anneeCreation: 1200 },
      { nomInstrument: 'Balafon Bobo', description: 'Xylophone pentatonique concave des Bobo avec gamme distinctive', anneeCreation: 1100 },
      { nomInstrument: 'Dondo Mossi', description: 'Tambour cylindrique des cérémonies Mossi', anneeCreation: 1300 },
      { nomInstrument: 'Gangan burkinabé', description: 'Tambour parlant des Gourmantché', anneeCreation: 1250 },
      { nomInstrument: 'Flûte Peul', description: 'Flûte traditionnelle des bergers Peuls du nord Burkina', anneeCreation: 1000 },
      { nomInstrument: 'Luth Bellao', description: 'Luth à cordes des Bellao du nord Burkina Faso', anneeCreation: 1150 },
      { nomInstrument: 'Tambour d\'eau Bissa', description: 'Tambour d\'eau utilisé dans les rituels Bissa', anneeCreation: 1200 },
      
      // Instruments modernes et fusion
      { nomInstrument: 'Guitare électrique africanisée', description: 'Guitare électrique adaptée aux styles africains', anneeCreation: 1960 },
      { nomInstrument: 'Saxophone afrobeat', description: 'Saxophone utilisé dans l\'afrobeat et le jazz africain', anneeCreation: 1970 },
      { nomInstrument: 'Piano jazz africain', description: 'Piano adapté aux gammes et rythmes africains', anneeCreation: 1965 },
      { nomInstrument: 'Basse électrique highlife', description: 'Basse électrique pour highlife et soukous', anneeCreation: 1975 },
      { nomInstrument: 'Batterie afro-fusion', description: 'Kit de batterie mélant percussions traditionnelles et modernes', anneeCreation: 1980 },
      { nomInstrument: 'Harmonica blues africain', description: 'Harmonica intégré dans les traditions africaines', anneeCreation: 1955 },
      { nomInstrument: 'Synthétiseur afrofuturiste', description: 'Synthétiseur pour musiques électroniques africaines', anneeCreation: 1985 },
      { nomInstrument: 'Trompette afrojazz', description: 'Trompette utilisée dans le jazz africain', anneeCreation: 1968 },
    ];

    const instruments = [];
    for (const data of instrumentsData) {
      const result = await session.run(`
        CREATE (i:Instrument {
          nomInstrument: $nomInstrument,
          description: $description,
          anneeCreation: $anneeCreation
        })
        RETURN i
      `, data);
      instruments.push({ ...data, id: result.records[0].get('i').identity.low });
    }
    
    return instruments;
  }

  async createAllRelations(session, entities) {
    console.log('🔗 Création des relations...');
    
    // Relation: Instrument appartientA Famille
    await this.createInstrumentFamilleRelations(session, entities);
    
    // Relation: Instrument utilisePar GroupeEthnique
    await this.createInstrumentGroupeEthniqueRelations(session, entities);
    
    // Relation: Instrument produitRythme Rythme
    await this.createInstrumentRythmeRelations(session, entities);
    
    // Relation: Entités localiseA Localite
    await this.createLocalisationRelations(session, entities);
    
    // Relation: Instrument constitueDe Materiau
    await this.createInstrumentMateriauRelations(session, entities);
    
    // Relation: Instrument joueAvec TechniqueDeJeu
    await this.createInstrumentTechniqueRelations(session, entities);
    
    // Relation: Artisan fabrique Instrument
    await this.createArtisanInstrumentRelations(session, entities);
    
    // Relation: Timbre caracterise Instrument
    await this.createTimbreInstrumentRelations(session, entities);
    
    // Relation: PatrimoineCulturel englobe diverses entités
    await this.createPatrimoineRelations(session, entities);
  }

  async createInstrumentFamilleRelations(session, entities) {
    const relations = [
      // Membranophones
      { instrument: 'Djembe', famille: 'Membranophones' },
      { instrument: 'Dundun', famille: 'Membranophones' },
      { instrument: 'Sangban', famille: 'Membranophones' },
      { instrument: 'Kenkeni', famille: 'Membranophones' },
      { instrument: 'Talking Drum', famille: 'Membranophones' },
      { instrument: 'Atumpan', famille: 'Membranophones' },
      { instrument: 'Fontomfrom', famille: 'Membranophones' },
      { instrument: 'Batterie afro-fusion', famille: 'Membranophones' },
      // Instruments du Burkina Faso
      { instrument: 'Bendré', famille: 'Membranophones' },
      { instrument: 'Bara', famille: 'Membranophones' },
      { instrument: 'Kuor', famille: 'Membranophones' },
      { instrument: 'Dondo Mossi', famille: 'Membranophones' },
      { instrument: 'Gangan burkinabé', famille: 'Membranophones' },
      { instrument: 'Tambour d\'eau Bissa', famille: 'Membranophones' },
      
      // Idiophones
      { instrument: 'Balafon', famille: 'Idiophones' },
      { instrument: 'Mbira', famille: 'Idiophones' },
      { instrument: 'Kalimba', famille: 'Idiophones' },
      { instrument: 'Sanza', famille: 'Idiophones' },
      { instrument: 'Gyil', famille: 'Idiophones' },
      { instrument: 'Balafon Bobo', famille: 'Idiophones' },
      
      // Cordophones
      { instrument: 'Kora', famille: 'Cordophones' },
      { instrument: 'Guitare électrique africanisée', famille: 'Cordophones' },
      { instrument: 'Basse électrique highlife', famille: 'Cordophones' },
      { instrument: 'Luth Bellao', famille: 'Cordophones' },
      
      // Aérophones
      { instrument: 'Saxophone afrobeat', famille: 'Aérophones' },
      { instrument: 'Harmonica blues africain', famille: 'Aérophones' },
      { instrument: 'Trompette afrojazz', famille: 'Aérophones' },
      { instrument: 'Flûte Peul', famille: 'Aérophones' },
      
      // Électrophones
      { instrument: 'Piano jazz africain', famille: 'Électrophones' },
      { instrument: 'Synthétiseur afrofuturiste', famille: 'Électrophones' },
    ];

    for (const rel of relations) {
      const instrument = entities.instruments.find(i => i.nomInstrument === rel.instrument);
      const famille = entities.familles.find(f => f.nomFamille === rel.famille);
      
      if (instrument && famille) {
        await session.run(`
          MATCH (i:Instrument), (f:Famille)
          WHERE id(i) = $instrumentId AND id(f) = $familleId
          CREATE (i)-[:appartientA]->(f)
        `, { instrumentId: instrument.id, familleId: famille.id });
      }
    }
  }

  async createInstrumentGroupeEthniqueRelations(session, entities) {
    const relations = [
      { instrument: 'Djembe', groupes: ['Mandingue', 'Bambara', 'Malinké'] },
      { instrument: 'Kora', groupes: ['Mandingue', 'Malinké', 'Dioula'] },
      { instrument: 'Balafon', groupes: ['Mandingue', 'Bambara', 'Songhaï'] },
      { instrument: 'Mbira', groupes: ['Akan', 'Ewe'] },
      { instrument: 'Talking Drum', groupes: ['Yoruba', 'Hausa'] },
      { instrument: 'Atumpan', groupes: ['Akan'] },
      { instrument: 'Saxophone afrobeat', groupes: ['Yoruba', 'Fon'] },
      { instrument: 'Guitare électrique africanisée', groupes: ['Akan', 'Yoruba', 'Wolof'] },
      { instrument: 'Piano jazz africain', groupes: ['Yoruba', 'Mandingue'] },
      // Instruments du Burkina Faso
      { instrument: 'Bendré', groupes: ['Mossi'] },
      { instrument: 'Bara', groupes: ['Mossi', 'Mandingue'] },
      { instrument: 'Gyil', groupes: ['Lobi', 'Dagara'] },
      { instrument: 'Kuor', groupes: ['Dagara', 'Lobi'] },
      { instrument: 'Balafon Bobo', groupes: ['Bobo', 'Bwaba'] },
      { instrument: 'Dondo Mossi', groupes: ['Mossi'] },
      { instrument: 'Gangan burkinabé', groupes: ['Gourmantché'] },
      { instrument: 'Flûte Peul', groupes: ['Peul'] },
      { instrument: 'Luth Bellao', groupes: ['Peul'] },
      { instrument: 'Tambour d\'eau Bissa', groupes: ['Bissa'] },
    ];

    for (const rel of relations) {
      const instrument = entities.instruments.find(i => i.nomInstrument === rel.instrument);
      
      if (instrument) {
        for (const groupeNom of rel.groupes) {
          const groupe = entities.groupesEthniques.find(g => g.nomGroupe === groupeNom);
          if (groupe) {
            await session.run(`
              MATCH (i:Instrument), (g:GroupeEthnique)
              WHERE id(i) = $instrumentId AND id(g) = $groupeId
              CREATE (i)-[:utilisePar]->(g)
            `, { instrumentId: instrument.id, groupeId: groupe.id });
          }
        }
      }
    }
  }

  async createInstrumentRythmeRelations(session, entities) {
    const relations = [
      { instrument: 'Djembe', rythmes: ['Djembe traditionnel', 'Afrobeat funk'] },
      { instrument: 'Kora', rythmes: ['Griot traditionnel', 'Wassoulou malien'] },
      { instrument: 'Balafon', rythmes: ['Balafon pentatonique', 'Jazz africain'] },
      { instrument: 'Saxophone afrobeat', rythmes: ['Afrobeat funk', 'Jazz africain'] },
      { instrument: 'Guitare électrique africanisée', rythmes: ['Highlife ghanéen', 'Soukous congolais'] },
      { instrument: 'Piano jazz africain', rythmes: ['Jazz africain', 'Ethio-jazz'] },
      { instrument: 'Batterie afro-fusion', rythmes: ['Mbalax sénégalais', 'Makossa camerounais'] },
      // Instruments du Burkina Faso
      { instrument: 'Bendré', rythmes: ['Bendré royal', 'Warba Mossi'] },
      { instrument: 'Bara', rythmes: ['Bendré royal', 'Griot traditionnel'] },
      { instrument: 'Gyil', rythmes: ['Gyil Lobi'] },
      { instrument: 'Balafon Bobo', rythmes: ['Balafon Bobo'] },
      { instrument: 'Dondo Mossi', rythmes: ['Warba Mossi', 'Wiiré Mossi', 'Wenega Mossi'] },
    ];

    for (const rel of relations) {
      const instrument = entities.instruments.find(i => i.nomInstrument === rel.instrument);
      
      if (instrument) {
        for (const rythmeNom of rel.rythmes) {
          const rythme = entities.rythmes.find(r => r.nomRythme === rythmeNom);
          if (rythme) {
            await session.run(`
              MATCH (i:Instrument), (r:Rythme)
              WHERE id(i) = $instrumentId AND id(r) = $rythmeId
              CREATE (i)-[:produitRythme]->(r)
            `, { instrumentId: instrument.id, rythmeId: rythme.id });
          }
        }
      }
    }
  }

  async createLocalisationRelations(session, entities) {
    const relations = [
      { type: 'Instrument', nom: 'Djembe', localites: ['Bamako', 'Conakry', 'Kayes'] },
      { type: 'Instrument', nom: 'Kora', localites: ['Bamako', 'Dakar', 'Conakry'] },
      { type: 'Instrument', nom: 'Balafon', localites: ['Bamako', 'Ouagadougou', 'Ségou'] },
      { type: 'GroupeEthnique', nom: 'Mandingue', localites: ['Bamako', 'Kayes', 'Conakry'] },
      { type: 'GroupeEthnique', nom: 'Yoruba', localites: ['Lagos', 'Cotonou'] },
      { type: 'GroupeEthnique', nom: 'Peul', localites: ['Mopti', 'Niamey'] },
      { type: 'GroupeEthnique', nom: 'Bambara', localites: ['Bamako', 'Ségou'] },
      { type: 'Rythme', nom: 'Afrobeat funk', localites: ['Lagos', 'Accra'] },
      { type: 'Rythme', nom: 'Mbalax sénégalais', localites: ['Dakar'] },
      // Entités du Burkina Faso
      { type: 'Instrument', nom: 'Bendré', localites: ['Ouagadougou'] },
      { type: 'Instrument', nom: 'Gyil', localites: ['Ouagadougou'] },
      { type: 'Instrument', nom: 'Balafon Bobo', localites: ['Ouagadougou'] },
      { type: 'GroupeEthnique', nom: 'Mossi', localites: ['Ouagadougou'] },
      { type: 'GroupeEthnique', nom: 'Bobo', localites: ['Ouagadougou'] },
      { type: 'GroupeEthnique', nom: 'Lobi', localites: ['Ouagadougou'] },
      { type: 'Rythme', nom: 'Warba Mossi', localites: ['Ouagadougou'] },
      { type: 'Rythme', nom: 'Gyil Lobi', localites: ['Ouagadougou'] },
    ];

    for (const rel of relations) {
      let entity;
      if (rel.type === 'Instrument') {
        entity = entities.instruments.find(i => i.nomInstrument === rel.nom);
      } else if (rel.type === 'GroupeEthnique') {
        entity = entities.groupesEthniques.find(g => g.nomGroupe === rel.nom);
      } else if (rel.type === 'Rythme') {
        entity = entities.rythmes.find(r => r.nomRythme === rel.nom);
      }
      
      if (entity) {
        for (const localiteNom of rel.localites) {
          const localite = entities.localites.find(l => l.nomLocalite === localiteNom);
          if (localite) {
            await session.run(`
              MATCH (e), (l:Localite)
              WHERE id(e) = $entityId AND id(l) = $localiteId
              CREATE (e)-[:localiseA]->(l)
            `, { entityId: entity.id, localiteId: localite.id });
          }
        }
      }
    }
  }

  async createInstrumentMateriauRelations(session, entities) {
    const relations = [
      { instrument: 'Djembe', materiaux: ['Bois de mahogany', 'Peau de chèvre'] },
      { instrument: 'Kora', materiaux: ['Calabasse', 'Corde en boyau', 'Bois d\'acacia'] },
      { instrument: 'Balafon', materiaux: ['Bois de lenke', 'Calabasse'] },
      { instrument: 'Mbira', materiaux: ['Bois d\'acacia', 'Métal'] },
      { instrument: 'Guitare électrique africanisée', materiaux: ['Bois de mahogany', 'Corde en nylon', 'Métal'] },
      { instrument: 'Saxophone afrobeat', materiaux: ['Laiton', 'Cuivre'] },
      { instrument: 'Piano jazz africain', materiaux: ['Bois de mahogany', 'Acier', 'Métal'] },
    ];

    for (const rel of relations) {
      const instrument = entities.instruments.find(i => i.nomInstrument === rel.instrument);
      
      if (instrument) {
        for (const materiauNom of rel.materiaux) {
          const materiau = entities.materiaux.find(m => m.nomMateriau === materiauNom);
          if (materiau) {
            await session.run(`
              MATCH (i:Instrument), (m:Materiau)
              WHERE id(i) = $instrumentId AND id(m) = $materiauId
              CREATE (i)-[:constitueDe]->(m)
            `, { instrumentId: instrument.id, materiauId: materiau.id });
          }
        }
      }
    }
  }

  async createInstrumentTechniqueRelations(session, entities) {
    const relations = [
      { instrument: 'Djembe', techniques: ['Jeu aux mains nues', 'Polyrythme'] },
      { instrument: 'Kora', techniques: ['Pincement des cordes', 'Jeu en arpège', 'Glissando'] },
      { instrument: 'Balafon', techniques: ['Frappe aux mailloches', 'Polyrythme'] },
      { instrument: 'Saxophone afrobeat', techniques: ['Souffle continu', 'Vibrato'] },
      { instrument: 'Guitare électrique africanisée', techniques: ['Pincement des cordes', 'Jeu percussif'] },
      { instrument: 'Piano jazz africain', techniques: ['Jeu en arpège', 'Polyrythme'] },
      { instrument: 'Batterie afro-fusion', techniques: ['Jeu aux baguettes', 'Polyrythme'] },
    ];

    for (const rel of relations) {
      const instrument = entities.instruments.find(i => i.nomInstrument === rel.instrument);
      
      if (instrument) {
        for (const techniqueNom of rel.techniques) {
          const technique = entities.techniquesDeJeu.find(t => t.nomTechnique === techniqueNom);
          if (technique) {
            await session.run(`
              MATCH (i:Instrument), (t:TechniqueDeJeu)
              WHERE id(i) = $instrumentId AND id(t) = $techniqueId
              CREATE (i)-[:joueAvec]->(t)
            `, { instrumentId: instrument.id, techniqueId: technique.id });
          }
        }
      }
    }
  }

  async createArtisanInstrumentRelations(session, entities) {
    const relations = [
      { artisan: 'Mamadou Kouyaté', instruments: ['Djembe', 'Dundun', 'Kora'] },
      { artisan: 'Fatoumata Diabaté', instruments: ['Balafon', 'Kalimba'] },
      { artisan: 'Ibrahim Sangaré', instruments: ['Mbira', 'Sanza'] },
      { artisan: 'Sekou Keita', instruments: ['Talking Drum', 'Atumpan'] },
      { artisan: 'Nana Ampadu', instruments: ['Guitare électrique africanisée'] },
      { artisan: 'Salif Keita', instruments: ['Piano jazz africain'] },
      { artisan: 'Youssou N\'Dour', instruments: ['Saxophone afrobeat'] },
      // Artisans du Burkina Faso
      { artisan: 'Naaba Tigré', instruments: ['Bendré', 'Bara'] },
      { artisan: 'Boukary Sawadogo', instruments: ['Gyil', 'Kuor'] },
      { artisan: 'Aminata Ouédraogo', instruments: ['Balafon Bobo'] },
      { artisan: 'Ibrahim Kaboré', instruments: ['Dondo Mossi', 'Gangan burkinabé'] },
      { artisan: 'Fatou Compaoré', instruments: ['Flûte Peul', 'Luth Bellao'] },
    ];

    for (const rel of relations) {
      const artisan = entities.artisans.find(a => a.nomArtisan === rel.artisan);
      
      if (artisan) {
        for (const instrumentNom of rel.instruments) {
          const instrument = entities.instruments.find(i => i.nomInstrument === instrumentNom);
          if (instrument) {
            await session.run(`
              MATCH (a:Artisan), (i:Instrument)
              WHERE id(a) = $artisanId AND id(i) = $instrumentId
              CREATE (a)-[:fabrique]->(i)
            `, { artisanId: artisan.id, instrumentId: instrument.id });
          }
        }
      }
    }
  }

  async createTimbreInstrumentRelations(session, entities) {
    const relations = [
      { timbre: 'Grave et profond', instruments: ['Djembe', 'Dundun'] },
      { timbre: 'Aigu et perçant', instruments: ['Kenkeni', 'Talking Drum'] },
      { timbre: 'Métallique et cristallin', instruments: ['Balafon', 'Mbira', 'Kalimba'] },
      { timbre: 'Chaud et rond', instruments: ['Kora', 'Piano jazz africain'] },
      { timbre: 'Sec et claquant', instruments: ['Atumpan', 'Fontomfrom'] },
      { timbre: 'Résonnant et vibrant', instruments: ['Saxophone afrobeat'] },
      { timbre: 'Doux et mélodieux', instruments: ['Harmonica blues africain'] },
      { timbre: 'Puissant et expressif', instruments: ['Trompette afrojazz'] },
    ];

    for (const rel of relations) {
      const timbre = entities.timbres.find(t => t.descriptionTimbre === rel.timbre);
      
      if (timbre) {
        for (const instrumentNom of rel.instruments) {
          const instrument = entities.instruments.find(i => i.nomInstrument === instrumentNom);
          if (instrument) {
            await session.run(`
              MATCH (t:Timbre), (i:Instrument)
              WHERE id(t) = $timbreId AND id(i) = $instrumentId
              CREATE (t)-[:caracterise]->(i)
            `, { timbreId: timbre.id, instrumentId: instrument.id });
          }
        }
      }
    }
  }

  async createPatrimoineRelations(session, entities) {
    const relations = [
      { 
        patrimoine: 'Tradition Griot Mandingue', 
        instruments: ['Kora', 'Djembe', 'Balafon'],
        groupes: ['Mandingue', 'Malinké'],
        rythmes: ['Griot traditionnel', 'Wassoulou malien']
      },
      { 
        patrimoine: 'Musique Yoruba', 
        instruments: ['Talking Drum', 'Saxophone afrobeat'],
        groupes: ['Yoruba'],
        rythmes: ['Afrobeat funk']
      },
      { 
        patrimoine: 'Afrobeat Heritage', 
        instruments: ['Saxophone afrobeat', 'Piano jazz africain', 'Guitare électrique africanisée'],
        groupes: ['Yoruba', 'Fon'],
        rythmes: ['Afrobeat funk', 'Jazz africain']
      },
      { 
        patrimoine: 'Highlife Legacy', 
        instruments: ['Guitare électrique africanisée'],
        groupes: ['Akan'],
        rythmes: ['Highlife ghanéen']
      },
      // Patrimoines du Burkina Faso
      { 
        patrimoine: 'Royaume Mossi', 
        instruments: ['Bendré', 'Bara', 'Dondo Mossi'],
        groupes: ['Mossi'],
        rythmes: ['Warba Mossi', 'Wiiré Mossi', 'Wenega Mossi', 'Bendré royal']
      },
      { 
        patrimoine: 'Culture Bobo', 
        instruments: ['Balafon Bobo'],
        groupes: ['Bobo', 'Bwaba'],
        rythmes: ['Balafon Bobo']
      },
      { 
        patrimoine: 'Héritage Lobi', 
        instruments: ['Gyil', 'Kuor'],
        groupes: ['Lobi', 'Dagara'],
        rythmes: ['Gyil Lobi']
      },
      { 
        patrimoine: 'Tradition Gourmantché', 
        instruments: ['Gangan burkinabé'],
        groupes: ['Gourmantché'],
        rythmes: []
      },
    ];

    for (const rel of relations) {
      const patrimoine = entities.patrimoinesCulturels.find(p => p.nomPatrimoine === rel.patrimoine);
      
      if (patrimoine) {
        // Englober les instruments
        for (const instrumentNom of rel.instruments) {
          const instrument = entities.instruments.find(i => i.nomInstrument === instrumentNom);
          if (instrument) {
            await session.run(`
              MATCH (p:PatrimoineCulturel), (i:Instrument)
              WHERE id(p) = $patrimoineId AND id(i) = $instrumentId
              CREATE (p)-[:englobe]->(i)
            `, { patrimoineId: patrimoine.id, instrumentId: instrument.id });
          }
        }
        
        // Englober les groupes ethniques
        for (const groupeNom of rel.groupes) {
          const groupe = entities.groupesEthniques.find(g => g.nomGroupe === groupeNom);
          if (groupe) {
            await session.run(`
              MATCH (p:PatrimoineCulturel), (g:GroupeEthnique)
              WHERE id(p) = $patrimoineId AND id(g) = $groupeId
              CREATE (p)-[:englobe]->(g)
            `, { patrimoineId: patrimoine.id, groupeId: groupe.id });
          }
        }
        
        // Englober les rythmes
        for (const rythmeNom of rel.rythmes) {
          const rythme = entities.rythmes.find(r => r.nomRythme === rythmeNom);
          if (rythme) {
            await session.run(`
              MATCH (p:PatrimoineCulturel), (r:Rythme)
              WHERE id(p) = $patrimoineId AND id(r) = $rythmeId
              CREATE (p)-[:englobe]->(r)
            `, { patrimoineId: patrimoine.id, rythmeId: rythme.id });
          }
        }
      }
    }
  }
}

module.exports = DatabasePopulator;

// Exécution si lancé directement
if (require.main === module) {
  const populator = new DatabasePopulator();
  populator.populateDatabase().catch(console.error);
}