/**
 * Login Screen Component
 * Handles email/password login with OTP verification
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  validateEmail,
  validatePassword,
  validateOTP,
} from "../utils/authValidation";
import {
  checkLoginLockout,
  checkOTPLockout,
  incrementLoginAttempts,
  incrementOTPAttempts,
  resetLoginAttempts,
  resetOTPAttempts,
  formatLockoutTime,
} from "../utils/deviceLockout";
import { signInUser } from "../services/firebaseAuth";
import {
  requestOTP,
  verifyOTP,
  checkOTPResendStatus,
} from "../services/otpService";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOTP] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [deviceLocked, setDeviceLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [otpLocked, setOTPLocked] = useState(false);
  const [otpLockoutTime, setOTPLockoutTime] = useState(null);
  const [canResendOTP, setCanResendOTP] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Check device lockout on component mount
  useEffect(() => {
    checkDeviceLockoutStatus();
  }, []);

  // Handle lockout timer
  useEffect(() => {
    let interval;
    if (deviceLocked && lockoutTime > 0) {
      interval = setInterval(() => {
        const newTime = lockoutTime - 1000;
        setLockoutTime(newTime);

        if (newTime <= 0) {
          setDeviceLocked(false);
          setLockoutTime(null);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [deviceLocked, lockoutTime]);

  // Handle OTP lockout timer
  useEffect(() => {
    let interval;
    if (otpLocked && otpLockoutTime > 0) {
      interval = setInterval(() => {
        const newTime = otpLockoutTime - 1000;
        setOTPLockoutTime(newTime);

        if (newTime <= 0) {
          setOTPLocked(false);
          setOTPLockoutTime(null);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpLocked, otpLockoutTime]);

  // Handle OTP resend countdown
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
    const loginLockout = await checkLoginLockout();
    if (loginLockout.isLockedOut) {
      setDeviceLocked(true);
      setLockoutTime(loginLockout.remainingTime);
    }
  };

  const handleLoginSubmit = async () => {
    setErrors({});

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setErrors({ email: emailValidation.error });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setErrors({ password: passwordValidation.errors });
      return;
    }

    // Check device lockout
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
      // Attempt Firebase sign in
      const result = await signInUser(email, password);

      if (result.success) {
        // Credentials are valid, now send OTP
        if (!phoneNumber.trim()) {
          setErrors({ phoneNumber: "Phone number is required for OTP" });
          setLoading(false);
          return;
        }

        const otpResult = await requestOTP(phoneNumber);
        if (otpResult.success) {
          setShowOTPInput(true);
          setCanResendOTP(false);
          setResendCountdown(60);
          Alert.alert("OTP Sent", `OTP has been sent to ${phoneNumber}`);
          resetLoginAttempts();
        } else {
          setErrors({ otp: otpResult.error });
        }
      } else {
        // Invalid credentials
        const attempts = await incrementLoginAttempts();
        const remainingAttempts = 5 - attempts;

        if (remainingAttempts > 0) {
          Alert.alert(
            "Login Failed",
            `${result.error}. ${remainingAttempts} attempt(s) remaining.`
          );
        } else {
          setDeviceLocked(true);
          setLockoutTime(60 * 60 * 1000);
          Alert.alert(
            "Account Locked",
            "Too many failed login attempts. Your account is locked for 1 hour."
          );
        }

        setErrors({ auth: result.error });
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({ auth: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async () => {
    setErrors({});

    // Validate OTP
    const otpValidation = validateOTP(otp);
    if (!otpValidation.isValid) {
      setErrors({ otp: otpValidation.error });
      return;
    }

    // Check OTP lockout
    const otpLockoutStatus = await checkOTPLockout();
    if (otpLockoutStatus.isLockedOut) {
      setOTPLocked(true);
      setOTPLockoutTime(otpLockoutStatus.remainingTime);
      Alert.alert(
        "OTP Verification Locked",
        `Too many failed OTP attempts. Please try again in ${formatLockoutTime(
          otpLockoutStatus.remainingTime
        )}.`
      );
      return;
    }

    setLoading(true);

    try {
      const result = await verifyOTP(phoneNumber, otp);

      if (result.success) {
        resetOTPAttempts();
        // OTP verified successfully
        Alert.alert("Success", "Login successful!");
        navigation.replace("Dashboard");
      } else {
        const attempts = await incrementOTPAttempts();
        const remainingAttempts = 5 - attempts;

        if (remainingAttempts > 0) {
          Alert.alert(
            "Verification Failed",
            `${result.error}. ${remainingAttempts} attempt(s) remaining.`
          );
        } else {
          setOTPLocked(true);
          setOTPLockoutTime(60 * 60 * 1000);
          Alert.alert(
            "Verification Locked",
            "Too many failed OTP attempts. Please try again later."
          );
        }

        setErrors({ otp: result.error });
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setErrors({ otp: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setCanResendOTP(false);
    setResendCountdown(60);

    const result = await requestOTP(phoneNumber);
    if (result.success) {
      Alert.alert("OTP Resent", `OTP has been resent to ${phoneNumber}`);
    } else {
      setErrors({ otp: result.error });
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword");
  };

  if (deviceLocked) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-6">
        <Text className="text-lg font-bold text-red-600 mb-4">
          Account Locked
        </Text>
        <Text className="text-center text-gray-600 mb-4">
          Too many failed login attempts. Please try again in:
        </Text>
        <Text className="text-3xl font-bold text-red-600 mb-4">
          {lockoutTime ? formatLockoutTime(lockoutTime) : "00:00"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-8">
        <Text className="text-3xl font-bold text-gray-800 mb-2">Welcome</Text>
        <Text className="text-gray-600 mb-8">Sign in to your account</Text>

        {!showOTPInput ? (
          <>
            {/* Email Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Email</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                keyboardType="email-address"
              />
              {errors.email && (
                <Text className="text-red-600 text-sm mt-1">
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Password</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
              {errors.password && (
                <View className="mt-2">
                  {errors.password.map((err, idx) => (
                    <Text key={idx} className="text-red-600 text-sm">
                      • {err}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Phone Number Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">
                Phone Number
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                placeholder="+1234567890"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!loading}
                keyboardType="phone-pad"
              />
              {errors.phoneNumber && (
                <Text className="text-red-600 text-sm mt-1">
                  {errors.phoneNumber}
                </Text>
              )}
            </View>

            {/* Auth Error */}
            {errors.auth && (
              <Text className="text-red-600 text-sm mb-4">{errors.auth}</Text>
            )}

            {/* Login Button */}
            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-3 mb-4"
              onPress={handleLoginSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-center">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text className="text-blue-600 text-center font-semibold">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* OTP Verification Section */}
            {otpLocked ? (
              <View className="items-center">
                <Text className="text-lg font-bold text-red-600 mb-4">
                  OTP Verification Locked
                </Text>
                <Text className="text-center text-gray-600 mb-4">
                  Too many failed attempts. Try again in:
                </Text>
                <Text className="text-3xl font-bold text-red-600 mb-4">
                  {otpLockoutTime ? formatLockoutTime(otpLockoutTime) : "00:00"}
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-gray-700 font-semibold mb-2">
                  Enter OTP
                </Text>
                <Text className="text-gray-600 text-sm mb-4">
                  We've sent a 6-digit code to {phoneNumber}
                </Text>

                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800 mb-6 text-center text-2xl"
                  placeholder="000000"
                  value={otp}
                  onChangeText={setOTP}
                  editable={!loading}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                {errors.otp && (
                  <Text className="text-red-600 text-sm mb-4">
                    {errors.otp}
                  </Text>
                )}

                {/* Verify OTP Button */}
                <TouchableOpacity
                  className="bg-blue-600 rounded-lg py-3 mb-4"
                  onPress={handleOTPSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-center">
                      Verify OTP
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP Button */}
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={!canResendOTP}
                  className={`py-2 ${canResendOTP ? "opacity-100" : "opacity-50"}`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      canResendOTP ? "text-blue-600" : "text-gray-400"
                    }`}
                  >
                    {canResendOTP
                      ? "Resend OTP"
                      : `Resend in ${resendCountdown}s`}
                  </Text>
                </TouchableOpacity>

                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => {
                    setShowOTPInput(false);
                    setOTP("");
                    setErrors({});
                  }}
                  className="mt-4"
                >
                  <Text className="text-blue-600 text-center font-semibold">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default LoginScreen;
