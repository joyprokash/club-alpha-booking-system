# Club Alpha - MySQL Deployment Guide for GoDaddy VPS

## ⚠️ Important: Two Versions Available

Your Club Alpha application currently runs on **PostgreSQL** in the Replit environment. When you're ready to deploy to your GoDaddy VPS with MySQL, you'll need to make the conversion changes outlined below.

### Current Status:
- **Replit Environment**: ✅ Running on PostgreSQL
- **VPS Deployment**: 📋 Ready for MySQL conversion

---

## 🔄 Converting to MySQL for VPS Deployment

When you're ready to deploy to your GoDaddy VPS, follow these steps to convert the application from PostgreSQL to MySQL:

### Step 1: Download and Prepare Files

1. **Download project from Replit**
   - Click the three dots (⋮) menu → Download as ZIP
   - Extract the ZIP file on your computer

2. **Make the following changes to the downloaded files:**

### Step 2: Update Package Dependencies

Edit `package.json` and make these changes:

**Remove these packages:**
```json
"postgres": "^3.4.5",
"@neondatabase/serverless": "^0.10.4"
```

**Add this package:**
```json
"mysql2": "^3.11.5"
```

### Step 3: Update Database Driver (`server/db.ts`)

Replace the entire file with:

```typescript
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create MySQL connection pool
const poolConnection = mysql.createPool(process.env.DATABASE_URL);

export const db = drizzle(poolConnection, { schema, mode: 'default' });
```

### Step 4: Update Database Schema (`shared/schema.ts`)

Replace the **import section** at the top:

**Change FROM:**
```typescript
import { 
  pgTable, 
  text, 
  uuid, 
  timestamp, 
  pgEnum,
  boolean,
  integer,
  date,
  jsonb,
  index,
  unique
} from "drizzle-orm/pg-core";
```

**Change TO:**
```typescript
import { 
  mysqlTable, 
  text, 
  varchar, 
  timestamp, 
  mysqlEnum,
  boolean,
  int,
  date,
  json,
  index,
  unique
} from "drizzle-orm/mysql-core";
```

**Then update the enums and tables:**

```typescript
// Change enum definitions from:
export const userRoleEnum = pgEnum("role", ['ADMIN', 'STAFF', 'RECEPTION', 'CLIENT']);
export const locationEnum = pgEnum("location", ['DOWNTOWN', 'WEST_END']);
export const bookingStatusEnum = pgEnum("booking_status", ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED']);
export const photoStatusEnum = pgEnum("photo_status", ['PENDING', 'APPROVED', 'REJECTED']);

// To:
// (Remove the export const declarations and use inline enums)

// Update each table:
// 1. Change pgTable → mysqlTable
// 2. Change uuid() → varchar("column_name", { length: 36 })
// 3. Change .defaultRandom() → .$defaultFn(() => crypto.randomUUID())
// 4. Change integer → int
// 5. Change pgEnum references to mysqlEnum inline
// 6. Change text().array() → json().$type<string[]>() (for specialties field only)
// 7. Change jsonb → json

// Example for users table:
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: varchar("username", { length: 191 }).notNull().unique(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: mysqlEnum("role", ['ADMIN', 'STAFF', 'RECEPTION', 'CLIENT']).notNull().default('CLIENT'),
  forcePasswordReset: boolean("force_password_reset").notNull().default(false),
  banned: boolean("banned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Apply similar changes to all other tables
```

### Step 5: Update Drizzle Config (`drizzle.config.ts`)

Change the dialect:

```typescript
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",  // ← Change from "postgresql" to "mysql"
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

---

## 🚀 GoDaddy VPS Deployment Instructions

### Step 1: Connect to Your VPS

```bash
ssh root@your-vps-ip-address
```

### Step 2: Install Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

### Step 3: Install MySQL

```bash
# Install MySQL Server
sudo apt install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Follow prompts:
# - Set root password: YES (choose a strong password)
# - Remove anonymous users: YES
# - Disallow root login remotely: YES
# - Remove test database: YES
# - Reload privilege tables: YES

# Start MySQL
sudo systemctl start mysql
sudo systemctl enable mysql
```

### Step 4: Create Database and User

```bash
# Login to MySQL
sudo mysql -u root -p

# In MySQL prompt, run:
CREATE DATABASE clubalpha;
CREATE USER 'clubalpha_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON clubalpha.* TO 'clubalpha_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 5: Upload Application to VPS

**From your local computer (after making the MySQL changes):**

```bash
# Create directory on VPS
ssh root@your-vps-ip "mkdir -p /var/www/clubalpha"

# Upload files (run from your local project folder)
scp -r ./* root@your-vps-ip:/var/www/clubalpha/

# Or use rsync (faster):
rsync -avz --exclude 'node_modules' ./ root@your-vps-ip:/var/www/clubalpha/
```

### Step 6: Set Up Application on VPS

```bash
# SSH into VPS
ssh root@your-vps-ip
cd /var/www/clubalpha

# Install dependencies
npm install --production

# Install PM2 globally
npm install -g pm2

# Create .env file
nano .env
```

**Add to .env:**

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=mysql://clubalpha_user:YourSecurePassword123!@localhost:3306/clubalpha
JWT_SECRET=your_very_long_random_secret_min_32_characters_here
SESSION_SECRET=another_very_long_random_secret_min_32_chars_here
```

Save (Ctrl+X, Y, Enter)

### Step 7: Run Database Migration

```bash
# Push schema to MySQL database
npm run db:push

# If you get a warning about data loss, force it (safe for new database)
npm run db:push --force
```

### Step 8: Build Frontend

```bash
# Build the React frontend
npm run build
```

### Step 9: Start Application with PM2

```bash
# Start the app
pm2 start npm --name "clubalpha" -- start

# If you don't have a start script, use:
pm2 start npm --name "clubalpha" -- run dev

# Save PM2 process list
pm2 save

# Set PM2 to auto-start on boot
pm2 startup systemd
# Copy and run the command it outputs

# Check status
pm2 status
pm2 logs clubalpha
```

### Step 10: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/clubalpha
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/clubalpha /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 11: Install SSL Certificate (Free)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts and choose option 2 (redirect HTTP to HTTPS)
```

### Step 12: Configure Firewall

```bash
# Allow necessary ports
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### Step 13: Point Domain to VPS

In your **GoDaddy DNS Settings**:

1. Go to: My Products → Domains → DNS
2. Add/Update these records:

```
Type    Name    Value                   TTL
A       @       your-vps-ip-address    600
A       www     your-vps-ip-address    600
```

Wait 10-60 minutes for DNS propagation.

---

## 📝 Useful Commands

### PM2 Management

```bash
# View logs
pm2 logs clubalpha

# Restart app
pm2 restart clubalpha

# Stop app
pm2 stop clubalpha

# Delete app from PM2
pm2 delete clubalpha

# Monitor resources
pm2 monit
```

### MySQL Management

```bash
# Login to MySQL
sudo mysql -u root -p

# Check database
USE clubalpha;
SHOW TABLES;

# View users table
SELECT * FROM users LIMIT 5;

# Backup database
mysqldump -u clubalpha_user -p clubalpha > backup.sql

# Restore database
mysql -u clubalpha_user -p clubalpha < backup.sql
```

### Application Updates

```bash
# SSH into VPS
cd /var/www/clubalpha

# Pull changes (if using Git)
git pull

# Or upload new files via SCP

# Install new dependencies (if any)
npm install

# Run migrations (if schema changed)
npm run db:push

# Rebuild frontend
npm run build

# Restart app
pm2 restart clubalpha
```

---

## 🔧 Troubleshooting

### Check if app is running:
```bash
pm2 status
pm2 logs clubalpha --lines 50
```

### Check Nginx:
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Check MySQL connection:
```bash
mysql -u clubalpha_user -p clubalpha -e "SELECT 1;"
```

### Check port 5000:
```bash
sudo netstat -tulpn | grep 5000
```

### Application not accessible:
1. Check PM2 status: `pm2 status`
2. Check Nginx status: `sudo systemctl status nginx`
3. Check firewall: `sudo ufw status`
4. Check DNS: `nslookup yourdomain.com`

---

## 🎉 Your Application is Ready!

Once deployed, visit: `https://yourdomain.com`

### Default Login Credentials (Change these immediately!):
- **Admin**: username: `admin`, password: `admin123`
- **Reception**: username: `reception`, password: `reception123`
- **Staff**: username: `staff`, password: `staff123`
- **Client**: username: `client1`, password: `client123`

---

## 📊 Key MySQL Conversion Notes

1. **MySQL vs PostgreSQL Arrays**: 
   - The `specialties` field is stored as JSON instead of a native array
   - Your application handles this automatically
   - No code changes needed in your application logic

2. **UUID Generation**:
   - Uses JavaScript's `crypto.randomUUID()` instead of PostgreSQL's `gen_random_uuid()`
   - Works identically, no application changes needed

3. **VARCHAR Length Requirements**:
   - MySQL requires explicit length for unique fields (username, email, slug)
   - These are set to 191 (MySQL's max for unique indexes with UTF8MB4)

4. **Performance**:
   - MySQL performs excellently for this application size
   - Consider adding indexes if you have >10,000 bookings

5. **Backups**:
   - Set up automated MySQL backups using cron
   - Backup both database and uploaded photos in `attached_assets/`

---

Need help? Check the logs and troubleshooting section above!
