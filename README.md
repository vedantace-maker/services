# 🏍️ BikeService App

A cross-platform mobile application built with React Native and Expo Router. This app connects bike owners (customers) with garage owners, allowing customers to find nearby garages and book service slots, while enabling garage owners to manage their bookings and schedules.

## ✨ Features
* **Role-Based Authentication:** Distinct flows for Customers and Garage Owners.
* **Customer App:** View available garages, calculate distance, check garage details, and book service slots.
* **Garage Owner App:** Manage the garage schedule, view incoming bookings, and update service status.
* **Mock Backend Integration:** Dummy authentication and local storage for rapid prototyping.

## 🗂️ Folder Structure Explained

The project uses **Expo Router** for file-based routing. Here is a breakdown of the directory structure:

```text
BikeService/
├── app/                    # 📱 Main application routes (Expo Router)
│   ├── _layout.tsx         # Root layout (handles global providers & initial routing)
│   ├── (auth)/             # 🔒 Authentication Route Group
│   │   ├── _layout.tsx     # Auth layout
│   │   ├── login.tsx       # User & Owner login screen
│   │   └── register.tsx    # New account registration screen
│   ├── (customer)/         # 🧑 Customer Route Group
│   │   ├── _layout.tsx     # Customer navigation/tab layout
│   │   ├── index.tsx       # Customer Home: Lists nearby garages
│   │   ├── garage-detail.tsx # Detailed view of a selected garage
│   │   ├── book-slot.tsx   # Interface to pick a date/time for service
│   │   └── my-bookings.tsx # List of the customer's past & upcoming bookings
│   └── (owner)/            # 🛠️ Garage Owner Route Group
│       ├── _layout.tsx     # Owner navigation/tab layout
│       ├── index.tsx       # Owner Home: Dashboard summary
│       ├── schedule.tsx    # Manage working hours and available slots
│       └── bookings.tsx    # List of all customer bookings for the garage
├── components/             # 🧩 Reusable UI Components
│   └── GarageCard.tsx      # Card component to display a garage's summary (image, name, distance)
├── store/                  # 💾 State Management
│   └── authStore.ts        # Global state for authentication (e.g., Zustand/Redux for user role & session)
├── types/                  # 🏷️ TypeScript Definitions
│   └── index.ts            # Global interfaces (User, Garage, Booking, etc.)
└── utils/                  # 🛠️ Helper Functions & Utilities
    ├── dummyAuth.ts        # Mock API calls for login/registration testing
    ├── storage.ts          # Wrappers for local storage (AsyncStorage/SecureStore)
    ├── distance.ts         # Math logic to calculate distances between user and garages
    └── helpers.ts          # Generic utility functions (date formatting, text capitalization)