# 🚀 Deployment Guide: AI Widget

## 📋 Prerequisites

- **Server**: Ubuntu 22.04 LTS (recommended)
- **Domain**: A domain name pointing to your server IP
- **Docker**: Installed on the server
- **Git**: Installed on the server

---

> [!important]
> **Low-RAM Warning (e.g. 2GB Server)**: Next.js builds are memory intensive. If you have less than 4GB RAM, you **MUST** add a swap file to prevent build crashes.
>
> ```bash
> # Create 4GB swap file
> sudo fallocate -l 4G /swapfile
> sudo chmod 600 /swapfile
> sudo mkswap /swapfile
> sudo swapon /swapfile
> # Make permanent
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

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

# Add current user to docker group (avoids permission denied error)
sudo usermod -aG docker $USER
newgrp docker

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

## ⚙️ 3. Environment Configuration (.env)

The file `.env` stores your secrets and is automatically read by Docker Compose. **It is NOT committed to Git** for security. You must create it manually on the server.

### Create the file:

```bash
nano .env
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

Since `.env` references `./service_account.json`, you must upload this file too.

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

---

## 🔄 6. Updates & Maintenance (CI/CD)

We have set up **GitHub Actions** to automate deployments.

### 1. Configure GitHub Secrets

Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.

Add the following secrets:

| Secret Name      | Value                                                                                                                   |
| :--------------- | :---------------------------------------------------------------------------------------------------------------------- |
| `SERVER_HOST`    | Your server IP address (e.g., `123.45.67.89`)                                                                           |
| `SERVER_USER`    | The username you SSH with (usually `root`)                                                                              |
| `SERVER_SSH_KEY` | Your **Private SSH Key** (content of `~/.ssh/id_rsa` from your local machine, or the key you use to access the server). |

### How to generate a new SSH Key for GitHub Actions

If you lost your `.pem` file or want a dedicated key for GitHub:

1.  **On your local computer**, generate a new key:

    ```bash
    ssh-keygen -t rsa -b 4096 -f github_actions_key
    # Press Enter for paraphrase (empty)
    ```

2.  **Copy the public key** to your server:

    ```bash
    # View the public key
    cat github_actions_key.pub
    ```

    - Copy the output (starts with `ssh-rsa ...`).
    - Login to your server: `ssh ubuntu@your-ip`
    - Add it to authorized keys:
      ```bash
      echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
      ```

3.  **Use the private key** for GitHub Secret:
    ```bash
    cat github_actions_key
    ```

    - Copy the **entire** content and paste it into **SERVER_SSH_KEY**.

### 2. Automatic Deployment

- **Trigger:** Push to `main` branch.
- **Workflow:**
  1. GitHub Action logs into your server via SSH.
  2. Pulls the latest code (`git pull origin main`).
  3. Rebuilds and restarts containers (`docker compose up -d --build`).
  4. Prunes old Docker images to save disk space.

### 3. Manual Deployment (Fallback)

If CI/CD fails, you can still deploy manually:

```bash
cd ~/ai-widget
git pull origin main
docker compose up -d --build
```

---

## ❓ FAQ

**Q: What is `dotenv`?**
A: `.env` is the standard file env vars. We use it on the server. Since it contains secrets (API keys), it is ignored by Git (`.gitignore`) so your secrets don't leak.

**Q: Why `mongodb://mongo:27017`?**
A: In `docker-compose.yml`, services can talk to each other by name. The database service is named `mongo`, so the app connects to hostname `mongo`.

**Q: How do I backup the database?**
A: The database files are stored in a Docker volume named `mongo-data`.

```bash
# Backup command
docker exec aiwidget-mongo-1 mongodump --out /dump
docker cp aiwidget-mongo-1:/dump ./backup
```

---

## 🛠️ Troubleshooting

### Docker Build Fails ("snapshot does not exist" or "failed to calculate checksum")

This error often happens when the Docker build cache is corrupted or the server is out of disk space.

**Fix 1: Prune Docker Builder Cache (Recommended)**

```bash
docker builder prune -a -f
```

**Fix 2: Clear All Docker System Data (If Fix 1 fails)**

```bash
# WARNING: This removes all stopped containers, networks, and unused images
docker system prune -a -f --volumes
```

**Fix 3: Check Disk Space**

```bash
df -h
```

If your disk is full (Use% is 100%), run the prune commands above to free space.

---

## 📈 Scaling Your Server (AWS EC2)

Yes! You can upgrade your server (RAM/CPU) without losing data.

**This process takes ~3-5 minutes. Your site will be offline during this time.**

1.  **Stop the Instance**
    - Go to AWS Console -> EC2 -> Instances.
    - Select your instance -> **Instance state** -> **Stop instance**.
    - _Wait until it says "Stopped"._

2.  **Change Instance Type**
    - Click **Actions** -> **Instance settings** -> **Change instance type**.
    - Select a larger type (e.g., `t3.medium` has 4GB RAM / 2 vCPU).
    - Click **Apply**.

3.  **Start the Instance**
    - **Instance state** -> **Start instance**.

**Note:** Your IP address might change _unless_ you are using an **Elastic IP** (static IP). If it changes, update your DNS (A record) to the new IP. All your Docker containers and data will remain intact.
