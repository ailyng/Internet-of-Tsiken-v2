# Firebase Multi-Factor Authentication (MFA) SMS Setup

## 🚨 CRITICAL: Enable Phone Authentication in Firebase Console

### Step 1: Enable Phone Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/project/internet-of-tsiken-690dd/authentication/providers)
2. Click **"Authentication"** → **"Sign-in method"** tab
3. Find **"Phone"** in the list
4. Click **"Enable"**
5. Save changes

### Step 2: Add Your App's SHA Certificate (Android)

1. In Firebase Console → **"Project Settings"** → **"Your apps"**
2. Select your Android app
3. Add SHA certificate fingerprints:
   - Development SHA1 (for debug builds)
   - Production SHA1 (for release builds)

### Step 3: Test with Real Phone Number

1. Run your app: `npx expo start`
2. Login with email/password first
3. Navigate to Verify Identity screen
4. Enter your Philippines phone number (without +63, just 10 digits)
5. Click "Send OTP"
6. **You should receive a REAL SMS** on your phone! 📱

## How It Works

### Authentication Flow:

1. **User logs in** with email + password (already authenticated)
2. **MFA enrollment**: Phone number is enrolled as second factor
3. **SMS sent** via Firebase's built-in SMS provider
4. **OTP verification** confirms phone ownership
5. **Multi-factor enabled** for future logins

### Real SMS Features:

- ✅ **Real SMS delivery** through Firebase infrastructure
- ✅ **Global coverage** - works in Philippines and worldwide
- ✅ **Automatic rate limiting** and fraud protection
- ✅ **Production-ready** SMS gateway
- ✅ **No additional setup** required once Phone Auth is enabled

## Troubleshooting

### If SMS doesn't arrive:

1. **Check phone number format**: Should be +639175246023 (with country code)
2. **Verify Firebase Console**: Phone auth must be enabled
3. **Check Firebase quotas**: Free tier has SMS limits
4. **Test with different number**: Some carriers may block verification SMS

### Common Error Codes:

- `auth/quota-exceeded`: SMS quota reached, try tomorrow
- `auth/too-many-requests`: Too many attempts, wait before retrying
- `auth/invalid-phone-number`: Check phone number format
- `auth/captcha-check-failed`: reCAPTCHA issue, retry

### Firebase SMS Quotas:

- **Free Spark Plan**: Limited SMS per day
- **Paid Blaze Plan**: Higher limits, pay-per-use
- **Production apps**: Upgrade to Blaze for unlimited SMS

## Next Steps After Setup:

1. Enable Phone Auth in Firebase Console (REQUIRED)
2. Test with your real phone number
3. For production: Upgrade to Blaze plan for higher SMS limits
4. Consider implementing MFA requirement for sensitive operations

---

**📱 Once Phone Auth is enabled, your app will send REAL SMS messages!**
