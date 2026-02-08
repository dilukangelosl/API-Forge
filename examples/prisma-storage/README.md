# Prisma Storage Example

API Forge example using Prisma ORM with SQLite for persistent OAuth storage.

## Setup

```bash
# Install dependencies
bun install

# Generate Prisma client and create database
bun run db:push

# Start the server
bun run dev
```

## Features

- **Persistent storage** using Prisma ORM
- **SQLite database** (easy to swap to PostgreSQL/MySQL)
- **OAuth 2.0** with client credentials, authorization code, and refresh tokens
- **Rate limiting** with database-backed counters
- **User management** API

## Testing

### 1. Get an access token

```bash
curl -X POST http://localhost:3001/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "demo-client",
    "client_secret": "YOUR_SECRET",
    "scope": "read:users write:users"
  }'
```

### 2. Create a user

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User", "password": "secret"}'
```

### 3. List users

```bash
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Database Management

```bash
# Open Prisma Studio (visual DB editor)
bun run db:studio

# Push schema changes
bun run db:push

# Regenerate Prisma client
bun run db:generate
```
