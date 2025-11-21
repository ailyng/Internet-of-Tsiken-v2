/**
 * Forgot Password Screen Component
 * Handles password reset email request
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { validateEmail } from "../utils/authValidation";
import { sendPasswordReset } from "../services/firebaseAuth";

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleResetRequest = async () => {
    setError("");

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error);
      return;
    }

    setLoading(true);

    try {
      const result = await sendPasswordReset(email);

      if (result.success) {
        setSubmitted(true);
        Alert.alert(
          "Reset Email Sent",
          "Check your email for password reset instructions"
        );
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-8">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-6">
          <Text className="text-blue-600 font-semibold">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-gray-800 mb-2">
          Reset Password
        </Text>
        <Text className="text-gray-600 mb-8">
          Enter your email address and we'll send you a link to reset your
          password.
        </Text>

        {submitted ? (
          <View className="items-center py-12">
            <Text className="text-lg font-bold text-green-600 mb-4">
              Check Your Email
            </Text>
            <Text className="text-center text-gray-600 mb-6">
              We've sent password reset instructions to:
            </Text>
            <Text className="text-gray-800 font-semibold mb-8">{email}</Text>
            <Text className="text-center text-gray-600 mb-6">
              Click the link in the email to reset your password.
            </Text>
            <TouchableOpacity
              className="bg-blue-600 rounded-lg px-6 py-3"
              onPress={() => {
                setEmail("");
                setSubmitted(false);
                navigation.goBack();
              }}
            >
              <Text className="text-white font-semibold">Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Email Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">
                Email Address
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                keyboardType="email-address"
              />
              {error && (
                <Text className="text-red-600 text-sm mt-1">{error}</Text>
              )}
            </View>

            {/* Send Reset Email Button */}
            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-3 mb-4"
              onPress={handleResetRequest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-center">
                  Send Reset Email
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text className="text-blue-600 text-center font-semibold">
                Back to Login
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default ForgotPasswordScreen;
