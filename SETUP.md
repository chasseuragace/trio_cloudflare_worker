# Cloudflare Worker Setup Guide

## Quick Start

### 1. Create a GitHub Repository

Create a new public repository on GitHub:
- Go to https://github.com/new
- Repository name: `trio-booking-api` (or your preferred name)
- Make it public
- Don't initialize with README (we already have one)

### 2. Push to GitHub

```bash
git remote add origin https://github.com/chasseuragace/trio-booking-api.git
git branch -M main
git add .
git commit -m "Initial commit: Cloudflare Worker booking API"
git push -u origin main
```

### 3. Connect to Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages**
3. Click **Create application** → **Create Worker**
4. Choose **Deploy with Git**
5. Select your GitHub repository (`trio-booking-api`)
6. Configure the build settings:
   - **Build command**: `pnpm install && pnpm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (or leave blank)
7. Click **Save and Deploy**

### 4. Configure Your Domain

After deployment, you can configure a custom domain:

1. In Cloudflare Workers dashboard, go to your worker
2. Click **Settings** → **Triggers**
3. Add a route like: `api.yourdomain.com/api/*`
4. Select your Cloudflare zone

### 5. Update Frontend

In your Trio frontend, update the booking form to call:

```typescript
const response = await fetch('https://api.yourdomain.com/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});
```

Or for local development:
```typescript
const response = await fetch('http://localhost:8787/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});
```

## Local Development

```bash
pnpm install
pnpm run dev
```

Visit `http://localhost:8787/api/health` to test.

## Deployment

```bash
pnpm run deploy
```

Make sure you're authenticated:
```bash
wrangler login
```

## Next Steps

- Add email notifications (SendGrid, Mailgun, Resend)
- Set up D1 database for storing bookings
- Add authentication/API keys
- Configure environment variables for different environments
