import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../config/firebaseconfig";
import { doc, updateDoc } from "firebase/firestore";
import {
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
} from "firebase/auth";

export default function VerifyIdentityScreen() {
  const [selectedOption, setSelectedOption] = useState("mobile");
  const [inputValue, setInputValue] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [verificationId, setVerificationId] = useState(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  const inputs = useRef([]);
  const navigation = useNavigation();

  // Note: reCAPTCHA not needed for React Native - Firebase handles it internally

  // Send SMS using Firebase MFA
  const handleSendOTP = async () => {
    if (selectedOption === "mobile") {
      if (inputValue.length < 10) {
        Alert.alert("Error", "Enter the 10-digit mobile number");
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert("Error", "User not authenticated");
          return;
        }

        // Format phone number with country code
        const phoneNumber = `+63${inputValue}`;
        console.log("🔄 Starting Firebase MFA SMS for:", phoneNumber);

        // Create phone auth credential for MFA
        const phoneInfoOptions = {
          phoneNumber: phoneNumber,
          session: await multiFactor(user).getSession(),
        };

        const phoneAuthProvider = new PhoneAuthProvider(auth);
        const verificationId =
          await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions);

        console.log("✅ SMS sent via Firebase MFA!");
        console.log("Verification ID:", verificationId);

        setVerificationId(verificationId);
        setConfirmationResult({ phoneNumber });
        setShowOtpScreen(true);

        Alert.alert(
          "SMS Sent!",
          `📱 Verification code sent to ${phoneNumber}\n\nCheck your messages for the 6-digit code.`
        );
      } catch (error) {
        console.error("🚨 Firebase MFA SMS Error:", error);

        let errorMessage = "Failed to send SMS verification code";

        // Handle specific Firebase Auth errors
        switch (error.code) {
          case "auth/invalid-phone-number":
            errorMessage = "Invalid phone number format";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many SMS requests. Please try again later";
            break;
          case "auth/captcha-check-failed":
            errorMessage = "reCAPTCHA verification failed. Please try again";
            break;
          case "auth/quota-exceeded":
            errorMessage = "SMS quota exceeded. Please try again tomorrow";
            break;
          default:
            if (error.message) {
              errorMessage = error.message;
            }
        }

        Alert.alert("SMS Error", errorMessage);
      }
    } else {
      Alert.alert("Error", "Only mobile OTP is supported.");
    }
  };

  // Handle OTP input
  const handleOtpChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, "");
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < otp.length - 1) {
      inputs.current[index + 1].focus();
    }
  };

  const handleBackspace = (text, index) => {
    if (!text && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  // Verify OTP using Firebase MFA
  const handleVerifyLogin = async () => {
    const enteredOtp = otp.join("");

    if (!verificationId || !confirmationResult) {
      Alert.alert(
        "Error",
        "No verification session found. Please request a new code."
      );
      return;
    }

    if (enteredOtp.length !== 6) {
      Alert.alert(
        "Error",
        "Please enter the complete 6-digit verification code."
      );
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User session expired. Please login again.");
        return;
      }

      console.log("🔄 Verifying OTP with Firebase MFA...");

      // Create phone auth credential from verification code
      const phoneAuthCredential = PhoneAuthProvider.credential(
        verificationId,
        enteredOtp
      );

      // Create multi-factor assertion
      const multiFactorAssertion =
        PhoneMultiFactorGenerator.assertion(phoneAuthCredential);

      // Enroll the second factor
      await multiFactor(user).enroll(multiFactorAssertion, "Phone Number");

      console.log("✅ Phone number enrolled as second factor!");

      // Update Firestore with verification status
      await updateDoc(doc(db, "users", user.uid), {
        verified: true,
        lastVerified: new Date(),
        phone: confirmationResult.phoneNumber,
        phoneVerified: true,
        mfaEnabled: true,
        mfaEnrollmentDate: new Date(),
      });

      console.log("✅ User verification status updated");

      Alert.alert(
        "Success!",
        "Phone number verified and enrolled as second factor authentication.",
        [
          {
            text: "Continue",
            onPress: () => navigation.navigate("LoginSuccess"),
          },
        ]
      );
    } catch (error) {
      console.error("🚨 Firebase MFA Verification Error:", error);

      let errorMessage = "Failed to verify the code";

      // Handle specific Firebase Auth errors
      switch (error.code) {
        case "auth/invalid-verification-code":
          errorMessage =
            "Invalid verification code. Please check and try again.";
          break;
        case "auth/code-expired":
          errorMessage =
            "Verification code has expired. Please request a new one.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        case "auth/second-factor-already-enrolled":
          errorMessage =
            "This phone number is already enrolled. Verification successful!";
          // Still navigate to success since it's technically verified
          navigation.navigate("LoginSuccess");
          return;
        default:
          if (error.message) {
            errorMessage = error.message;
          }
      }

      Alert.alert("Verification Failed", errorMessage);
    }
  };

  const handleBack = () => {
    setShowOtpScreen(false);
    setOtp(["", "", "", "", "", ""]);
  };

  const handleOutsideTap = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  return (
    <TouchableWithoutFeedback onPress={handleOutsideTap}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          {showOtpScreen ? (
            <>
              <Text style={styles.title}>Enter OTP CODE</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to your mobile number
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputs.current[index] = ref)}
                    style={styles.otpBox}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace") {
                        handleBackspace(digit, index);
                      }
                    }}
                  />
                ))}
              </View>

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                <TouchableOpacity onPress={handleSendOTP}>
                  <Text style={styles.resendLink}>Resend</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerifyLogin}
              >
                <Text style={styles.verifyText}>Verify & Login</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Verify Your Identity</Text>
              <Text style={styles.subtitle}>
                Enter your mobile number to receive OTP
              </Text>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  selectedOption === "mobile" && styles.selectedOption,
                ]}
                onPress={() => setSelectedOption("mobile")}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color={selectedOption === "mobile" ? "#3b4cca" : "#666"}
                />
                <Text
                  style={[
                    styles.optionText,
                    selectedOption === "mobile" && styles.selectedOptionText,
                  ]}
                >
                  Mobile Number
                </Text>
              </TouchableOpacity>

              <View style={styles.inputContainer}>
                <Text style={styles.countryCode}>+63</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 10-digit mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={inputValue}
                  onChangeText={setInputValue}
                />
              </View>

              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendOTP}
              >
                <Text style={styles.sendText}>Send OTP</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

// Keep existing styles...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  selectedOption: {
    borderColor: "#3b4cca",
    backgroundColor: "#f0f2ff",
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#666",
  },
  selectedOptionText: {
    color: "#3b4cca",
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 20,
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f8f8f8",
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#333",
  },
  sendButton: {
    backgroundColor: "#3b4cca",
    borderRadius: 8,
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
  },
  sendText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  otpBox: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  resendText: {
    fontSize: 14,
    color: "#666",
  },
  resendLink: {
    fontSize: 14,
    color: "#3b4cca",
    fontWeight: "600",
  },
  verifyButton: {
    backgroundColor: "#3b4cca",
    borderRadius: 8,
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  verifyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});
