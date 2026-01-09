# UGC Compliance Implementation Guide

This document outlines the implementation of User Generated Content (UGC) compliance features required for App Store and Google Play submission.

## Files Created/Modified

### 1. EULA Document
- **File**: `EULA.md`
- **Purpose**: Complete End User License Agreement with UGC-specific clauses
- **Key Sections**:
  - Prohibited content (offensive, hateful, obscene content)
  - Zero-tolerance policy
  - Reporting and blocking mechanisms
  - Content moderation rights

### 2. Database Migrations

#### `supabase_migrations/add_eula_accepted_column.sql`
- Adds `eula_accepted` boolean column to `profiles` table
- Default value: `false`
- Includes index for faster queries

#### `supabase_migrations/create_user_reports_table.sql`
- Creates `user_reports` table for storing user reports
- Includes RLS policies for security
- Supports multiple report types:
  - `offensive_content`
  - `harassment`
  - `spam`
  - `inappropriate_username`
  - `inappropriate_emote`
  - `other`

### 3. React Components

#### `components/EULAAcceptanceModal.tsx`
- Non-dismissible modal that displays EULA text
- Requires user to scroll to bottom before accepting
- Updates `eula_accepted` field in Supabase on acceptance
- Styled to match app's luxury theme

### 4. Hooks/Utilities

#### `hooks/useReportUser.ts`
- React hook for reporting users
- Also exports standalone `reportUser` function
- Validates inputs and prevents self-reporting
- Returns success/error status

### 5. Type Updates

#### `types.ts`
- Added `eula_accepted?: boolean` to `UserProfile` interface

### 6. App Integration

#### `App.tsx`
- Added EULA check after profile loads
- Shows `EULAAcceptanceModal` if `eula_accepted === false`
- Only checks for authenticated users (not guests)
- Refreshes profile after EULA acceptance

#### `services/supabase.ts`
- Updated `getDefaultProfile()` to set `eula_accepted: false` for new users

## How It Works

### EULA Acceptance Flow

1. **User logs in** → Profile is fetched
2. **Profile check** → If `eula_accepted === false` or `undefined`, show modal
3. **User scrolls** → Must scroll to bottom of EULA text
4. **User clicks "I Agree"** → Updates `profiles.eula_accepted = true` in Supabase
5. **Modal closes** → User can now access the game

### Reporting Flow

1. **User identifies objectionable content** (username, emote, behavior)
2. **Calls `reportUser()` function** with:
   - `reportedUserId`: The user being reported
   - `reportType`: Type of violation
   - `description`: Optional additional context
   - `reportedContent`: The specific content (username, emote, etc.)
3. **Report is saved** to `user_reports` table with status `pending`
4. **Admin reviews** reports using service role key (outside app)

## Usage Examples

### Reporting a User (React Component)

```typescript
import { useReportUser } from '../hooks/useReportUser';

function MyComponent() {
  const { reportUser, isLoading, error } = useReportUser();

  const handleReport = async () => {
    const result = await reportUser({
      reportedUserId: 'user-id-here',
      reportType: 'inappropriate_username',
      description: 'Username contains offensive language',
      reportedContent: 'OffensiveUsername#1234'
    });

    if (result.success) {
      console.log('Report submitted successfully');
    } else {
      console.error('Report failed:', result.error);
    }
  };

  return (
    <button onClick={handleReport} disabled={isLoading}>
      Report User
    </button>
  );
}
```

### Reporting a User (Standalone Function)

```typescript
import { reportUser } from '../hooks/useReportUser';

const result = await reportUser({
  reportedUserId: 'user-id-here',
  reportType: 'harassment',
  description: 'User sent harassing messages'
});
```

## Database Setup

### Step 1: Run Migrations

Run these SQL migrations in your Supabase SQL editor:

1. `supabase_migrations/add_eula_accepted_column.sql`
2. `supabase_migrations/create_user_reports_table.sql`

### Step 2: Verify RLS Policies

The `user_reports` table has RLS enabled with these policies:
- Users can create reports (INSERT)
- Users can view their own reports (SELECT)
- Service role can view all reports (for moderation)

**Note**: To view all reports for moderation, use the Supabase service role key (not the anon key).

## Testing Checklist

- [ ] New users see EULA modal on first login
- [ ] EULA modal cannot be dismissed without accepting
- [ ] User must scroll to bottom before "I Agree" button is enabled
- [ ] After accepting, `eula_accepted` is set to `true` in database
- [ ] EULA modal does not show again after acceptance
- [ ] Guest users do not see EULA modal
- [ ] Reporting function works correctly
- [ ] Reports are saved to `user_reports` table
- [ ] Self-reporting is prevented

## App Store/Google Play Submission

When submitting to app stores, you can reference:

1. **EULA**: `EULA.md` file
2. **Reporting mechanism**: `hooks/useReportUser.ts` and `user_reports` table
3. **Blocking mechanism**: (Implement user blocking in your app if not already present)
4. **Content moderation**: Your process for reviewing reports

## Next Steps

1. **Run the SQL migrations** in Supabase
2. **Test the EULA flow** with a new user account
3. **Implement UI for reporting** in your user profile or game components
4. **Set up moderation workflow** to review reports (consider using Supabase dashboard or building an admin panel)
5. **Update EULA.md** with your actual contact information and jurisdiction

## Notes

- The EULA modal only shows for authenticated users (not guests)
- Existing users will see the modal on their next login if `eula_accepted` is `false`
- You may want to add a "View EULA" option in settings for users who want to re-read it
- Consider adding user blocking functionality if not already implemented
