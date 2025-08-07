# 🧹 Guide de Nettoyage - Dashboard OT

## 🎯 Objectif
Supprimer TOUTES les données de test et rendre l'application 100% fonctionnelle avec de vrais comptes.

## 📋 Étapes de Nettoyage

### 1. 🗑️ Nettoyer la Base de Données Supabase

1. **Allez dans votre projet Supabase**
   - [https://supabase.com](https://supabase.com)
   - Sélectionnez votre projet

2. **Ouvrez le SQL Editor**
   - Cliquez sur "SQL Editor" dans le menu de gauche

3. **Exécutez le script de nettoyage**
   - Copiez le contenu du fichier `database/cleanup-test-data.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run"

4. **Corriger les utilisateurs orphelins**
   - Copiez le contenu du fichier `database/fix-orphaned-users.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run"
   - Cela créera automatiquement les profils manquants pour les utilisateurs existants

4. **Vérifiez le nettoyage**
   ```sql
   -- Vérifier qu'il n'y a plus d'utilisateurs de test
   SELECT * FROM auth.users WHERE email LIKE '%@ot.fr';
   
   -- Vérifier qu'il n'y a plus d'événements de test
   SELECT * FROM events WHERE title LIKE '%Festival%' OR title LIKE '%Exposition%';
   
   -- Vérifier qu'il n'y a plus de communes de test
   SELECT * FROM communes WHERE name IN ('Paris', 'Lyon', 'Marseille');
   ```

### 2. 🔑 Configurer la Clé Service Supabase

1. **Récupérer la clé service**
   - Dans Supabase : Settings → API
   - Copiez la "service_role" key (commence par `eyJ...`)

2. **Ajouter la clé au fichier .env**
   ```bash
   # Dans frontend/.env
   SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_ici
   ```

### 3. 👥 Créer de Vrais Utilisateurs

1. **Modifier le script de création**
   - Ouvrez `create-real-users.js`
   - Modifiez les emails et mots de passe selon vos besoins

2. **Installer les dépendances**
   ```bash
   npm install @supabase/supabase-js
   ```

3. **Exécuter le script**
   ```bash
   node create-real-users.js
   ```

### 4. 🏢 Ajouter de Vraies Communes

1. **Dans Supabase SQL Editor**
   ```sql
   -- Ajouter votre vraie commune
   INSERT INTO communes (name, code_insee, population) VALUES
   ('Votre Commune', '12345', 50000);
   ```

2. **Ou via l'interface**
   - Table Editor → communes → Insert Row

### 5. 🏷️ Ajouter de Vraies Catégories

1. **Dans Supabase SQL Editor**
   ```sql
   -- Ajouter vos vraies catégories
   INSERT INTO categories (name, description, color) VALUES
   ('Votre Catégorie', 'Description de votre catégorie', '#3B82F6');
   ```

### 6. 🚀 Redémarrer l'Application

```bash
cd frontend
npm start
```

## ✅ Vérification

Après le nettoyage, vous devriez avoir :

- ✅ **Aucun utilisateur de test** dans Supabase Auth
- ✅ **Aucun événement de test** dans la base de données
- ✅ **Aucune commune de test** (Paris, Lyon, etc.)
- ✅ **Aucune catégorie de test**
- ✅ **De vrais comptes utilisateurs** fonctionnels
- ✅ **Une application propre** sans références aux données de test

## 🔧 Dépannage

### Erreur "Table not found"
- Vérifiez que toutes les tables existent dans Supabase
- Exécutez le script `database/schema-supabase.sql`

### Erreur d'authentification
- Vérifiez que la clé anonyme est correcte dans `frontend/.env`
- Vérifiez que la clé service est correcte pour créer des utilisateurs

### Erreur CORS
- Dans Supabase : Settings → API → CORS Origins
- Ajoutez : `http://localhost:3000`

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans la console du navigateur
2. Vérifiez les logs dans Supabase (Logs → API)
3. Vérifiez que toutes les variables d'environnement sont correctes

---

**🎉 Votre application est maintenant prête pour la production !** 