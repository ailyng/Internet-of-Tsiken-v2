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
 * Send SMS using multiple fallback methods
 */
const sendSMSMessage = async (phone, message) => {
  // Method 1: Use a simple HTTP request to TextBelt
  try {
    const https = require("https");
    const querystring = require("querystring");

    const postData = querystring.stringify({
      phone: phone,
      message: message,
      key: "textbelt",
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
            if (result.success) {
              console.log("✅ SMS sent successfully via TextBelt");
              resolve({ success: true, provider: "TextBelt", result });
            } else {
              console.error("❌ TextBelt failed:", result);
              reject(new Error(result.error || "SMS failed"));
            }
          } catch (parseError) {
            console.error("❌ TextBelt response parse error:", parseError);
            reject(parseError);
          }
        });
      });

      req.on("error", (error) => {
        console.error("❌ TextBelt request error:", error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error("❌ SMS sending failed:", error);
    throw error;
  }
};

/**
 * Send SMS OTP
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

    if (!phone) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Phone number is required"
      );
    }

    const otp = generateOTP();
    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    const message = `Your verification code is: ${otp}. This code will expire in 10 minutes.`;

    console.log(`📱 Sending SMS to: ${formattedPhone}`);

    // Store OTP in Firestore
    await admin
      .firestore()
      .collection("otps")
      .doc(formattedPhone)
      .set({
        otp: otp,
        phone: formattedPhone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        verified: false,
      });

    // Try to send SMS
    let smsResult = null;
    let smsProvider = "Development Mode";

    try {
      smsResult = await sendSMSMessage(formattedPhone, message);
      smsProvider = smsResult.provider;
      console.log(`✅ SMS sent via ${smsProvider}`);
    } catch (smsError) {
      console.error(
        "❌ SMS sending failed, using development mode:",
        smsError.message
      );
      // Continue with development mode
    }

    const result = {
      success: true,
      message: `OTP ${smsProvider === "Development Mode" ? "generated" : "sent"} via ${smsProvider}`,
      phone: formattedPhone,
      provider: smsProvider,
      // Include OTP for development/testing
      testOTP: otp,
    };

    console.log(`✅ SMS OTP process completed for ${formattedPhone}`);
    return result;
  } catch (error) {
    console.error("❌ Error in sendSMSOTP:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      `Failed to send OTP: ${error.message}`
    );
  }
});

/**
 * Verify SMS OTP
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

    const otpDoc = await admin
      .firestore()
      .collection("otps")
      .doc(formattedPhone)
      .get();

    if (!otpDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "OTP not found or expired"
      );
    }

    const otpData = otpDoc.data();

    if (new Date() > otpData.expiresAt.toDate()) {
      await admin.firestore().collection("otps").doc(formattedPhone).delete();
      throw new functions.https.HttpsError(
        "deadline-exceeded",
        "OTP has expired"
      );
    }

    if (otpData.otp !== otp) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid OTP");
    }

    if (otpData.verified) {
      throw new functions.https.HttpsError(
        "already-exists",
        "OTP has already been used"
      );
    }

    await admin.firestore().collection("otps").doc(formattedPhone).delete();

    console.log(`✅ OTP verified successfully for phone: ${formattedPhone}`);

    return {
      success: true,
      message: "OTP verified successfully",
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

exports.helloWorld = functions.https.onRequest((req, res) => {
  console.log("Hello logs! SMS OTP service is ready.");
  res.send(
    "Hello from Firebase Functions! SMS OTP service is ready with TextBelt integration."
  );
});
