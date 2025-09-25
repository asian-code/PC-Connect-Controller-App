# 🚀 PC Connect - Glassmorphic React Native App

A stunning React Native application with glassmorphic design that allows you to remotely turn on your PC through the PC Connect API. Features modern blue and purple gradients, smooth animations, and haptic feedback.

## ✨ Features

- **🎨 Glassmorphic UI** - Modern glass-like interface with blur effects
- **🌈 Blue/Purple Gradients** - Beautiful gradient themes throughout the app
- **⚡ One-Touch Power Control** - Large power button and toggle switch
- **📱 Haptic Feedback** - Tactile feedback on interactions
- **🔄 Smart Animations** - Smooth transitions and pulse effects
- **🛡️ One-Way Control** - Can only turn PC ON for security
- **📊 Real-time Status** - Live PC status with visual indicators
- **🔄 Auto-refresh** - Status updates after successful operations
- **🌐 Robust API** - Enhanced error handling with retry logic
- **📱 Cross-platform** - Works on both iOS and Android

## 🎯 API Integration

The app interacts with the PC Connect API at `https://api.eric-n.com/pc-connect/`:

- **GET**: Fetches current PC status with timeout and retry logic
- **POST**: Sends turn-on command with comprehensive error handling
- **Health Check**: Monitors API availability

## 🛠️ Installation

### Prerequisites

1. **Node.js** (v16 or higher)
2. **React Native CLI** or **Expo CLI**
3. **Android Studio** (for Android development)
4. **Xcode** (for iOS development, macOS only)

### Setup Steps

1. **Clone and Install Dependencies:**
   ```bash
   cd c:\Users\admin\Documents\PC-Connect-webapp
   npm install
   ```

2. **Install iOS Dependencies (macOS only):**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Install React Native Dependencies:**
   ```bash
   # For Android - Link native modules
   npx react-native link react-native-linear-gradient
   npx react-native link react-native-vector-icons
   npx react-native link react-native-animatable
   ```

## 🚀 Running the App

### Start Metro Bundler
```bash
npm start
```

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

## 📱 App Structure

```
📁 PC-Connect-webapp/
├── 📄 App.js              # Main glassmorphic component
├── 📄 api.js              # Enhanced API service with retry logic
├── 📄 package.json        # Dependencies & scripts
├── 📄 app.json           # App configuration
├── 📄 index.js           # Entry point
├── 📄 babel.config.js    # Babel configuration
├── 📄 metro.config.js    # Metro bundler config
└── 📄 README.md          # This file
```

## 🎨 Design Features

### Glassmorphic Elements
- **Translucent cards** with backdrop blur effects
- **Gradient overlays** for depth and modern aesthetics
- **Floating orbs** with animated pulse effects
- **Glass-like borders** with subtle transparency

### Color Palette
- **Primary Gradient**: Blue (#667eea) to Purple (#764ba2)
- **Secondary Gradient**: Purple to Pink (#f093fb)
- **Status Colors**: Green (#4ade80) for ON, Red (#f87171) for OFF
- **Glass Effects**: White overlays with 10-20% opacity

### Interactive Elements
- **Power Button**: Large circular button with pulse animation
- **Toggle Switch**: Custom styled with gradient tracks
- **Status Indicators**: Animated dots with glow effects
- **Cards**: Glassmorphic containers with subtle shadows

## 🔧 Configuration

### API Response Formats Supported
```json
// Option 1 - String status
{
  "status": "on" // or "off", "online", "offline"
}

// Option 2 - Boolean status
{
  "isOn": true // or false
}

// Option 3 - Alternative boolean
{
  "online": true, // or false
  "powered": true // or false
}
```

### Customization
- **API Endpoint**: Update `API_URL` in `api.js`
- **Colors**: Modify gradient arrays in `styles`
- **Animations**: Adjust durations in Animatable components
- **Timeouts**: Configure in `api.js` constants

## 🧪 Testing

### Manual Testing Checklist
- [ ] App loads with proper gradient background
- [ ] Initial status fetch works correctly
- [ ] Power button shows pulse animation when PC is OFF
- [ ] Toggle switch functions properly
- [ ] Haptic feedback works on button press
- [ ] Loading states display correctly
- [ ] Error handling shows appropriate alerts
- [ ] Status updates after successful power-on
- [ ] Glassmorphic effects render properly
- [ ] Animations are smooth and responsive

### API Testing
```bash
# Test GET endpoint
curl -X GET https://api.eric-n.com/pc-connect/

# Test POST endpoint
curl -X POST https://api.eric-n.com/pc-connect/ \
  -H "Content-Type: application/json" \
  -d '{"action":"turn_on"}'
```

## 🚨 Troubleshooting

### Common Issues

**Gradient not showing:**
- Ensure `react-native-linear-gradient` is properly linked
- For Android: Check `android/settings.gradle` and `MainApplication.java`

**Animations not working:**
- Verify `react-native-animatable` installation
- Check that animations are enabled in device settings

**API errors:**
- Verify internet connection
- Check API endpoint availability
- Review network permissions in app manifest

**Build errors:**
- Clean project: `npx react-native clean`
- Reset cache: `npx react-native start --reset-cache`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Platform-specific Issues

**Android:**
- Enable hardware acceleration in emulator
- Check Gradle version compatibility
- Verify Android SDK installation

**iOS:**
- Update Xcode to latest version
- Clean build folder (Cmd+Shift+K)
- Reset iOS Simulator

## 📋 Requirements Fulfilled

✅ **Glassmorphic Design** - Modern glass-like UI elements  
✅ **Blue/Purple Gradients** - Beautiful color schemes throughout  
✅ **Single Toggle Switch** - "Turn On PC" control  
✅ **One-way Control** - Only allows turning PC ON  
✅ **Disabled State** - When PC is ON, controls are disabled  
✅ **API Integration** - GET/POST to https://api.eric-n.com/pc-connect/  
✅ **React Hooks** - useState, useEffect, useCallback  
✅ **Fetch API** - Modern HTTP client  
✅ **Loading States** - Animated loading indicators  
✅ **Error Handling** - User-friendly error alerts  
✅ **Modern UX** - Haptic feedback and smooth animations  
✅ **Best Practices** - Latest React Native patterns  

## 🔮 Future Enhancements

- **🌙 Dark/Light Mode** - Theme switching
- **🔔 Push Notifications** - Status change alerts
- **📊 Usage Analytics** - Power-on statistics
- **🏠 Multi-PC Support** - Control multiple computers
- **⚙️ Settings Screen** - Customizable preferences
- **🔐 Authentication** - Secure access controls

---

**Built with ❤️ using React Native and modern design principles**
