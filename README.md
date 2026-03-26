# SENTINEL OSINT v2.2 – North America Edition

Professional OSINT field toolkit for iOS. Built with React Native / Expo.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npx expo start

# 3. Scan QR code with Expo Go app (for quick testing)
# Note: Biometrics & Keychain require a physical device
```

---

## Project Structure

```
SentinelV4/
├── App.tsx                          # Root component, all OSINT screens
├── app.json                         # Expo config (Google Maps key here)
├── package.json
├── eas.json                         # EAS Build config
├── babel.config.js
├── tsconfig.json
├── SECURITY.md                      # Security architecture docs
└── src/
    ├── types/
    │   └── index.ts                 # Shared TypeScript types
    ├── screens/
    │   ├── LockScreen.tsx           # Biometric auth + integrity check
    │   ├── CasesScreen.tsx          # Case management
    │   ├── SettingsScreen.tsx       # Security settings + audit log
    │   ├── MapScreen.tsx            # Interactive field map
    │   └── AIResultScreen.tsx       # AI analysis display
    └── utils/
        ├── theme.ts                 # Colors, spacing, layout
        ├── osintEngines.ts          # 12 OSINT module result builders
        ├── pdfExport.ts             # PDF report generation
        ├── storage.ts               # App data access layer
        ├── secureStorage.ts         # AES-256 + HMAC-SHA256 encryption
        ├── sessionManager.ts        # Auto-lock, background wipe
        ├── auditLog.ts              # Encrypted tamper-evident log
        ├── integrityCheck.ts        # Jailbreak / debug detection
        └── aiEngine.ts              # Claude API integration (Pro tier)
```

---

## API Keys

| Key | Where | Required |
|-----|-------|---------|
| Google Maps | `app.json` → `ios.config.googleMapsApiKey` | No (Map View only) |
| Anthropic | In-app Settings → AI Configuration | No (AI features only) |
| Apple Developer ($99/yr) | EAS Build | Yes for App Store |

---

## Build for iOS (EAS Cloud Build – Windows compatible)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project (first time)
eas build:configure

# Production build
eas build --platform ios --profile production
```

---

## Security Architecture

See `SECURITY.md` for full details.

- AES-256-CBC + HMAC-SHA256 encrypted local storage
- Keys in iOS Keychain (Secure Enclave on A12+)
- Face ID / Touch ID on every session
- Session auto-lock (configurable, default 15 min)
- Memory wipe on app backgrounding
- Device integrity checks (jailbreak, debug, OS version)
- Encrypted tamper-evident audit log with HMAC chain
- Manual key rotation support

---

## OSINT Modules (12)

1. Person Search
2. Phone Lookup
3. Email Lookup
4. Social Media (25+ platforms)
5. IP & Network
6. Domain & WHOIS
7. Company / Org
8. Vehicle
9. Court Records
10. Geo & Location
11. Image Analysis
12. Data Breaches

Plus: Map View, Cases, Field Notes, History, Security Settings

---

*For licensed professionals only. FCRA · DPPA · State laws apply.*
