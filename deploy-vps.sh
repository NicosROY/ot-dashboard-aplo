#!/bin/bash

# Script de déploiement VPS - OT Dashboard APLO
# Usage: ./deploy-vps.sh

set -e

echo "🚀 Déploiement OT Dashboard APLO sur VPS"
echo "========================================"

# Variables
DOMAIN="dashboard-aplo.com"
APP_DIR="/var/www/dashboard-aplo"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERREUR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[ATTENTION] $1${NC}"
}

# 1. Mise à jour du système
log "📦 Mise à jour du système..."
apt update && apt upgrade -y

# 2. Installation des dépendances
log "🔧 Installation des dépendances..."
apt install -y curl wget git unzip nginx certbot python3-certbot-nginx postgresql postgresql-contrib

# 3. Installation Node.js 18.x
log "📦 Installation Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Vérification
log "✅ Node.js version: $(node --version)"
log "✅ NPM version: $(npm --version)"

# 4. Installation PM2
log "📦 Installation PM2..."
npm install -g pm2

# 5. Création des répertoires
log "📁 Création des répertoires..."
mkdir -p $APP_DIR
mkdir -p $BACKEND_DIR
mkdir -p $FRONTEND_DIR

# 6. Configuration Nginx
log "🌐 Configuration Nginx..."
cat > /etc/nginx/sites-available/dashboard-aplo << 'EOF'
server {
    listen 80;
    server_name dashboard-aplo.com www.dashboard-aplo.com;

    # Frontend
    location / {
        root /var/www/dashboard-aplo/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache statique
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Stripe Webhook (pas de proxy pour le body raw)
    location /api/stripe-webhook {
        proxy_pass http://localhost:3000/stripe-webhook;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Activer le site
ln -sf /etc/nginx/sites-available/dashboard-aplo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test configuration Nginx
nginx -t

# Redémarrer Nginx
systemctl restart nginx
systemctl enable nginx

log "✅ Nginx configuré et démarré"

# 7. Configuration PostgreSQL
log "🗄️ Configuration PostgreSQL..."
sudo -u postgres createdb dashboard_aplo
sudo -u postgres createuser dashboard_user
sudo -u postgres psql -c "ALTER USER dashboard_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dashboard_aplo TO dashboard_user;"

log "✅ PostgreSQL configuré"

# 8. Configuration Firewall
log "🔥 Configuration Firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

log "✅ Firewall configuré"

# 9. Script de déploiement continu
cat > /usr/local/bin/deploy-dashboard << 'EOF'
#!/bin/bash

APP_DIR="/var/www/dashboard-aplo"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

cd $APP_DIR

# Pull des changements
git pull origin main

# Backend
cd $BACKEND_DIR
npm install
npm run build

# Frontend
cd $FRONTEND_DIR
npm install
npm run build

# Redémarrer PM2
pm2 restart all

echo "✅ Déploiement terminé"
EOF

chmod +x /usr/local/bin/deploy-dashboard

# 10. Configuration PM2
log "📦 Configuration PM2..."
cd $BACKEND_DIR

# Créer ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'dashboard-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/dashboard-backend-error.log',
    out_file: '/var/log/pm2/dashboard-backend-out.log',
    log_file: '/var/log/pm2/dashboard-backend-combined.log'
  }]
};
EOF

# Créer répertoire logs
mkdir -p /var/log/pm2

log "✅ Configuration PM2 terminée"

# 11. Instructions finales
echo ""
echo "🎉 Déploiement initial terminé !"
echo "================================"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Copier le code source vers $APP_DIR"
echo "2. Configurer les variables d'environnement :"
echo "   - $BACKEND_DIR/.env"
echo "   - $FRONTEND_DIR/.env.production"
echo "3. Installer les dépendances :"
echo "   cd $BACKEND_DIR && npm install"
echo "   cd $FRONTEND_DIR && npm install"
echo "4. Build et démarrer :"
echo "   cd $FRONTEND_DIR && npm run build"
echo "   cd $BACKEND_DIR && pm2 start ecosystem.config.js"
echo "5. Configurer SSL :"
echo "   certbot --nginx -d dashboard-aplo.com"
echo ""
echo "🔧 Commandes utiles :"
echo "   deploy-dashboard    # Déploiement rapide"
echo "   pm2 status          # Statut des processus"
echo "   pm2 logs            # Logs des applications"
echo "   nginx -t            # Test configuration Nginx"
echo ""
echo "🌐 Site accessible sur : http://$DOMAIN"
echo "" 