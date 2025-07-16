# 🎯 Analyse de Centralité - Ontologie Musicale

## 📊 Qu'est-ce que l'Analyse de Centralité ?

L'analyse de centralité identifie les **entités les plus importantes** dans votre réseau sémantique musical en mesurant leur **niveau de connexion** et d'**influence**.

## 🔍 Type Actuel : Centralité de Degré

### Formule
```
Centralité(entité) = Nombre total de relations directes
```

### Interprétation
- **Score élevé** = Entité très connectée = **Importante/Influente**
- **Score faible** = Entité peu connectée = **Marginale/Spécialisée**

## 🎵 Résultats de Votre Système

### Top 5 Entités Centrales
1. **Kora** (Instrument) - Centralité: 11
   - La plus connectée (11 relations)
   - Influence culturelle majeure
   - Point d'entrée privilégié

2. **Djembé** (Instrument) - Centralité: 9
   - Deuxième plus connecté
   - Instrument emblématique
   - Rayonnement inter-culturel

3. **Balafon** (Instrument) - Centralité: 5
   - Troisième plus connecté
   - Instrument traditionnel important

4. **Mandingue** (Groupe) - Centralité: 4
   - Groupe ethnique le plus connecté
   - Influence culturelle forte

5. **Yoruba** (Groupe) - Centralité: 2
   - Groupe ethnique modérément connecté

## 🎯 Applications Pratiques

### 1. Exploration de l'Ontologie
- **Commencer par** : Kora, Djembé, Balafon
- **Explorer ensuite** : Leurs relations et entités connectées
- **Découvrir** : Patterns culturels via entités centrales

### 2. Recommandations
- **Utilisateur intéressé par percussion** → Suggérer Djembé (central)
- **Recherche d'instruments mandingues** → Kora (haute centralité)
- **Étude culturelle** → Groupe Mandingue (plus connecté)

### 3. Analyse Culturelle
- **Instruments dominants** : Percussion et cordes
- **Groupes influents** : Mandingue > Yoruba
- **Régions clés** : Déterminées par entités centrales

## 🔧 Amélioration Possible

### Centralité Pondérée
```cypher
// Pondérer selon le type de relation
MATCH (n)-[r]-()
WITH n, 
     CASE type(r)
       WHEN 'appartientA' THEN 1
       WHEN 'utilisePar' THEN 3    // Plus important
       WHEN 'englobe' THEN 5       // Très important
       ELSE 1 END as weight
RETURN n, sum(weight) as weightedCentrality
```

### Centralité par Domaine
```cypher
// Centralité spécifique aux instruments
MATCH (i:Instrument)-[r]-(other)
WITH i, count(r) as instrumentCentrality
ORDER BY instrumentCentrality DESC
```

## 🎵 Conclusion

L'analyse de centralité révèle que :
- **Kora** et **Djembé** sont les instruments les plus influents
- **Mandingue** est le groupe culturel le plus connecté
- Ces entités forment l'**épine dorsale** de votre ontologie musicale
- Elles sont des **points d'entrée optimaux** pour l'exploration