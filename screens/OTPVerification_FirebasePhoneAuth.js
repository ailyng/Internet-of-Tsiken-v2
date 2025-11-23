import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth, db } from "../firebaseconfig.js";
import { doc, updateDoc } from "firebase/firestore";
import {
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import {
  checkOTPLockout,
  incrementOTPAttempts,
  resetOTPAttempts,
  formatLockoutTime,
} from "../src/utils/deviceLockout";

const Logo = require("../assets/logo.png");

export default function OTPVerificationFirebasePhoneAuth() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [deviceLocked, setDeviceLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30); // 30 seconds cooldown between resends
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [verificationId, setVerificationId] = useState(null);

  const inputs = useRef([]);
  const navigation = useNavigation();
  const route = useRoute();

  const { mobileNumber, userId } = route.params;

  useEffect(() => {
    checkDeviceLockoutStatus();
    sendInitialOTP();
  }, []);

  useEffect(() => {
    // Timer for OTP expiry (5 minutes)
    let otpTimer;
    if (timeLeft > 0) {
      otpTimer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(otpTimer);
  }, [timeLeft]);

  useEffect(() => {
    // Resend cooldown timer
    let cooldownTimer;
    if (resendCooldown > 0 && resendCooldown < 30) {
      cooldownTimer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(cooldownTimer);
  }, [resendCooldown]);

  useEffect(() => {
    // Device lockout timer
    let lockoutTimer;
    if (deviceLocked && lockoutTime > 0) {
      lockoutTimer = setInterval(() => {
        setLockoutTime((prev) => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            setDeviceLocked(false);
            return null;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(lockoutTimer);
  }, [deviceLocked, lockoutTime]);

  const checkDeviceLockoutStatus = async () => {
    const lockoutStatus = await checkOTPLockout();
    if (lockoutStatus.isLockedOut) {
      setDeviceLocked(true);
      setLockoutTime(lockoutStatus.remainingTime);
    }
  };

  const sendInitialOTP = async () => {
    try {
      await sendOTP();
    } catch (error) {
      console.error("Failed to send initial OTP:", error);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    }
  };

  const sendOTP = async () => {
    try {
      console.log("🔄 Sending Firebase Phone Auth OTP to:", mobileNumber);

      if (Platform.OS === "web") {
        // Web platform implementation
        const recaptchaVerifier = new RecaptchaVerifier(
          "recaptcha-container",
          {
            size: "invisible",
            callback: () => {
              console.log("✅ reCAPTCHA solved");
            },
            "expired-callback": () => {
              console.log("❌ reCAPTCHA expired");
            },
          },
          auth
        );

        const confirmationResult = await signInWithPhoneNumber(
          auth,
          mobileNumber,
          recaptchaVerifier
        );

        setConfirmationResult(confirmationResult);
        console.log("✅ Firebase Phone Auth OTP sent successfully (Web)");
      } else {
        // Mobile platform implementation
        // For React Native, we need to use Firebase Phone Auth differently
        // This requires additional setup with Firebase Phone Auth provider

        console.log("🔄 Setting up Firebase Phone Auth for mobile...");

        // For mobile, we'll use a different approach
        // We need to implement phone auth with verification ID
        Alert.alert(
          "SMS Verification",
          `A verification code will be sent to ${mobileNumber}. Please make sure this number can receive SMS messages.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Send SMS",
              onPress: async () => {
                try {
                  // For now, let's simulate the phone auth process
                  // In a real implementation, you'd use Firebase Phone Auth Provider
                  const mockVerificationId = `verification_${Date.now()}`;
                  setVerificationId(mockVerificationId);
                  setConfirmationResult({ verificationId: mockVerificationId });

                  console.log(
                    "✅ Firebase Phone Auth setup completed (Mobile simulation)"
                  );

                  // TODO: Implement actual Firebase Phone Auth for React Native
                  // This would involve using Firebase Phone Auth Provider
                  Alert.alert(
                    "Development Mode",
                    "SMS sending is simulated. In production, Firebase would send a real SMS.\n\nFor testing, use: 123456"
                  );
                } catch (error) {
                  console.error("❌ Mobile phone auth failed:", error);
                  throw error;
                }
              },
            },
          ]
        );
      }

      // Reset timer to 5 minutes
      setTimeLeft(300);
      setCanResend(false);
      setResendCooldown(30);

      return { success: true };
    } catch (error) {
      console.error("🚨 OTP Send Error:", error);
      throw error;
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) {
      Alert.alert(
        "Please Wait",
        `You can resend OTP in ${resendCooldown} seconds.`
      );
      return;
    }

    setResendLoading(true);
    setErrors({});

    try {
      await sendOTP();
      Alert.alert(
        "OTP Resent",
        `New verification code sent to ${mobileNumber}`
      );

      // Clear current OTP input
      setOtp(["", "", "", "", "", ""]);
      if (inputs.current[0]) {
        inputs.current[0].focus();
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      Alert.alert("Error", "Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, "");
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Clear errors when user starts typing
    if (errors.otp) {
      setErrors({});
    }

    // Auto-focus next input
    if (digit && index < otp.length - 1) {
      inputs.current[index + 1].focus();
    }
  };

  const handleBackspace = (text, index) => {
    if (!text && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const validateOTP = () => {
    const enteredOtp = otp.join("");
    setErrors({});

    if (enteredOtp.length !== 6) {
      setErrors({ otp: "Please enter the complete 6-digit OTP" });
      return false;
    }

    if (timeLeft <= 0) {
      setErrors({ otp: "OTP has expired. Please request a new one." });
      return false;
    }

    return true;
  };

  const handleVerifyOTP = async () => {
    console.log("=== OTP VERIFICATION STARTED ===");

    if (!validateOTP()) {
      console.log("OTP validation failed");
      return;
    }

    // Check device lockout
    try {
      const lockoutStatus = await checkOTPLockout();
      if (lockoutStatus && lockoutStatus.isLockedOut) {
        console.log("Device is locked for OTP attempts");
        setDeviceLocked(true);
        setLockoutTime(lockoutStatus.remainingTime);
        Alert.alert(
          "Account Locked",
          `Too many failed OTP attempts. Please try again in ${formatLockoutTime(
            lockoutStatus.remainingTime
          )}.`
        );
        return;
      }
    } catch (lockoutError) {
      console.log("Lockout check error (continuing anyway):", lockoutError);
    }

    const enteredOtp = otp.join("");
    setLoading(true);

    try {
      console.log("Verifying OTP:", enteredOtp);

      if (
        Platform.OS === "web" &&
        confirmationResult &&
        confirmationResult.confirm
      ) {
        // Web platform verification
        try {
          console.log("Using Firebase Phone Auth verification (Web)");
          const result = await confirmationResult.confirm(enteredOtp);
          console.log("✅ Firebase Phone Auth verification successful (Web)");

          // Update user document
          await updateUserDocument();

          Alert.alert(
            "Success",
            "Phone number verified successfully! Redirecting to dashboard...",
            [{ text: "OK", onPress: () => navigation.navigate("Home") }]
          );

          return;
        } catch (firebaseError) {
          console.log(
            "Firebase Phone Auth verification failed:",
            firebaseError.message
          );
          throw new Error("Invalid OTP code");
        }
      } else {
        // Mobile platform verification
        console.log("Using mobile verification");

        // For development/testing purposes
        if (enteredOtp === "123456") {
          console.log("✅ Test OTP verified successfully");

          // Update user document
          await updateUserDocument();

          Alert.alert(
            "Success",
            "Phone number verified successfully! Redirecting to dashboard...",
            [{ text: "OK", onPress: () => navigation.navigate("Home") }]
          );

          return;
        } else {
          throw new Error("Invalid OTP code");
        }
      }
    } catch (error) {
      console.error("OTP Verification Error:", error);

      // Increment OTP attempts
      const attempts = await incrementOTPAttempts();
      const remainingAttempts = 5 - attempts;
      setOtpAttempts(attempts);

      let errorMessage = "Invalid OTP code. Please try again.";

      if (error.message && error.message.includes("expired")) {
        errorMessage = "OTP has expired. Please request a new one.";
        setTimeLeft(0);
        setCanResend(true);
      }

      if (remainingAttempts <= 0) {
        setDeviceLocked(true);
        setLockoutTime(60000); // 1 minute for development
        Alert.alert(
          "Account Locked",
          "Too many failed OTP attempts. Your account is locked temporarily."
        );
      } else {
        setErrors({
          otp: `${errorMessage} ${remainingAttempts} attempts remaining.`,
        });
        // Clear OTP inputs on failed attempt
        setOtp(["", "", "", "", "", ""]);
        if (inputs.current[0]) {
          inputs.current[0].focus();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUserDocument = async () => {
    // Reset OTP attempts on successful verification
    await resetOTPAttempts();

    // Update user document in Firestore
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        verified: true,
        lastVerified: new Date(),
        phone: mobileNumber,
        phoneVerified: true,
        otpVerified: true,
        lastOTPVerified: new Date(),
        failedOtpAttempts: 0,
      });
      console.log("✅ User verification status updated in Firestore");
    }
  };

  const handleBack = () => {
    Alert.alert(
      "Go Back",
      "Are you sure you want to go back? You'll need to start the verification process again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Go Back", onPress: () => navigation.goBack() },
      ]
    );
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatResendCooldown = (seconds) => {
    return `${seconds}s`;
  };

  if (deviceLocked) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedCard}>
          <Ionicons name="lock-closed" size={48} color="#c41e3a" />
          <Text style={styles.lockedTitle}>Account Locked</Text>
          <Text style={styles.lockedSubtitle}>
            Too many failed OTP attempts
          </Text>
          <Text style={styles.lockedTime}>
            {lockoutTime ? formatLockoutTime(lockoutTime) : "00:00"}
          </Text>
          <Text style={styles.lockedMessage}>
            Please try again later or contact support.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#3b4cca" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Image source={Logo} style={styles.logo} />

            <Text style={styles.title}>ENTER OTP CODE</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {mobileNumber}
            </Text>

            {/* Firebase Phone Auth Status */}
            <View style={styles.statusContainer}>
              <Ionicons
                name={
                  Platform.OS === "web"
                    ? "globe-outline"
                    : "phone-portrait-outline"
                }
                size={16}
                color="#3b4cca"
              />
              <Text style={styles.statusText}>
                {Platform.OS === "web"
                  ? "Using Firebase Phone Auth (Web)"
                  : "Using Firebase Phone Auth (Mobile)"}
              </Text>
            </View>

            {/* Timer Display */}
            <View style={styles.timerContainer}>
              <Ionicons
                name={timeLeft > 60 ? "time-outline" : "warning-outline"}
                size={16}
                color={timeLeft > 60 ? "#3b4cca" : "#c41e3a"}
              />
              <Text
                style={[
                  styles.timerText,
                  timeLeft <= 60 && styles.timerTextUrgent,
                ]}
              >
                {timeLeft > 0
                  ? `Code expires in ${formatTime(timeLeft)}`
                  : "Code expired"}
              </Text>
            </View>

            {errors.otp && (
              <View style={styles.errorAlert}>
                <Text style={styles.errorAlertText}>{errors.otp}</Text>
              </View>
            )}

            {/* OTP Input */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputs.current[index] = ref)}
                  style={[
                    styles.otpBox,
                    digit && styles.otpBoxFilled,
                    errors.otp && styles.otpBoxError,
                  ]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace") {
                      handleBackspace(digit, index);
                    }
                  }}
                  editable={!loading && !deviceLocked}
                />
              ))}
            </View>

            {/* Resend OTP Section */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={resendCooldown > 0 || resendLoading}
                style={styles.resendButton}
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color="#3b4cca" />
                ) : (
                  <Text
                    style={[
                      styles.resendLink,
                      resendCooldown > 0 && styles.resendLinkDisabled,
                    ]}
                  >
                    {resendCooldown > 0
                      ? `Resend (${formatResendCooldown(resendCooldown)})`
                      : "Resend OTP"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Attempt Counter */}
            {otpAttempts > 0 && (
              <View style={styles.attemptContainer}>
                <Text style={styles.attemptText}>
                  {otpAttempts}/5 failed attempts
                </Text>
              </View>
            )}

            {/* Verify Button */}
            <Pressable
              style={({ pressed }) => [
                styles.verifyBtn,
                (loading || timeLeft <= 0) && styles.buttonDisabled,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleVerifyOTP}
              disabled={loading || timeLeft <= 0}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyText}>
                  {timeLeft <= 0 ? "OTP Expired" : "Verify & Continue"}
                </Text>
              )}
            </Pressable>

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#666"
              />
              <Text style={styles.helpText}>
                Enter the 6-digit code sent to your mobile number. The code is
                valid for 5 minutes.
                {Platform.OS !== "web" && "\n\nFor testing, use: 123456"}
              </Text>
            </View>

            {/* Recaptcha container for web */}
            {Platform.OS === "web" && <div id="recaptcha-container"></div>}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  card: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
    alignItems: "center",
    marginVertical: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backText: {
    color: "#3b4cca",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 10,
    borderRadius: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#e3f2fd",
    borderRadius: 6,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#3b4cca",
    fontWeight: "500",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
  },
  timerText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#3b4cca",
    fontWeight: "500",
  },
  timerTextUrgent: {
    color: "#c41e3a",
  },
  errorAlert: {
    width: "100%",
    backgroundColor: "#ffebee",
    borderLeftColor: "#c41e3a",
    borderLeftWidth: 4,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  errorAlertText: {
    color: "#c41e3a",
    fontSize: 12,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    width: "100%",
  },
  otpBox: {
    width: 45,
    height: 50,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    backgroundColor: "#fff",
  },
  otpBoxFilled: {
    borderColor: "#3b4cca",
    backgroundColor: "#f0f2ff",
  },
  otpBoxError: {
    borderColor: "#c41e3a",
    backgroundColor: "#ffebee",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  resendText: {
    fontSize: 14,
    color: "#666",
  },
  resendButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendLink: {
    fontSize: 14,
    color: "#3b4cca",
    fontWeight: "600",
  },
  resendLinkDisabled: {
    color: "#999",
  },
  attemptContainer: {
    marginBottom: 15,
    padding: 8,
    backgroundColor: "#fff3cd",
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  attemptText: {
    fontSize: 12,
    color: "#856404",
    textAlign: "center",
  },
  verifyBtn: {
    backgroundColor: "#3b4cca",
    width: "100%",
    height: 45,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
  },
  helpText: {
    color: "#666",
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  lockedContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  lockedCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#c41e3a",
    marginTop: 16,
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  lockedTime: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#c41e3a",
    marginBottom: 16,
  },
  lockedMessage: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
});
