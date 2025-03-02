# Orion Backend Deployment

This directory contains files needed to deploy the Orion backend to a VPS.

## Deployment Steps

1. **Connect to your VPS via SSH**:
   ```bash
   ssh username@147.93.84.232
   ```

2. **Create a deployment directory**:
   ```bash
   mkdir -p ~/orion-deploy
   ```

3. **Upload the files to your VPS**:
   - Using SCP:
     ```bash
     scp -r * username@147.93.84.232:~/orion-deploy/
     ```
   - Or using an SFTP client like FileZilla

4. **Make the setup script executable**:
   ```bash
   chmod +x ~/orion-deploy/setup.sh
   ```

5. **Run the setup script with sudo**:
   ```bash
   cd ~/orion-deploy
   sudo ./setup.sh
   ```

6. **Verify the deployment**:
   ```bash
   curl http://147.93.84.232/api/auth/status
   ```

## Manual Setup (if the script fails)

If the automated script fails, you can follow these manual steps:

1. **Install Node.js and npm**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install PM2**:
   ```bash
   sudo npm install -g pm2
   ```

3. **Create application directory and copy files**:
   ```bash
   sudo mkdir -p /var/www/orion
   sudo cp -r . /var/www/orion
   ```

4. **Install dependencies**:
   ```bash
   cd /var/www/orion
   npm install --production
   ```

5. **Start the application with PM2**:
   ```bash
   pm2 start server.js --name orion
   pm2 save
   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username
   ```

6. **Install and configure Nginx**:
   ```bash
   sudo apt-get install -y nginx
   sudo nano /etc/nginx/sites-available/orion
   ```
   
   Add the configuration from the setup script, then:
   
   ```bash
   sudo ln -sf /etc/nginx/sites-available/orion /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Troubleshooting

- **Check Node.js application logs**:
  ```bash
  pm2 logs orion
  ```

- **Check Nginx logs**:
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ```

- **Restart the application**:
  ```bash
  pm2 restart orion
  ```

- **Restart Nginx**:
  ```bash
  sudo systemctl restart nginx
  ``` 