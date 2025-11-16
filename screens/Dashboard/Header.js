import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { Image } from "react-native";

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

export default function Header({ title = "Internet of Tsiken" }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current; // Start off-screen

  useEffect(() => {
    if (menuVisible) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [menuVisible]);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handleMenuItemPress = (item) => {
    console.log(`Navigating to ${item}`);
    setMenuVisible(false);
    // Add navigation logic here
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.leftSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require("./assets/Iburat.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles.centerSection}>
            <Text style={styles.headerText}>{title}</Text>
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

      {/* Slide-out Menu */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="none"
        onRequestClose={toggleMenu}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={toggleMenu}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderText}>Reports</Text>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress("Activity Logs")}
            >
              <Text style={styles.menuItemText}>Activity Logs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress("User Profile")}
            >
              <Text style={styles.menuItemText}>User Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress("Settings")}
            >
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  menuContainer: {
    width: 280,
    backgroundColor: "#ffffff",
    height: "100%",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 44,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  menuHeader: {
    backgroundColor: "#1e40af",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  menuHeaderText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
});
