# Mobile Application Client

This directory contains the cross-platform mobile application built with Flutter (Dart).

## Responsibilities
- Deliver native iOS and Android experiences using a single codebase.
- Interface directly with device camera sensors for live viewport framing.
- Cache user session details and past diagnostics in a local embedded database (Hive/SQLite).
- Support offline inference using local quantized TensorFlow Lite (TFLite) models when cellular signals are missing.
- Sync offline diagnoses with the central cloud database immediately upon detecting an active internet connection.

## Recommended Structure
```
mobile/
├── assets/              # Local model weights (.tflite), icons, fonts
├── lib/
│   ├── bloc/            # State management pattern blocks (Auth, Camera, Predict)
│   ├── models/          # Dart models matching backend API JSON payloads
│   ├── repository/      # HTTP clients & Offline Database adapters
│   ├── screens/         # View widgets (Home, CameraView, DiagnosisResult, History)
│   ├── widgets/         # Shared custom widgets (bounding_box_overlay.dart)
│   └── main.dart        # Entrypoint configuration
└── pubspec.yaml         # Dependencies declaration
```
