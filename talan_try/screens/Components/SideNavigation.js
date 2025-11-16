import React, { useEffect, useRef } from "react";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SideNavigation({ visible, onClose }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const menuItemAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Staggered animation for menu items
        Animated.stagger(
          80,
          menuItemAnims.map((anim) =>
            Animated.spring(anim, {
              toValue: 1,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            })
          )
        ).start();
      });
    } else {
      // Reset animations
      menuItemAnims.forEach((anim) => anim.setValue(0));

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleMenuItemPress = (item) => {
    console.log(`Navigating to ${item}`);
    onClose();
  };

  const menuItems = [
    { id: 1, title: "Activity Logs", description: "View system activity" },
    { id: 2, title: "User Profile", description: "Manage your account" },
    { id: 3, title: "Settings", description: "Configure preferences" },
    { id: 4, title: "About", description: "App information" },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.menuContainer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header Section */}
          <View style={styles.menuHeader}>
            <View style={styles.headerTop}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>MB</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.menuHeaderTitle}>My Brooder</Text>
            <Text style={styles.menuHeaderSubtitle}>
              Smart Monitoring System
            </Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContent}>
            <Text style={styles.sectionTitle}>MENU</Text>
            {menuItems.map((item, index) => (
              <Animated.View
                key={item.id}
                style={{
                  opacity: menuItemAnims[index],
                  transform: [
                    {
                      translateX: menuItemAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    index === menuItems.length - 1 && styles.menuItemLast,
                  ]}
                  onPress={() => handleMenuItemPress(item.title)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemText}>{item.title}</Text>
                    <Text style={styles.menuItemDescription}>
                      {item.description}
                    </Text>
                  </View>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.menuFooter}>
            <View style={styles.divider} />
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  menuContainer: {
    width: "85%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  menuHeader: {
    backgroundColor: "#1e40af",
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 20 : 64,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "400",
  },
  menuHeaderTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  menuHeaderSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "400",
  },
  menuContent: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  menuItemLast: {
    marginBottom: 0,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  menuItemDescription: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "400",
  },
  menuItemArrow: {
    fontSize: 24,
    color: "#d1d5db",
    fontWeight: "300",
    marginLeft: 12,
  },
  menuFooter: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "android" ? 20 : 36,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    fontWeight: "400",
  },
});
