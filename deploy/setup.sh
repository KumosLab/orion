#!/bin/bash

# Exit on error
set -e

echo "Setting up Orion Node.js backend on VPS..."

# Update system packages
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js and npm
echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
echo "Installing PM2 process manager..."
npm install -g pm2

# Create app directory
echo "Creating application directory..."
mkdir -p /var/www/orion

# Copy application files
echo "Copying application files..."
cp -r . /var/www/orion

# Set up environment
echo "Setting up environment..."
cp .env /var/www/orion/.env

# Install dependencies
echo "Installing dependencies..."
cd /var/www/orion
npm install --production

# Start the application with PM2
echo "Starting the application with PM2..."
pm2 start server.js --name orion
pm2 save
pm2 startup

# Install and configure Nginx
echo "Installing and configuring Nginx..."
apt-get install -y nginx

# Create Nginx configuration
cat > /etc/nginx/sites-available/orion << 'EOL'
server {
    listen 80;
    server_name 147.93.84.232;

    location /api {
        proxy_pass http://localhost:3000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://kumoslab.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://kumoslab.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOL

# Enable the site
ln -sf /etc/nginx/sites-available/orion /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

echo "Setup complete! Your Orion backend is now running on http://147.93.84.232/api"
echo "To check the status of your application, run: pm2 status" 