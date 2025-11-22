import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Import components with the correct path and names
import JsonSplashScreen from "./JsonSplashScreen/JsonSplashScreen";
import LogIn from "./screens/LogIn";
import SignUp from "./screens/SignUp";
import LoginSuccess from "./screens/loginSuccess";
import VerifyIdentity from "./screens/verifyIdentity";
import PasswordUpdated from "./src/screens/passwordupdated";
import ResetPassword from "./screens/resetpassword";
import ConfirmPassword from "./screens/ConfirmPassword";
import Home from "./screens/Dashboard/Home";

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [
    "internet-of-tsiken://",
    "https://internet-of-tsiken-690dd.web.app", //  Hosting domain
  ],
  config: {
    screens: {
      JsonSplash: "splash",
      LogIn: "login",
      SignUp: "signup",
      LoginSuccess: "loginSuccess",
      VerifyIdentity: "verifyIdentity",
      PasswordUpdated: "passwordupdated",
      resetpassword: "resetpassword",
      ConfirmPassword: "resetpassword", // ✅ routes reset link into ConfirmPassword
      Home: "home",
    },
  },
};

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName="JsonSplash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="JsonSplash" component={JsonSplashScreen} />
        <Stack.Screen name="LogIn" component={LogIn} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="LoginSuccess" component={LoginSuccess} />
        <Stack.Screen name="VerifyIdentity" component={VerifyIdentity} />
        <Stack.Screen name="PasswordUpdated" component={PasswordUpdated} />
        <Stack.Screen name="resetpassword" component={ResetPassword} />
        <Stack.Screen name="ConfirmPassword" component={ConfirmPassword} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
