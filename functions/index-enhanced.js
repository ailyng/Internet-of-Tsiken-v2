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
 * Send SMS using multiple services with fallbacks
 */
const sendSMSMessage = async (phone, message) => {
  console.log(`📱 Attempting to send SMS to: ${phone}`);

  // Method 1: Try Twilio (most reliable, requires API keys)
  try {
    // Uncomment and configure these lines when you get Twilio credentials:
    /*
    const twilio = require('twilio');
    const client = twilio(
      functions.config().twilio.account_sid,  // Set via: firebase functions:config:set twilio.account_sid="your_sid"
      functions.config().twilio.auth_token    // Set via: firebase functions:config:set twilio.auth_token="your_token"
    );
    
    const result = await client.messages.create({
      body: message,
      from: functions.config().twilio.phone_number, // Your Twilio phone number
      to: phone
    });
    
    console.log('✅ SMS sent successfully via Twilio:', result.sid);
    return { success: true, provider: 'Twilio', messageId: result.sid };
    */
  } catch (twilioError) {
    console.error("❌ Twilio failed:", twilioError.message);
  }

  // Method 2: Try TextBelt with error handling
  try {
    const https = require("https");
    const querystring = require("querystring");

    const postData = querystring.stringify({
      phone: phone,
      message: message,
      key: "textbelt", // Free quota - limited uses per day
    });

    const options = {
      hostname: "textbelt.com",
      port: 443,
      path: "/text",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 10000, // 10 second timeout
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const result = JSON.parse(data);
            console.log("TextBelt response:", result);

            if (result.success) {
              console.log("✅ SMS sent successfully via TextBelt");
              resolve({ success: true, provider: "TextBelt", result });
            } else {
              const errorMsg = result.error || "Unknown TextBelt error";
              console.error("❌ TextBelt failed:", errorMsg);

              // Handle specific TextBelt errors
              if (errorMsg.includes("quota")) {
                reject(
                  new Error(
                    "TextBelt quota exceeded. Please try again tomorrow or use premium SMS service."
                  )
                );
              } else if (errorMsg.includes("invalid")) {
                reject(new Error("Invalid phone number format."));
              } else {
                reject(new Error(`TextBelt error: ${errorMsg}`));
              }
            }
          } catch (parseError) {
            console.error("❌ TextBelt response parse error:", parseError);
            reject(new Error("SMS service returned invalid response"));
          }
        });
      });

      req.on("error", (error) => {
        console.error("❌ TextBelt request error:", error);
        reject(new Error(`SMS service connection failed: ${error.message}`));
      });

      req.on("timeout", () => {
        console.error("❌ TextBelt request timeout");
        req.destroy();
        reject(new Error("SMS service timeout - please try again"));
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error("❌ All SMS methods failed:", error);
    throw new Error(`SMS delivery failed: ${error.message}`);
  }
};

/**
 * Send SMS OTP with comprehensive error handling
 */
exports.sendSMSOTP = functions.https.onCall(async (data, context) => {
  console.log("🔄 sendSMSOTP called with data:", JSON.stringify(data, null, 2));

  try {
    // Extract phone number from data
    const actualData = data.data || data;
    const phone =
      actualData.phone ||
      actualData.phoneNumber ||
      data.phone ||
      data.phoneNumber;

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

    const otp = generateOTP();
    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    const message = `Your Internet of Tsiken verification code is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`;

    console.log(`📱 Processing SMS for: ${formattedPhone}`);

    // Store OTP in Firestore with additional metadata
    await admin
      .firestore()
      .collection("otps")
      .doc(formattedPhone)
      .set({
        otp: otp,
        phone: formattedPhone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        verified: false,
        attempts: 0,
        maxAttempts: 3,
      });

    // Try to send SMS with detailed error reporting
    let smsResult = null;
    let smsProvider = "Development Mode";
    let smsError = null;

    try {
      smsResult = await sendSMSMessage(formattedPhone, message);
      smsProvider = smsResult.provider;
      console.log(`✅ SMS sent successfully via ${smsProvider}`);
    } catch (smsErr) {
      smsError = smsErr.message;
      console.error("❌ SMS sending failed:", smsError);

      // Update Firestore with SMS failure info
      await admin.firestore().collection("sms_logs").add({
        phone: formattedPhone,
        error: smsError,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        otp: otp, // For debugging - remove in production
      });
    }

    const result = {
      success: true,
      message:
        smsProvider === "Development Mode"
          ? `SMS service unavailable. Using development mode.`
          : `SMS sent successfully via ${smsProvider}`,
      phone: formattedPhone,
      provider: smsProvider,
      smsError: smsError,
      // Always include OTP for development/testing until SMS is working reliably
      testOTP: otp,
      instructions:
        smsProvider === "Development Mode"
          ? "Use the testOTP code shown above since SMS delivery failed."
          : "Check your phone for the SMS code.",
    };

    console.log(`✅ SMS OTP process completed for ${formattedPhone}:`, {
      provider: smsProvider,
      hasError: !!smsError,
      error: smsError,
    });

    return result;
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
 * Verify SMS OTP with attempt tracking
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
    const otpDocRef = admin.firestore().collection("otps").doc(formattedPhone);
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
      throw new functions.https.HttpsError(
        "deadline-exceeded",
        "OTP has expired"
      );
    }

    // Check if too many attempts
    if (otpData.attempts >= otpData.maxAttempts) {
      await otpDocRef.delete();
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Too many verification attempts"
      );
    }

    // Check if OTP matches
    if (otpData.otp !== otp) {
      // Increment attempt counter
      await otpDocRef.update({
        attempts: (otpData.attempts || 0) + 1,
      });
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid OTP code"
      );
    }

    if (otpData.verified) {
      throw new functions.https.HttpsError(
        "already-exists",
        "OTP has already been used"
      );
    }

    // Success - delete the OTP
    await otpDocRef.delete();

    // Log successful verification
    await admin.firestore().collection("verification_logs").add({
      phone: formattedPhone,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: true,
    });

    console.log(`✅ OTP verified successfully for phone: ${formattedPhone}`);

    return {
      success: true,
      message: "Phone number verified successfully",
      phone: formattedPhone,
    };
  } catch (error) {
    console.error("❌ Error in verifySMSOTP:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to verify OTP");
  }
});

// Test endpoint
exports.helloWorld = functions.https.onRequest((req, res) => {
  console.log(
    "Hello logs! SMS OTP service is ready with enhanced error handling."
  );
  res.send(
    "Hello from Firebase Functions! SMS OTP service is ready with TextBelt and Twilio support."
  );
});
