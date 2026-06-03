# Deployment Guide - Knockout App

## 1. Supabase Setup

Your Supabase project already exists at: `your-supabase-url` (set this in Netlify environment variables)

### Run Migrations
Execute both migrations in order:

```bash
# First migration (core schema)
npx supabase db push --dry-run  # Check what will be applied
npx supabase db push            # Apply migration 001

# Second migration (Kanban workspace + time tracking)
npx supabase db push --dry-run  # Check what will be applied  
npx supabase db push            # Apply migration 002
```

Alternatively, copy the SQL from both files and run in Supabase SQL Editor:
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_kanban_workspace.sql`

### Get Your Supabase Keys
1. Go to Supabase Dashboard → Project Settings → API
2. Copy the following values:

- **anon public** (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **service_role secret** (for `SUPABASE_SERVICE_ROLE_KEY`) - keep this secret!

## 2. Generate Encryption Key

Run this locally to generate your encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 3. Netlify Deployment

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository
4. Build settings should auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `.next`

## 4. Environment Variables

> ⚠️ **Important**: Never commit real Supabase keys or encryption keys to your repository!
> Set these values ONLY in Netlify Environment Variables (Project Settings → Environment Variables).

In Netlify Site Settings → Environment Variables, add these **four** variables:

| Variable | Value | Type |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `your-supabase-url` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-supabase-anon-key` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-supabase-service-role-key` | Secret |
| `ENCRYPTION_KEY` | `your-encryption-key` | Secret |

## 5. Deploy!

After setting environment variables:
1. Trigger a new deploy in Netlify
2. Your site will be live at your Netlify URL

## 6. Fixing Netlify Secrets Scanner Issues

If Netlify's secrets scanner blocks your build with messages like:
```
Secret env var "NEXT_PUBLIC_SUPABASE_URL"'s value detected
```

This happens because Netlify considers Supabase URLs and keys as "secrets" even though `NEXT_PUBLIC_*` variables are meant to be public.

**Solution**: Add these environment variables in Netlify to disable the scanner:

In **Netlify Site Settings → Environment Variables**, add:
- `SECRETS_SCAN_ENABLED` = `false`

Alternatively, you can configure specific paths to omit from scanning:
- `SECRETS_SCAN_OMIT_PATHS` = `.netlify/edge-functions`

However, this is a temporary workaround. The proper solution is to ensure no real values are ever embedded in your build.

## First Login

1. Visit your deployed site
2. Sign up with your email
3. You'll automatically get a profile and organization
4. Start using the Kanban boards, time tracking, and external DB features!

## Questions?

Check the README or open an issue if you need help with any step.