import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || options.title || route.name;

        const isFocused = state.index === index;
        const color = isFocused ? "#1e40af" : "#6b7280";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // If a tabBarIcon is provided in App.js, call it so it can render an icon or image.
        // Example (in App.js):
        // <Tab.Screen
        //   name="Home"
        //   component={Home}
        //   options={{
        //     tabBarIcon: ({ focused }) => (
        //       <Image
        //         source={require("../../assets/home.png")}
        //         style={[styles.iconImage, { opacity: focused ? 1 : 0.6 }]}
        //       />
        //     ),
        //   }}
        // />
        let iconEl = null;
        if (typeof options.tabBarIcon === "function") {
          iconEl = options.tabBarIcon({ focused: isFocused, color, size: 22 });
        }

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                isFocused && styles.iconContainerActive,
              ]}
            >
              {iconEl ?? (
                <>
                  {/*
                    To use a static image here (without defining tabBarIcon in App.js),
                    add your Image component below and point to your asset:

                    <Image
                      source={require("../../assets/home.png")}
                      style={[styles.iconImage, { tintColor: color }]}
                    />

                    Notes:
                    - Use tintColor to color monochrome PNG/SVG equivalents.
                    - Replace "../../assets/home.png" with your actual path.
                  */}
                  <Text style={[styles.icon, { color }]}>{label?.[0]}</Text>
                </>
              )}
            </View>
            <Text
              style={[styles.label, isFocused && styles.labelActive]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default CustomTabBar;

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  iconContainer: {
    width: 48,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: "#dbeafe",
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
    letterSpacing: -0.1,
  },
  labelActive: {
    color: "#1e40af",
    fontWeight: "600",
  },
  iconImage: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
});
