# KitchenPal Mobile App

A React Native mobile application built with Expo and TypeScript for managing kitchen inventory and reducing food waste.

## Features

- **Monthly Summary**: Visual donut chart showing wasted vs saved food percentages
- **Expiry Tracking**: Horizontal scrollable list of items nearing expiry
- **Item Management**: Acknowledge items and create recipes from expiring ingredients
- **Bottom Tab Navigation**: Easy navigation between different sections

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo Go app installed on your Android phone ([Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent))

## Installation

1. Navigate to the mobile app directory:

```bash
cd KitchenPal-Mobile
```

2. Install dependencies (if not already installed):

```bash
npm install
```

## Running on Android Phone

### Method 1: Using Expo Go (Recommended)

1. Start the development server:

```bash
npm start
```

2. A QR code will appear in your terminal and browser

3. Open the **Expo Go** app on your Android phone

4. Tap "Scan QR code" and scan the QR code from your terminal

5. The app will load on your phone

### Method 2: Using USB Cable (Development Build)

1. Enable Developer Options on your Android phone
2. Enable USB Debugging
3. Connect your phone via USB
4. Run:

```bash
npm run android
```

## Project Structure

```
KitchenPal-Mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── DonutChart.tsx
│   │   ├── ExpiryItemCard.tsx
│   │   └── MonthlySummaryCard.tsx
│   ├── navigation/          # Navigation configuration
│   │   └── BottomTabNavigator.tsx
│   ├── screens/             # Screen components
│   │   └── HomeScreen.tsx
│   └── types/               # TypeScript type definitions
│       └── index.ts
├── App.tsx                  # Main app component
└── package.json
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/emulator (macOS only)
- `npm run web` - Run in web browser

## Technologies Used

- **React Native**: Mobile app framework
- **Expo**: Development platform
- **TypeScript**: Type-safe JavaScript
- **React Navigation**: Navigation library
- **React Native SVG**: For custom donut chart
- **Expo Vector Icons**: Icon library

## Backend Connection

To connect to the backend API:

1. Ensure your backend is running (see main README)
2. Update the API base URL in the app configuration
3. Make sure your phone and computer are on the same network

## Troubleshooting

### QR Code not working

- Ensure your phone and computer are on the same WiFi network
- Try using tunnel mode: `npm start --tunnel`

### App crashes on load

- Clear Expo cache: `npm start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Build errors

- Make sure all dependencies are installed
- Check that you're using compatible Node.js version

## Next Steps

- [ ] Connect to backend API
- [ ] Implement authentication
- [ ] Add recipe creation flow
- [ ] Implement notification system
- [ ] Add barcode scanning for items
