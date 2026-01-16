# Google Play Data Safety Form - Configuration Guide

**Last Updated:** January 06, 2026

This document provides guidance for completing the Google Play Console Data Safety form for the "Thirteen" mobile game.

## Data Collection & Sharing Summary

### Data Types Collected

#### 1. **Personal Identifiers**
- **Email Address**: Collected via Google OAuth for account creation and authentication
- **User ID**: Unique identifier for your account
- **Device ID**: Collected for fraud prevention and analytics
- **Advertising ID (AAID/IDFA)**: Collected by Google AdMob for personalized advertising
- **IP Address**: Collected for ad delivery, fraud prevention, and analytics

**Purpose**: Account management, authentication, fraud prevention, advertising
**Shared**: Yes (with Google AdMob and Supabase)
**Required**: Yes (for account creation and core functionality)

#### 2. **Personal Information**
- **Name**: Collected via Google OAuth for account personalization
- **Username**: User-selected display name

**Purpose**: Account personalization, user identification
**Shared**: Yes (with Supabase for storage)
**Required**: Yes (for account creation)

#### 3. **App Activity**
- **Game Statistics**: Wins, games played, experience points, level
- **In-Game Actions**: Gameplay preferences, settings, achievements
- **Ad Interaction Data**: Information about ads viewed or interacted with

**Purpose**: Game functionality, personalization, analytics, advertising
**Shared**: Yes (with Google AdMob for analytics)
**Required**: Yes (for core game functionality)

#### 4. **App Info and Performance**
- **Crash Reports**: Automatically collected for error tracking
- **Device Information**: Device type, operating system version
- **Performance Data**: App usage analytics

**Purpose**: App improvement, error fixing, analytics
**Shared**: Yes (with Google AdMob and Supabase)
**Required**: No (optional, but recommended for app quality)

#### 5. **Financial Information**
- **Purchase History**: In-app purchase records (via RevenueCat/Stripe)
- **Payment Information**: Handled by third-party payment processors (not stored by us)

**Purpose**: Transaction processing, fraud prevention
**Shared**: Yes (with RevenueCat and Stripe)
**Required**: Yes (for in-app purchases)

#### 6. **Other User-Generated Content**
- **Chat Messages**: In-game chat messages (if applicable)
- **User Reports**: Reports submitted by users about other players

**Purpose**: Game functionality, safety and moderation
**Shared**: No (stored only in Supabase)
**Required**: No (optional user-generated content)

### Data Sharing

#### Third-Party Services We Share Data With:

1. **Google AdMob**
   - **Data Shared**: Device IDs, Advertising IDs, IP addresses, app activity, ad interaction data
   - **Purpose**: Personalized advertising, fraud prevention, analytics
   - **Privacy Policy**: https://policies.google.com/privacy

2. **Supabase**
   - **Data Shared**: Email, name, username, game statistics, in-game currency, virtual items, social connections
   - **Purpose**: User authentication, data storage, database services
   - **Privacy Policy**: https://supabase.com/privacy

3. **RevenueCat** (if applicable)
   - **Data Shared**: Purchase history, user ID
   - **Purpose**: In-app purchase management
   - **Privacy Policy**: https://www.revenuecat.com/privacy

4. **Stripe** (if applicable)
   - **Data Shared**: Payment information (processed, not stored by us)
   - **Purpose**: Payment processing
   - **Privacy Policy**: https://stripe.com/privacy

### Data Security Practices

- **Encryption**: Data is encrypted in transit (HTTPS/TLS) and at rest
- **Authentication**: Secure authentication via Supabase and Google OAuth
- **Access Controls**: Row-level security policies in database
- **Data Minimization**: We only collect data necessary for app functionality

### Data Deletion

- **User-Initiated Deletion**: Users can delete their account and all associated data via the Settings menu within the app
- **Data Retention**: Data is retained only as long as the account is active, except where required by law
- **Deletion Process**: Account deletion removes profile, game stats, gems, and all associated data from our systems

### Children's Privacy

- **Age Restriction**: App is intended for users 13 years and older
- **COPPA Compliance**: We do not knowingly collect data from children under 13
- **Parental Rights**: Parents can request deletion of their child's data by contacting support@playthirteen.app

## Form Completion Checklist

When filling out the Google Play Data Safety form, ensure you:

- [ ] Select all data types listed above that your app collects
- [ ] Mark data types as "Shared" where applicable (AdMob, Supabase, etc.)
- [ ] Specify the purposes for data collection (advertising, app functionality, analytics, etc.)
- [ ] Include links to your Privacy Policy and third-party privacy policies
- [ ] Specify that data can be deleted by users via in-app settings
- [ ] Indicate age restriction (13+)
- [ ] Mark advertising ID collection for personalized ads
- [ ] Include Google API Services Limited Use disclosure in Privacy Policy (already added)

## Key Phrases for Form Fields

**Data Collection Purpose**: 
- "App functionality, authentication, personalization, advertising, analytics, fraud prevention"

**Data Sharing Purpose**:
- "Advertising (Google AdMob), data storage (Supabase), payment processing (RevenueCat/Stripe)"

**Data Deletion**:
- "Users can delete their account and all associated data via the Settings menu within the app"

**Children's Privacy**:
- "App is intended for users 13 years and older. We do not knowingly collect data from children under 13."

## Important Notes

1. **Advertising IDs**: Make sure to clearly indicate that Advertising IDs (AAID/IDFA) are collected for personalized advertising via Google AdMob.

2. **Google OAuth**: When listing email/name collection, note that this is via Google OAuth and link to Google API Services User Data Policy.

3. **Account Deletion**: Emphasize that account deletion is available in-app (not just via email request).

4. **Data Retention**: Be clear that data is deleted upon account deletion, except where legally required.

5. **Third-Party Links**: Include links to all third-party privacy policies (Google, Supabase, RevenueCat, Stripe).

---

**Contact**: For questions about data practices, contact support@playthirteen.app
