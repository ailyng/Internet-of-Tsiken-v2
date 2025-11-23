# Firebase Phone Authentication Implementation

This implementation uses Firebase Phone Authentication for OTP verification instead of external SMS services like Twilio.

## Configuration

### 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Authentication > Sign-in method
4. Enable "Phone" authentication
5. Add your domain to authorized domains (for web testing)

### 2. Phone Number Format

- Ensure phone numbers are in international format (+63XXXXXXXXXX for Philippines)
- The system validates Philippine mobile numbers (09XXXXXXXXX becomes +639XXXXXXXXX)

## Implementation Details

### Cloud Functions (functions/index.js)

#### sendSMSOTP Function

```javascript
exports.sendSMSOTP = onCall(async (request) => {
  // Uses Firebase Admin SDK to prepare phone authentication
  // Fallback to development mode if Firebase Phone Auth is not available
  // Returns confirmation for client-side verification
});
```

#### verifySMSOTP Function

```javascript
exports.verifySMSOTP = onCall(async (request) => {
  // Verifies OTP codes
  // Integrates with Firebase Phone Authentication
  // Updates user verification status
});
```

### Client-Side Integration (screens/OTPVerification.js)

#### Firebase Phone Auth Flow

1. **Web Platform**: Uses `signInWithPhoneNumber` with RecaptchaVerifier
2. **Mobile Platform**: Uses cloud functions as intermediary
3. **Fallback**: Development mode with test OTP codes

#### Key Features

- Automatic platform detection (web vs mobile)
- RecaptchaVerifier integration for web
- Seamless fallback to test mode
- 5-minute OTP expiry timer
- Device lockout after 5 failed attempts

## Testing

### Development Mode

When Firebase Phone Auth is not available:

- Test OTP codes are generated (111111, 222222, etc.)
- Console logs show test codes for debugging
- No actual SMS is sent

### Production Mode

With Firebase Phone Auth enabled:

- Real SMS messages sent via Firebase
- No test codes exposed in production
- Full production security

## Error Handling

### Common Scenarios

1. **Invalid Phone Number**: Validation at client and server level
2. **SMS Delivery Failure**: Automatic fallback to test mode
3. **OTP Expiry**: 5-minute timer with resend capability
4. **Too Many Attempts**: Device lockout mechanism
5. **Network Issues**: Retry logic and user feedback

### Lockout System

- **Login Attempts**: Separate tracking from OTP attempts
- **OTP Attempts**: 5 attempts before lockout
- **Lockout Duration**: 1 minute (development) / 1 hour (production)
- **Automatic Reset**: After successful verification

## Security Features

### Rate Limiting

- Built-in Firebase rate limiting
- Custom device lockout implementation
- Separate attempt tracking for login vs OTP

### Data Protection

- Phone numbers encrypted in transit
- No sensitive data in client logs
- Test codes only in development

### Authentication Flow

1. User logs in with email/password
2. System checks if phone verification required
3. Phone number validated against Firestore user record
4. OTP sent via Firebase Phone Auth
5. User enters 6-digit code
6. Verification updates user document
7. User proceeds to main application

## Recent Updates (v2.0)

### Firebase Phone Auth Integration

- Replaced Twilio SMS with Firebase Phone Authentication
- Added automatic platform detection (web vs mobile)
- Implemented RecaptchaVerifier for web platforms
- Enhanced fallback mechanisms for development

### Improved Error Handling

- Better error messages for different failure scenarios
- Enhanced OTP validation with Firebase Auth integration
- Improved user feedback for authentication states

### Testing Enhancements

- Seamless development/production mode switching
- Better test OTP generation and logging
- Enhanced debugging capabilities

## Troubleshooting

### Common Issues

#### "Firebase Phone Auth not available"

- Check Firebase Console phone authentication is enabled
- Verify domain is in authorized domains list
- Ensure proper Firebase configuration

#### "Invalid phone number format"

- Phone numbers must be in international format
- Philippine numbers: +639XXXXXXXXX
- Use the provided validation functions

#### "OTP not received"

- Check SMS quota in Firebase Console
- Verify phone number is correct
- Test with development mode first

#### "Recaptcha issues" (Web)

- Ensure div with id="recaptcha-container" exists
- Check domain authorization in Firebase Console
- Test with mobile fallback

### Debug Mode

Enable detailed logging:

```javascript
console.log("Firebase Phone Auth Debug:", {
  platform: Platform.OS,
  phoneNumber: mobileNumber,
  firebaseReady: !!confirmationResult,
  authMethod: confirmationResult?.firebaseAuth ? "Firebase" : "Fallback",
});
```

## Deployment

### Prerequisites

- Firebase project with Phone Authentication enabled
- Firebase Functions deployed
- React Native app with Firebase SDK configured

### Deploy Functions

```bash
cd functions
firebase deploy --only functions
```

### Test End-to-End

1. Run the app (web or mobile)
2. Complete email/password login
3. Enter phone number for verification
4. Check console for test OTP (development)
5. Enter OTP code
6. Verify successful navigation to dashboard

## Migration from Twilio

If upgrading from a previous Twilio implementation:

1. **Remove Twilio Dependencies**: No longer needed
2. **Update Environment Variables**: Firebase config only
3. **Redeploy Functions**: Use the new Firebase Phone Auth functions
4. **Test Thoroughly**: Verify both web and mobile platforms work
5. **Update Documentation**: Reference this guide instead of Twilio docs

The new Firebase Phone Auth implementation is simpler, more reliable, and better integrated with the existing Firebase ecosystem.
