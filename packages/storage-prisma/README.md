# @api-forge/storage-prisma

Prisma storage adapter for API Forge OAuth.

## Installation

```bash
npm install @api-forge/storage-prisma @prisma/client
# or
bun add @api-forge/storage-prisma @prisma/client
```

## Setup

### 1. Add OAuth tables to your Prisma schema

Copy the models from `prisma/schema.prisma` in this package to your project's schema:

```prisma
// prisma/schema.prisma

model OAuthClient {
  id               String   @id @default(cuid())
  clientId         String   @unique
  clientSecretHash String?
  name             String
  description      String?
  redirectUris     String[]
  grantTypes       String[]
  scopes           String[]
  isConfidential   Boolean  @default(true)
  ownerId          String
  logoUrl          String?
  websiteUrl       String?
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  tokens    OAuthToken[]
  authCodes OAuthAuthCode[]
  consents  OAuthConsent[]

  @@map("oauth_clients")
}

// ... (see full schema in prisma/schema.prisma)
```

### 2. Run migrations

```bash
npx prisma migrate dev --name add-oauth-tables
```

### 3. Use with API Forge

```typescript
import { APIForge } from "@api-forge/core";
import { PrismaStorageAdapter } from "@api-forge/storage-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const forge = new APIForge({
    storage: {
        adapter: new PrismaStorageAdapter({ prisma }),
    },
    auth: {
        grants: ["authorization_code", "refresh_token"],
        scopes: {
            "read:users": "Read user data",
        },
    },
});
```

## License

MIT
