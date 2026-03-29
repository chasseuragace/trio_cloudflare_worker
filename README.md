# Trio Booking API - Cloudflare Worker

This is a Cloudflare Worker that handles booking form submissions from the Trio frontend.

## Setup

### Prerequisites
- Cloudflare account
- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Development

Run the worker locally:

```bash
pnpm run dev
```

The worker will be available at `http://localhost:8787`

### Testing the API

Test the health endpoint:
```bash
curl http://localhost:8787/api/health
```

Test the booking endpoint:
```bash
curl -X POST http://localhost:8787/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "message": "I would like to book a consultation"
  }'
```

### Deployment

Deploy to Cloudflare:

```bash
pnpm run deploy
```

This will deploy to your Cloudflare account. Make sure you're authenticated with `wrangler login`.

## API Endpoints

### POST /api/bookings

Submit a booking form.

**Request:**
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "company": "string (optional)",
  "message": "string (required)"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Booking received successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "company": "string",
    "message": "string",
    "timestamp": "ISO 8601 timestamp"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [...]
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "ISO 8601 timestamp"
}
```

## Kaha API Proxy

All Kaha API endpoints are proxied through `/api/kaha/` prefix.

### Available Endpoints

**Assets:**
- `POST /api/kaha/main/api/v3/asset` - Create asset
- `GET /api/kaha/main/api/v3/asset` - List assets
- `GET /api/kaha/main/api/v3/asset/my-business` - Get my business assets
- `GET /api/kaha/main/api/v3/asset/business/{businessId}` - Get business assets
- `GET /api/kaha/main/api/v3/asset/{id}` - Get asset by ID
- `PATCH /api/kaha/main/api/v3/asset/{id}` - Update asset
- `DELETE /api/kaha/main/api/v3/asset/{id}` - Delete asset

### Example Usage

```bash
# Get assets
curl https://trio-worker.chasseuragace.workers.dev/api/kaha/main/api/v3/asset

# Get my business assets
curl https://trio-worker.chasseuragace.workers.dev/api/kaha/main/api/v3/asset/my-business

# Create asset
curl -X POST https://trio-worker.chasseuragace.workers.dev/api/kaha/main/api/v3/asset \
  -H "Content-Type: application/json" \
  -d '{"name": "My Asset", ...}'
```

### Authentication

If the Kaha API requires authentication, pass the Authorization header:

```bash
curl https://trio-worker.chasseuragace.workers.dev/api/kaha/main/api/v3/asset \
  -H "Authorization: Bearer YOUR_TOKEN"
```

The proxy will forward all headers to the upstream API.

## Configuration

Edit `wrangler.toml` to configure:
- Worker name
- Routes and domains
- Environment variables
- Database bindings (D1)
- KV namespace bindings

## Next Steps

1. **Email Integration**: Add SendGrid, Mailgun, or Resend to send confirmation emails
2. **Database**: Enable D1 database to store bookings
3. **Analytics**: Add event tracking
4. **Webhooks**: Send booking data to external services
5. **Authentication**: Add API key validation if needed

## Environment Variables

Add environment variables in `wrangler.toml`:

```toml
[env.production]
vars = { API_KEY = "your-key" }
```

Access in code:
```typescript
const apiKey = env.API_KEY;
```

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [KV Storage](https://developers.cloudflare.com/kv/)
