import React, { useState, useRef, useEffect } from "react";
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
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
} from "firebase/auth";

export default function VerifyIdentityScreen() {
  const [selectedOption, setSelectedOption] = useState("mobile");
  const [inputValue, setInputValue] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [verificationId, setVerificationId] = useState(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  const inputs = useRef([]);
  const navigation = useNavigation();

  // Initialize reCAPTCHA
  useEffect(() => {
    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: (response) => {
        console.log("reCAPTCHA verified");
      },
    });
    setRecaptchaVerifier(verifier);
  }, []);

  // Send OTP using Firebase Phone Authentication
  const handleSendOTP = async () => {
    if (selectedOption === "mobile") {
      if (inputValue.length < 10) {
        Alert.alert("Error", "Enter the 10-digit mobile number");
        return;
      }
      try {
        // Format phone number with country code
        const phoneNumber = `+63${inputValue}`; // Philippines country code

        console.log("🔄 Sending SMS OTP to:", phoneNumber);

        // Use Firebase Phone Auth Provider
        const phoneProvider = new PhoneAuthProvider(auth);
        const verificationId = await phoneProvider.verifyPhoneNumber(
          phoneNumber,
          recaptchaVerifier
        );

        setVerificationId(verificationId);

        console.log("==========================================");
        console.log(`📱 SMS OTP sent to: ${phoneNumber}`);
        console.log("✅ Firebase Phone Auth successful");
        console.log("Verification ID:", verificationId);
        console.log("==========================================");

        setShowOtpScreen(true);
        Alert.alert(
          "OTP Sent",
          `SMS verification code has been sent to ${phoneNumber}`
        );
      } catch (error) {
        console.error("🚨 Firebase Phone Auth Error:", error);

        let errorMessage = "Failed to send OTP";
        if (error.code === "auth/invalid-phone-number") {
          errorMessage = "Invalid phone number format";
        } else if (error.code === "auth/too-many-requests") {
          errorMessage = "Too many requests. Please try again later.";
        } else if (error.code === "auth/quota-exceeded") {
          errorMessage = "SMS quota exceeded. Please try again later.";
        } else if (error.message) {
          errorMessage += `: ${error.message}`;
        }

        Alert.alert("Error", errorMessage);
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

  // Verify OTP using Firebase Phone Authentication
  const handleVerifyLogin = async () => {
    const enteredOtp = otp.join("");
    if (!verificationId) {
      Alert.alert("Error", "No verification ID found.");
      return;
    }

    try {
      // Create phone credential
      const credential = PhoneAuthProvider.credential(
        verificationId,
        enteredOtp
      );

      // Sign in with credential
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      console.log("✅ Phone number verified successfully!");
      console.log("User:", user.phoneNumber);

      // Update Firestore verification status
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          verified: true,
          lastVerified: new Date(),
          phoneNumber: user.phoneNumber,
        });
        console.log("✅ User verification status updated");
      }

      Alert.alert("Success", "Phone number verified successfully!");
      navigation.navigate("LoginSuccess");
    } catch (error) {
      console.error("🚨 OTP Verification Error:", error);

      let errorMessage = "Invalid OTP code";
      if (error.code === "auth/invalid-verification-code") {
        errorMessage = "Invalid verification code. Please try again.";
      } else if (error.code === "auth/code-expired") {
        errorMessage =
          "Verification code has expired. Please request a new one.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    }
  };

  const handleBack = () => {
    setShowOtpScreen(false);
    setOtp(["", "", "", "", "", ""]);
  };

  const handleOutsideTap = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={handleOutsideTap}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          {showOtpScreen ? (
            <>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>

              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to your mobile number
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputs.current[index] = ref)}
                    style={styles.otpBox}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace") {
                        handleBackspace(digit, index);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
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
                <Text style={styles.verifyText}>Verify</Text>
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
                  styles.optionContainer,
                  selectedOption === "mobile" && styles.selectedOption,
                ]}
                activeOpacity={1}
              >
                <Ionicons
                  name="call-outline"
                  size={22}
                  color={selectedOption === "mobile" ? "#3B47FF" : "#555"}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number (e.g. 9123456789)"
                  placeholderTextColor="#999"
                  value={inputValue}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, "");
                    if (numericText.length <= 11) {
                      setInputValue(numericText);
                    }
                  }}
                  keyboardType="number-pad"
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={handleSendOTP}>
                <Text style={styles.buttonText}>Send OTP Code</Text>
              </TouchableOpacity>
            </>
          )}

          {/* reCAPTCHA container for Firebase Phone Auth */}
          <View
            id="recaptcha-container"
            style={{ height: 0, overflow: "hidden" }}
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 10,
    marginTop: 40,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
  },
  selectedOption: {
    borderColor: "#3B47FF",
    backgroundColor: "#F8F9FF",
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  button: {
    backgroundColor: "#3B47FF",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  otpBox: {
    width: 40,
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
    color: "#000",
    marginHorizontal: 6,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 13,
  },
  resendText: {
    fontSize: 13,
    color: "#555",
  },
  resendLink: {
    fontSize: 13,
    color: "#2E33A6",
    fontWeight: "700",
    textDecorationLine: "underline",
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
});
