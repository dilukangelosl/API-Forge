# @api-forge/storage-drizzle

Drizzle ORM storage adapter for API Forge OAuth.

## Installation

```bash
npm install @api-forge/storage-drizzle drizzle-orm
# or
bun add @api-forge/storage-drizzle drizzle-orm
```

## Setup

### 1. Use the provided schema

Import and use the OAuth schema tables:

```typescript
// db/schema.ts
import {
    oauthClients,
    oauthTokens,
    oauthAuthCodes,
    oauthRateLimits,
    oauthConsents,
} from "@api-forge/storage-drizzle/schema";

// Export alongside your other tables
export * from "@api-forge/storage-drizzle/schema";
export * from "./your-other-tables";
```

### 2. Run migrations

```bash
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

### 3. Use with API Forge

```typescript
import { APIForge } from "@api-forge/core";
import { DrizzleStorageAdapter } from "@api-forge/storage-drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const forge = new APIForge({
    storage: {
        adapter: new DrizzleStorageAdapter({ db }),
    },
    auth: {
        grants: ["authorization_code", "refresh_token"],
        scopes: {
            "read:users": "Read user data",
        },
    },
});
```

## Supported Databases

The schema is defined for PostgreSQL. For MySQL or SQLite, you'll need to modify the schema imports:

```typescript
// For MySQL
import { mysqlTable, varchar, text, boolean, timestamp, int } from "drizzle-orm/mysql-core";

// For SQLite
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
```

## License

MIT
