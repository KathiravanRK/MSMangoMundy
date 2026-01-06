# MS Mango Mundy - Complete Deployment Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Options](#environment-options)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Database Migration](#database-migration)
6. [Network Configuration](#network-configuration)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)
9. [Production Considerations](#production-considerations)

## 🎯 Overview

This guide provides comprehensive instructions for deploying the MS Mango Mundy application to a standalone local wireless network environment. The application consists of:
- **Backend Server**: Node.js/Express API server
- **Frontend Client**: React application
- **Database**: MongoDB

## 📋 Prerequisites

### Hardware Requirements
- **Minimum**: 4GB RAM, 20GB storage, dual-core processor
- **Recommended**: 8GB RAM, 50GB storage, quad-core processor
- **Operating System**: Windows 10/11, Linux (Ubuntu 20.04+), or macOS

### Software Requirements
- **Node.js**: Version 18 or higher
- **MongoDB**: Version 6.0 or higher
- **Git**: For version control and deployment
- **Network**: Wireless router with DHCP enabled

### Network Requirements
- **Isolated Network**: Standalone wireless network
- **Static IP**: Recommended for the server machine
- **Port Access**: Ports 5000 (API) and 5173 (Client) must be accessible

## 🌍 Environment Options

### Option A: Windows Environment
**Best for**: Users familiar with Windows, quick setup
**Pros**: Easy installation, familiar interface
**Cons**: Higher resource usage

### Option B: Linux Environment (Ubuntu)
**Best for**: Production deployments, better performance
**Pros**: Lower resource usage, better stability
**Cons**: Requires Linux knowledge

### Option C: Raspberry Pi (ARM)
**Best for**: Low-power, embedded deployments
**Pros**: Energy efficient, compact
**Cons**: Limited performance, ARM architecture

## 🚀 Step-by-Step Deployment

### Phase 1: Prepare Source Machine

#### Step 1: Create Deployment Package
```bash
# Navigate to project directory
cd /path/to/AntiGrav_Project

# Create a clean deployment package
mkdir deployment_package
cd deployment_package

# Copy application files
cp -r ../client ./
cp -r ../server ./
cp ../start_app.bat ./
cp ../README.md ./

# Create deployment configuration
cat > deployment_config.json << EOF
{
  "version": "1.0.0",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source_machine": {
    "ip": "192.168.1.6",
    "os": "Windows 11",
    "node_version": "v22.19.0",
    "mongodb_version": "6.0+"
  },
  "target_requirements": {
    "node_min": "18.0.0",
    "mongodb_min": "6.0.0",
    "ram_min_gb": 4,
    "storage_min_gb": 20
  }
}
EOF

# Create backup of current database
mongodump --out ./database_backup

# Create compressed deployment package
tar -czf ms-mango-mundy-deployment.tar.gz *
```

#### Step 2: Transfer to Target Machine
```bash
# Option A: USB Drive
cp ms-mango-mundy-deployment.tar.gz /path/to/usb/

# Option B: Network Transfer
scp ms-mango-mundy-deployment.tar.gz user@target-machine:/home/user/

# Option C: Cloud Storage
# Upload to Google Drive/Dropbox and download on target machine
```

### Phase 2: Prepare Target Machine

#### Step 3: Install Required Software

**For Windows:**
```powershell
# Install Node.js
Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.19.5/node-v20.19.5-x64.msi" -OutFile "nodejs.msi"
Start-Process msiexec.exe -ArgumentList "/i nodejs.msi /quiet" -Wait

# Install MongoDB
Invoke-WebRequest -Uri "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.15-signed.msi" -OutFile "mongodb.msi"
Start-Process msiexec.exe -ArgumentList "/i mongodb.msi /quiet" -Wait

# Verify installations
node --version
npm --version
mongo --version
```

**For Linux (Ubuntu):**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify installations
node --version
npm --version
mongo --version
```

**For Raspberry Pi:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (ARM version)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB (Community Edition for ARM)
# Note: MongoDB doesn't have official ARM support, use alternative database or Docker

# Alternative: Use SQLite for Raspberry Pi
sudo apt install -y sqlite3

# Verify installations
node --version
npm --version
```

#### Step 4: Configure Target Machine

**Set Static IP Address:**

**Windows:**
```powershell
# Find network adapter name
Get-NetAdapter

# Set static IP (replace "Wi-Fi" with your adapter name)
New-NetIPAddress -InterfaceAlias "Wi-Fi" -IPAddress "192.168.1.100" -PrefixLength 24 -DefaultGateway "192.168.1.1"
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses "8.8.8.8", "8.8.4.4"
```

**Linux:**
```bash
# Edit network configuration
sudo nano /etc/netplan/01-netcfg.yaml

# Add static IP configuration:
network:
  version: 2
  renderer: networkd
  ethernets:
    wlan0:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]

# Apply configuration
sudo netplan apply
```

### Phase 3: Deploy Application

#### Step 5: Extract and Configure Application

```bash
# Extract deployment package
tar -xzf ms-mango-mundy-deployment.tar.gz
cd deployment_package

# Set target machine IP in configuration
TARGET_IP="192.168.1.100"  # Replace with your target machine IP

# Update server configuration
sed -i "s/192.168.1.6/$TARGET_IP/g" server/.env
sed -i "s/192.168.1.6/$TARGET_IP/g" client/.env

# Update client API URL
sed -i "s/192.168.1.6/$TARGET_IP/g" client/services/api.ts

# Update start script
sed -i "s/192.168.1.6/$TARGET_IP/g" start_app.bat
```

#### Step 6: Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Build client for production
npm run build
```

#### Step 7: Configure Database

**Option A: Fresh Database Setup**
```bash
# Start MongoDB
sudo systemctl start mongod  # Linux
# or
net start MongoDB  # Windows

# Initialize database
cd ../server
node src/seed.js  # Run seed script to create initial data
```

**Option B: Restore from Backup**
```bash
# Restore database from backup
mongorestore --drop ./database_backup

# Verify data restoration
mongo
> use ms-mango-mundy
> show collections
> db.users.find().pretty()
```

### Phase 4: Configure Network Access

#### Step 8: Configure Firewall

**Windows:**
```powershell
# Allow Node.js through firewall
New-NetFirewallRule -DisplayName "MS Mango Mundy Server" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
New-NetFirewallRule -DisplayName "MS Mango Mundy Client" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow

# Allow MongoDB
New-NetFirewallRule -DisplayName "MongoDB" -Direction Inbound -Protocol TCP -LocalPort 27017 -Action Allow
```

**Linux:**
```bash
# Configure UFW firewall
sudo ufw allow 5000/tcp
sudo ufw allow 5173/tcp
sudo ufw allow 27017/tcp
sudo ufw enable
```

#### Step 9: Configure Wireless Network

**Router Configuration:**
1. Access router admin panel (usually http://192.168.1.1)
2. Set up SSID and password for standalone network
3. Configure DHCP range (e.g., 192.168.1.100-199)
4. Reserve IP 192.168.1.100 for target machine MAC address

**Client Device Configuration:**
1. Connect to the standalone wireless network
2. Verify IP address assignment
3. Test connectivity to target machine

### Phase 5: Start Application

#### Step 10: Start Services

```bash
# Start MongoDB (if not already running)
sudo systemctl start mongod  # Linux
# or
net start MongoDB  # Windows

# Start application
cd /path/to/deployment_package
./start_app.bat  # Windows
# or
chmod +x start_app.bat
./start_app.bat  # Linux
```

#### Step 11: Verify Services

```bash
# Check if services are running
netstat -tuln | grep 5000  # Server
netstat -tuln | grep 5173  # Client

# Test API access
curl http://$TARGET_IP:5000/api/users

# Test client access
curl http://$TARGET_IP:5173
```

## 🔄 Database Migration

### Complete Data Migration

#### Step 1: Export Data from Source
```bash
# On source machine
cd /path/to/AntiGrav_Project/deployment_package

# Export current database state
mongodump --out ./full_backup_$(date +%Y%m%d_%H%M%S)

# Create data integrity check
mongo --eval "
  use ms-mango-mundy;
  print('=== Database Integrity Check ===');
  print('Users:', db.users.count());
  print('Buyers:', db.buyers.count());
  print('Suppliers:', db.suppliers.count());
  print('Products:', db.products.count());
  print('Entries:', db.entries.count());
  print('Invoices:', db.invoices.count());
  print('Supplier Invoices:', db.supplierInvoices.count());
" > data_integrity_check.txt
```

#### Step 2: Transfer Data
```bash
# Compress and transfer
tar -czf database_migration.tar.gz full_backup_* data_integrity_check.txt

# Transfer to target machine
scp database_migration.tar.gz user@target-machine:/home/user/
```

#### Step 3: Import Data to Target
```bash
# On target machine
tar -xzf database_migration.tar.gz

# Stop application temporarily
pkill -f "node.*server"

# Restore database
mongorestore --drop ./full_backup_*/

# Verify data integrity
mongo --eval "
  use ms-mango-mundy;
  print('=== Data Migration Verification ===');
  print('Users:', db.users.count());
  print('Buyers:', db.buyers.count());
  print('Suppliers:', db.suppliers.count());
  print('Products:', db.products.count());
  print('Entries:', db.entries.count());
  print('Invoices:', db.invoices.count());
  print('Supplier Invoices:', db.supplierInvoices.count());
"
```

### Incremental Data Migration

For ongoing data synchronization:

```bash
# Create incremental backup script
cat > sync_data.sh << 'EOF'
#!/bin/bash
TARGET_IP="192.168.1.100"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Export recent changes
mongodump --out ./incremental_backup_$TIMESTAMP --query '{updatedAt: {$gte: ISODate("'$TIMESTAMP'")}}'

# Transfer to target
scp -r incremental_backup_$TIMESTAMP user@$TARGET_IP:/home/user/

# Import on target
ssh user@$TARGET_IP "mongorestore --merge ./incremental_backup_$TIMESTAMP"

echo "Data sync completed at $(date)"
EOF

chmod +x sync_data.sh
```

## 🌐 Network Configuration

### Network Topology

```
Standalone Wireless Network (192.168.1.0/24)
├── Router (192.168.1.1)
├── Server Machine (192.168.1.100)
│   ├── API Server: http://192.168.1.100:5000
│   └── Client Server: http://192.168.1.100:5173
├── Client Device 1 (192.168.1.101)
├── Client Device 2 (192.168.1.102)
└── Client Device N (192.168.1.103-199)
```

### DNS Configuration (Optional)

For easier access, configure local DNS:

**Windows (on server machine):**
```powershell
# Add hosts entry for local DNS
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "192.168.1.100 ms-mango.local"
```

**Linux (on server machine):**
```bash
# Edit hosts file
echo "192.168.1.100 ms-mango.local" | sudo tee -a /etc/hosts
```

**Router DNS (if supported):**
- Configure custom DNS entries in router settings
- Map `ms-mango.local` to `192.168.1.100`

### Network Security

#### VPN Setup (Optional)
For secure remote access:

```bash
# Install OpenVPN on server
sudo apt install openvpn easy-rsa  # Linux

# Generate certificates
make-cadir ~/openvpn-ca
cd ~/openvpn-ca
./easyrsa init-pki
./easyrsa build-ca
./easyrsa build-server-full server nopass
./easyrsa build-client-full client1 nopass

# Configure OpenVPN server
cat > /etc/openvpn/server.conf << EOF
port 1194
proto udp
dev tun
ca /etc/openvpn/ca.crt
cert /etc/openvpn/server.crt
key /etc/openvpn/server.key
dh /etc/openvpn/dh.pem
server 10.8.0.0 255.255.255.0
ifconfig-pool-persist ipp.txt
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"
keepalive 10 120
cipher AES-256-CBC
user nobody
group nogroup
persist-key
persist-tun
status openvpn-status.log
verb 3
explicit-exit-notify 1
EOF

# Start OpenVPN
sudo systemctl start openvpn@server
sudo systemctl enable openvpn@server
```

## ✅ Testing & Verification

### Pre-Deployment Testing

#### Step 1: Application Health Check
```bash
# Test server startup
cd server
npm run dev
# Verify: Server starts without errors on http://localhost:5000

# Test client startup
cd ../client
npm run dev
# Verify: Client starts without errors on http://localhost:5173

# Test API endpoints
curl http://localhost:5000/api/users
# Expected: 401 Unauthorized (expected for protected endpoint)

# Test database connection
mongo
> use ms-mango-mundy
> db.users.find().limit(1).pretty()
# Expected: Returns user data
```

#### Step 2: Network Connectivity Test
```bash
# Test local network access
curl http://192.168.1.100:5000/api/users
curl http://192.168.1.100:5173

# Test from client device
# On client device, open browser and navigate to:
# http://192.168.1.100:5173
# Expected: Login page loads successfully
```

### Post-Deployment Testing

#### Step 3: Full Application Test
```bash
# Test user login
curl -X POST http://192.168.1.100:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"contactNumber":"your-contact-number","password":"your-password"}'

# Test data access
# Login to application via browser
# Navigate through all major features:
# - Users management
# - Buyers management
# - Suppliers management
# - Products management
# - Entries management
# - Invoices management
# - Reports generation

# Test multi-device access
# Open application on multiple devices simultaneously
# Verify all devices can access and use the application
```

#### Step 4: Performance Testing
```bash
# Test concurrent user load
# Use multiple devices to simulate concurrent users
# Monitor server response times
# Check for any performance bottlenecks

# Test database performance
# Perform bulk operations (create, update, delete)
# Monitor database response times
# Check for any database locks or timeouts
```

### Acceptance Criteria

✅ **Application Startup**: Both server and client start without errors
✅ **Database Connection**: MongoDB connection established and functional
✅ **Network Access**: Application accessible from multiple devices
✅ **User Authentication**: Login works correctly on all devices
✅ **Data Integrity**: All data migrated correctly and accessible
✅ **Feature Functionality**: All application features work as expected
✅ **Performance**: Application responds within acceptable time limits
✅ **Security**: No unauthorized access points, proper authentication

## 🔧 Troubleshooting

### Common Issues

#### Issue 1: Application Won't Start
**Symptoms**: Server or client fails to start
**Solutions**:
```bash
# Check Node.js version
node --version
# Ensure version >= 18

# Check dependencies
cd server && npm install
cd ../client && npm install

# Check port availability
netstat -tuln | grep 5000
netstat -tuln | grep 5173

# Check MongoDB status
sudo systemctl status mongod  # Linux
# or
net start MongoDB  # Windows
```

#### Issue 2: Database Connection Failed
**Symptoms**: Application starts but can't connect to database
**Solutions**:
```bash
# Check MongoDB is running
sudo systemctl status mongod
sudo systemctl start mongod

# Check MongoDB configuration
mongo --eval "db.adminCommand('ismaster')"

# Check connection string in server/.env
cat server/.env | grep MONGO_URI

# Test direct MongoDB connection
mongo "mongodb://localhost:27017/ms-mango-mundy"
```

#### Issue 3: Network Access Issues
**Symptoms**: Application accessible locally but not from other devices
**Solutions**:
```bash
# Check firewall settings
sudo ufw status  # Linux
# or
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*MS Mango*"}  # Windows

# Check network binding
netstat -tuln | grep 5000
# Should show 0.0.0.0:5000, not 127.0.0.1:5000

# Check wireless network
ping 192.168.1.100  # From client device
```

#### Issue 4: CORS Errors
**Symptoms**: Browser shows CORS errors when accessing API
**Solutions**:
```bash
# Check CORS configuration in server/src/app.ts
grep -A 10 "app.use(cors" server/src/app.ts

# Verify client API URL
grep -A 5 "API_URL" client/services/api.ts

# Test API directly
curl -H "Origin: http://192.168.1.101" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://192.168.1.100:5000/api/auth/login
```

#### Issue 5: Authentication Problems
**Symptoms**: Login fails or tokens not working
**Solutions**:
```bash
# Check JWT secret consistency
grep JWT_SECRET server/.env

# Verify token generation
curl -X POST http://192.168.1.100:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"contactNumber":"test","password":"test"}' \
  -v

# Check token validation
curl -H "Authorization: Bearer your-token-here" \
     http://192.168.1.100:5000/api/users
```

### Debugging Tools

#### Application Logs
```bash
# Server logs
tail -f server/logs/combined.log

# Client logs (browser console)
# Open browser developer tools
# Navigate to Console tab
# Look for any errors or warnings

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log  # Linux
# or
Get-Content "C:\Program Files\MongoDB\Server\6.0\log\mongod.log" -Wait  # Windows
```

#### Network Diagnostics
```bash
# Check network connectivity
ping 192.168.1.100
traceroute 192.168.1.100  # Linux
tracert 192.168.1.100      # Windows

# Check port accessibility
telnet 192.168.1.100 5000
telnet 192.168.1.100 5173

# Check DNS resolution
nslookup ms-mango.local
```

#### Performance Monitoring
```bash
# Monitor server resources
top  # Linux
# or
Get-Process | Sort-Object CPU -Descending  # Windows

# Monitor network traffic
iftop  # Linux
# or
Resource Monitor  # Windows

# Monitor MongoDB performance
mongo --eval "db.serverStatus()"
```

### Emergency Recovery

#### Database Recovery
```bash
# Restore from latest backup
mongorestore --drop ./database_backup/latest/

# Verify restoration
mongo --eval "use ms-mango-mundy; db.users.count()"

# Rollback to previous version
mongorestore --drop --oplogReplay ./database_backup/previous/
```

#### Application Recovery
```bash
# Restart services
sudo systemctl restart mongod
# Restart application processes

# Rollback code changes
git checkout main
git pull origin main
npm install
npm run build

# Emergency access
# Use admin credentials for emergency access
# Check emergency contact procedures
```

## 🏭 Production Considerations

### Security Hardening

#### Application Security
```bash
# Update all dependencies
npm audit fix --force

# Remove development dependencies
npm prune --production

# Set secure environment variables
export NODE_ENV=production
export JWT_SECRET="your-production-secret-key"

# Configure security headers
# Add to server/src/app.ts:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

#### Database Security
```bash
# Enable MongoDB authentication
mongo --eval "
  use admin;
  db.createUser({
    user: 'admin',
    pwd: 'secure-admin-password',
    roles: [{ role: 'root', db: 'admin' }]
  });
"

# Configure MongoDB with authentication
# Edit /etc/mongod.conf:
security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

#### Network Security
```bash
# Configure firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow from 192.168.1.0/24 to any port 5000
sudo ufw allow from 192.168.1.0/24 to any port 5173
sudo ufw enable

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
```

### Monitoring & Maintenance

#### Health Monitoring
```bash
# Create health check script
cat > health_check.sh << 'EOF'
#!/bin/bash
TARGET_IP="192.168.1.100"

# Check server health
if curl -s http://$TARGET_IP:5000/api/users > /dev/null; then
  echo "✅ Server API: OK"
else
  echo "❌ Server API: FAILED"
  exit 1
fi

# Check client health
if curl -s http://$TARGET_IP:5173 > /dev/null; then
  echo "✅ Client: OK"
else
  echo "❌ Client: FAILED"
  exit 1
fi

# Check database
if mongo --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; then
  echo "✅ Database: OK"
else
  echo "❌ Database: FAILED"
  exit 1
fi

echo "🎉 All services healthy"
EOF

chmod +x health_check.sh
```

#### Automated Backups
```bash
# Create backup script
cat > automated_backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup database
mongodump --out $BACKUP_DIR/database

# Backup application
tar -czf $BACKUP_DIR/application.tar.gz /path/to/application

# Compress and archive
tar -czf $BACKUP_DIR/full_backup.tar.gz $BACKUP_DIR

# Clean old backups (keep last 7 days)
find /backups -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x automated_backup.sh

# Schedule daily backups
echo "0 2 * * * /path/to/automated_backup.sh" | sudo crontab -
```

#### Performance Optimization
```bash
# Database optimization
mongo --eval "
  use ms-mango-mundy;
  db.users.createIndex({ contactNumber: 1 });
  db.buyers.createIndex({ buyerName: 1 });
  db.suppliers.createIndex({ supplierName: 1 });
  db.products.createIndex({ productName: 1 });
  db.entries.createIndex({ date: 1 });
  db.invoices.createIndex({ date: 1 });
  db.supplierInvoices.createIndex({ date: 1 });
"

# Application optimization
# Enable gzip compression in server
npm install compression
# Add to server/src/app.ts:
app.use(compress());

# Client optimization
# Enable production build optimizations
npm run build
```

### Scaling Considerations

#### Horizontal Scaling
```bash
# Load balancer configuration (nginx)
cat > /etc/nginx/sites-available/ms-mango << 'EOF'
upstream backend {
    server 192.168.1.100:5000;
    server 192.168.1.101:5000;
    server 192.168.1.102:5000;
}

server {
    listen 80;
    server_name ms-mango.local;

    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://192.168.1.100:5173;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/ms-mango /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Database Scaling
```bash
# MongoDB replica set setup
# On primary server:
mongo --eval "
  rs.initiate({
    _id: 'msMangoReplicaSet',
    members: [
      { _id: 0, host: '192.168.1.100:27017' },
      { _id: 1, host: '192.168.1.101:27017' },
      { _id: 2, host: '192.168.1.102:27017' }
    ]
  });
"

# Update connection string for replica set
# In server/.env:
MONGO_URI="mongodb://192.168.1.100:27017,192.168.1.101:27017,192.168.1.102:27017/ms-mango-mundy?replicaSet=msMangoReplicaSet"
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks

#### Daily Tasks
- [ ] Check application health
- [ ] Monitor backup completion
- [ ] Review error logs
- [ ] Check disk space usage

#### Weekly Tasks
- [ ] Update dependencies
- [ ] Review performance metrics
- [ ] Test backup restoration
- [ ] Clean temporary files

#### Monthly Tasks
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Database optimization
- [ ] Documentation updates

### Emergency Procedures

#### Application Down
1. Check server status
2. Review error logs
3. Restart services if needed
4. Check network connectivity
5. Contact support if unresolved

#### Database Issues
1. Check MongoDB status
2. Review database logs
3. Attempt recovery from backup
4. Contact database administrator
5. Implement emergency procedures

#### Network Issues
1. Check router status
2. Verify IP configurations
3. Test network connectivity
4. Restart network services
5. Contact network administrator

### Contact Information

#### Technical Support
- **Email**: support@ms-mango-mundy.com
- **Phone**: +1-XXX-XXX-XXXX
- **Hours**: 9 AM - 6 PM EST, Monday - Friday

#### Emergency Support
- **Email**: emergency@ms-mango-mundy.com
- **Phone**: +1-XXX-XXX-XXXX (24/7)
- **Response Time**: 30 minutes

#### Documentation
- **User Manual**: [Link to user manual]
- **API Documentation**: [Link to API docs]
- **Troubleshooting Guide**: [Link to troubleshooting]

---

## 🎉 Deployment Complete!

Your MS Mango Mundy application is now successfully deployed to your standalone local wireless network environment. The application should be accessible from any device connected to the wireless network at:

- **Application URL**: http://192.168.1.100:5173
- **API Endpoint**: http://192.168.1.100:5000/api

If you encounter any issues during deployment or need further assistance, refer to the troubleshooting section or contact support.

**Happy deploying! 🚀**
