# Result Portal Backend API

Node.js + Express + PostgreSQL backend for the ITMT result portal system. This service powers the student portal, admin dashboard, token management, payments, notifications, and result delivery.

## Stack

- Node.js
- Express
- PostgreSQL
- Sequelize
- Socket.IO
- Paystack integration
- Puppeteer PDF generation

## Local Development

```bash
npm install
npm run dev
```

The API runs on the port defined in `.env`, currently `5002`.

## Available Scripts

- `npm run dev` starts the backend with Nodemon.
- `npm run start` starts the backend in production mode.
- `npm run db:migrate` runs Sequelize migrations.
- `npm run db:migrate:undo` rolls back the last migration.

## Environment Variables

Create a local `.env` file from `.env.example` and fill in your production or development credentials.

Required variables include:

- `PORT`
- `ALLOWED_ORIGINS`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `DEFAULT_ADMIN_NAME`
- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`
- `TOKEN_PRICE`
- `PORTAL_BASE_URL`

Optional variables:

- `DB_SSL`
- `DB_LOGGING`
- `EMAIL_ENCRYPTION_KEY`

## Deployment

- Recommended host: Railway
- Install command: `npm install`
- Start command: `npm start`
- Root directory: `server`
- `railway.json` is included for a predictable start command.

## Security

- Do not commit `.env` or any live credentials.
- Rotate any exposed Paystack, database, SMTP, or JWT secrets before production deployment if they have ever been shared or committed elsewhere.
- Restrict `ALLOWED_ORIGINS` to your real frontend domains in production.

## Notes

- This repository is intended to be pushed independently as `resultportal-server`.
- The backend serves the built frontends when used in the combined local environment, but it can also be deployed as an API-only service.
