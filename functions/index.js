const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize admin with proper error handling
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send SMS using Twilio Verify Service
 * This function uses Twilio Verify to send real OTP SMS
 */
const sendTwilioVerifySMS = async (phone) => {
  console.log(`📱 Using Twilio Verify SMS for: ${phone}`);

  try {
    // Initialize Twilio client with your credentials
    const accountSid =
      process.env.TWILIO_ACCOUNT_SID || "ACcc5a4257b42b456747083860b3a61773";
    const authToken = process.env.TWILIO_AUTH_TOKEN; // From .env file
    const verifySid =
      process.env.TWILIO_VERIFY_SERVICE_SID ||
      "VAf81f3e93faa06bb33bd946e3a7fb1da5";

    // Only proceed if auth token is available
    if (!authToken) {
      throw new Error("Twilio Auth Token not configured");
    }

    const client = require("twilio")(accountSid, authToken);

    // Send verification SMS using Twilio Verify
    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    console.log(`✅ Twilio Verify SMS sent successfully: ${verification.sid}`);

    return {
      success: true,
      provider: "Twilio Verify",
      message: "Real SMS sent via Twilio Verify service",
      phone: phone,
      verificationSid: verification.sid,
      status: verification.status,
    };
  } catch (error) {
    console.error("❌ Twilio Verify SMS failed:", error);
    throw error;
  }
};

/**
 * Send SMS OTP using REAL Firebase Phone Authentication
 */
exports.sendSMSOTP = functions.https.onCall(async (data, context) => {
  console.log("🔄 sendSMSOTP called with data:", data);

  try {
    // Extract phone number from data
    const actualData = data.data || data;
    const phone =
      actualData.phone ||
      actualData.phoneNumber ||
      data.phone ||
      data.phoneNumber;

    const useRealSMS = actualData.useRealSMS || data.useRealSMS || false;

    if (!phone) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Phone number is required"
      );
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ""))) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid phone number format"
      );
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    console.log(
      `📱 Processing SMS for: ${formattedPhone}, useRealSMS: ${useRealSMS}`
    );

    if (useRealSMS) {
      // Use REAL Twilio Verify SMS Service
      console.log("📬 Attempting REAL SMS via Twilio Verify");

      try {
        // Send real SMS using Twilio Verify
        const twilioResult = await sendTwilioVerifySMS(formattedPhone);

        // Store verification details in Firestore for tracking
        await admin
          .firestore()
          .collection("twilio_verifications")
          .doc(formattedPhone)
          .set({
            phone: formattedPhone,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes (Twilio default)
            status: "pending",
            method: "twilio_verify",
            verificationSid: twilioResult.verificationSid,
            requestId: Date.now().toString(),
          });

        console.log(`✅ Real SMS sent via Twilio Verify for ${formattedPhone}`);

        return {
          success: true,
          message: "REAL SMS sent via Twilio Verify service",
          phone: formattedPhone,
          provider: "Twilio Verify",
          realSMS: true,
          verificationSid: twilioResult.verificationSid,
          instructions:
            "Check your phone for the verification code from Twilio",
        };
      } catch (twilioError) {
        console.error("❌ Twilio Verify SMS failed:", twilioError);

        // Fall back to local OTP storage
        const otp = generateOTP();

        await admin
          .firestore()
          .collection("otps")
          .doc(formattedPhone)
          .set({
            otp: otp,
            phone: formattedPhone,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            verified: false,
            attempts: 0,
            maxAttempts: 5,
            method: "fallback_after_twilio_failed",
            twilioError: twilioError.message,
            requestId: Date.now().toString(),
          });

        return {
          success: true,
          message: "Twilio SMS failed, using fallback OTP",
          phone: formattedPhone,
          provider: "Fallback Mode",
          testOTP: otp,
          realSMS: false,
          error: "Twilio SMS service unavailable",
          instructions: `Twilio failed. Use test OTP: ${otp}`,
        };
      }
    } else {
      // Traditional local OTP storage (existing behavior)
      console.log(
        "🔄 Using local OTP verification (Firebase Phone Auth handles SMS)"
      );

      const otp = generateOTP();

      // Store OTP in Firestore with enhanced metadata
      await admin
        .firestore()
        .collection("otps")
        .doc(formattedPhone)
        .set({
          otp: otp,
          phone: formattedPhone,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes (matching UI timer)
          verified: false,
          attempts: 0,
          maxAttempts: 5, // Match device lockout limit
          method: "local_storage",
          ipAddress: context?.rawRequest?.ip || "unknown",
          userAgent: context?.rawRequest?.headers?.["user-agent"] || "unknown",
          requestId: Date.now().toString(),
        });

      console.log(`✅ Local OTP stored for ${formattedPhone}`);

      return {
        success: true,
        message:
          "OTP stored locally - client should handle Firebase Phone Auth",
        phone: formattedPhone,
        provider: "Local Storage",
        testOTP: otp,
        firebaseReady: true,
        realSMS: false,
        instructions:
          "Client should use Firebase signInWithPhoneNumber for real SMS",
      };
    }
  } catch (error) {
    console.error("❌ Error in sendSMSOTP:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      `Failed to process OTP request: ${error.message}`
    );
  }
});

/**
 * Verify SMS OTP with Twilio Verify and fallback to local storage
 */
exports.verifySMSOTP = functions.https.onCall(async (data, context) => {
  try {
    const actualData = data.data || data;
    const phone =
      actualData.phone ||
      actualData.phoneNumber ||
      data.phone ||
      data.phoneNumber;
    const otp = actualData.otp || data.otp;

    if (!phone || !otp) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Phone number and OTP are required"
      );
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    console.log(`🔄 Verifying OTP for phone: ${formattedPhone}, code: ${otp}`);

    // Check if we have a Twilio verification first
    const twilioDoc = await admin
      .firestore()
      .collection("twilio_verifications")
      .doc(formattedPhone)
      .get();

    if (twilioDoc.exists) {
      console.log("🔄 Using Twilio Verify verification");

      try {
        const twilioData = twilioDoc.data();
        const accountSid =
          process.env.TWILIO_ACCOUNT_SID ||
          "ACcc5a4257b42b456747083860b3a61773";
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const verifySid =
          process.env.TWILIO_VERIFY_SERVICE_SID ||
          "VAf81f3e93faa06bb33bd946e3a7fb1da5";

        if (!authToken) {
          throw new Error("Twilio Auth Token not configured");
        }

        const client = require("twilio")(accountSid, authToken);

        // Verify the code with Twilio Verify
        const verificationCheck = await client.verify.v2
          .services(verifySid)
          .verificationChecks.create({
            to: formattedPhone,
            code: otp,
          });

        if (verificationCheck.status === "approved") {
          // Mark as verified and clean up
          await admin
            .firestore()
            .collection("twilio_verifications")
            .doc(formattedPhone)
            .update({
              status: "verified",
              verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          // Log successful verification
          await admin.firestore().collection("verification_logs").add({
            phone: formattedPhone,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: true,
            method: "Twilio Verify",
            verificationSid: twilioData.verificationSid,
          });

          console.log(
            `✅ OTP verified successfully via Twilio Verify for ${formattedPhone}`
          );

          return {
            success: true,
            message: "Phone number verified successfully via Twilio Verify",
            phone: formattedPhone,
            method: "Twilio Verify",
          };
        } else {
          throw new Error(
            `Twilio verification failed: ${verificationCheck.status}`
          );
        }
      } catch (twilioError) {
        console.error("❌ Twilio Verify verification failed:", twilioError);

        // Log failed Twilio attempt
        await admin.firestore().collection("verification_logs").add({
          phone: formattedPhone,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          success: false,
          method: "Twilio Verify",
          error: twilioError.message,
        });

        // Fall through to local verification
      }
    }

    // Fallback to local OTP verification
    console.log("🔄 Using local OTP verification as fallback");

    try {
      const otpDocRef = admin
        .firestore()
        .collection("otps")
        .doc(formattedPhone);
      const otpDoc = await otpDocRef.get();

      if (!otpDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "OTP not found or expired"
        );
      }

      const otpData = otpDoc.data();

      // Check if OTP has expired
      if (new Date() > otpData.expiresAt.toDate()) {
        await otpDocRef.delete();

        // Log expired OTP attempt
        await admin
          .firestore()
          .collection("verification_logs")
          .add({
            phone: formattedPhone,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: false,
            method: "Local Storage",
            error: "OTP expired",
            requestId: otpData.requestId || "unknown",
          });

        throw new functions.https.HttpsError(
          "deadline-exceeded",
          "OTP has expired. Please request a new one."
        );
      }

      // Check if too many attempts
      if (otpData.attempts >= otpData.maxAttempts) {
        await otpDocRef.delete();

        // Log too many attempts
        await admin
          .firestore()
          .collection("verification_logs")
          .add({
            phone: formattedPhone,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: false,
            method: "Local Storage",
            error: "Too many attempts",
            attempts: otpData.attempts,
            requestId: otpData.requestId || "unknown",
          });

        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Too many verification attempts. Please request a new OTP."
        );
      }

      // Check if already verified
      if (otpData.verified) {
        await admin
          .firestore()
          .collection("verification_logs")
          .add({
            phone: formattedPhone,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: false,
            method: "Local Storage",
            error: "OTP already used",
            requestId: otpData.requestId || "unknown",
          });

        throw new functions.https.HttpsError(
          "already-exists",
          "OTP has already been used. Please request a new one."
        );
      }

      // Check if OTP matches
      if (otpData.otp !== otp) {
        // Increment attempt counter
        const newAttempts = (otpData.attempts || 0) + 1;
        await otpDocRef.update({
          attempts: newAttempts,
          lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Log failed attempt
        await admin
          .firestore()
          .collection("verification_logs")
          .add({
            phone: formattedPhone,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: false,
            method: "Local Storage",
            error: "Invalid OTP",
            attempts: newAttempts,
            requestId: otpData.requestId || "unknown",
          });

        const remainingAttempts = otpData.maxAttempts - newAttempts;
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid OTP code. ${remainingAttempts} attempts remaining.`
        );
      }

      // Success - mark as verified and then delete
      await otpDocRef.update({
        verified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log successful verification with metadata
      await admin
        .firestore()
        .collection("verification_logs")
        .add({
          phone: formattedPhone,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          success: true,
          method: "Local Storage",
          attempts: otpData.attempts || 0,
          requestId: otpData.requestId || "unknown",
          verificationDuration:
            Date.now() - (otpData.createdAt?.toMillis() || Date.now()),
        });

      // Delete the OTP after successful verification
      await otpDocRef.delete();

      console.log(
        `✅ OTP verified successfully via local storage for phone: ${formattedPhone}`
      );

      return {
        success: true,
        message: "Phone number verified successfully via local storage",
        phone: formattedPhone,
        method: "Local Storage",
      };
    } catch (innerError) {
      console.error("❌ Local OTP verification failed:", innerError);
      if (innerError instanceof functions.https.HttpsError) {
        throw innerError;
      }
      throw new functions.https.HttpsError("internal", "Failed to verify OTP");
    }
  } catch (error) {
    console.error("❌ Error in verifySMSOTP:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to verify OTP");
  }
});

/**
 * Update user verification status after successful OTP
 */
exports.updateUserVerification = functions.https.onCall(
  async (data, context) => {
    try {
      // Check if user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated to update verification status."
        );
      }

      const userId = context.auth.uid;
      const { phone, otpVerified } = data;

      if (!phone || otpVerified === undefined) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Phone number and verification status are required."
        );
      }

      const userRef = admin.firestore().collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "User document not found."
        );
      }

      // Update user document with verification info
      await userRef.update({
        phone: phone,
        phoneVerified: otpVerified,
        otpVerified: otpVerified,
        lastOTPVerified: admin.firestore.FieldValue.serverTimestamp(),
        verified: otpVerified,
        lastVerified: admin.firestore.FieldValue.serverTimestamp(),
        failedOtpAttempts: 0, // Reset failed attempts
        deviceLockUntil: null, // Clear any device locks
      });

      console.log(`✅ User ${userId} verification status updated`);

      return {
        success: true,
        message: "User verification status updated successfully",
        userId: userId,
        phone: phone,
        verified: otpVerified,
      };
    } catch (error) {
      console.error("❌ Error updating user verification:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to update user verification status"
      );
    }
  }
);

// Test endpoint
exports.helloWorld = functions.https.onRequest((req, res) => {
  console.log(
    "Hello logs! SMS OTP service is ready with enhanced error handling and user management."
  );
  res.send(
    "Hello from Firebase Functions! SMS OTP service is ready with TextBelt and Twilio support, plus user verification management."
  );
});
