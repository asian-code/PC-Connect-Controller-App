# 🚀 Complete Setup Guide - Proxmox VM Controller

This guide will walk you through setting up the entire Proxmox VM Controller system from scratch.

## 📋 Prerequisites

### Required Software
- [ ] Docker & Docker Compose
- [ ] Node.js 16+ and npm
- [ ] Expo CLI: `npm install -g expo-cli`
- [ ] kubectl (for Kubernetes deployment)
- [ ] Git

### Required Access
- [ ] Proxmox server access (11.11.11.11)
- [ ] API token created in Proxmox
- [ ] Kubernetes cluster (for production)
- [ ] Cloudflare Tunnel configured
- [ ] SMTP credentials (Gmail or other)

## 🏗️ Architecture Overview

```
Mobile App (React Native)
    ↓ HTTPS (Cloudflare Tunnel)
Backend API (FastAPI)
    ├→ PostgreSQL (User/VM mapping)
    ├→ GoTrue (Authentication)
    └→ Proxmox API (VM Control)
```

---

## Part 1: Backend Setup (Local Development)

### Step 1: Configure Environment

```powershell
cd backend-api
cp .env.example .env
```

Edit `.env` file with your settings:

```env
# Database - Change password!
DATABASE_URL=postgresql+asyncpg://proxmox_user:STRONG_PASSWORD_HERE@postgres:5432/proxmox_controller

# Proxmox - Already configured
PROXMOX_HOST=11.11.11.11
PROXMOX_TOKEN_VALUE=df52c07c-34b9-4b84-a695-02e64a49d97d

# GoTrue - CHANGE JWT SECRET!
GOTRUE_JWT_SECRET=min-32-characters-super-secret-jwt-key-here

# API - CHANGE SECRET!
SECRET_KEY=min-32-characters-super-secret-api-key-here

# SMTP - Your Gmail settings
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

### Step 2: Start Backend Services

```powershell
docker-compose up -d
```

Verify services are running:
```powershell
docker ps
# Should show: proxmox-postgres, proxmox-gotrue, proxmox-api
```

Check health:
```powershell
# API health check
curl http://localhost:8000/health

# GoTrue health check
curl http://localhost:9999/health
```

### Step 3: Create Admin User

Create the first admin user:

```powershell
# Create user in GoTrue
$body = @{
    email = "admin@example.com"
    password = "YourSecurePassword123!"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:9999/signup" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

Set admin privileges in database:

```powershell
# Connect to PostgreSQL
docker exec -it proxmox-postgres psql -U proxmox_user -d proxmox_controller

# Set user as admin
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';

# Verify
SELECT id, email, is_admin FROM users;

# Exit
\q
```

### Step 4: Test Admin Login

```powershell
# Test login
$loginBody = @{
    email = "admin@example.com"
    password = "YourSecurePassword123!"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody
```

You should receive a JSON response with `access_token`.

### Step 5: Create Regular Users and Assign VMs

Using the admin token, create users via API:

```powershell
# Save admin token from previous response
$adminToken = "eyJ0eXAiOiJKV1QiLC..."

# Create user
$newUserBody = @{
    email = "user1@example.com"
    password = "UserPassword123!"
    is_admin = $false
} | ConvertTo-Json

$user = Invoke-WebRequest -Uri "http://localhost:8000/admin/users" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $adminToken" } `
    -Body $newUserBody | ConvertFrom-Json

# Assign VM to user
$assignmentBody = @{
    user_id = $user.id
    vm_id = 106  # First workstation
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/admin/vm-assignments" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $adminToken" } `
    -Body $assignmentBody
```

Repeat for other users with different VM IDs (103, 101, 102).

---

## Part 2: Mobile App Setup

### Step 1: Install Dependencies

```powershell
# Navigate to project root
cd ..  # If you're in backend-api

npm install
```

### Step 2: Configure API URL

Edit `api.js`:

```javascript
const API_URL = 'http://YOUR_COMPUTER_IP:8000';  // For local testing
// const API_URL = 'https://your-domain.com';  // For production
```

To find your computer's IP:
```powershell
# Windows
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

### Step 3: Start Mobile App

```powershell
# Start Expo
npm start

# Scan QR code with Expo Go app
# Or press 'a' for Android emulator
# Or press 'i' for iOS simulator
```

### Step 4: Test App

1. **Login** with admin@example.com
2. **Verify** you see all 4 VMs
3. **Test** power on functionality
4. **Logout** and login as regular user
5. **Verify** you see only assigned VM

---

## Part 3: Production Deployment (Kubernetes)

### Step 1: Build and Push Docker Image

```powershell
cd backend-api

# Build image
docker build -t your-registry/proxmox-api:latest .

# Push to registry
docker push your-registry/proxmox-api:latest
```

### Step 2: Update Kubernetes Configurations

Edit `k8s/secrets.yaml`:
- Change all passwords
- Update SMTP credentials
- Set strong JWT secrets

Edit `k8s/api-deployment.yaml`:
- Update image reference to your registry

Edit `k8s/ingress.yaml`:
- Set your Cloudflare tunnel domain

### Step 3: Deploy to Kubernetes

```powershell
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres-deployment.yaml

# Wait for PostgreSQL
kubectl wait --for=condition=ready pod -l app=postgres -n proxmox-controller --timeout=120s

kubectl apply -f k8s/gotrue-deployment.yaml

# Wait for GoTrue
kubectl wait --for=condition=ready pod -l app=gotrue -n proxmox-controller --timeout=120s

kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml
```

### Step 4: Verify Deployment

```powershell
# Check pods
kubectl get pods -n proxmox-controller

# Check services
kubectl get svc -n proxmox-controller

# Check logs
kubectl logs -f deployment/proxmox-api -n proxmox-controller
```

### Step 5: Configure Cloudflare Tunnel

Your API should now be accessible at your configured domain (e.g., `https://api.yourdomain.com`).

Update mobile app `api.js` with production URL:
```javascript
const API_URL = 'https://api.yourdomain.com';
```

---

## Part 4: Create Production Mobile App

### Step 1: Update App Configuration

Edit `app.json`:

```json
{
  "expo": {
    "name": "VM Controller",
    "slug": "proxmox-vm-controller",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.vmcontroller"
    },
    "android": {
      "package": "com.yourcompany.vmcontroller"
    }
  }
}
```

### Step 2: Build Mobile App

```powershell
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for Android
eas build --platform android --profile production

# Build for iOS (requires Mac + Apple Developer account)
eas build --platform ios --profile production
```

### Step 3: Distribute App

**Internal Distribution:**
- Download APK/IPA from EAS build
- Distribute to users via email or internal portal

**App Stores:**
- Submit to Google Play Store / Apple App Store
- Follow platform-specific guidelines

---

## 🔍 Testing Checklist

### Backend Testing

- [ ] Health endpoint responds: `curl http://localhost:8000/health`
- [ ] Admin user can login
- [ ] Admin can create users
- [ ] Admin can assign VMs to users
- [ ] Admin can see all VMs: `GET /vms/`
- [ ] User can login
- [ ] User sees only assigned VM
- [ ] VM power on works: `POST /vms/{id}/start`
- [ ] Audit logs are created

### Mobile App Testing

- [ ] App loads without errors
- [ ] Login screen appears
- [ ] Can login with valid credentials
- [ ] Invalid credentials show error
- [ ] Admin sees all VMs
- [ ] Regular user sees only assigned VM
- [ ] VM status displays correctly
- [ ] Power on button works
- [ ] "Already running" notification works
- [ ] Pull to refresh works
- [ ] Auto-refresh every 30 seconds works
- [ ] Logout works
- [ ] Session expiry handled correctly

---

## 🐛 Troubleshooting

### Backend Issues

**"Database connection failed"**
```powershell
# Check PostgreSQL is running
docker ps | findstr postgres

# Check logs
docker logs proxmox-postgres

# Test connection
docker exec -it proxmox-postgres psql -U proxmox_user -d proxmox_controller
```

**"GoTrue unavailable"**
```powershell
# Check GoTrue is running
docker logs proxmox-gotrue

# Test health
curl http://localhost:9999/health
```

**"Proxmox connection failed"**
- Verify Proxmox host is reachable
- Check API token is correct
- Ensure PROXMOX_VERIFY_SSL=false if using self-signed cert

### Mobile App Issues

**"Network request failed"**
```powershell
# Test API from same network
curl http://YOUR_COMPUTER_IP:8000/health

# For Android emulator, use:
# http://10.0.2.2:8000 instead of localhost
```

**"Can't connect to backend"**
- Check API_URL in api.js
- Verify your device is on same network as backend (for local testing)
- For Android emulator, check firewall settings
- Try using computer's IP instead of localhost

### Kubernetes Issues

**Pods not starting**
```powershell
kubectl describe pod POD_NAME -n proxmox-controller
kubectl logs POD_NAME -n proxmox-controller
```

**Database migration issues**
```powershell
# Manually run migrations in API pod
kubectl exec -it POD_NAME -n proxmox-controller -- python -m alembic upgrade head
```

---

## 📊 Monitoring

### Backend Metrics

```powershell
# Check API health
curl https://api.yourdomain.com/health

# Get admin stats (requires admin token)
curl -H "Authorization: Bearer TOKEN" https://api.yourdomain.com/admin/stats
```

### Database Queries

```powershell
# Connect to database
docker exec -it proxmox-postgres psql -U proxmox_user -d proxmox_controller

# Check users
SELECT * FROM users;

# Check VM assignments
SELECT u.email, va.vm_id, va.vm_name 
FROM users u 
JOIN vm_assignments va ON u.id = va.user_id;

# Check recent audit logs
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;
```

---

## 🔒 Security Checklist

- [ ] Changed all default passwords
- [ ] Using strong JWT secrets (32+ chars)
- [ ] SMTP credentials configured
- [ ] Email verification enabled
- [ ] HTTPS enabled via Cloudflare
- [ ] CORS origins restricted to your domain
- [ ] Kubernetes secrets encrypted at rest
- [ ] PostgreSQL backups configured
- [ ] Regular security updates applied
- [ ] Audit logs monitored

---

## 🎉 Congratulations!

You now have a fully functional Proxmox VM Controller system with:

✅ Backend API running in Docker/Kubernetes  
✅ User authentication with GoTrue  
✅ Database with user-VM mapping  
✅ Mobile app for iOS/Android  
✅ Role-based access control  
✅ Secure production deployment  

**Next Steps:**
- Add more users and assign VMs
- Monitor usage via audit logs
- Customize UI branding
- Add push notifications (future enhancement)
- Set up automated backups

---

Need help? Check the README files in `backend-api/` and project root for detailed documentation.
