import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import { useNavigation } from "@react-navigation/native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseconfig";
import { validateEmail, validatePassword } from "../utils/authValidation";
import {
  checkLoginLockout,
  incrementLoginAttempts,
  resetLoginAttempts,
  formatLockoutTime,
} from "../utils/deviceLockout";
import { requestOTP, checkOTPResendStatus } from "../src/services/otpService";

const Logo = require("../assets/logo.png");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [deviceLocked, setDeviceLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOTP] = useState("");
  const [canResendOTP, setCanResendOTP] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const navigation = useNavigation();

  useEffect(() => {
    checkDeviceLockoutStatus();
  }, []);

  useEffect(() => {
    let interval;
    if (deviceLocked && lockoutTime > 0) {
      interval = setInterval(() => {
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
    return () => clearInterval(interval);
  }, [deviceLocked, lockoutTime]);

  useEffect(() => {
    let interval;
    if (showOTPInput && resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResendOTP(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOTPInput, resendCountdown]);

  const checkDeviceLockoutStatus = async () => {
    const lockoutStatus = await checkLoginLockout();
    if (lockoutStatus.isLockedOut) {
      setDeviceLocked(true);
      setLockoutTime(lockoutStatus.remainingTime);
    }
  };

  const validateLoginForm = () => {
    setErrors({});
    const newErrors = {};

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors;
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required for OTP verification";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateLoginForm()) {
      return;
    }

    const lockoutStatus = await checkLoginLockout();
    if (lockoutStatus.isLockedOut) {
      setDeviceLocked(true);
      setLockoutTime(lockoutStatus.remainingTime);
      Alert.alert(
        "Account Locked",
        `Too many failed login attempts. Please try again in ${formatLockoutTime(
          lockoutStatus.remainingTime
        )}.`
      );
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("✅ Login successful! User ID:", user.uid);

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        console.log("✅ User data loaded:", userDoc.data());
      }

      // Send OTP for verification
      const otpResult = await requestOTP(phoneNumber);
      if (otpResult.success) {
        setShowOTPInput(true);
        setCanResendOTP(false);
        setResendCountdown(60);
        setOTP("");
        Alert.alert("OTP Sent", `OTP has been sent to ${phoneNumber}`);
        resetLoginAttempts();
      } else {
        Alert.alert("Error", otpResult.error);
      }
    } catch (error) {
      console.error("Firebase Login Error:", error.code, error.message);
      const attempts = await incrementLoginAttempts();
      const remainingAttempts = 5 - attempts;

      let errorMessage = "Invalid email or password.";
      if (error.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "That email address is not valid.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many login attempts. Please try again later.";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "User not found.";
      }

      if (remainingAttempts > 0) {
        Alert.alert(
          "Login Failed",
          `${errorMessage}\n${remainingAttempts} attempt(s) remaining.`
        );
      } else {
        setDeviceLocked(true);
        setLockoutTime(60 * 60 * 1000);
        Alert.alert(
          "Account Locked",
          "Too many failed login attempts. Your account is locked for 1 hour."
        );
      }

      setErrors({ auth: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setCanResendOTP(false);
    setResendCountdown(60);
    const result = await requestOTP(phoneNumber);
    if (result.success) {
      Alert.alert("Success", `OTP resent to ${phoneNumber}`);
    } else {
      Alert.alert("Error", result.error);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate("resetpassword");
  };

  const handleSignup = () => {
    navigation.navigate("SignUp");
  };

  if (deviceLocked) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedCard}>
          <Ionicons name="lock-closed" size={48} color="#c41e3a" />
          <Text style={styles.lockedTitle}>Account Locked</Text>
          <Text style={styles.lockedSubtitle}>
            Too many failed login attempts
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

  if (showOTPInput) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.card}>
              <TouchableOpacity
                onPress={() => {
                  setShowOTPInput(false);
                  setOTP("");
                  setErrors({});
                }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#3b4cca" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Enter OTP Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to {phoneNumber}
              </Text>

              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor="#ccc"
                value={otp}
                onChangeText={setOTP}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />

              {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.buttonDisabled]}
                onPress={() => {
                  navigation.navigate("VerifyIdentity", { otp, phoneNumber });
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={!canResendOTP}
                style={styles.resendButton}
              >
                <Text
                  style={[
                    styles.resendText,
                    !canResendOTP && styles.resendTextDisabled,
                  ]}
                >
                  {canResendOTP
                    ? "Resend OTP"
                    : `Resend in ${resendCountdown}s`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
            <Image source={Logo} style={styles.logo} />

            <Text style={styles.title}>WELCOME</Text>
            <Text style={styles.subtitle}>Login to your Account</Text>

            {errors.auth && (
              <View style={styles.errorAlert}>
                <Text style={styles.errorAlertText}>{errors.auth}</Text>
              </View>
            )}

            {/* Email Input */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}

            {/* Password Input */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#555"
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <View>
                {Array.isArray(errors.password) ? (
                  errors.password.map((err, idx) => (
                    <Text key={idx} style={styles.errorText}>
                      • {err}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>
            )}

            {/* Phone Number Input */}
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!loading}
              keyboardType="phone-pad"
            />
            {errors.phoneNumber && (
              <Text style={styles.errorText}>{errors.phoneNumber}</Text>
            )}

            {/* Options Row */}
            <View style={styles.optionsRow}>
              <View style={styles.checkboxContainer}>
                <Checkbox
                  value={remember}
                  onValueChange={setRemember}
                  color={remember ? "#3b4cca" : undefined}
                  style={styles.checkbox}
                />
                <Text style={styles.rememberText}>Remember password</Text>
              </View>

              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an Account? </Text>
              <TouchableOpacity onPress={handleSignup}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
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
  },
  label: {
    alignSelf: "flex-start",
    color: "#333",
    fontWeight: "500",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    width: "100%",
    height: 45,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    width: "100%",
    height: 45,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
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
  errorText: {
    color: "#c41e3a",
    fontSize: 11,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginVertical: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    marginRight: 8,
  },
  rememberText: {
    color: "#333",
  },
  forgotText: {
    color: "#3b4cca",
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  loginBtn: {
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
  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  signupRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  signupText: {
    color: "#555",
  },
  signupLink: {
    color: "#3b4cca",
    fontWeight: "bold",
    textDecorationLine: "underline",
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
  otpInput: {
    width: "100%",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 24,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 8,
    fontWeight: "600",
  },
  resendButton: {
    paddingVertical: 12,
  },
  resendText: {
    color: "#3b4cca",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  resendTextDisabled: {
    color: "#999",
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
