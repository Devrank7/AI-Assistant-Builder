# 🚀 Deployment Guide: AI Widget

## 📋 Prerequisites

- **Server**: Ubuntu 22.04 LTS (recommended)
- **Domain**: A domain name pointing to your server IP
- **Docker**: Installed on the server
- **Git**: Installed on the server

---

## 🛠️ 1. Server Setup (Ubuntu)

Connect to your server via SSH:

```bash
ssh root@your-server-ip
```

### Install Docker & Git

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose-plugin
```

---

## 📥 2. Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone https://github.com/your-repo/ai-widget.git

# Enter project directory
cd ai-widget
```

---

## ⚙️ 3. Environment Configuration (.env.local)

The file `.env.local` stores your secrets. **It is NOT committed to Git** for security. You must create it manually on the server.

### Create the file:

```bash
nano .env.local
```

### Paste the content (edit with your real keys):

```env
# ════════════ Database ════════════
# Connect to the MongoDB container (service name "mongo")
MONGODB_URI=mongodb://mongo:27017/ai-widget-admin

# ════════════ App Secrets ════════════
ADMIN_SECRET_TOKEN=your-super-secure-token-change-this
GEMINI_API_KEY=your_google_gemini_api_key

# ════════════ Domain ════════════
# Your real domain (https)
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# ════════════ Email (SMTP) ════════════
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=ChatBot Fusion <your-email@gmail.com>

# ════════════ Telegram Bot ════════════
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=YourBotName

# ════════════ Payments (Cryptomus) ════════════
# Leave commented for testing, uncomment for production
# CRYPTOMUS_MERCHANT_ID=your_merchant_id
# CRYPTOMUS_API_KEY=your_api_key

# ════════════ Google Sheets ════════════
GOOGLE_SERVICE_ACCOUNT_PATH=./service_account.json
# Spreadsheet ID from URL
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
```

### Add Google Service Account JSON

Since `.env.local` references `./service_account.json`, you must upload this file too.

1. **Option A (SCP):** Upload from your local machine

   ```bash
   scp service_account.json root@your-server-ip:~/ai-widget/
   ```

2. **Option B (Nano):** Create and paste content
   ```bash
   nano service_account.json
   # Paste content & save
   ```

---

## 🚀 4. Run with Docker Compose

Now that everything is configured, launch the app.

```bash
# Build and start containers in detached mode (background)
docker compose up -d --build
```

### Verify it's running

```bash
docker compose ps
```

You should see:

- `aiwidget-app-1` (running on port 3000)
- `aiwidget-mongo-1` (running on port 27017)

---

## 🌐 5. Setup Reverse Proxy (Nginx + SSL)

To serve your app on a domain with HTTPS, use Nginx.

### Install Nginx

```bash
sudo apt install -y nginx
```

### Configure Site

```bash
sudo nano /etc/nginx/sites-available/ai-widget
```

Paste configuration:

```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/ai-widget /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Add SSL (HTTPS) with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔄 6. Updates & Maintenance

### How to update the app?

When you push changes to GitHub, do this on the server:

```bash
cd ~/ai-widget

# 1. Pull changes
git pull origin main

# 2. Rebuild and restart
docker compose up -d --build
```

### View Logs

```bash
docker compose logs -f app
```

---

## ❓ FAQ

**Q: What is `dotenv.local`?**
A: In Next.js, `.env.local` is the standard file for **local environment variables**. It overrides defaults. We use it on the server too for simplicity. Since it contains secrets (API keys), it is ignored by Git (`.gitignore`) so your secrets don't leak.

**Q: Why `mongodb://mongo:27017`?**
A: In `docker-compose.yml`, services can talk to each other by name. The database service is named `mongo`, so the app connects to hostname `mongo`.

**Q: How do I backup the database?**
A: The database files are stored in a Docker volume named `mongo-data`.

```bash
# Backup command
docker exec aiwidget-mongo-1 mongodump --out /dump
docker cp aiwidget-mongo-1:/dump ./backup
```
