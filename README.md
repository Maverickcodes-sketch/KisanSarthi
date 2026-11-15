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