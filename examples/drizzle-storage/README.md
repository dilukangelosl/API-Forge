# Drizzle Storage Example

API Forge example using Drizzle ORM with SQLite for persistent OAuth storage.

## Setup

```bash
# Install dependencies
bun install

# Create database tables
bun run db:push

# Start the server
bun run dev
```

## Features

- **Persistent storage** using Drizzle ORM
- **SQLite database** (easy to swap to PostgreSQL/MySQL)
- **OAuth 2.0** with client credentials, authorization code, and refresh tokens
- **Rate limiting** with database-backed counters
- **User management** API

## Testing

### 1. Get an access token

```bash
curl -X POST http://localhost:3002/api/oauth/token \
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
curl -X POST http://localhost:3002/api/users \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User", "password": "secret"}'
```

### 3. List users

```bash
curl http://localhost:3002/api/users \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Comparison with Prisma

| Feature | Prisma | Drizzle |
|---------|--------|---------|
| Schema | Declarative .prisma file | TypeScript schema |
| Migrations | Auto-generated | Push or SQL files |
| Type Safety | Generated types | Inferred types |
| Bundle Size | Larger | Smaller |
