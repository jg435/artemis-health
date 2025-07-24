# Fitbit Integration Implementation Plan

## Overview
This document outlines the complete implementation plan for integrating Fitbit into the health dashboard, following the existing patterns established for Whoop, Oura, and Garmin integrations.

## Prerequisites

### 1. Fitbit Developer Account & App Registration
- Create a Fitbit Developer account at https://dev.fitbit.com/
- Register a new application in the Fitbit Web API
- Obtain:
  - Client ID
  - Client Secret
  - Set redirect URI to: `https://yourdomain.com/api/fitbit/callback`
- Configure scopes needed:
  - `activity` - Daily activity data, steps, calories
  - `heartrate` - Heart rate data
  - `sleep` - Sleep data
  - `profile` - Basic profile information

### 2. Environment Variables
Add to `.env.local`:
```
FITBIT_CLIENT_ID=your_client_id
FITBIT_CLIENT_SECRET=your_client_secret
FITBIT_REDIRECT_URI=https://yourdomain.com/api/fitbit/callback
```

## Implementation Steps

### Phase 1: Database Schema Updates

#### 1.1 Update User Table
Add Fitbit connection fields to users table:
```sql
-- Add to existing users table
ALTER TABLE users ADD COLUMN fitbit_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN fitbit_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN fitbit_access_token TEXT;
ALTER TABLE users ADD COLUMN fitbit_refresh_token TEXT;
ALTER TABLE users ADD COLUMN fitbit_token_expires TIMESTAMP;
```

#### 1.2 Update Wearable Data Tables
Modify existing wearable data tables to support Fitbit as a source:

**Recovery Data:**
```sql
-- Update existing recovery_data table
-- Ensure 'source' enum includes 'fitbit'
ALTER TYPE wearable_source ADD VALUE 'fitbit';
```

**Sleep Data:**
```sql
-- Sleep data table already supports source column
-- Fitbit sleep stages: wake, light, deep, rem
```

**Activity Data:**
```sql
-- Activity data table already supports source column
-- Fitbit provides: steps, calories, distance, active minutes
```

**Heart Rate Data:**
```sql
-- Heart rate data table already supports source column
-- Fitbit provides: resting HR, HR zones, intraday HR
```

### Phase 2: API Implementation

#### 2.1 Authentication Flow
Create Fitbit OAuth2 implementation:

**File:** `pages/api/fitbit/auth.ts`
```typescript
// OAuth2 authorization URL generation
// Redirect to Fitbit authorization server
```

**File:** `pages/api/fitbit/callback.ts`
```typescript
// Handle OAuth2 callback
// Exchange authorization code for access token
// Store tokens in database
// Update user fitbit_connected status
```

**File:** `pages/api/fitbit/disconnect.ts`
```typescript
// Revoke access token
// Clear Fitbit data from user record
// Update fitbit_connected status to false
```

#### 2.2 Data Fetching APIs

**File:** `pages/api/fitbit/connection-status.ts`
```typescript
// Check if user has valid Fitbit connection
// Return connection status and basic info
```

**File:** `pages/api/fitbit/profile.ts`
```typescript
// Fetch user profile data
// Basic info like name, timezone, etc.
```

**File:** `pages/api/fitbit/activity.ts`
```typescript
// Fetch daily activity data
// Steps, calories, distance, active minutes
// Support date range queries (?days=30)
```

**File:** `pages/api/fitbit/sleep.ts`
```typescript
// Fetch sleep data
// Sleep stages, efficiency, duration
// Support date range queries (?days=30)
```

**File:** `pages/api/fitbit/heart-rate.ts`
```typescript
// Fetch heart rate data
// Resting HR, HR zones, intraday data
// Support date range queries (?days=30)
```

#### 2.3 Fitbit API Service
**File:** `lib/fitbit-service.ts`
```typescript
export class FitbitService {
  // Token refresh logic
  // API request wrapper with authentication
  // Rate limiting handling (150 requests/hour)
  // Error handling and retry logic
  
  // Data transformation methods:
  // - transformActivityData()
  // - transformSleepData()
  // - transformHeartRateData()
}
```

### Phase 3: Data Synchronization

#### 3.1 Update Wearable Sync Service
**File:** `lib/wearable-sync.ts`

Add Fitbit sync capabilities:
```typescript
// Add fitbitSync() method
// Integrate with existing sync infrastructure
// Handle Fitbit-specific data formats
// Store in unified wearable data tables
```

#### 3.2 Fitbit Data Models
**File:** `lib/fitbit-types.ts`
```typescript
// Fitbit API response types
// Unified data transformation interfaces
// Error handling types
```

### Phase 4: Frontend Components

#### 4.1 Fitbit Connect Component
**File:** `components/fitbit-connect.tsx`
```typescript
// Similar to WhoopConnect, OuraConnect, GarminConnect
// OAuth connection flow
// Connection status display
// Disconnect functionality
// Connection health indicators
```

#### 4.2 Update Existing Components

**Update:** `components/recovery-dashboard.tsx`
```typescript
// Add Fitbit data fetching in wearablesToTry array
// Handle Fitbit-specific data transformation
// Update UI to show Fitbit as source
```

**Update:** `components/sleep-analysis.tsx`
```typescript
// Add Fitbit sleep data fetching
// Handle Fitbit sleep stages format
// Update wearable name display
```

**Update:** `components/workout-analysis.tsx`
```typescript
// Add Fitbit activity data fetching
// Handle Fitbit activity metrics
// Update charts and displays
```

#### 4.3 Update Trainer Interface
**Update:** `components/trainer-client-switcher.tsx`
```typescript
// Add Fitbit option to wearable selection dropdown
// Update wearable icons/colors
```

### Phase 5: Type System Updates

#### 5.1 Update Wearable Types
**File:** `lib/wearable-service.ts`
```typescript
// Add 'fitbit' to WearableType union
// Update UnifiedRecoveryData, UnifiedSleepData, UnifiedActivityData
// Add Fitbit-specific fields if needed
```

#### 5.2 Update Auth Context
**File:** `context/auth-context.tsx`
```typescript
// Add fitbit_connected to User interface
// Update selectedWearable type to include 'fitbit'
```

### Phase 6: UI/UX Integration

#### 6.1 Update Main Dashboard
**File:** `app/page.tsx`
```typescript
// Add FitbitConnect component to connection grids
// Update connection state checking
// Add Fitbit to connectionStates object
```

#### 6.2 Branding & Styling
- Add Fitbit logo to `/public/logos/fitbit.svg`
- Use Fitbit brand colors (teal/green: #00B0B9)
- Follow Fitbit brand guidelines

### Phase 7: Testing & Quality Assurance

#### 7.1 API Testing
- Test OAuth flow end-to-end
- Verify data fetching for all endpoints
- Test error handling and rate limiting
- Verify token refresh mechanism

#### 7.2 Frontend Testing
- Test connection/disconnection flow
- Verify data display across all components
- Test trainer wearable selection
- Test mobile responsiveness

#### 7.3 Data Integrity Testing
- Verify unified data transformation
- Test sync service integration
- Verify trainer data access with Fitbit selection

## Fitbit API Specifics

### Rate Limits
- 150 requests per hour per user
- Implement proper rate limiting and caching

### Data Availability
- **Activity Data:** Steps, calories, distance, floors, active minutes
- **Sleep Data:** Sleep stages (wake, light, deep, REM), efficiency, duration
- **Heart Rate:** Resting HR, HR zones, intraday data (if subscribed)
- **Weight:** Body weight data (if available)

### OAuth2 Scopes Required
```
activity heartrate sleep profile weight
```

### Data Formats
- Date format: YYYY-MM-DD
- Activity data: Daily summaries and intraday time series
- Sleep data: Sleep logs with stage breakdowns
- Heart rate: Daily resting HR and optional intraday

## Implementation Notes

### 1. Follow Existing Patterns
- Use the same structure as Whoop/Oura/Garmin implementations
- Maintain consistency in error handling
- Follow the same data transformation patterns

### 2. Fitbit-Specific Considerations
- Fitbit uses different terminology (e.g., "active minutes" vs "strain")
- Sleep stages are similar to Oura but different from Whoop
- Heart rate zones are pre-calculated by Fitbit

### 3. Trainer Integration
- Ensure trainer wearable selection includes Fitbit
- Verify data filtering works correctly
- Test trainer access to Fitbit data

### 4. Data Migration
- No existing data migration needed
- New Fitbit data will be stored alongside existing wearable data

## Post-Implementation Tasks

### 1. Documentation Updates
- Update README with Fitbit setup instructions
- Add Fitbit to supported wearables list
- Update API documentation

### 2. Monitoring
- Add Fitbit connection health monitoring
- Track sync success rates
- Monitor API rate limit usage

### 3. User Communication
- Announce Fitbit support to existing users
- Update marketing materials
- Create setup guides

## File Checklist

### New Files to Create
- [ ] `pages/api/fitbit/auth.ts`
- [ ] `pages/api/fitbit/callback.ts`
- [ ] `pages/api/fitbit/disconnect.ts`
- [ ] `pages/api/fitbit/connection-status.ts`
- [ ] `pages/api/fitbit/activity.ts`
- [ ] `pages/api/fitbit/sleep.ts`
- [ ] `pages/api/fitbit/heart-rate.ts`
- [ ] `lib/fitbit-service.ts`
- [ ] `lib/fitbit-types.ts`
- [ ] `components/fitbit-connect.tsx`
- [ ] `public/logos/fitbit.svg`

### Files to Update
- [ ] `supabase/migrations/004_add_fitbit_support.sql`
- [ ] `lib/wearable-sync.ts`
- [ ] `lib/wearable-service.ts`
- [ ] `context/auth-context.tsx`
- [ ] `components/recovery-dashboard.tsx`
- [ ] `components/sleep-analysis.tsx`
- [ ] `components/workout-analysis.tsx`
- [ ] `components/trainer-client-switcher.tsx`
- [ ] `app/page.tsx`
- [ ] `.env.local`

## Success Criteria

### Technical
- [ ] All Fitbit APIs working correctly
- [ ] Data properly stored and retrieved
- [ ] OAuth flow functioning smoothly
- [ ] Trainer integration working
- [ ] No breaking changes to existing functionality

### User Experience
- [ ] Seamless connection process
- [ ] Data displays correctly across all components
- [ ] Trainer wearable selection includes Fitbit
- [ ] Mobile experience is responsive
- [ ] Error states handled gracefully

### Performance
- [ ] API responses under 2 seconds
- [ ] Proper caching implemented
- [ ] Rate limits respected
- [ ] No impact on existing wearable performance

This implementation should take approximately 2-3 days for a developer familiar with the existing codebase patterns.