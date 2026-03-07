# Hostinger VPS Deployment Guide

## Prerequisites
- Hostinger VPS running Ubuntu 22.04
- A domain name pointed to your VPS IP (or just use the IP directly to start)
- SSH access to the VPS

---

## 1. Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
```

---

## 2. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should print v20.x.x
```

---

## 3. Install PM2 and Nginx

```bash
npm install -g pm2
sudo apt-get install -y nginx
```

---

## 4. Install Git and Clone the Repo

```bash
sudo apt-get install -y git
cd /var/www
git clone https://github.com/WeBothSuckPal/TheBoyzPickV2.git
cd TheBoyzPickV2
```

---

## 5. Set Environment Variables

```bash
cp .env.example .env
nano .env
```

Fill in your actual values:
- `DATABASE_URL` — from your Neon dashboard
- `SESSION_SECRET` — run `openssl rand -hex 32` to generate one
- `ODDS_API_KEY` — from the-odds-api.com

Save and exit (`Ctrl+X`, `Y`, `Enter`).

---

## 6. Install Dependencies and Build

```bash
npm install
npm run build
```

The build output goes to `dist/` (server) and `dist/public/` (frontend).

---

## 7. Run Database Migrations

```bash
npm run db:push
```

This creates all tables in your Neon database.

---

## 8. Start the App with PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed command to auto-start on reboot
```

Check it's running:
```bash
pm2 status
pm2 logs theboyzpick
```

The app is now running on port 5000.

---

## 9. Configure Nginx

```bash
sudo cp /var/www/TheBoyzPickV2/nginx.conf /etc/nginx/sites-available/theboyzpick
sudo ln -s /etc/nginx/sites-available/theboyzpick /etc/nginx/sites-enabled/
sudo nano /etc/nginx/sites-available/theboyzpick
```

Replace `YOUR_DOMAIN_OR_IP` with your actual domain or VPS IP address, then:

```bash
sudo nginx -t          # test config — should say "ok"
sudo systemctl restart nginx
sudo systemctl enable nginx
```

Your app is now accessible at `http://YOUR_DOMAIN_OR_IP`.

---

## 10. (Optional) Enable HTTPS with Let's Encrypt

Only do this if you have a domain name pointed to your VPS.

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

Certbot will automatically edit your Nginx config and set up auto-renewal.

---

## Updating the App After Code Changes

SSH into the VPS and run:

```bash
cd /var/www/TheBoyzPickV2
git pull origin main
npm install
npm run build
pm2 restart theboyzpick
```

---

## Useful PM2 Commands

| Command | Description |
|---|---|
| `pm2 status` | Show running apps |
| `pm2 logs theboyzpick` | Live log output |
| `pm2 restart theboyzpick` | Restart the app |
| `pm2 stop theboyzpick` | Stop the app |
| `pm2 monit` | Real-time CPU/memory dashboard |
