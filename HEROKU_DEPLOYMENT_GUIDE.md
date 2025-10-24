# 🚀 Club Alpha - Heroku Deployment Guide

## 💰 Important: Heroku Pricing (2025)
- **Eco Dyno**: $5/month (your web server)
- **Heroku Postgres Mini**: $5/month (your database)
- **Total Cost**: ~$10/month minimum
- **Student Discount**: GitHub Student Developer Pack offers $13/month in credits for 24 months

---

## 📋 Step-by-Step Deployment Instructions

### **Step 1: Install Heroku CLI**

**macOS:**
```bash
brew install heroku/brew/heroku
```

**Windows:**
Download from: https://devcenter.heroku.com/articles/heroku-cli

**Verify installation:**
```bash
heroku --version
```

---

### **Step 2: Login to Heroku**

```bash
heroku login
```
This opens a browser window for authentication.

---

### **Step 3: Update package.json**

Add the `engines` section to your `package.json` (after "license"):

```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "engines": {
    "node": "20.x",
    "npm": "10.x"
  },
  "scripts": {
    ...
  }
}
```

---

### **Step 4: Create Procfile**

Create a file named `Procfile` (no extension) in your project root:

```
web: npm start
```

**Command to create it:**
```bash
echo "web: npm start" > Procfile
```

---

### **Step 5: Create Heroku App**

```bash
# Create a new Heroku app (choose a unique name)
heroku create club-alpha-booking

# Or let Heroku generate a random name
heroku create
```

This will:
- Create a new Heroku app
- Add a git remote called `heroku` to your repository

---

### **Step 6: Add PostgreSQL Database**

```bash
# Add Heroku Postgres (Essential plan - $5/month)
heroku addons:create heroku-postgresql:essential-0

# Check that it was added
heroku addons
```

This automatically sets the `DATABASE_URL` environment variable.

---

### **Step 7: Set Environment Variables**

```bash
# Set Node environment
heroku config:set NODE_ENV=production

# Set JWT secret (use a strong random string)
heroku config:set JWT_SECRET=$(openssl rand -base64 32)

# Set session secret (use a strong random string)
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)

# Verify all environment variables
heroku config
```

**You should see:**
- `DATABASE_URL` (automatically set by Postgres addon)
- `NODE_ENV=production`
- `JWT_SECRET` (your generated secret)
- `SESSION_SECRET` (your generated secret)

---

### **Step 8: Initialize Git (if not already done)**

```bash
# Check if git is initialized
git status

# If not initialized, run:
git init
git add .
git commit -m "Initial commit - Club Alpha booking platform"
```

---

### **Step 9: Deploy to Heroku**

```bash
# Deploy to Heroku
git push heroku main

# If you're on a different branch (e.g., master):
git push heroku master:main
```

**What happens during deployment:**
1. Heroku detects Node.js app
2. Installs dependencies (`npm install`)
3. Runs build script (`npm run build`)
   - Builds Vite frontend → `dist/client`
   - Bundles Express backend → `dist/index.js`
4. Starts the app with `npm start`

---

### **Step 10: Run Database Migrations**

```bash
# Push your Drizzle schema to Heroku Postgres
heroku run npm run db:push
```

If you get a warning about data loss, use:
```bash
heroku run npm run db:push -- --force
```

---

### **Step 11: Verify Deployment**

```bash
# Check if app is running
heroku ps

# View recent logs
heroku logs --tail

# Open your app in browser
heroku open
```

Your app should now be live at: `https://your-app-name.herokuapp.com`

---

## 🔧 Common Issues & Fixes

### **Issue 1: Application Error / Dyno Won't Start**

**Check logs:**
```bash
heroku logs --tail
```

**Common causes:**
- Port binding issue - Ensure `server/index.ts` uses `process.env.PORT`
- Missing environment variables - Check with `heroku config`
- Build failed - Check build logs for errors

---

### **Issue 2: Database Connection Fails**

**Fix:**
1. Verify `DATABASE_URL` exists:
```bash
heroku config | grep DATABASE_URL
```

2. Check database connection settings in your code
3. Heroku Postgres requires SSL - ensure your connection config has SSL enabled

---

### **Issue 3: Static Files (Vite Build) Not Loading**

**Check:**
1. Build completed successfully (check deployment logs)
2. `dist` folder contains built files
3. Express is serving static files from correct path

---

### **Issue 4: Environment Variables Not Working**

**Solution:**
```bash
# List all config vars
heroku config

# Set missing variables
heroku config:set VARIABLE_NAME=value
```

---

## 📊 Monitoring Your App

### **View logs in real-time:**
```bash
heroku logs --tail
```

### **Check dyno status:**
```bash
heroku ps
```

### **Restart app:**
```bash
heroku restart
```

### **View database info:**
```bash
heroku pg:info
```

### **Connect to database directly:**
```bash
heroku pg:psql
```

---

## 🔄 Deploying Updates

After making changes to your code:

```bash
# Commit changes
git add .
git commit -m "Description of changes"

# Deploy to Heroku
git push heroku main

# Check deployment
heroku logs --tail
```

---

## 💾 Database Management

### **Backup database:**
```bash
heroku pg:backups:capture
heroku pg:backups:download
```

### **View database URL:**
```bash
heroku config:get DATABASE_URL
```

### **Reset database (⚠️ DESTROYS ALL DATA):**
```bash
heroku pg:reset DATABASE
heroku run npm run db:push -- --force
```

---

## 🎓 Free Alternatives to Heroku

Since Heroku discontinued free tier, consider these alternatives:

| Platform | Free Tier | Database | Best For |
|----------|-----------|----------|----------|
| **Render** | ✅ Yes (sleeps after inactivity) | PostgreSQL included | Full-stack apps (Heroku-like) |
| **Railway** | $5 credit/month | PostgreSQL included | Node.js + Postgres |
| **Fly.io** | 3 VMs free | Postgres free tier | Docker deployments |
| **Vercel** | ✅ Yes | Vercel Postgres | Frontend + Serverless |
| **Netlify** | ✅ Yes | External DB needed | Static sites + Functions |
| **Cyclic** | ✅ Yes (no sleep) | DynamoDB | Serverless Node.js |

**Recommended alternative:** **Render** - Most similar to Heroku with free tier

---

## 🔗 Helpful Resources

- [Heroku Node.js Documentation](https://devcenter.heroku.com/articles/deploying-nodejs)
- [Heroku Postgres Documentation](https://devcenter.heroku.com/articles/heroku-postgresql)
- [Heroku CLI Commands](https://devcenter.heroku.com/articles/heroku-cli-commands)
- [GitHub Student Developer Pack](https://education.github.com/pack) - Free Heroku credits

---

## 📝 Quick Reference Commands

```bash
# Deploy
git push heroku main

# Logs
heroku logs --tail

# Restart
heroku restart

# Environment variables
heroku config
heroku config:set KEY=value

# Database
heroku pg:info
heroku pg:psql

# Open app
heroku open

# Run database migrations
heroku run npm run db:push
```

---

## ✅ Pre-Deployment Checklist

- [ ] Heroku CLI installed
- [ ] Logged into Heroku (`heroku login`)
- [ ] Added `engines` to package.json
- [ ] Created `Procfile` with `web: npm start`
- [ ] Environment variables set (JWT_SECRET, SESSION_SECRET)
- [ ] Database addon added (heroku-postgresql)
- [ ] Code committed to git
- [ ] Build script tested locally (`npm run build && npm start`)

---

## 🚨 Important Notes

1. **First deployment takes 5-10 minutes** - Be patient!
2. **Cold starts** - Eco dynos sleep after 30 min of inactivity (30 sec wake-up time)
3. **Database backups** - Enable automatic backups in production
4. **SSL/HTTPS** - Automatically enabled by Heroku
5. **Custom domain** - Can be added later (requires verification)

---

**Need help?** Check the logs first: `heroku logs --tail`

Good luck with your deployment! 🎉
