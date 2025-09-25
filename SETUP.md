# Development Setup for PC Connect App

## Installation Steps

### 1. Install Dependencies
```powershell
npm install
```

### 2. Link Native Dependencies (if using React Native CLI)
```powershell
# For react-native-linear-gradient
npx react-native link react-native-linear-gradient

# For react-native-vector-icons  
npx react-native link react-native-vector-icons

# For react-native-animatable
npx react-native link react-native-animatable
```

### 3. Android Setup
1. Open Android Studio
2. Start your emulator or connect a device
3. Ensure USB debugging is enabled

### 4. Run the App
```powershell
# Start Metro bundler
npm start

# In a new terminal, run on Android
npm run android
```

## Troubleshooting

### If you get "No Android device found":
1. Make sure your emulator is running
2. Check `adb devices` shows your device
3. Restart the emulator if needed

### If gradients don't show:
1. Make sure react-native-linear-gradient is properly linked
2. Clean and rebuild: `npx react-native clean && npm run android`

### For animation issues:
1. Ensure react-native-animatable is installed
2. Check device animation settings are enabled