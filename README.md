# KisanSathi

Dynamic queue management system for farmers. "Less Waiting, More Growing."

KisanSathi helps farmers avoid long waits at mandis and government procurement centers by booking virtual queue tokens and tracking live queue positions.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Auth: JWT and bcrypt
- Real-time: Socket.IO
- Charts: Recharts

## Prerequisites

- Node.js 20.19+ (or 22.12+)
- Git
- A MongoDB database (local MongoDB or a free MongoDB Atlas cluster)

## Setup

### 1. Server

    cd server
    npm install
    copy .env.example .env

Open `server/.env` and fill in:

- `MONGO_URI`: your connection string, ending with the database name `kisansathi` (for Atlas: `...mongodb.net/kisansathi?retryWrites=true&w=majority`)
- `JWT_SECRET`: any long random string. Generate one with:

      node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

- `AUTH_PAYLOAD_PRIVATE_KEY_BASE64` (optional): a base64-encoded RSA private key for decrypting login and registration requests. If omitted, the server generates an in-memory key on startup. For multiple server instances, generate one shared value with the command below and configure it on every instance:

      node --input-type=module -e "import { generateKeyPairSync } from 'node:crypto'; const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }); console.log(Buffer.from(privateKey).toString('base64'));"

Never commit `.env`.

### 2. Demo data

Run once from the `server` folder:

    npm run seed

This creates the admin and operator accounts, plus demo centers, services and counters. It is safe to run again.

To add five demo farmer accounts with waiting tokens to every active counter, run from the `server` folder:

    npm run seed:farmers

The script is safe to rerun. Seed farmers use `farmer123` as their password and have globally numbered email addresses, such as `farmer1@kisansathi.in` and `farmer2@kisansathi.in`.

### 3. Run the server

    npm run dev

The API runs at http://localhost:5000 (health check: http://localhost:5000/api/health).

### 4. Client

In a second terminal:

    cd client
    npm install
    npm run dev

The app runs at http://localhost:5173.

## Deploy to Render

1. Push the repository to GitHub and create a new Blueprint on Render using the repository's `render.yaml`.
2. Set `MONGO_URI` to your MongoDB Atlas connection string and `JWT_SECRET` to a long, random secret when prompted. Ensure your Atlas network access rules allow connections from Render.
3. Deploy both services. The Blueprint connects the static client to the API and configures the API's CORS origin automatically.
4. Once deployed, seed demo data from the server service's Shell with `npm run seed` if needed.

The client is deployed as a static site with SPA routing enabled. The API health check is available at `/api/health`.
Render serves both services over HTTPS. The client refuses API requests to non-local HTTP endpoints, so keep `VITE_API_ORIGIN` pointed at the HTTPS API URL.

## Password transport and storage

Login and registration encrypt their JSON payload in the browser with AES-GCM and wrap the one-time encryption key using the API's RSA public key. The server decrypts the payload before validation and hashes passwords with bcrypt before storing them. The DevTools Network panel therefore shows an encrypted envelope instead of the original request body.

This only obscures the request body shown in the Network panel; it cannot prevent someone with access to the browser from inspecting the password before encryption or modifying the client. HTTPS remains required for production transport. Local development uses HTTP only on `localhost`.

## Demo Accounts

| Role | Login | Password |
| --- | --- | --- |
| Admin | admin@kisansathi.in | admin123 |
| Operator | operator@kisansathi.in | operator123 |
| Operator | operator2@kisansathi.in to operator6@kisansathi.in | operator123 |

Farmers can register from the app.

## Team Workflow

- Pull the latest code before starting: `git pull origin main`
- Work on your own branch: `git checkout -b feature/your-feature-name`
- Commit small changes with clear messages, then push your branch and open a pull request.
- Never commit `.env` or any secrets.

🚀 **Live Demo:** [Click Here](https://kisan-sarthi-beryl.vercel.app/)
