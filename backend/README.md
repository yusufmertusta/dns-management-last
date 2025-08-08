# Bind Domain Manager Backend

## Features
- User authentication (JWT)
- Admin and user roles
- CRUD for domains and DNS records
- Syncs with Bind9

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your values.
3. Set up PostgreSQL and update the connection string in `.env`.
4. Run migrations:
   ```sh
   npx prisma migrate dev --name init
   ```
5. Start the server:
   ```sh
   npm run dev
   ```

## Production
- Build: `npm run build`
- Start: `npm start`
- Use Docker for deployment (see Dockerfile)
- Ensure Bind9 is installed and accessible

## Environment Variables
See `.env.example` for required variables.
