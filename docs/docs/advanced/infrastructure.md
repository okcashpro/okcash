---
sidebar_position: 1
title: Infrastructure
---

# Infrastructure

## Overview

Eliza uses a flexible, multi-database architecture that supports different storage backends through a unified adapter interface. The system supports PostgreSQL (with Supabase), SQLite, and SQL.js, allowing for both cloud and local deployments.

## Database Architecture

### Adapter Pattern

Eliza implements a database adapter pattern that provides a consistent interface across different database backends:

```typescript
// Core adapter interface implemented by all database providers
class DatabaseAdapter {
  async getRoom(roomId: UUID): Promise<UUID | null>;
  async getParticipantsForAccount(userId: UUID): Promise<Participant[]>;
  async getMemories(params: {...}): Promise<Memory[]>;
  // ... other interface methods
}
```

### Supported Databases

1. **PostgreSQL/Supabase** (`PostgresDatabaseAdapter`)

   - Full-featured cloud database with vector search capabilities
   - Supports real-time subscriptions
   - Built-in user authentication
   - Row-level security policies

2. **SQLite** (`SqliteDatabaseAdapter`)

   - Local filesystem storage
   - Vector similarity search via SQLite extensions
   - Suitable for edge deployments
   - Embedded database operations

3. **SQL.js** (`SqlJsDatabaseAdapter`)
   - In-memory database operations
   - Browser-compatible
   - No filesystem dependencies
   - Ideal for testing and development

## Core Components

### 1. Memory Storage System

The memory system uses a sophisticated schema that supports:

```sql
CREATE TABLE memories (
    "id" UUID PRIMARY KEY,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB NOT NULL,
    "embedding" vector(1536), -- Vector storage for embeddings
    "userId" UUID,
    "roomId" UUID,
    "unique" BOOLEAN DEFAULT true
);
```

Key features:

- Vector embeddings for semantic search
- Content deduplication via the `unique` flag
- JSON storage for flexible content types
- Relationship tracking through foreign keys

### 2. User Management

```sql
CREATE TABLE accounts (
    "id" UUID PRIMARY KEY,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "details" JSONB DEFAULT '{}',
    "is_agent" BOOLEAN DEFAULT false
);
```

Features:

- Flexible user details storage using JSONB
- Agent/user differentiation
- Integration with auth systems

### 3. Relationship System

```sql
CREATE TABLE relationships (
    "id" UUID PRIMARY KEY,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "userA" UUID NOT NULL,
    "userB" UUID NOT NULL,
    "status" TEXT,
    "userId" UUID NOT NULL
);
```

Supports:

- Bi-directional relationships
- Relationship status tracking
- Friend recommendations

## Security Features

### Row Level Security (RLS)

PostgreSQL deployment includes comprehensive RLS policies:

```sql
-- Example RLS policies
CREATE POLICY "Enable read access for all users"
ON "public"."accounts" FOR SELECT
USING (true);

CREATE POLICY "Can select and update all data"
ON "public"."accounts"
USING (("auth"."uid"() = "id"))
WITH CHECK (("auth"."uid"() = "id"));
```

### Authentication Integration

- Built-in support for Supabase Auth
- JWT validation
- Role-based access control

## Deployment Options

### 1. Cloud Deployment (Supabase)

```typescript
// Initialize cloud database
const supabaseAdapter = new SupabaseDatabaseAdapter(
  "https://your-project.supabase.co",
  "your-supabase-key",
);
```

Features:

- Automated backups
- Scalable vector operations
- Real-time capabilities
- Built-in monitoring

### 2. Local Deployment (SQLite)

```typescript
// Initialize local database
const sqliteAdapter = new SqliteDatabaseAdapter(
  new Database("path/to/database.db"),
);
```

Features:

- File-based storage
- Portable deployment
- Low resource requirements
- Embedded vector operations

### 3. In-Memory Deployment (SQL.js)

```typescript
// Initialize in-memory database
const sqljsAdapter = new SqlJsDatabaseAdapter(new Database());
```

Features:

- No persistence requirements
- Fast operations
- Perfect for testing
- Browser compatibility

## Vector Search Capabilities

All database adapters support vector operations for semantic search:

```typescript
async searchMemoriesByEmbedding(
  embedding: number[],
  params: {
    match_threshold?: number;
    count?: number;
    roomId?: UUID;
    unique?: boolean;
    tableName: string;
  }
): Promise<Memory[]>
```

### Implementation Details:

- PostgreSQL: Uses pgvector extension
- SQLite: Uses sqlite-vss extension
- SQL.js: Uses custom vector similarity functions

## Best Practices

1. **Database Selection**

   - Use Supabase for production deployments
   - Use SQLite for edge computing/local deployments
   - Use SQL.js for testing and browser-based applications

2. **Memory Management**

   ```typescript
   // Example of proper memory handling
   async function withConnection(fn: (client: PoolClient) => Promise<T>) {
     const client = await pool.connect();
     try {
       return await fn(client);
     } finally {
       client.release();
     }
   }
   ```

3. **Error Handling**

   ```typescript
   try {
     await adapter.createMemory(memory, tableName);
   } catch (error) {
     console.error("Database error:", error);
     // Implement proper error recovery
   }
   ```

4. **Connection Pooling**
   ```typescript
   const pool = new Pool({
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

## Performance Optimization

1. **Indexing Strategy**

   ```sql
   -- Essential indexes for performance
   CREATE INDEX idx_memories_embedding ON memories
   USING hnsw ("embedding" vector_cosine_ops);
   CREATE INDEX idx_memories_type_room ON memories("type", "roomId");
   ```

2. **Query Optimization**

   ```typescript
   // Use parameterized queries
   const stmt = db.prepare(
     "SELECT * FROM memories WHERE type = ? AND roomId = ?",
   );
   ```

3. **Caching**
   - Implement memory caching for frequently accessed data
   - Use embedding caching for similar queries

## Monitoring and Maintenance

1. **Health Checks**

   ```typescript
   async testConnection(): Promise<boolean> {
     const result = await client.query("SELECT NOW()");
     return !!result.rows[0];
   }
   ```

2. **Logging**
   ```typescript
   // Implement comprehensive logging
   const loggingAdapter = createLoggingDatabaseAdapter(baseAdapter);
   ```

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Supabase Documentation](https://supabase.com/docs)
- [Vector Search Guide](https://supabase.com/docs/guides/database/extensions/pgvector)

For deployment-specific configurations and advanced setup options, refer to the respective database documentation.
