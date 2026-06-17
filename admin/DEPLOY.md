# Admin Panel Deployment

## 1. Set environment variable on server
Create `/home/ubuntu/mrunal-agro/admin/.env.local`:
```
NEXT_PUBLIC_API_URL=https://api.mrunalagro.in/api/v1
```

## 2. Build & start with PM2
```bash
cd /home/ubuntu/mrunal-agro/admin
npm install
npm run build
pm2 start npm --name "admin-panel" -- start
pm2 save
```
This runs on port 3001.

## 3. Nginx config for admin32.mrunalagro.in
Add a new server block in `/etc/nginx/sites-available/admin`:
```nginx
server {
    listen 80;
    server_name admin32.mrunalagro.in;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Then enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 4. SSL with Certbot
```bash
sudo certbot --nginx -d admin32.mrunalagro.in
```

## 5. DNS
Add an A record in your DNS: `admin32` → your server IP
