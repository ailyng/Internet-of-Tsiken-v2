import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Components are imported with the correct path and names
import LogIn from "./Doub_try/tryLogIn";
import SignUp from "./Doub_try/trySignUp";
import LoginSuccess from "./Doub_try/loginSuccess";
import VerifyIdentity from "./Doub_try/verifyIdentity";
import PasswordUpdated from "./Doub_try/passwordupdated";
import ResetPassword from "./Doub_try/resetpassword";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="LogIn"
      >
        {/* Screen names must match the navigation calls in the components (e.g., handleSignup in tryLogIn.js navigates to "Signup") */}
        <Stack.Screen name="LogIn" component={LogIn} />
        <Stack.Screen name="Signup" component={SignUp} />
        <Stack.Screen name="LoginSuccess" component={LoginSuccess} />
        <Stack.Screen name="VerifyIdentity" component={VerifyIdentity} />
        <Stack.Screen name="PasswordUpdated" component={PasswordUpdated} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}