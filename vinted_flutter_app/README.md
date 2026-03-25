# Vinted Sangvish Flutter App

A responsive Flutter application connected to the Vinted-clone Express API.

## 📁 Architecture: Clean MVC

This project follows a neat MVC (Model-View-Controller) pattern to ensure clear separation of concerns.

### Folder Structure
- **`lib/models/`**: Data classes and JSON serialization logic.
- **`lib/views/`**: UI Screens (Widgets) that build the interface.
- **`lib/controllers/`**: Business logic and State Management (using Provider).
- **`lib/services/`**: API handlers, database connections, and external service calls.
- **`lib/widgets/`**: Reusable UI components (buttons, cards, inputs).
- **`lib/utils/`**: Helpher classes (Responsive layout mixins, constants, themes).
- **`lib/theme/`**: App-wide styling, colors, and typography.
- **`lib/routes/`**: Navigation and routing configuration.

## 🚀 Responsive Design
- The app uses the `Responsive` helper class in `lib/utils/responsive.dart`.
- Breakpoints:
  - **Mobile**: < 850px
  - **Tablet**: 850px - 1100px
  - **Desktop**: > 1100px

## 🔗 Backend Integration
- Connected to: `https://vinted.sangvish.com/api`
- Service: `lib/services/api_service.dart`

## 🛠 To-Do After Installing Flutter
1. Run `flutter create .` inside this folder to generate platform specific files (Android/iOS).
2. Run `flutter pub get` to install dependencies.
3. Start the app with `flutter run`.
