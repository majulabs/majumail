# MajuMail Vercel Deployment Guide

## Prerequisites

Before deploying, make sure you have:
- A Vercel account (https://vercel.com)
- Your GitHub repository connected to Vercel
- Access to your environment variables

## Step-by-Step Deployment

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 2: Import Project on Vercel

1. Go to https://vercel.com/new
2. Click "Import" next to your `majumail` repository
3. Select the repository and click "Import"

### Step 3: Configure Environment Variables

In the Vercel project settings, add these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | NeonDB connection string | `postgresql://user:pass@host.neon.tech/db?sslmode=require` |
| `AUTH_SECRET` | Random secret for Auth.js (generate with `openssl rand -base64 32`) | `your-random-32-char-string` |
| `NEXTAUTH_URL` | Your production URL | `https://majumail.vercel.app` |
| `RESEND_API_KEY` | Your Resend API key | `re_xxxxx` |
| `RESEND_WEBHOOK_SECRET` | Webhook signing secret (from Resend) | `whsec_xxxxx` |
| `ANTHROPIC_API_KEY` | Claude AI API key | `sk-ant-xxxxx` |

### Step 4: Deploy

Click "Deploy" and wait for the build to complete.

### Step 5: Configure Resend Webhook

After deployment, you need to tell Resend where to send incoming emails:

1. Go to https://resend.com/webhooks
2. Click "Add Webhook"
3. Configure:
   - **Endpoint URL**: `https://your-domain.vercel.app/api/webhooks/resend`
   - **Events**: Select `email.received`
4. Copy the **Signing Secret** and add it to Vercel as `RESEND_WEBHOOK_SECRET`
5. Redeploy after adding the secret

### Step 6: Update NEXTAUTH_URL

After the first deployment, update the `NEXTAUTH_URL` environment variable with your actual Vercel URL:
- If using a custom domain: `https://mail.yourdomain.com`
- If using Vercel's domain: `https://majumail-xxx.vercel.app`

Then trigger a redeploy.

## Security Checklist

✅ **Auth.js**: Server-side session validation on all API routes  
✅ **Allowed Emails**: Only `kueck.marcel@gmail.com` and `hello@julien-scholz.dev` can login  
✅ **Webhook Verification**: Using svix for proper signature verification  
✅ **Next.js Version**: Using 16.0.8 (protected against CVE-2025-29927)  
✅ **Vercel Hosting**: Middleware bypass vulnerability doesn't affect Vercel  

## Custom Domain (Optional)

1. Go to your Vercel project settings → Domains
2. Add your custom domain (e.g., `mail.rechnungs-api.de`)
3. Follow Vercel's DNS configuration instructions
4. Update `NEXTAUTH_URL` to match your custom domain

## Troubleshooting

### Emails not appearing in inbox
- Check Resend dashboard → Webhooks → Recent Deliveries
- Verify the webhook URL is correct
- Check Vercel logs for webhook errors

### Can't login
- Verify `AUTH_SECRET` is set correctly
- Check `NEXTAUTH_URL` matches your deployment URL
- Ensure your email is in the allowed list

### Database connection issues
- Verify `DATABASE_URL` is correct
- Make sure you're using `?sslmode=require` for NeonDB

## Environment Variables Reference

```env
# Database (NeonDB)
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# Auth.js
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-vercel-url.vercel.app"

# Resend
RESEND_API_KEY="re_your_api_key"
RESEND_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Anthropic (Claude AI)
ANTHROPIC_API_KEY="sk-ant-your_api_key"
```
