# MS Mango Mundy

## Project Structure
- **client**: Frontend application (Vite + React)
- **server**: Backend application (Node.js + Express)

## Getting Started

### Prerequisites
- Node.js installed
- MongoDB installed and running (for the server)

### Installation
1. Install client dependencies:
   ```bash
   cd client
   npm install
   ```
2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

### Running the Application
You can start both the client and server simultaneously using the provided batch file:

1. Double-click `start_app.bat` in the root directory.
   - This will open two new command windows: one for the server and one for the client.

Alternatively, you can run them manually:

**Server:**
```bash
cd server
npm run dev
```

**Client:**
```bash
cd client
npm run dev
```

### Accessing from Local Network (LAN)

If your development machine and another device are on the same Wi‑Fi, you can open the app from that device by binding Vite to the network interface:

1. Find your development host IP (Windows): run `ipconfig` and copy the IPv4 address for the Wi‑Fi adapter (example: `192.168.1.100`).
2. Start Vite with the LAN host option:

```powershell
cd client
npm install
npm run dev:lan
```

Vite will show a "Network" URL like `http://192.168.1.100:5173` — open that on any device in the same network.

To preview a production build bound to the LAN:

```powershell
cd client
npm run build
npm run preview:lan
```

If you cannot reach the host, check Windows Firewall and allow inbound TCP on the dev ports (e.g., `5173` for Vite). Example PowerShell (Admin):

```powershell
New-NetFirewallRule -DisplayName "Vite Dev (5173)" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Backend (5000)" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

Security: binding to the LAN exposes the dev server on your local network; avoid doing this on untrusted networks.
