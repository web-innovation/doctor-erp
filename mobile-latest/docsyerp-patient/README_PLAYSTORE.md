Play Store Publishing Guide — docsyerp-patient (for first-time publishers)

This guide walks you through preparing, building, signing, and publishing the Android app to the Google Play Store. It also lists common blockers and checks that can cause rejection.

Prerequisites
- A Google account.
- A Google Play Console account (one-time fee ~$25) — signup at https://play.google.com/console
- Android build environment (we use Expo in this repo). Install Node.js, Yarn/npm, and Expo CLI.
- The mobile app repository is at `mobile-latest/docsyerp-patient`.

High-level steps
1. Review app content & permissions
2. Prepare app metadata (name, description, graphics)
3. Generate a signing key and configure build
4. Build an Android release (AAB recommended)
5. Create a Play Console app and upload the AAB
6. Fill Play Store listing, content rating, and privacy/security forms
7. Submit for review and monitor status

Detailed steps
1) Review app for Play Store requirements
- Target SDK: Google requires targeting a recent Android API level (set by Expo/SDK). Use the latest Expo SDK supported.
- Permissions: Remove or justify sensitive permissions (SMS, call logs, background location, contacts, microphone, camera). Apps requesting sensitive permissions need clear use-cases and privacy disclosures.
- Privacy: Provide a privacy policy URL. If the app processes personal/health data, describe storage, processing, sharing, and retention clearly.
- Content policy: Ensure no disallowed content (copyrighted material, medical misinformation, etc.).

2) App metadata and assets
- App name (short and full), short description, full description.
- High-resolution icon (512x512), feature graphic (1024x500), screenshots of app (phone/tablet), promo video (optional).
- Contact email and privacy policy URL (required).

3) Generate a keystore (app signing key)
- For Expo-managed apps, you can let Expo handle signing or provide your own keystore.
- To create and manage keystores with Expo (recommended for first-time publishers):
  a) Install Expo CLI: `npm install -g expo-cli` or use `npx expo`.
  b) Run: `expo build:android -t app-bundle` (for SDK 45-47) or `eas build -p android --profile production` (recommended for EAS Build). Follow prompts to let Expo generate/upload keystore, or provide your own.
- If you create your own keystore locally using keytool:
  ```bash
  keytool -genkey -v -keystore my-release-key.jks -alias docsyerp -keyalg RSA -keysize 2048 -validity 10000
  ```
  Keep this file and passwords safe — you’ll need them for future updates.

4) Build an Android App Bundle (AAB)
- Using EAS (Expo Application Services) is modern and recommended:
  a) Install and login: `npm install -g eas-cli` and `eas login`.
  b) Configure `eas.json` in the project root (EAS docs show examples).
  c) Run: `eas build -p android --profile production`.
  d) When complete, download the generated `.aab` from EAS.
- Using Classic `expo build` (older): `expo build:android -t app-bundle` — follow prompts.

5) Create the Play Console app and upload
- In Play Console, select "Create app" → set app name, default language, app type (App), Free/ Paid.
- Under "Release" > "Production" create a new release and upload the AAB.
- Provide release notes and roll-out percentage (start with 100% for full release).

6) Fill required Play Store forms
- App content (target audience, content rating questionnaire).
- Data safety section: declare what user data is collected and how it’s used/shared. Be accurate — Play enforces this.
- Privacy policy URL and contact email are required.
- Decide if your app is for children (special rules).

7) Submit and wait for review
- Click "Start rollout to production" — review can take a few hours to several days.
- Monitor the Play Console for errors or rejection reasons.

Common blockers and checks that often cause rejection
- Missing privacy policy or inaccurate Data Safety form entries.
- Requesting sensitive permissions (SMS, call logs, contacts, background location) without strong justification or use of the Play-provided permissions declaration.
- Incomplete or misleading app description/screenshots.
- App contains personal health data without clear privacy/consent and contact information — Play may require additional disclosures.
- Crashes or ANRs during review (test builds on multiple devices/Android versions).
- Non-compliance with target SDK version policy (must target recent API level).

Specific checks for a healthcare-like app (this project)
- The app mentions patient data (appointments, prescriptions, billing). Treat this as personal health information:
  - Add a comprehensive privacy policy describing what data is collected, how it is stored, encryption, who can access it, and retention policy.
  - If you process or store Protected Health Information (PHI) and your users are in regions with HIPAA (US) or similar laws, ensure backend handling meets those laws (this is a legal/business requirement beyond Play's review).
- Do not request SMS read permissions to auto-read OTPs unless necessary; instead use OTP via email or manual entry to avoid SMS permission issues.

Practical checklist before upload
- [ ] App builds successfully as AAB and installs on test device.
- [ ] No runtime crashes on Android 11/12/13 (test emulators / real devices).
- [ ] Privacy policy URL is hosted and reachable (HTTPS).
- [ ] Data Safety form filled accurately.
- [ ] All required graphics and screenshots prepared.
- [ ] Keystore saved securely (or EAS-managed key stored by Expo/EAS account).
- [ ] Release notes drafted.

Helpful links
- Play Console: https://play.google.com/console
- EAS Build docs: https://docs.expo.dev/eas/intro/
- Google Play policies: https://support.google.com/googleplay/android-developer/answer/9878810
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469

If you want, I can:
- Add a sample `eas.json` for this repo to build production AABs.
- Add a minimal privacy policy template tailored to this app that you can host.
- Walk through an EAS build and Play Console upload step-by-step while you run commands.


---
File created by the project assistant. Follow the steps above and tell me which part you want me to do next (generate eas.json, sample privacy policy, or prepare Play Console metadata).