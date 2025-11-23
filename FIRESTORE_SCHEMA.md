# Firestore Database Schema

This document outlines the complete Firestore database schema required for the Internet of Tsiken application with the enhanced login + OTP flow.

## Collections Overview

### 1. `users` Collection

Main user data collection storing user account information, verification status, and security data.

```json
{
  "users": {
    "uid123": {
      // Basic User Information
      "email": "user@example.com",
      "displayName": "John Doe",
      "createdAt": "2024-11-23T10:00:00.000Z",
      "updatedAt": "2024-11-23T15:30:00.000Z",

      // Mobile/Phone Information
      "mobile": "+639123456789",
      "phone": "+639123456789", // Alternative field name for compatibility
      "phoneVerified": true,
      "lastMobileVerified": "2024-11-23T15:25:00.000Z",

      // OTP Verification Status
      "otpVerified": true,
      "lastOTPVerified": "2024-11-23T15:25:00.000Z",

      // General Verification Status
      "verified": true,
      "lastVerified": "2024-11-23T15:25:00.000Z",

      // Security & Lockout Management
      "failedLoginAttempts": 0,
      "failedOtpAttempts": 0,
      "mobileVerificationAttempts": 0,
      "deviceLockUntil": null, // Timestamp when device unlock expires, or null
      "lastLoginAttempt": "2024-11-23T15:20:00.000Z",
      "lastFailedLogin": null,

      // Password Management (existing)
      "mustShowPasswordUpdated": false,

      // Additional Security Fields
      "ipAddress": "192.168.1.100", // Last known IP
      "userAgent": "Mozilla/5.0...", // Last known user agent
      "loginHistory": [], // Array of recent login timestamps

      // Account Status
      "accountStatus": "active", // active, suspended, locked
      "accountType": "standard" // standard, premium, admin
    }
  }
}
```

### 2. `otps` Collection

Temporary collection for storing OTP codes with expiration and attempt tracking.

```json
{
  "otps": {
    "+639123456789": {
      "otp": "123456",
      "phone": "+639123456789",
      "createdAt": "2024-11-23T15:20:00.000Z",
      "expiresAt": "2024-11-23T15:25:00.000Z", // 5 minutes from creation
      "verified": false,
      "attempts": 0,
      "maxAttempts": 5,
      "lastAttemptAt": null,

      // Security tracking
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "requestId": "1732368000000", // Unique request identifier

      // Auto-cleanup (documents expire automatically)
      "ttl": "2024-11-23T15:25:00.000Z" // TTL for automatic deletion
    }
  }
}
```

### 3. `verification_logs` Collection

Audit trail for all verification attempts (both successful and failed).

```json
{
  "verification_logs": {
    "log123": {
      "phone": "+639123456789",
      "timestamp": "2024-11-23T15:25:00.000Z",
      "success": true,
      "method": "Local Storage", // "Twilio Verify", "Local Storage"
      "error": null, // Error message if failed
      "attempts": 2, // Number of attempts made
      "requestId": "1732368000000",
      "verificationDuration": 45000, // Time taken in milliseconds

      // Additional context
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "userId": "uid123" // If known
    }
  }
}
```

### 4. `sms_logs` Collection

Logs for SMS sending attempts and failures for debugging and monitoring.

```json
{
  "sms_logs": {
    "sms123": {
      "phone": "+639123456789",
      "timestamp": "2024-11-23T15:20:00.000Z",
      "success": true,
      "provider": "Twilio Verify", // "Twilio Verify", "Twilio Messages", "TextBelt"
      "messageId": "SM1234567890abcdef", // Provider's message ID
      "error": null, // Error message if failed
      "otp": "123456", // For debugging - remove in production

      // Cost tracking (optional)
      "cost": 0.0075, // USD
      "currency": "USD"
    }
  }
}
```

### 5. `security_events` Collection (Optional - for enhanced security)

Track security-related events across the application.

```json
{
  "security_events": {
    "event123": {
      "userId": "uid123",
      "eventType": "login_attempt", // login_attempt, otp_attempt, device_lockout, password_reset
      "timestamp": "2024-11-23T15:20:00.000Z",
      "success": true,
      "details": {
        "ip": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "phone": "+639123456789",
        "attempts": 1,
        "lockoutDuration": null
      },
      "riskScore": 0.1, // 0.0 (low) to 1.0 (high)
      "location": {
        "country": "Philippines",
        "city": "Manila",
        "coordinates": [14.5995, 120.9842]
      }
    }
  }
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // OTP collection - only callable functions can write
    match /otps/{document} {
      allow read, write: if false; // Only accessible via Cloud Functions
    }

    // Verification logs - read-only for authenticated users, write via functions
    match /verification_logs/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Only accessible via Cloud Functions
    }

    // SMS logs - admin only
    match /sms_logs/{document} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.accountType == 'admin';
    }

    // Security events - admin only
    match /security_events/{document} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.accountType == 'admin';
    }
  }
}
```

## Collection Indexes

For optimal performance, create these composite indexes:

### `users` Collection Indexes

```
- email (ascending)
- mobile (ascending)
- phoneVerified (ascending)
- accountStatus (ascending)
- createdAt (descending)
```

### `verification_logs` Collection Indexes

```
- phone (ascending), timestamp (descending)
- success (ascending), timestamp (descending)
- method (ascending), timestamp (descending)
```

### `otps` Collection Indexes

```
- phone (ascending), createdAt (descending)
- expiresAt (ascending) // For TTL cleanup
```

## Environment-Specific Configurations

### Development Environment

- OTP expiry: 5 minutes
- Device lockout duration: 1 minute
- Max login attempts: 5
- Max OTP attempts: 5
- SMS provider: Development mode (shows OTP in logs)

### Production Environment

- OTP expiry: 5 minutes
- Device lockout duration: 1 hour
- Max login attempts: 5
- Max OTP attempts: 5
- SMS provider: Twilio Verify (real SMS)

## Data Lifecycle Management

### Automatic Cleanup

1. **OTP Documents**: Auto-expire after 5 minutes using Firestore TTL
2. **Verification Logs**: Keep for 90 days, then archive
3. **SMS Logs**: Keep for 30 days for cost tracking
4. **Security Events**: Keep for 1 year for compliance

### Manual Cleanup (Cloud Function - scheduled)

```javascript
// Daily cleanup function
exports.dailyCleanup = functions.pubsub
  .schedule("0 2 * * *") // Run at 2 AM daily
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Clean up old SMS logs
    const smsQuery = db
      .collection("sms_logs")
      .where("timestamp", "<", thirtyDaysAgo);

    // Batch delete old records
    const batch = db.batch();
    const smsSnapshot = await smsQuery.get();

    smsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${smsSnapshot.size} old SMS logs`);
  });
```

## Field Descriptions

### User Document Fields

| Field                 | Type      | Required | Description                                      |
| --------------------- | --------- | -------- | ------------------------------------------------ |
| `email`               | string    | Yes      | User's email address                             |
| `mobile`              | string    | Yes      | User's mobile number with country code (+63...)  |
| `phoneVerified`       | boolean   | Yes      | Whether mobile number is verified                |
| `otpVerified`         | boolean   | Yes      | Whether latest OTP verification was successful   |
| `verified`            | boolean   | Yes      | Overall verification status                      |
| `failedLoginAttempts` | number    | Yes      | Counter for failed login attempts                |
| `failedOtpAttempts`   | number    | Yes      | Counter for failed OTP attempts                  |
| `deviceLockUntil`     | timestamp | No       | When device lockout expires (null if not locked) |
| `lastVerified`        | timestamp | No       | Last successful verification timestamp           |
| `accountStatus`       | string    | Yes      | Account status: active, suspended, locked        |

### OTP Document Fields

| Field         | Type      | Required | Description                                     |
| ------------- | --------- | -------- | ----------------------------------------------- |
| `otp`         | string    | Yes      | 6-digit verification code                       |
| `phone`       | string    | Yes      | Mobile number this OTP was sent to              |
| `expiresAt`   | timestamp | Yes      | When this OTP expires (5 minutes from creation) |
| `attempts`    | number    | Yes      | Number of verification attempts made            |
| `maxAttempts` | number    | Yes      | Maximum attempts allowed (5)                    |
| `verified`    | boolean   | Yes      | Whether this OTP has been successfully verified |

This schema supports the complete login + OTP flow with comprehensive security features, audit trails, and proper data lifecycle management.
