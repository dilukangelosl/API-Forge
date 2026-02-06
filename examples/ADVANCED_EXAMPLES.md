# API Forge - Advanced Examples

## Overview

Two example apps demonstrating API Forge's advanced features:

| App | Port | Purpose |
|-----|------|---------|
| **Blog Platform** | 4000 | OAuth provider with host app auth |
| **Social Poster** | 5000 | OAuth client (third-party app) |

---

## Quick Start

```bash
# Terminal 1: Start Blog Platform
cd examples/blog-platform
bun install && bun run dev

# Terminal 2: Start Social Poster
cd examples/social-poster  
bun install && bun run dev
```

---

## Example 1: Blog Platform

Demonstrates:
- ✅ **Host app auth integration** - Uses session cookies
- ✅ **Protected portal** - Requires login to manage OAuth apps
- ✅ **Public routes** - `GET /posts` (no auth)
- ✅ **Protected routes** - `POST /posts` (requires token)
- ✅ **Ownership checks** - Users can only edit their own posts
- ✅ **App limits** - Max 5 apps per user

### Route Types

```typescript
// PUBLIC - No auth required
.endpoint({ method: "GET", path: "/posts" })

// PROTECTED - Requires OAuth token with scope
.endpoint({ 
    method: "POST", 
    path: "/posts",
    scopes: ["write:posts"]
})

// OWNERSHIP - Only resource owner can access
.endpoint({
    method: "PUT",
    path: "/posts/:id",
    scopes: ["write:posts"],
    // Manual check in handler:
    handler: (ctx) => {
        if (post.authorId !== ctx.request.oauth.sub) {
            return Response.forbidden();
        }
    }
})
```

### Auth Integration

```typescript
forge.use(oauthPlugin({
    userAuth: {
        getCurrentUser: (req) => req.session?.user,
        loginUrl: "/auth/login",
    },
    maxAppsPerUser: 5,
}));
```

---

## Example 2: Social Poster

Demonstrates:
- ✅ **OAuth client implementation**
- ✅ **Authorization code flow with PKCE**
- ✅ **Acting on behalf of users**
- ✅ **Token management**

### Key Point: Scoped Access

Even with a user's token, the Social Poster can only access that user's resources. It CANNOT access other users' posts because Blog Platform checks:

```typescript
if (post.authorId !== oauth.sub) {
    return Response.forbidden("You can only edit your own posts");
}
```

---

## All Configuration Options

```typescript
// OAuth Plugin
oauthPlugin({
    issuer: "https://your-domain.com",
    audience: "https://your-domain.com",
    basePath: "/oauth",
    
    // Auth Integration
    userAuth: {
        getCurrentUser: (req) => User | null,
        loginUrl: "/login",
        canCreateApps: (user) => boolean,
    },
    
    // Limits
    maxAppsPerUser: 5,
    maxRedirectUrisPerApp: 10,
})

// Rate Limit Plugin
rateLimitPlugin({
    globalLimit: "1000/hour",
    includeHeaders: true,
})

// Route Metadata
.endpoint({
    scopes: ["read:posts"],      // Required scopes
    ownerField: "authorId",       // Auto ownership check
    rateLimit: "100/hour",        // Per-endpoint limit
})
```

---

## Testing the Flow

1. **Login to Blog Platform**: http://localhost:4000/auth/login
2. **Create OAuth App**: http://localhost:4000/portal
3. **Update Social Poster config** with client credentials
4. **Connect**: http://localhost:5000 → "Connect to Blog Platform"
5. **Create Post**: Post will be created as the logged-in user
