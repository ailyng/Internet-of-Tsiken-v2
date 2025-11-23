# APK Installation Guide

## 🎯 **Get Your APK File**

### **Option 1: EAS Build (Recommended)**

1. **Wait for current build** to complete
2. **Download APK** from Expo dashboard
3. **Install on phone** directly

### **Option 2: Expo Go (Immediate)**

1. **Download Expo Go** from Play Store
2. **Scan QR code** from your Metro bundler
3. **Test app** immediately (no APK needed)

### **Option 3: Development Build**

```bash
# Create development build
npx eas build --platform android --profile development
```

## 📱 **Install APK on Phone**

### **Steps:**

1. **Enable** "Install from Unknown Sources" in Android settings
2. **Download** APK file to your phone
3. **Tap** the APK file to install
4. **Allow** installation permissions
5. **Open** your app!

### **Alternative - Direct Install:**

1. **Connect phone** to computer via USB
2. **Enable** USB Debugging
3. **Run**: `adb install path/to/your-app.apk`

## 🔧 **Troubleshooting**

### **If EAS Build Fails:**

- Check Firebase configuration
- Verify all dependencies are compatible
- Use development profile instead

### **If APK Won't Install:**

- Enable "Install Unknown Apps"
- Check Android version compatibility
- Clear previous app versions

## ✅ **Testing Your SMS Feature**

Once installed:

1. **Login** with your credentials
2. **Navigate** to Verify Identity
3. **Enter** your phone number
4. **Test** SMS functionality
5. **Verify** with OTP code

---

**Your app includes real SMS verification via Firebase Functions!** 📱
