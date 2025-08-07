#!/bin/bash

# Script d'export Supabase vers PostgreSQL local
# Usage: ./export-supabase-to-postgresql.sh

set -e

echo "🗄️ Export Supabase vers PostgreSQL local"
echo "========================================"

# Variables
SUPABASE_URL="https://your-dashboard-supabase-url.supabase.co"
SUPABASE_SERVICE_KEY="your-supabase-service-role-key"
LOCAL_DB_NAME="dashboard_aplo"
LOCAL_DB_USER="dashboard_user"
LOCAL_DB_PASSWORD="your_secure_password"
EXPORT_DIR="./database/exports"
DATE=$(date +"%Y%m%d_%H%M%S")

# Créer répertoire d'export
mkdir -p $EXPORT_DIR

echo "📦 Installation des outils d'export..."

# Installer pg_dump si pas présent
if ! command -v pg_dump &> /dev/null; then
    echo "❌ pg_dump non trouvé. Installation de postgresql-client..."
    sudo apt-get update
    sudo apt-get install -y postgresql-client
fi

# Installer Node.js si pas présent
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trouvé. Installation..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "🔧 Création du script d'export..."

# Créer le script Node.js pour l'export
cat > export-supabase.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const exportDir = process.env.EXPORT_DIR || './exports';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement manquantes');
    console.error('SUPABASE_URL et SUPABASE_SERVICE_KEY requis');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tables à exporter
const tables = [
    'users',
    'user_profiles',
    'communes',
    'categories',
    'events',
    'subscriptions',
    'payments',
    'onboarding_progress',
    'admin_notifications',
    'team_invitations'
];

async function exportTable(tableName) {
    console.log(`📋 Export de la table: ${tableName}`);
    
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');
        
        if (error) {
            console.error(`❌ Erreur export ${tableName}:`, error);
            return null;
        }
        
        const filename = path.join(exportDir, `${tableName}_${Date.now()}.json`);
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        
        console.log(`✅ ${tableName}: ${data.length} enregistrements exportés vers ${filename}`);
        return { tableName, data, filename };
        
    } catch (error) {
        console.error(`❌ Erreur export ${tableName}:`, error);
        return null;
    }
}

async function exportAllTables() {
    console.log('🚀 Début de l\'export de toutes les tables...');
    
    const results = [];
    
    for (const table of tables) {
        const result = await exportTable(table);
        if (result) {
            results.push(result);
        }
    }
    
    // Créer un fichier de résumé
    const summary = {
        exportDate: new Date().toISOString(),
        tables: results.map(r => ({
            name: r.tableName,
            recordCount: r.data.length,
            filename: path.basename(r.filename)
        }))
    };
    
    const summaryFile = path.join(exportDir, `export_summary_${Date.now()}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('✅ Export terminé !');
    console.log(`📊 Résumé sauvegardé dans: ${summaryFile}`);
    
    return results;
}

// Exécuter l'export
exportAllTables().catch(console.error);
EOF

echo "📦 Installation des dépendances..."
npm install @supabase/supabase-js

echo "🚀 Début de l'export..."

# Exporter les variables d'environnement
export SUPABASE_URL=$SUPABASE_URL
export SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
export EXPORT_DIR=$EXPORT_DIR

# Exécuter l'export
node export-supabase.js

echo ""
echo "🗄️ Création du script d'import PostgreSQL..."

# Créer le script d'import PostgreSQL
cat > import-to-postgresql.sql << 'EOF'
-- Script d'import PostgreSQL pour OT Dashboard APLO
-- Usage: psql -U dashboard_user -d dashboard_aplo -f import-to-postgresql.sql

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Nettoyer les tables existantes (ATTENTION: supprime toutes les données)
TRUNCATE TABLE events CASCADE;
TRUNCATE TABLE user_profiles CASCADE;
TRUNCATE TABLE subscriptions CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE onboarding_progress CASCADE;
TRUNCATE TABLE admin_notifications CASCADE;
TRUNCATE TABLE team_invitations CASCADE;

-- Réinitialiser les séquences
ALTER SEQUENCE events_id_seq RESTART WITH 1;
ALTER SEQUENCE user_profiles_id_seq RESTART WITH 1;
ALTER SEQUENCE subscriptions_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE onboarding_progress_id_seq RESTART WITH 1;
ALTER SEQUENCE admin_notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE team_invitations_id_seq RESTART WITH 1;

-- Note: Les données seront importées via les fichiers JSON exportés
-- Utiliser le script Node.js d'import pour traiter les fichiers JSON
EOF

# Créer le script Node.js d'import
cat > import-to-postgresql.js << 'EOF'
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration PostgreSQL local
const client = new Client({
    host: 'localhost',
    port: 5432,
    database: process.env.LOCAL_DB_NAME || 'dashboard_aplo',
    user: process.env.LOCAL_DB_USER || 'dashboard_user',
    password: process.env.LOCAL_DB_PASSWORD || 'your_secure_password'
});

const importDir = process.env.IMPORT_DIR || './exports';

async function importTable(tableName, data) {
    console.log(`📥 Import de la table: ${tableName} (${data.length} enregistrements)`);
    
    if (data.length === 0) {
        console.log(`⚠️ Table ${tableName} vide, ignorée`);
        return;
    }
    
    try {
        // Générer les colonnes dynamiquement
        const columns = Object.keys(data[0]);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const columnNames = columns.join(', ');
        
        const query = `
            INSERT INTO ${tableName} (${columnNames})
            VALUES (${placeholders})
            ON CONFLICT (id) DO UPDATE SET
            ${columns.map(col => `${col} = EXCLUDED.${col}`).join(', ')}
        `;
        
        // Insérer les données par batch
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            for (const row of batch) {
                const values = columns.map(col => row[col]);
                await client.query(query, values);
            }
            
            console.log(`  ✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}`);
        }
        
        console.log(`✅ Table ${tableName} importée avec succès`);
        
    } catch (error) {
        console.error(`❌ Erreur import ${tableName}:`, error);
        throw error;
    }
}

async function importAllTables() {
    console.log('🚀 Début de l\'import vers PostgreSQL...');
    
    try {
        await client.connect();
        console.log('✅ Connexion PostgreSQL établie');
        
        // Lire le répertoire d'export
        const files = fs.readdirSync(importDir)
            .filter(file => file.endsWith('.json') && !file.includes('summary'));
        
        for (const file of files) {
            const tableName = file.split('_')[0];
            const filePath = path.join(importDir, file);
            
            console.log(`📋 Traitement du fichier: ${file}`);
            
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            await importTable(tableName, data);
        }
        
        console.log('🎉 Import terminé avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'import:', error);
        throw error;
    } finally {
        await client.end();
    }
}

// Exécuter l'import
importAllTables().catch(console.error);
EOF

echo "📦 Installation des dépendances PostgreSQL..."
npm install pg

echo ""
echo "🎉 Scripts d'export/import créés !"
echo "================================"
echo ""
echo "📋 Prochaines étapes :"
echo ""
echo "1. 🔧 Configurer les variables dans le script :"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_KEY"
echo "   - LOCAL_DB_PASSWORD"
echo ""
echo "2. 📤 Exporter depuis Supabase :"
echo "   ./export-supabase-to-postgresql.sh"
echo ""
echo "3. 📥 Importer vers PostgreSQL local :"
echo "   export LOCAL_DB_PASSWORD='your_password'"
echo "   node import-to-postgresql.js"
echo ""
echo "4. 🔍 Vérifier l'import :"
echo "   psql -U dashboard_user -d dashboard_aplo -c 'SELECT COUNT(*) FROM events;'"
echo ""
echo "📁 Fichiers créés :"
echo "   - export-supabase.js"
echo "   - import-to-postgresql.js"
echo "   - import-to-postgresql.sql"
echo "   - exports/ (répertoire)"
echo "" 