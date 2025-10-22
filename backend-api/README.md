# Proxmox VM Controller - Backend API

FastAPI-based backend for managing Proxmox VMs with GoTrue authentication.

## 🏗️ Architecture

```
FastAPI + PostgreSQL + GoTrue
├── User Authentication (GoTrue)
├── VM Management (Proxmox API)
├── Role-Based Access Control
└── Audit Logging
```

## 📋 Features

- ✅ **GoTrue Authentication** - Self-hosted auth with email verification
- ✅ **Role-Based Access** - Admin and user roles
- ✅ **Proxmox Integration** - Control VMs (start, stop, status)
- ✅ **User-VM Mapping** - Assign VMs to users
- ✅ **Audit Logging** - Track all VM operations
- ✅ **Health Checks** - Monitor service status
- ✅ **Docker Support** - Easy deployment with Docker Compose
- ✅ **Kubernetes Ready** - Production K8s manifests included

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for local development)
- PostgreSQL 15+ (if not using Docker)
- Access to Proxmox cluster

### 1. Clone and Configure

```powershell
cd backend-api
cp .env.example .env
# Edit .env with your configuration
```

### 2. Update Configuration

Edit `.env` file:

```env
# Proxmox - Already configured
PROXMOX_HOST=11.11.11.11
PROXMOX_TOKEN_VALUE=df52c07c-34b9-4b84-a695-02e64a49d97d

# Database - Change password!
DATABASE_URL=postgresql+asyncpg://proxmox_user:CHANGE_ME@postgres:5432/proxmox_controller

# Security - CHANGE THESE!
GOTRUE_JWT_SECRET=your-super-secret-jwt-key-min-32-characters
SECRET_KEY=your-api-secret-key-min-32-characters

# SMTP - For email verification
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Run with Docker Compose

```powershell
docker-compose up -d
```

Services will be available at:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **GoTrue**: http://localhost:9999
- **PostgreSQL**: localhost:5432

### 4. Create First Admin User

```powershell
# Using curl (Windows PowerShell)
$body = @{
    email = "admin@example.com"
    password = "YourSecurePassword123!"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:9999/signup" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

Then manually set `is_admin=true` in the database:

```powershell
# Connect to PostgreSQL
docker exec -it proxmox-postgres psql -U proxmox_user -d proxmox_controller

# Update user to admin
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
\q
```

## 📚 API Documentation

### Authentication Endpoints

#### POST `/auth/login`
Login and get access token
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "is_admin": false,
    "created_at": "2025-10-22T00:00:00Z"
  }
}
```

#### POST `/auth/request-password-reset`
Request password reset email

### VM Endpoints (Requires Authentication)

#### GET `/vms/`
List accessible VMs
- **Regular users**: Only assigned VM
- **Admins**: All VMs

#### GET `/vms/{vm_id}/status`
Get VM status

#### POST `/vms/{vm_id}/start`
Start a VM

### Admin Endpoints (Requires Admin Role)

#### POST `/admin/users`
Create new user

#### GET `/admin/users`
List all users

#### POST `/admin/vm-assignments`
Assign VM to user

#### GET `/admin/stats`
Get dashboard statistics

## 🔧 Development

### Local Development Without Docker

1. Install dependencies:
```powershell
pip install -r requirements.txt
```

2. Run PostgreSQL and GoTrue (via Docker):
```powershell
docker-compose up postgres gotrue -d
```

3. Run API locally:
```powershell
python -m uvicorn app.main:app --reload
```

### Run Tests

```powershell
pytest
```

## 🐳 Docker Deployment

### Build Image

```powershell
docker build -t proxmox-api:latest .
```

### Push to Registry

```powershell
docker tag proxmox-api:latest your-registry/proxmox-api:latest
docker push your-registry/proxmox-api:latest
```

## ☸️ Kubernetes Deployment

### 1. Update Configuration

Edit `k8s/secrets.yaml`:
- Change all passwords and secrets
- Update SMTP credentials
- Set your domain in `k8s/ingress.yaml`

### 2. Apply Manifests

```powershell
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply secrets and config
kubectl apply -f k8s/secrets.yaml

# Deploy database
kubectl apply -f k8s/postgres-deployment.yaml

# Wait for PostgreSQL
kubectl wait --for=condition=ready pod -l app=postgres -n proxmox-controller --timeout=120s

# Deploy GoTrue
kubectl apply -f k8s/gotrue-deployment.yaml

# Wait for GoTrue
kubectl wait --for=condition=ready pod -l app=gotrue -n proxmox-controller --timeout=120s

# Deploy API
kubectl apply -f k8s/api-deployment.yaml

# Create services
kubectl apply -f k8s/services.yaml

# Create ingress (update domain first!)
kubectl apply -f k8s/ingress.yaml
```

### 3. Check Status

```powershell
kubectl get all -n proxmox-controller
kubectl logs -f deployment/proxmox-api -n proxmox-controller
```

### 4. Access API

Your API will be available at the domain configured in your Cloudflare Tunnel.

## 🔐 Security Notes

### Production Checklist

- [ ] Change all default passwords in secrets.yaml
- [ ] Use strong JWT secret (min 32 chars)
- [ ] Configure SMTP for email verification
- [ ] Enable SSL/TLS (handled by Cloudflare Tunnel)
- [ ] Set CORS origins to your mobile app domain
- [ ] Use Kubernetes secrets management
- [ ] Enable network policies
- [ ] Set resource limits
- [ ] Configure backup for PostgreSQL
- [ ] Monitor logs and health endpoints

### Environment Variables

Critical variables to change:
- `GOTRUE_JWT_SECRET` - Min 32 characters
- `SECRET_KEY` - Min 32 characters
- `POSTGRES_PASSWORD` - Strong password
- `SMTP_USER` & `SMTP_PASS` - Valid SMTP credentials

## 📊 Database Schema

### Users Table
- `id` (UUID from GoTrue)
- `email` (unique)
- `is_admin` (boolean)
- `created_at` / `updated_at`

### VM Assignments Table
- `id` (auto-increment)
- `user_id` (FK to users)
- `vm_id` (Proxmox VM ID: 106, 103, 101, 102)
- `vm_name` (cached from Proxmox)
- `created_at` / `updated_at`

### Audit Logs Table
- Tracks all VM operations
- User, action, success/failure
- Timestamp and IP address

## 🔍 Troubleshooting

### Database Connection Issues

```powershell
# Check PostgreSQL logs
docker logs proxmox-postgres

# Test connection
docker exec -it proxmox-postgres psql -U proxmox_user -d proxmox_controller
```

### GoTrue Issues

```powershell
# Check GoTrue logs
docker logs proxmox-gotrue

# Test health
curl http://localhost:9999/health
```

### Proxmox Connection

```powershell
# Check API logs for Proxmox errors
docker logs proxmox-api

# Test health endpoint
curl http://localhost:8000/health
```

### Common Issues

1. **"Database not found"**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env

2. **"GoTrue unavailable"**
   - Verify GoTrue container is running
   - Check GOTRUE_URL setting

3. **"Proxmox connection failed"**
   - Verify Proxmox host is reachable
   - Check API token credentials
   - Set PROXMOX_VERIFY_SSL=false if using self-signed cert

## 📝 VM IDs

Configured Proxmox VMs:
- **106** - Workstation 1
- **103** - Workstation 2
- **101** - Workstation 3
- **102** - Workstation 4

## 🤝 Contributing

1. Follow Python PEP 8 style guide
2. Add tests for new features
3. Update documentation
4. Use type hints

## 📄 License

MIT License - See LICENSE file

---

**Built with FastAPI, PostgreSQL, and GoTrue** 🚀
