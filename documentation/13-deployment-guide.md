# Earntix Deployment Guide

## 1. Environment Preparation
Before deploying, ensure the production environment has the correct environment variables set in the `.env` file.

### Critical Production Variables
```env
NODE_ENV=production
PORT=5000

# MongoDB (Must point to the Production Atlas Cluster)
MONGO_URI=mongodb+srv://...

# Security Keys (Must be long, cryptographically secure strings)
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key

# External Services
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Frontend URL for CORS
FRONTEND_URL=https://earntix.com
```

## 2. Server Configuration

### 2.1 PM2 Process Management
In production, do not use `nodemon` or `node app.js`. Use **PM2** to leverage multi-core clustering and auto-restarts.

1. Install PM2: `npm install -g pm2`
2. Start the app in cluster mode (utilizing all CPU cores):
   ```bash
   pm2 start src/app.js -i max --name "earntix-api"
   ```
3. Set PM2 to start on server boot:
   ```bash
   pm2 startup
   pm2 save
   ```

### 2.2 Reverse Proxy (Nginx)
The Node.js server should run on `localhost:5000` behind an Nginx reverse proxy that handles SSL termination.

**Example Nginx Config:**
```nginx
server {
    listen 80;
    server_name api.earntix.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.earntix.com;

    ssl_certificate /etc/letsencrypt/live/api.earntix.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.earntix.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Real IP Forwarding (Critical for Rate Limiting)
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_addrs;
    }
}
```

## 3. Trust Proxy Settings
Because Earntix runs behind Nginx, Express must be configured to trust the proxy, otherwise all rate-limiters will see the traffic as coming from `127.0.0.1` and instantly block all users.
In `app.js`:
```javascript
app.set('trust proxy', 1);
```
