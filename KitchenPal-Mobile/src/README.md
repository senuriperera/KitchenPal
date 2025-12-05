# KitchenPal Mobile - Home Screen

This folder contains the React Native implementation of the KitchenPal home screen using TypeScript.

## Components

### HomeScreen (`src/screens/HomeScreen.tsx`)

The main home screen component that displays:

- Header with profile icon
- Monthly summary card with waste/saved statistics
- Expiry nearing items section with scrollable cards

### MonthlySummaryCard (`src/components/MonthlySummaryCard.tsx`)

A component that displays monthly food waste statistics:

- Donut chart visualization showing wasted vs saved percentages
- Uses `react-native-svg` for custom chart rendering
- Props:
  - `wastedPercentage`: number (0-100)
  - `savedPercentage`: number (0-100)
  - `month`: string (e.g., "July 2025")

### ExpiryItemCard (`src/components/ExpiryItemCard.tsx`)

Individual card for items nearing expiry:

- Displays item name, expiry date, and time remaining
- Shows quantity and location
- Action buttons:
  - Acknowledge: Mark item as seen
  - Create Recipe: Generate recipe using this ingredient
- Props:
  - `item`: ExpiryItem object

### BottomNavigation (`src/components/BottomNavigation.tsx`)

Bottom navigation bar with 5 tabs:

- Home
- List
- Add (centered, elevated button)
- Recipes
- Notifications

Props:

- `activeTab`: TabName
- `onTabPress`: (tab: TabName) => void

## Types

All TypeScript interfaces are defined in `src/types/index.ts`:

- `ExpiryItem`: Structure for expiring items
- `MonthlySummary`: Structure for monthly statistics
- `TabName`: Union type for navigation tabs

## Running the App

```bash
cd KitchenPal-Mobile
npm start
```

Then press:

- `a` for Android
- `i` for iOS
- `w` for web

## Customization

### Mock Data

Currently using mock data in `HomeScreen.tsx`. Replace with actual API calls:

```typescript
const expiryItems: ExpiryItem[] = [
  // Replace with API data
];
```

### Colors

Main colors used:

- Yellow card background: `#F9D97B`
- Green (saved): `#9FC88C`
- Red (wasted): `#E74C3C`
- Orange button: `#FF8C42`
- Dark navy navigation: `#2D3748`

### Navigation

The bottom navigation currently logs tab changes. Integrate with React Navigation:

1. Set up Stack/Tab Navigator
2. Replace console.log in `handleTabPress` with navigation logic

## Dependencies

- `@expo/vector-icons`: Icon library
- `react-native-svg`: For donut chart rendering
- `@react-navigation/bottom-tabs`: (to be integrated)
- `@react-navigation/native`: (to be integrated)

## Notes

- Images are currently placeholders - replace with actual product images
- Add API integration for real-time data
- Implement proper navigation between screens
- Add pull-to-refresh functionality
- Add loading states and error handling
