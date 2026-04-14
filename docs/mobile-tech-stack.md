# Mobile Tech Stack Research — MiniMax Studio

**Status**: Draft | **Version**: 1.0 | **Date**: 2026-04-09
**Author**: Mobile Engineer | **Sprint**: Content Sprint 1, Task 2.1

This document evaluates mobile development frameworks, AI integration strategies, and camera pipeline designs to guide the MiniMax Studio mobile app build. Target latency is under 3 seconds end-to-end.

---

## 1. Executive Summary

MiniMax Studio mobile app core flow: user captures an idea (text, voice, or camera) → AI generates a visual → user receives the result. The critical engineering constraint is **sub-3-second latency** from capture to first pixel.

The recommendation is **React Native with a native module bridge** for the MVP, with a fallback evaluation of **Flutter** if cross-platform animation fidelity or camera pipeline performance becomes a bottleneck. Native development (Swift/Kotlin) is deprioritized for MVP due to doubled engineering cost across iOS and Android.

---

## 2. Framework Comparison

### Comparison Table

| Dimension | iOS/Android Native (Swift + Kotlin) | React Native (0.76+) | Flutter 3.24+ | Kotlin Multiplatform (KMP) |
|---|---|---|---|---|
| **Language** | Swift, Kotlin | TypeScript / JavaScript | Dart | Kotlin (shared) + Swift/Kotlin UI |
| **Code sharing** | 0% (separate codebases) | ~90% (one codebase, both platforms) | ~95% (one codebase, both platforms) | ~70% (logic shared, UI native) |
| **Time to MVP** | 2x (two codebases) | 1x (baseline) | 1.1x (slightly longer ramp) | 1.3x (KMP + native UI setup) |
| **Camera/Vision APIs** | Full native access (AVFoundation, CameraX) | Native module bridge required | Full via platform channels | Native module bridge required |
| **AI inference on-device** | Core ML (iOS), ML Kit / TFLite (Android) | Requires native module bridge | Plugin ecosystem (tflite_flutter) | Shared Kotlin inference layer + native bindings |
| **Animation performance** | 60fps native, Metal/Core Animation | JS thread can drop frames; Reanimated 4.x helps | 60fps built-in, Skia renderer | Native frame rates via Compose/UIKit |
| **App store distribution** | Direct | Direct | Direct | Direct (shared business logic, native shells) |
| **Hot reload / DevX** | Partial (SwiftUI previews) | Full (Metro bundler) | Full (Hot Reload) | Partial (Compose preview) |
| **Ecosystem maturity** | Mature (2014+) | Very mature (2015+) | Mature (2017+) | Growing (2019+) |
| **Hiring pool (2026)** | Good | Excellent | Good | Limited niche |
| **Typical app size overhead** | 0MB baseline | ~15-25MB (JS runtime) | ~15-20MB (Flutter engine) | ~5-10MB (KMP runtime only) |
| **MiniMax Studio fit score** | ★★★★☆ | ★★★★★ | ★★★★☆ | ★★★☆☆ |

### Detailed Analysis

#### iOS/Android Native — Swift + Kotlin

**Pros**
- Full, unimpeded access to every platform API including AVFoundation, CameraX, ARKit, and Core ML.
- Best-in-class performance for compute-heavy tasks: AI inference, real-time image processing, and 60fps animations with zero JS thread overhead.
- Direct Metal (iOS) and Vulkan (Android) GPU access for custom rendering pipelines.

**Cons**
- Two separate codebases. Every feature is implemented twice, in two languages, with two review queues. Doubles QA surface and doubles CI pipeline complexity.
- Hiring two specialist teams (Swift iOS + Kotlin Android) is expensive and slow to scale.
- Faster iteration is possible per-platform but the combined velocity is lower.

**When to choose**: High-fidelity AR experiences, real-time video processing, or apps where 3-5ms rendering latency is a hard requirement (e.g., gaming, live video). Not recommended for MVP given team size constraints.

#### React Native (0.76+) — Recommended for MVP

**Pros**
- Single TypeScript codebase compiles to both iOS and Android. Feature parity is achieved once, deployed twice.
- React Native 0.76+ ships with New Architecture (Fabric renderer + JSI) enabled by default, closing the performance gap with native for most UI workloads.
- `react-native-reanimated` v4 delivers near-native animation performance on the UI thread, bypassing the JS thread entirely.
- Camera access via `react-native-vision-camera` v4 — a performant, frame-processor-ready camera library with direct access to native camera streams. This is critical for MiniMax Studio's <3s pipeline.
- `expo-camera` as an alternative for faster initial setup (though `vision-camera` offers lower-level control needed for the AI pipeline).
- AI inference via `expo-local-aa` (on-device LLM) and TensorFlow Lite through `tflite-react-native` or custom native modules.
- Largest hiring pool. Easiest to bring contractors or new hires up to speed.

**Cons**
- JavaScript thread is still a bottleneck for complex real-time video processing — mitigated by pushing heavy lifting to native modules.
- Native module bridge (TurboModules in New Architecture) requires Swift/Kotlin for any custom platform code, adding a secondary skill requirement.
- App bundle size overhead (~15-25MB) compared to native.

**Fit for MiniMax Studio**: Strongest. The camera pipeline is the only area requiring native code, and React Native's New Architecture handles this cleanly via VisionCamera + Reanimated.

#### Flutter 3.24+

**Pros**
- Dart compiles to native ARM with zero JS overhead. Best raw performance among cross-platform options.
- `camera` package and `gpu_image` for camera access. `ffigen`-based TFLite bindings for on-device AI.
- Single widget tree, single paint pass — consistent, predictable rendering across platforms.
- `flutter_realtime_face_detection` and `google_mlkit` plugins handle vision use cases well.
- Excellent animation engine (built on Skia) — ideal for smooth generative-AI result transitions.

**Cons**
- Dart is a niche language. Hiring is harder. Onboarding is longer than React Native (TypeScript).
- Platform channels are required for native camera/GPU access, which is essentially the same bridge complexity as React Native's native modules — but in a less familiar language.
- Flutter's widget system creates a semantic gap when integrating native camera preview layers (AVCaptureVideoPreviewLayer on iOS, TextureView/SurfaceView on Android) — these require platform views that are more complex than React Native's equivalent.
- Less mature FFI for cutting-edge ML frameworks compared to the React Native + npm ecosystem.

**Fit for MiniMax Studio**: Good. Flutter is the strongest cross-platform performer, but React Native's TypeScript ecosystem, hiring pool, and VisionCamera's direct frame processor access give it the edge for this specific use case.

#### Kotlin Multiplatform (KMP)

**Pros**
- Share business logic (API clients, state management, data models) across platforms in Kotlin while writing native UI with SwiftUI (iOS) and Jetpack Compose (Android).
- Shared AI inference logic in Kotlin — same model loading and preprocessing code runs on both platforms.
- App size overhead is minimal (5-10MB) because native UI frameworks are used directly.
- JetBrains toolchain is mature (Kotlin, Gradle, Android Studio, Fleet IDE).

**Cons**
- UI is not shared. You write the camera screen in SwiftUI and again in Compose. The visual UI layer is doubled.
- KMP + native UI setup is complex. The Gradle configuration alone can consume days of engineering time.
- React Native's native module bridge (TurboModules) achieves similar logic sharing with a simpler setup and a larger ecosystem.
- Camera pipeline (the most critical path for MiniMax Studio) is implemented natively on both platforms regardless of KMP choice.

**Fit for MiniMax Studio**: Moderate. KMP excels when the shared logic is complex and the UI is simple. MiniMax Studio's core complexity is in the camera/vision pipeline which is inherently platform-specific, negating KMP's main advantage.

---

## 3. AI Integration Strategy

### Strategic Decision: Cloud-First, On-Device Caching

MiniMax Studio's core value proposition — **<3s latency from idea capture to visual** — is the primary driver. A cloud-first architecture is the correct choice for the MVP, with selective on-device caching to reduce perceived latency on repeat/similar requests.

### Strategy Comparison

| Strategy | Latency | Offline Capable | Model Quality | App Size | Complexity | MiniMax Fit |
|---|---|---|---|---|---|---|
| **On-Device Only** | <100ms (no network) | Yes | Medium (quantized models only) | +200-500MB | High (ML runtime) | No — image gen models too large for mobile |
| **Cloud Only** | 1-3s (depends on API call) | No | Best (full models) | +0MB | Low (API calls) | Yes (MVP choice) |
| **Hybrid: Cloud + On-Device Cache** | <500ms (cached) / 1-3s (uncached) | Partial | Best (full models) | +50-100MB | Medium | Yes (v2 choice) |
| **Hybrid: Cloud + On-Device Upscaling** | 1-2s + <100ms upscaling | Partial | Best | +20-50MB | Medium | Yes (v2 choice) |

### Recommended Architecture: Cloud-First with Progressive Enhancement

```
[Capture Input] → [Preprocessing] → [Cloud AI API] → [Result Display]
                                    ↑
                              [Cache Layer]
                              (on-device, v2)
```

**MVP Phase (Cloud Only)**
- All AI inference happens server-side via MiniMax's existing API (already designed in `ai-integration.md`).
- Mobile app sends text/voice/image input to `POST /api/generate` endpoint.
- Server returns a CDN URL of the generated image.
- Latency target: <3s on a 4G/LTE connection (accounting for ~500ms round-trip network + 1-2s AI generation).
- App shows a skeleton/loading state during the wait.

**v2 Phase (Hybrid — On-Device Cache)**
- Cache generated images on-device using a hash of the prompt + parameters as the key.
- For repeat or semantically similar prompts (fuzzy match), serve the cached image instantly.
- Estimated cache hit rate for creative workflows: 20-30% (based on prompt similarity patterns in iterative workflows).
- Cache storage: 500MB max per device, LRU eviction.

**v2 Phase (Hybrid — On-Device Upscaling)**
- Cloud API returns a 1024x1024 base image.
- On-device TFLite model performs 2x super-resolution upscaling to 2048x2048 locally.
- This reduces the cloud payload by ~75% (1024x1024 JPEG is ~200KB vs 2048x2048 at ~800KB) and enables offline upscaling for repeat generations.

**On-Device Model Suitability by Task**

| Task | On-Device Feasible? | Recommended Model | Notes |
|---|---|---|---|
| Text-to-Image (full generation) | No | — | Requires >7B parameter models. Not practical on mobile. |
| Image-to-Image / Style Transfer | Partial | Stable Diffusion TFLite (800MB+) | Technically possible but app size impact is severe. Best left for v3. |
| Voice-to-Text (STT) | Yes | Whisper Turbo TFLite (~150MB) | Strong candidate for on-device voice transcription in v2. |
| Image Classification / Scene Detection | Yes | MobileNet V3 (~10MB) | Lightweight, good for auto-tagging or quality filtering. |
| Image Upscaling / Super-Resolution | Yes | Real-ESRGAN TFLite (~20MB) | Good candidate for v2 hybrid upscaling. |
| Face/Object Detection (input QA) | Yes | BlazeFace (~1MB), YOLO-TFLite (~50MB) | Use for pre-upload quality checks per User Story 5 AC-8. |

**API Integration Points**

The mobile app integrates with the backend API defined in `ai-integration.md`. Additional endpoints for mobile-specific flows:

| Endpoint | Method | Purpose | Priority |
|---|---|---|---|
| `POST /api/generate` | POST | Submit capture for AI generation | P0 (MVP) |
| `GET /api/generate/:id/status` | GET | Poll generation status (for long-running jobs) | P0 (MVP) |
| `GET /api/generate/:id/result` | GET | Fetch generated image URL | P0 (MVP) |
| `POST /api/generate/voice` | POST | Voice note → STT → generation pipeline | P1 (v1) |
| `POST /api/generate/image-ref` | POST | Photo reference → style transfer pipeline | P1 (v1) |

---

## 4. Camera + Vision Pipeline Technical Design

### Pipeline Overview

The camera/vision pipeline is the most performance-critical component. It must:
1. Capture a high-quality photo or video frame
2. Preprocess the input (resize, normalize, compress)
3. Send to the AI generation pipeline
4. Display the result with a smooth transition

Target end-to-end latency: **<3 seconds** (capture to first pixel of result).

### Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     CAMERA + VISION PIPELINE                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [1. CAPTURE]                                                     │
│  User taps capture → VisionCamera (RN) triggers AVCaptureSession │
│  or CameraX → Full-resolution photo frame acquired                │
│  → ~50ms                                                          │
│                                                                   │
│  [2. QUALITY CHECK]                                              │
│  BlazeFace (<1MB) runs on-device to detect:                       │
│  - Face presence (for face-aware enhancements)                    │
│  - Blur score (Laplacian variance on downscaled image)           │
│  - Brightness level (mean pixel value)                            │
│  → Reject with user-friendly error if below threshold            │
│  → ~100ms (on-device, parallelizable)                            │
│                                                                   │
│  [3. PREPROCESSING]                                               │
│  - Resize to max 1024px on longest edge (client-side)            │
│  - Apply Exif orientation correction                              │
│  - Compress to JPEG quality 85                                    │
│  → ~80ms                                                         │
│                                                                   │
│  [4. API SUBMISSION]                                              │
│  Upload JPEG payload to POST /api/generate/image-ref             │
│  → ~300-800ms depending on connection (4G: ~500ms for 200KB)     │
│                                                                   │
│  [5. AI GENERATION]                                               │
│  Server-side (MiniMax API)                                        │
│  → ~1000-1500ms                                                   │
│                                                                   │
│  [6. RESULT DELIVERY]                                             │
│  App receives CDN URL → Prefetch image → Display                  │
│  → ~200ms                                                         │
│                                                                   │
│  TOTAL ESTIMATED: ~2.0-3.0s on 4G                                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Capture Layer
- **Library**: `react-native-vision-camera` v4 (`vision-camera` on npm)
- **Why**: Provides direct access to `AVCaptureSession` (iOS) and `CameraX` (Android) with a React-friendly API. Supports photo capture with full EXIF metadata preservation.
- **Key features used**: HDR photo capture, EXIF extraction (orientation, GPS), manual exposure control for low-light scenarios.
- **Alternative**: `expo-camera` — faster to set up but lower-level frame processor access. Use for MVP prototyping; migrate to `vision-camera` if frame-level AI preprocessing is needed.

#### On-Device Quality Check
- **Library**: Custom TFLite model integration via `tflite-react-native` or a native module.
- **Models**:
  - BlazeFace (`blazeface.tflite`, <1MB) — face detection
  - Custom blur/brightness scorer — lightweight JS or TFLite
- **Flow**: After capture, run detection on the full-resolution frame in a background thread. Display error overlay if quality is insufficient (per User Story 5 AC-8).

#### Preprocessing
- **Library**: `react-native-image-resizer` or custom native module using Core Graphics (iOS) / Bitmap (Android).
- **Transforms**:
  - Max dimension: 1024px (preserves detail for AI while minimizing upload)
  - Format: JPEG, quality 85 (good balance of file size vs quality)
  - Orientation: Normalize to Exif orientation 1 via rotation/crop
  - Color: Optional sRGB normalization if AI provider expects calibrated input

#### AI Submission
- **Protocol**: Multipart form upload to REST API.
- **Retry**: 2 retries with exponential backoff (10s, 30s) on network failure.
- **Timeout**: 45 seconds total before showing failure UI (per User Story 5 AC-4).

#### Result Display
- **Loading state**: Skeleton UI matching the result card dimensions. Animated shimmer effect at 60fps using Reanimated.
- **Result**: Fade-in transition (300ms, ease-out) from skeleton to image. Supports pinch-to-zoom via `react-native-gesture-handler`.
- **Comparison mode**: Side-by-side original + result using `reanimated` layout animations.

### Frame Processor Option (Future Enhancement)

For Story 5 (Photo-to-AI-Visual), the VisionCamera frame processor enables real-time AI on the camera preview stream:

```
Camera Preview → Frame Processor → Style Transfer (lightweight) → AR Overlay
                                            ↓
                              Full Resolution Capture → Cloud API
```

- **Library**: `@shopify/react-native-skia` + VisionCamera frame processor
- **Use case**: Show a live "AI preview" style overlay on the camera screen before the user captures, giving them real-time feedback on the transformation style.
- **Note**: This is a v2 feature. The MVP captures first, then sends to the cloud. Frame-level processing adds complexity and is not required for the <3s latency target.

### Offline Behavior

| Scenario | Behavior | Priority |
|---|---|---|
| No network during capture | Show offline banner, queue the capture locally | P0 |
| Network timeout (>45s) | Show retry button with error message | P0 |
| API returns 5xx | Retry with backoff; after 3 failures, show "Try again later" | P0 |
| Image upload fails mid-transfer | Resume-capable upload (multipart) or retry from scratch | P1 |

---

## 5. Development Timeline

### Team Configuration

| Role | Headcount | Responsibilities |
|---|---|---|
| **Tech Lead / Senior Mobile Engineer** | 1 | Architecture, native module development, CI/CD, final review |
| **Mobile Engineer (React Native)** | 1-2 | Feature development, UI/UX implementation, API integration |
| **Backend Engineer** | 1 | API endpoints, AI pipeline, queue system, CDN integration |
| **Product Manager** | 0.5 | Prioritization, acceptance criteria, stakeholder alignment |
| **QA / Designer** | Shared | Sprint review, visual QA, accessibility check |

**Minimum viable team for MVP**: 3 engineers (1 lead + 1 RN + 1 backend). 4 engineers (1 lead + 2 RN + 1 backend) cuts timeline by ~30%.

### Milestones

```
Month 1          Month 2          Month 3          Month 4
|---------------|---------------|---------------|---------------|
                |               |               |
Sprint 1-4      Sprint 5-8      Sprint 9-12     Sprint 13-16
M1: Core        M2: Core        M3: Polish      M4: v1
Foundation      Launch-Ready    & Launch        Public
                |               |               |
                - Text gen      - Performance   - App Store
                - Result        - Error         listing
                display         handling       - Analytics
                - Skeleton      - Sharing       - Real user
                UI              - Social        feedback
                - Basic         share           - Iterative
                error           - Dashboard     fixes
                handling        (Story 4)
```

### Phase Details

#### M1 — Core Foundation (Sprints 1-4, Weeks 1-8)

| Sprint | Goal | Deliverables |
|---|---|---|
| 1-2 | Project setup + Camera capture | React Native project scaffolded. VisionCamera integrated. Photo capture works on iOS + Android. EXIF extraction working. |
| 3 | AI pipeline integration | `POST /api/generate` endpoint integrated. Text-to-image generation works end-to-end. Result display with skeleton loading. |
| 4 | Voice + text input flows | Voice-to-text (STT) via Web Speech API or `react-native-voice`. Text input flow with validation. Error handling for all failure modes. |

**M1 Exit Criteria**: A user can type a prompt, receive a generated image, and view it — on both iOS and Android. Error states handled gracefully.

#### M2 — MVP Launch-Ready (Sprints 5-8, Weeks 9-16)

| Sprint | Goal | Deliverables |
|---|---|---|
| 5-6 | Photo-to-AI-Visual (Story 5) | Camera capture + gallery selection. Quality checks (blur, brightness). Image preprocessing. Style transfer via API. Side-by-side comparison. |
| 7 | Polish + performance | Latency profiling end-to-end. Optimize camera pipeline. Reduce time-to-first-pixel. Polish animations with Reanimated. |
| 8 | Social sharing + export | Download as PNG. Share to Instagram/TikTok via native share sheets. App icon + splash screen. |

**M2 Exit Criteria**: App meets <3s latency target on 4G. All P0 + P1 user stories implemented. App Store (iOS) and Play Store (Android) submission ready.

#### M3 — Polish & Public Launch (Sprints 9-12, Weeks 17-24)

- Iterative refinement (Story 6, Phase 1)
- Analytics integration (Story 4)
- Performance monitoring (crash reporting, latency metrics)
- Public beta / soft launch

#### M4 — v1 Public Release (Sprints 13-16, Weeks 25-32)

- App Store + Play Store public launch
- On-device caching (v2 hybrid strategy)
- Voice input polishing
- User feedback loop iteration

### Timeline Risk Factors

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| VisionCamera integration complexity underestimated | Medium | High | Spike in Sprint 1 week 1 — validate frame processor access before committing to RN |
| AI API latency >2s causes end-to-end miss | Medium | High | Validate MiniMax API SLA in Sprint 3; add client-side optimizations (pre-warm connection) |
| Dual-platform testing doubles QA effort | High | Medium | Automate UI regression with Detox (React Native E2E). Start CI on day 1. |
| React Native New Architecture edge cases | Low | Medium | Stay on stable RN 0.76.x. Avoid canary builds until v1 is stable. |
| On-device quality check models too slow | Low | Medium | Run models on a background thread; degrade gracefully (skip check on slow devices). |

---

## 6. Recommendation

### Primary Recommendation: React Native 0.76+

**Rationale**

React Native is the correct choice for MiniMax Studio's MVP given three converging constraints:

1. **Team size**: A 3-4 person mobile team cannot sustain two separate native codebases. Code sharing is not a nice-to-have — it is a survival requirement.

2. **Camera pipeline**: `react-native-vision-camera` v4 with frame processors provides the low-level camera access required for MiniMax Studio's capture flow. The New Architecture (Fabric + JSI) removes the JS thread bottleneck for the critical rendering path.

3. **Ecosystem velocity**: The TypeScript + npm ecosystem (VisionCamera, Reanimated, Gesture Handler, MMKV, react-native-fs) covers every requirement in the pipeline. No custom native code is needed for MVP beyond the vision camera integration.

**The one exception**: If the team includes a Flutter specialist and no React Native expertise, Flutter is the stronger choice — developer familiarity outweighs the TypeScript ecosystem advantage. In that scenario, Flutter with `vision_camera` and `tflite_flutter` achieves equivalent outcomes.

### Fallback: Flutter 3.24+

If React Native proves unable to meet the <3s latency target (particularly if the camera pipeline or animation performance degrades on the JS thread), Flutter is the fallback because:

- Dart compiles to native ARM with zero JS overhead.
- The Skia-based animation engine delivers consistent 60fps for result transitions without configuration.
- The camera plugin ecosystem is mature enough for production use.

**Switch trigger**: If profiling in Sprint 7 reveals frame drops below 50fps on result display animations OR if VisionCamera frame processor throughput cannot sustain the required capture pipeline, escalate to Flutter spike in Sprint 8.

### Out of Scope for MVP

The following are deliberately excluded from the MVP recommendation but documented for future phases:

- AR/VR integration (ARKit / ARCore)
- On-device image generation models
- Real-time video-to-video style transfer
- Multi-user collaboration features
- Cross-platform reactive sync (CRDT-based)

---

## 7. Appendix: Key Technology Stack Summary

### Mobile App

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | React Native | 0.76.x | Cross-platform app shell |
| Language | TypeScript | 5.x | Type-safe development |
| Camera | react-native-vision-camera | 4.x | Photo/video capture |
| Animation | react-native-reanimated | 4.x | 60fps UI animations |
| Gestures | react-native-gesture-handler | 2.x | Pinch, pan, swipe |
| State | Zustand | 5.x | Lightweight global state |
| Storage | react-native-mmkv | 3.x | Fast key-value cache |
| HTTP | axios / fetch | — | API communication |
| Image resize | react-native-image-resizer | 3.x | Client-side preprocessing |
| E2E testing | Detox | 20.x | Cross-platform UI automation |

### Backend (existing, from `ai-integration.md`)

| Layer | Technology | Notes |
|---|---|---|
| API Server | Node.js / Fastify | REST API per OpenAPI spec |
| Database | PostgreSQL | Ideas table, status tracking |
| Queue | BullMQ | Background job processing |
| AI Provider | MiniMax API | Text-to-image generation |
| CDN | Cloudflare R2 / S3 + CloudFront | Result image delivery |
| Email | Resend / SendGrid | User notifications |

---

*Document Version: 1.0 — Content Sprint 1, Task 2.1*
