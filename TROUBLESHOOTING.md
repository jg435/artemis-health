# Whoop Connection Troubleshooting

## Step 1: Check Database Connection
Visit: `http://localhost:3000/api/test/db-connection`

This will tell you:
- ✅ Database connected
- ✅ Users table exists  
- ✅ Whoop tokens table exists
- ❌ Any configuration issues

## Step 2: Run Database Migration
If tables don't exist, run the migration:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Copy contents from `/scripts/auth-migration-manual.sql`
5. Paste and click **Run**

## Step 3: Check Console Logs
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try connecting Whoop
4. Look for error messages

## Step 4: Verify Environment Variables
Check your `.env` file has:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_service_key
WHOOP_CLIENT_ID=your_whoop_client_id
WHOOP_CLIENT_SECRET=your_whoop_secret
```

## Step 5: Test Auth Flow
1. Create a test account
2. Check if you can login/logout
3. Try connecting Whoop after logging in

## Common Issues:

### "Database not configured"
- Missing SUPABASE_SERVICE_ROLE_KEY
- Wrong Supabase URL

### "Tables don't exist" 
- Need to run database migration
- Check Supabase project is correct

### "Whoop connection fails"
- Check Whoop credentials in .env
- Verify redirect URI in Whoop dashboard

### "No data showing"
- Check console for API errors
- Verify user is logged in
- Check Whoop tokens are stored

## Debug URLs:
- Database test: `http://localhost:3000/api/test/db-connection`
- User info: `http://localhost:3000/api/auth/me`
- Whoop recovery: `http://localhost:3000/api/whoop/recovery`