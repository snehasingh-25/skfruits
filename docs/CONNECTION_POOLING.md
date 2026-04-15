# Connection Pooling & HTTP Keep-Alive Configuration

## Overview
This backend now uses optimized connection pooling and HTTP keep-alive to improve performance and reduce database connection overhead.

## Prisma Singleton Pattern

All route files now use a shared PrismaClient instance from `prisma.js` instead of creating new instances per request. This ensures:
- **Single connection pool** shared across all requests
- **Efficient connection reuse** - connections are reused instead of created/destroyed per request
- **Reduced connection overhead** - no connection setup/teardown per request

### Implementation
- Created `prisma.js` with singleton pattern
- All route files import: `import prisma from "../prisma.js"`
- Prevents multiple PrismaClient instances

## HTTP Keep-Alive

HTTP keep-alive is enabled to allow connection reuse between client and server:
- **keepAliveTimeout**: 65 seconds
- **headersTimeout**: 66 seconds
- Reduces TCP connection overhead
- Improves response times for subsequent requests

## MySQL Connection Pooling

Prisma automatically manages connection pooling for MySQL. Configure pool size via `DATABASE_URL`:

### Recommended DATABASE_URL Format:
```
mysql://user:password@host:port/database?connection_limit=10&pool_timeout=20
```

### Parameters:
- `connection_limit`: Maximum number of connections in the pool (default: depends on Prisma version)
- `pool_timeout`: Maximum time to wait for a connection from the pool (in seconds)

### Example:
```env
DATABASE_URL="mysql://user:pass@localhost:3306/giftchoice?connection_limit=10&pool_timeout=20"
```

## Benefits

1. **Performance**: Reuses existing connections instead of creating new ones
2. **Resource Efficiency**: Single connection pool instead of multiple pools
3. **Scalability**: Better handling of concurrent requests
4. **Reduced Latency**: HTTP keep-alive reduces connection setup time

## Monitoring

The server logs will show:
- "HTTP keep-alive: Enabled"
- "Prisma connection pooling: Enabled (singleton pattern)"

## Graceful Shutdown

Both HTTP server and Prisma client handle graceful shutdown:
- SIGTERM and SIGINT signals properly close connections
- Prisma client disconnects cleanly on process exit
