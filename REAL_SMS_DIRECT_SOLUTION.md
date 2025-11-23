# Real SMS Solution - Direct Implementation

Since Firebase Phone Auth is not working reliably in your Expo setup, here's a direct SMS solution that will definitely send real SMS messages.

## Option 1: Twilio SMS (Most Reliable)

### Setup Twilio Account

1. Go to [Twilio Console](https://console.twilio.com)
2. Create account and get:
   - Account SID
   - Auth Token
   - Phone Number

### Add to Firebase Functions

```javascript
const twilio = require("twilio");

const client = twilio(
  functions.config().twilio.account_sid,
  functions.config().twilio.auth_token
);

exports.sendRealSMS = functions.https.onCall(async (data, context) => {
  const { phone } = data;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Send real SMS via Twilio
    const message = await client.messages.create({
      body: `Your Internet of Tsiken verification code is: ${otp}. Valid for 5 minutes.`,
      from: functions.config().twilio.phone_number,
      to: phone,
    });

    // Store OTP in Firestore
    await admin
      .firestore()
      .collection("otps")
      .doc(phone)
      .set({
        otp: otp,
        phone: phone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verified: false,
        messageSid: message.sid,
      });

    return {
      success: true,
      message: "Real SMS sent via Twilio",
      phone: phone,
    };
  } catch (error) {
    console.error("Twilio SMS Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to send SMS");
  }
});
```

## Option 2: TextBelt SMS (Simple)

### Implement TextBelt in Firebase Functions

```javascript
const axios = require("axios");

exports.sendTextBeltSMS = functions.https.onCall(async (data, context) => {
  const { phone } = data;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Send SMS via TextBelt
    const response = await axios.post("https://textbelt.com/text", {
      phone: phone,
      message: `Your Internet of Tsiken verification code is: ${otp}. Valid for 5 minutes.`,
      key: "textbelt", // Use 'textbelt' for 1 free SMS per day, or buy API key
    });

    if (response.data.success) {
      // Store OTP in Firestore
      await admin
        .firestore()
        .collection("otps")
        .doc(phone)
        .set({
          otp: otp,
          phone: phone,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: false,
          textbeltId: response.data.textId,
        });

      return {
        success: true,
        message: "Real SMS sent via TextBelt",
        phone: phone,
      };
    } else {
      throw new Error("TextBelt SMS failed: " + response.data.error);
    }
  } catch (error) {
    console.error("TextBelt SMS Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to send SMS");
  }
});
```

## Option 3: SMS Gateway Philippines

For Philippines-specific SMS delivery:

### Semaphore SMS

```javascript
const axios = require("axios");

exports.sendSemaphoreSMS = functions.https.onCall(async (data, context) => {
  const { phone } = data;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const response = await axios.post(
      "https://api.semaphore.co/api/v4/messages",
      {
        apikey: functions.config().semaphore.api_key,
        number: phone,
        message: `Your Internet of Tsiken verification code is: ${otp}. Valid for 5 minutes.`,
        sendername: "TSIKEN",
      }
    );

    if (response.data.length > 0 && response.data[0].status === "Queued") {
      // Store OTP in Firestore
      await admin
        .firestore()
        .collection("otps")
        .doc(phone)
        .set({
          otp: otp,
          phone: phone,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: false,
          semaphoreId: response.data[0].message_id,
        });

      return {
        success: true,
        message: "Real SMS sent via Semaphore",
        phone: phone,
      };
    } else {
      throw new Error("Semaphore SMS failed");
    }
  } catch (error) {
    console.error("Semaphore SMS Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to send SMS");
  }
});
```

## Quick Implementation Steps

1. **Choose SMS Provider** (I recommend Twilio for reliability)
2. **Update Firebase Functions** with the chosen SMS service
3. **Update your app** to call the new SMS function
4. **Deploy and test** - you'll get real SMS immediately

## Test with TextBelt (Free Option)

For immediate testing, TextBelt gives 1 free SMS per day per phone number:

```javascript
// In your app, call this instead of Firebase Phone Auth
const sendRealSMS = httpsCallable(functions, "sendTextBeltSMS");
const result = await sendRealSMS({ phone: "+639171234567" });
```

This approach bypasses Firebase Phone Auth completely and uses proven SMS services that definitely work.

Which SMS service would you like me to implement for you?
