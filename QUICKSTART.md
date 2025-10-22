# ⚡ Quick Start - Proxmox VM Controller

## 🚀 **Get Up and Running in 5 Minutes**

### Step 1: Backend (2 minutes)

```powershell
# Navigate to backend
cd backend-api

# Copy environment file
cp .env.example .env

# Edit .env and change:
# - GOTRUE_JWT_SECRET (make it 32+ characters)
# - SECRET_KEY (make it 32+ characters)  
# - SMTP settings (your Gmail credentials)

# Start services
docker-compose up -d

# Check status
docker ps
```

### Step 2: Create Admin (1 minute)

```powershell
# Create admin user
$body = @{
    email = "admin@example.com"
    password = "Admin123!@#"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:9999/signup" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

# Set as admin
docker exec -it proxmox-postgres psql -U proxmox_user -d proxmox_controller -c "UPDATE users SET is_admin = true WHERE email = 'admin@example.com';"
```

### Step 3: Mobile App (2 minutes)

```powershell
# Go back to project root
cd ..

# Install dependencies
npm install

# Find your computer's IP
ipconfig  # Look for IPv4 Address (e.g., 192.168.1.100)

# Edit api.js and change API_URL to:
# const API_URL = 'http://YOUR_IP:8000';

# Start app
npm start

# Scan QR code with Expo Go or press 'a' for Android
```

### Step 4: Test (1 minute)

1. Open app on your phone
2. Login with `admin@example.com` / `Admin123!@#`
3. See all 4 VMs
4. Try power on button

---

## 🎯 **What to Do Next**

### Create Regular Users

```powershell
# Login as admin and get token
$login = @{
    email = "admin@example.com"
    password = "Admin123!@#"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:8000/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $login | ConvertFrom-Json

$token = $response.access_token

# Create user
$newUser = @{
    email = "user1@example.com"
    password = "User123!@#"
    is_admin = $false
} | ConvertTo-Json

$user = Invoke-WebRequest -Uri "http://localhost:8000/admin/users" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $token" } `
    -Body $newUser | ConvertFrom-Json

# Assign VM
$assignment = @{
    user_id = $user.id
    vm_id = 106
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/admin/vm-assignments" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $token" } `
    -Body $assignment
```

### Test Regular User

1. Logout from app
2. Login with `user1@example.com` / `User123!@#`
3. See only VM 106
4. Test power on

---

## 📚 **Full Documentation**

- **Backend Details**: See `backend-api/README.md`
- **Mobile App**: See `README.md`
- **Complete Setup**: See `SETUP_GUIDE.md`
- **Project Overview**: See `PROJECT_SUMMARY.md`

---

## 🐛 **Common Issues**

**"Network request failed"**
- Make sure backend is running: `docker ps`
- Check you're using your computer's IP, not localhost
- For Android emulator, use `http://10.0.2.2:8000`

**"Cannot connect to database"**
- Check PostgreSQL is running: `docker logs proxmox-postgres`
- Verify DATABASE_URL in .env is correct

**"GoTrue unavailable"**
- Check GoTrue is running: `docker logs proxmox-gotrue`
- Verify GOTRUE_URL in .env is correct

---

## ✅ **Checklist**

Backend:
- [ ] Docker Compose running
- [ ] Admin user created
- [ ] Admin user set in database
- [ ] Can login at http://localhost:8000/docs

Mobile App:
- [ ] Dependencies installed
- [ ] API_URL updated with your IP
- [ ] App running via Expo
- [ ] Can login as admin
- [ ] Can see all VMs

---

**You're all set! Enjoy your Proxmox VM Controller! 🎉**
