# PC Connect React Native App

A React Native application that allows you to remotely turn on your PC through the PC Connect API.

## Features

- **Single Toggle Switch**: Simple interface with a "Turn On PC" toggle
- **One-Way Control**: Can only turn the PC ON, never OFF (as per security requirements)
- **Real-time Status**: Displays current PC status (ON/OFF)
- **Auto-disable**: Toggle is disabled when PC is already ON
- **Loading States**: Shows loading indicators during API calls
- **Error Handling**: Graceful error handling with user-friendly alerts
- **Auto-refresh**: Automatically refreshes status after turning on PC

## API Integration

The app interacts with the PC Connect API at `https://api.eric-n.com/pc-connect/`:

- **GET**: Fetches current PC status on app load
- **POST**: Sends turn-on command to the PC
- **Auto-refresh**: Refreshes status after successful POST request

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. For iOS development:
   ```bash
   cd ios && pod install && cd ..
   ```

## Running the App

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

### Start Metro Bundler
```bash
npm start
```

## Project Structure

```
pc-connect-app/
├── App.js              # Main application component
├── package.json        # Dependencies and scripts
├── app.json           # App configuration
├── index.js           # App entry point
├── babel.config.js    # Babel configuration
└── metro.config.js    # Metro bundler configuration
```

## Requirements Met

✅ Single toggle switch labeled "Turn On PC"  
✅ Toggle can only be turned ON, never OFF  
✅ Disabled state when PC is already ON  
✅ POST request to turn on PC  
✅ GET request to fetch status on load and after POST  
✅ React Native functional components with hooks  
✅ Fetch API for HTTP requests  
✅ Loading indicators during API calls  
✅ Error handling with alerts  

## API Response Format

The app expects the API to return JSON in one of these formats:

```json
// Option 1
{
  "status": "on" // or "off"
}

// Option 2
{
  "isOn": true // or false
}

// Option 3
{
  "status": true // or false
}
```

## Customization

If your API uses a different response format, update the `fetchPCStatus` function in `App.js` to parse the response correctly.

If your API expects different POST body format, update the `turnOnPC` function in `App.js`.
