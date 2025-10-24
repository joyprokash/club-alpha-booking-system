# 🌊 Club Alpha - Digital Ocean Deployment Guide

## 📦 Exporting from Replit

Your database has already been exported! Here's what you have:

### **✅ Files Ready for Export:**

1. **Database backup**: `club_alpha_database_backup.sql` (778 KB, 5,498 lines)
   - Contains all your data: users, hostesses, bookings, messages, schedules, etc.

2. **Source code**: Your entire project directory
   - All frontend and backend code
   - Configuration files
   - Dependencies listed in package.json

---

## 📥 **How to Download Files from Replit**

### **Option 1: Download via Replit UI** (Easiest)
1. In the Replit file explorer (left sidebar)
2. Right-click on the root folder
3. Select **"Download as ZIP"**
4. This downloads everything including the database backup

### **Option 2: Download Database Backup Only**
1. Click on `club_alpha_database_backup.sql` in the file explorer
2. Right-click → **Download**
3. Or click the three dots menu → Download

### **Option 3: Use Git** (Best for version control)
```bash
# Clone your Replit repository
git clone https://your-replit-repo-url.git
cd your-project

# Download the database backup separately
# (You'll need to download it via Replit UI or copy it)
```

---

## 🚀 **Digital Ocean Deployment Options**

You have **3 main options** on Digital Ocean:

| Option | Cost | Complexity | Best For |
|--------|------|------------|----------|
| **App Platform** | $5/month + $7/month DB | ⭐ Easy | Quick deployment (Heroku-like) |
| **Droplet + Managed DB** | $6/month + $15/month | ⭐⭐ Medium | More control, scalable |
| **Droplet (All-in-one)** | $6/month | ⭐⭐⭐ Advanced | Full control, cheapest |

**Recommended:** **App Platform** for easiest deployment

---

## 🎯 **Option 1: Digital Ocean App Platform** (Recommended)

This is the easiest option - similar to Heroku.

### **Cost:**
- Web service: **$5/month**
- Managed PostgreSQL: **$7/month**
- **Total: $12/month**

### **Step-by-Step Instructions:**

#### **1. Create GitHub Repository**

Your code needs to be in a Git repository (GitHub, GitLab, or Bitbucket).

```bash
# In your local project folder (after downloading from Replit)
git init
git add .
git commit -m "Initial commit - Club Alpha"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/your-username/club-alpha.git
git branch -M main
git push -u origin main
```

#### **2. Update package.json**

Add these sections to your `package.json`:

```json
{
  "engines": {
    "node": "20.x",
    "npm": "10.x"
  }
}
```

Your build and start scripts are already correct:
- ✅ `"build": "vite build && esbuild server/index.ts ..."`
- ✅ `"start": "NODE_ENV=production node dist/index.js"`

#### **3. Create App on Digital Ocean**

1. Go to: https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Select your **GitHub repository**
4. Choose the **main** branch
5. Digital Ocean will auto-detect it as a Node.js app

#### **4. Configure Build Settings**

Digital Ocean should auto-detect these, but verify:

- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Environment**: Node.js 20.x
- **HTTP Port**: `8080` (or use environment variable)

#### **5. Add Environment Variables**

In the App Platform settings, add these environment variables:

```
NODE_ENV=production
JWT_SECRET=<generate-random-string>
SESSION_SECRET=<generate-random-string>
DATABASE_URL=<will-be-set-by-managed-database>
```

Generate secrets:
```bash
# Run these locally to generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### **6. Add Managed PostgreSQL Database**

In your App Platform settings:
1. Click **"Create Resource"** → **"Database"**
2. Select **PostgreSQL**
3. Choose **Basic plan** ($7/month)
4. Digital Ocean will automatically set `DATABASE_URL`

#### **7. Import Your Database**

After the database is created:

```bash
# Get database connection details from Digital Ocean dashboard
# Then restore your backup:

psql "postgresql://username:password@host:port/database?sslmode=require" < club_alpha_database_backup.sql
```

Or use Digital Ocean's database console:
1. Go to your database in Digital Ocean
2. Click **"Console"**
3. Copy and paste your SQL backup

#### **8. Deploy!**

1. Click **"Create Resources"**
2. Digital Ocean will build and deploy your app
3. You'll get a URL like: `https://club-alpha-xxxxx.ondigitalocean.app`

---

## 🖥️ **Option 2: Droplet + Managed Database** (More Control)

### **Cost:**
- Basic Droplet: **$6/month** (1 GB RAM)
- Managed PostgreSQL: **$15/month**
- **Total: $21/month**

### **Advantages:**
- Full control over server
- Can run multiple apps
- More scalable

### **Step-by-Step:**

#### **1. Create a Droplet**

1. Go to: https://cloud.digitalocean.com/droplets
2. Click **"Create Droplet"**
3. Choose:
   - **Image**: Ubuntu 24.04 LTS
   - **Size**: Basic ($6/month - 1GB RAM)
   - **Region**: Closest to your users
   - **Authentication**: SSH key (recommended) or password

#### **2. Initial Server Setup**

SSH into your droplet:
```bash
ssh root@your-droplet-ip
```

Update system and install Node.js:
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (reverse proxy)
apt install -y nginx

# Verify installations
node -v  # Should show v20.x
npm -v
```

#### **3. Create Database on Digital Ocean**

1. Go to: https://cloud.digitalocean.com/databases
2. Create **PostgreSQL** database
3. Note the connection string

#### **4. Upload Your Code**

From your local machine:
```bash
# Create a tar.gz of your project
tar -czf club-alpha.tar.gz .

# Upload to droplet
scp club-alpha.tar.gz root@your-droplet-ip:/var/www/

# On the droplet
cd /var/www
tar -xzf club-alpha.tar.gz
rm club-alpha.tar.gz

# Install dependencies
npm install

# Build the app
npm run build
```

#### **5. Import Database**

```bash
# On your droplet
psql "your-digitalocean-database-url" < club_alpha_database_backup.sql
```

#### **6. Configure Environment Variables**

Create `.env` file on your droplet:
```bash
cat > /var/www/.env << EOF
NODE_ENV=production
DATABASE_URL=your-digitalocean-database-url
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
PORT=3000
EOF
```

#### **7. Start App with PM2**

```bash
# Start the app
pm2 start npm --name "club-alpha" -- start

# Make PM2 start on boot
pm2 startup
pm2 save
```

#### **8. Configure Nginx**

Create Nginx config:
```bash
cat > /etc/nginx/sites-available/club-alpha << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Or your droplet IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/club-alpha /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### **9. Setup SSL with Let's Encrypt** (Optional but recommended)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

Your app is now live at `http://your-domain.com` (or `https://` if you set up SSL)!

---

## 💻 **Option 3: Single Droplet (All-in-One)** (Cheapest)

### **Cost:**
- Droplet with PostgreSQL: **$12/month** (2 GB RAM recommended)

### **This includes:**
- Your Node.js app
- PostgreSQL database (self-hosted)
- Same setup as Option 2, but install PostgreSQL on the droplet

```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE club_alpha;
CREATE USER club_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE club_alpha TO club_user;
\q

# Import your backup
sudo -u postgres psql club_alpha < club_alpha_database_backup.sql

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://club_user:your-secure-password@localhost:5432/club_alpha
```

---

## 📊 **Cost Comparison**

| Option | Monthly Cost | Ease | Performance |
|--------|-------------|------|-------------|
| **App Platform** | $12 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Droplet + Managed DB** | $21 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Single Droplet** | $12 | ⭐⭐ | ⭐⭐⭐ |
| **Heroku** | $10 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🔄 **Deployment Checklist**

### **Before Deploying:**
- [ ] Database backup downloaded (`club_alpha_database_backup.sql`)
- [ ] Code downloaded from Replit (ZIP or Git)
- [ ] `engines` added to package.json
- [ ] Environment variables documented
- [ ] GitHub repository created (if using App Platform)

### **After Deploying:**
- [ ] Database imported successfully
- [ ] App is accessible via URL
- [ ] Can log in with admin credentials
- [ ] Bookings system works
- [ ] Messaging system works
- [ ] File uploads work

---

## 🛠️ **Useful Commands**

### **App Platform:**
```bash
# View logs
doctl apps logs <app-id>

# Restart app
doctl apps update <app-id>
```

### **Droplet:**
```bash
# Check app status
pm2 status

# View logs
pm2 logs club-alpha

# Restart app
pm2 restart club-alpha

# Update code
cd /var/www
git pull
npm install
npm run build
pm2 restart club-alpha
```

### **Database:**
```bash
# Backup database
pg_dump "your-database-url" > backup-$(date +%Y%m%d).sql

# Restore database
psql "your-database-url" < backup-file.sql
```

---

## 🎁 **Free Credits & Discounts**

- **GitHub Student Pack**: $200 credit for Digital Ocean
- **New users**: Often get $200 free credit for 60 days
- Check: https://www.digitalocean.com/github-students

---

## 📚 **Additional Resources**

- [Digital Ocean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [How to Deploy Node.js Apps](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-20-04)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Configuration](https://nginx.org/en/docs/)

---

## ❓ **Need Help?**

Common issues:
1. **Port already in use**: Change PORT in .env or kill the process
2. **Database connection failed**: Check DATABASE_URL and firewall settings
3. **502 Bad Gateway**: App isn't running - check PM2 status
4. **Build failed**: Check Node version matches package.json engines

---

**Recommendation**: Start with **App Platform** - it's the easiest and most reliable option!

Good luck with your deployment! 🚀
