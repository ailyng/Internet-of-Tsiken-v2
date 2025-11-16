import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { Image } from "react-native";
import SideNavigation from "./SideNavigation";

const MenuIcon = ({ size = 22, color = "#1a1a1a", style, ...props }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        justifyContent: "center",
        alignItems: "center",
      },
      style,
    ]}
    {...props}
  >
    <View
      style={{
        width: size,
        height: 2.5,
        backgroundColor: color,
        marginBottom: 5,
        borderRadius: 1,
      }}
    />
    <View
      style={{
        width: size,
        height: 2.5,
        backgroundColor: color,
        marginBottom: 5,
        borderRadius: 1,
      }}
    />
    <View
      style={{
        width: size,
        height: 2.5,
        backgroundColor: color,
        borderRadius: 1,
      }}
    />
  </View>
);

export default function Header({ title, onBack, showBackButton = true }) {
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.leftSection}>
            <View style={styles.logoContainer}>
              {/* Temporarily commented until image is added
              <Imageg")}
                source={require("../../assets/Iburat.png")}
                style={styles.logo}
                resizeMode="contain"
              />*/}
              <Text style={{ fontSize: 24 }}>🏠</Text>
            </View>
          </View>

          <View style={styles.centerSection}>
            <Text style={styles.headerText}>My Brooder</Text>
            <Text style={styles.subtitle}>Smart Monitoring</Text>
          </View>

          <View style={styles.rightSection}>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={toggleMenu}
            >
              <MenuIcon size={22} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <SideNavigation
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  leftSection: {
    flex: 1,
    alignItems: "flex-start",
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: {
    width: 36,
    height: 36,
  },
  centerSection: {
    flex: 2,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  rightSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#666",
    textAlign: "center",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
});
