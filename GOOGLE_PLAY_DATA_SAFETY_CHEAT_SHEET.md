# Google Play Console - Data Safety Form Cheat Sheet
## For playthirteen.app

**Last Updated:** January 2026

This document provides exact answers for the Google Play Console Data Safety form based on the app's current functionality.

---

## 1. DATA COLLECTED

### ✅ Personal Information Collected

#### Email Address
- **Collected?** YES
- **Purpose:** Account creation and authentication (via Google OAuth)
- **Optional?** NO (required for account creation)
- **Encrypted in transit?** YES
- **Collected from:** Users who sign in with Google OAuth

#### Name
- **Collected?** YES
- **Purpose:** Account creation and personalization (via Google OAuth)
- **Optional?** NO (required for account creation)
- **Encrypted in transit?** YES
- **Collected from:** Users who sign in with Google OAuth

#### User IDs
- **Collected?** YES
- **Purpose:** Account identification, authentication, game services
- **Optional?** NO
- **Encrypted in transit?** YES
- **Note:** Includes unique user identifiers and authentication tokens

---

### ✅ App Activity / In-App Data Collected

#### App Interactions / Game Statistics
- **Collected?** YES
- **Purpose:** Game functionality, progress tracking, achievements
- **Optional?** NO (necessary for game functionality)
- **Encrypted in transit?** YES
- **Examples:**
  - Wins/losses
  - Games played
  - Experience points (XP)
  - Level/rank
  - In-game currency balances (Gems, Coins)
  - Virtual items owned (avatars, sleeves, boards, finishers, emotes)
  - Gameplay preferences and settings
  - Friends list and social connections
  - Achievement data

#### Other User-Generated Content
- **Collected?** YES
- **Purpose:** Game functionality, social features
- **Optional?** YES (users can choose to create content)
- **Encrypted in transit?** YES
- **Examples:**
  - Usernames
  - Custom game room names
  - Quick chat presets
  - Profile customizations

---

### ✅ Device or Other IDs Collected

#### Device IDs / Advertising IDs
- **Collected?** YES
- **Purpose:** 
  - Fraud prevention and security
  - Analytics
  - Advertising (by Google AdMob)
- **Optional?** NO (automatic collection)
- **Encrypted in transit?** YES
- **Collected by:** 
  - Our app directly (for fraud prevention and analytics)
  - Google AdMob (for advertising and analytics)
- **Note:** Includes Android Advertising ID (AAID) and Device IDs

---

## 2. DATA SHARED WITH THIRD PARTIES

### ✅ Third-Party Services

#### Supabase
- **Data Shared:** Email addresses, Names, User IDs, App Activity (game statistics, preferences, virtual items)
- **Purpose:** User authentication, data storage, database services
- **Data Security Practices:** Encrypted in transit and at rest
- **Privacy Policy:** https://supabase.com/privacy

#### Google AdMob
- **Data Shared:** Device IDs, Advertising IDs, App Activity (ad interactions), general location data (country/region level)
- **Purpose:** Personalized and non-personalized advertising, fraud prevention, analytics
- **Data Security Practices:** Encrypted in transit
- **Privacy Policy:** https://policies.google.com/privacy
- **Note:** AdMob may collect Device IDs and Advertising IDs for ad delivery and analytics

---

## 3. DATA SECURITY

- **Data Encryption:** YES (in transit via HTTPS/TLS)
- **Users can request data deletion:** YES
- **Deletion request contact:** support@playthirteen.app
- **Account deletion process:** Users can contact support to request account and data deletion

---

## 4. DATA RETENTION

- **Account Data:** Retained for as long as the account is active or as needed to provide services
- **Legal Retention:** Certain information may be retained longer as required by law or for legitimate business purposes
- **User-Initiated Deletion:** Users can request account deletion at any time via support@playthirteen.app

---

## 5. QUICK REFERENCE CHECKLIST

### Data Types to Check in Google Play Console:

- ✅ **Email address** (Required, Account creation via Google OAuth)
- ✅ **Name** (Required, Account creation via Google OAuth)
- ✅ **User IDs** (Required, Authentication and identification)
- ✅ **App activity / In-app information** (Required, Game statistics, progress, virtual items)
- ✅ **Device or other IDs** (Required, Device IDs and Advertising IDs for fraud prevention and advertising)

### Third-Party Services to Declare:

- ✅ **Supabase** (Authentication, data storage, database)
- ✅ **Google AdMob** (Advertising - personalized and non-personalized)

### Data Sharing:

- ✅ **Email addresses** → Shared with Supabase
- ✅ **Names** → Shared with Supabase
- ✅ **User IDs** → Shared with Supabase
- ✅ **App Activity** → Shared with Supabase and Google AdMob (ad interactions only)
- ✅ **Device IDs / Advertising IDs** → Shared with Google AdMob

---

## 6. ADDITIONAL NOTES FOR GOOGLE PLAY CONSOLE

### Children's Privacy
- **Target Audience:** 13+ (not intended for children under 13)
- **COPPA Compliance:** Does not knowingly collect data from children under 13

### Location Data
- **Precise Location:** NO (not collected)
- **Approximate Location:** YES (general location at country/region level by AdMob for advertising)

### Sensitive Data
- **Financial information?** NO (only virtual in-game currency, not real money transactions processed by app)
- **Health information?** NO
- **Precise location?** NO
- **Other sensitive data?** NO

---

## 7. COMPLIANCE INFORMATION

### GDPR (European Users)
- Consent mechanism required for EU users via User Messaging Platform (UMP) - see `utils/AdsManager.js`
- Users have right to access, rectify, erase, restrict processing, data portability, and object to processing
- Contact: support@playthirteen.app

### CCPA (California Users)
- Does not sell personal information
- Users have right to know, delete, and opt-out
- Contact: support@playthirteen.app

---

**Remember:** Always review Google Play Console's Data Safety form carefully and ensure all information accurately reflects your app's current data collection and sharing practices. This cheat sheet is based on the app's functionality as of January 2026.
