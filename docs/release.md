# 배포 환경

## EAS 프로젝트

- 소유자: `eunnns-team`
- 프로젝트: `chongchong`
- Android application ID: `com.chongchong.app`

EAS 프로젝트 연결 ID는 `apps/mobile/app.json`의 `extra.eas.projectId`에서 관리합니다. GitHub 저장소를 이전해도 이 설정을 함께 옮기면 같은 EAS 프로젝트를 계속 사용합니다.

## WebView 배포 주소

모바일 앱은 로그인 이후 배포된 React 웹 앱을 WebView로 엽니다. preview·production 빌드 전에 EAS 환경 변수 `EXPO_PUBLIC_WEB_APP_URL`에 HTTPS 웹 배포 주소를 등록합니다. 이 값이 없는 로컬 개발 빌드는 Android 에뮬레이터에서 `http://10.0.2.2:5173`을 사용합니다.

Google Play 제출 빌드에서는 로컬 주소를 사용할 수 없으므로 웹 앱을 먼저 배포하고 production 환경 변수 설정을 확인합니다. WebView는 설정한 웹 앱과 동일한 origin만 내부에서 열고, 외부 URL은 시스템 브라우저로 전달합니다.

## Android 빌드 프로필

`apps/mobile`에서 다음 명령을 실행합니다.

```bash
pnpm dlx eas-cli build --platform android --profile development
pnpm dlx eas-cli build --platform android --profile preview
pnpm dlx eas-cli build --platform android --profile production
```

- `development`: 네이티브 모듈을 테스트하는 개발 클라이언트
- `preview`: 내부 배포용 설치 파일
- `production`: Google Play 제출용 AAB, 원격 버전 코드 자동 증가

## Android 서명 지문

Firebase에는 EAS 서명키의 SHA-1과 Google Play App Signing의 SHA-1을 모두 등록합니다. 현재 EAS 자격증명은 다음 명령으로 확인합니다.

```bash
pnpm dlx eas-cli credentials --platform android
```

서명키와 서비스 계정 키는 저장소에 커밋하지 않고 EAS Credentials에서 관리합니다.

## Android Google 로그인

- Firebase Console의 **Authentication > 로그인 방법**에서 Google 제공업체를 활성화합니다.
- Firebase Android 앱에는 EAS 서명키와 Google Play App Signing의 SHA-1을 모두 등록합니다.
- SHA 지문이나 OAuth 클라이언트를 변경했다면 새 `google-services.json`을 내려받아 `apps/mobile/google-services.json`을 교체합니다.
- 네이티브 모듈을 사용하므로 Expo Go가 아닌 development build에서 로그인합니다.

로컬 Android 빌드에는 JDK 17과 Android SDK가 필요합니다.

## Android 푸시 알림

- 알림 수신 동의는 로그인 직후가 아니라 사용자가 **푸시 알림** 스위치를 켤 때 요청합니다.
- Expo Go에서는 Android 원격 알림을 테스트할 수 없으므로 development build 또는 설치된 APK/AAB를 사용합니다.
- 앱은 Expo Push Token이 아닌 Firebase의 네이티브 FCM 토큰을 등록합니다.
- 토큰은 Firestore의 `users/{uid}/pushTokens/{tokenHash}`에 저장되고, 로그아웃 후 다시 로그인해도 사용자별 설정을 복원합니다.
- 토큰 원문은 문서 ID로 사용하지 않고 SHA-256 해시를 문서 ID로 사용합니다.

Firestore 데이터베이스를 만든 뒤 저장소 루트에서 보안 규칙을 배포합니다.

```bash
pnpm dlx firebase-tools deploy --only firestore:rules --project chongchong-86716
```

`firestore.rules`는 로그인한 사용자가 자신의 푸시 토큰 문서만 읽고 쓸 수 있도록 제한합니다. 실제 알림 발송 서버에서는 Firebase Admin SDK를 사용하며 서비스 계정 키를 저장소에 커밋하지 않습니다.

## 푸시 발송 Functions

Cloud Functions는 Node.js 22 런타임을 사용합니다. 현재 Firestore 데이터베이스 위치가 `nam5`이므로 공식 권장 인접 리전인 `us-central1`에 `deliverPushNotification`을 배포합니다. 배포 전 Firebase 프로젝트를 Blaze 요금제로 전환하고 Cloud Messaging API가 활성화되어 있어야 합니다.

PR을 머지한 뒤 저장소 루트에서 배포합니다.

```bash
git switch develop
git pull origin develop
pnpm install --frozen-lockfile
pnpm dlx firebase-tools deploy --only functions:deliverPushNotification --project chongchong-86716
```

배포 후 Firebase Console의 Firestore 데이터 탭에서 `notificationJobs` 컬렉션에 다음 문서를 생성하면 실제 기기로 테스트할 수 있습니다. `recipientUserIds`에는 Authentication에서 확인한 Firebase UID를 넣습니다.

| 필드 | Firestore 타입 | 예시 |
| --- | --- | --- |
| `status` | string | `pending` |
| `title` | string | `총총` |
| `body` | string | `푸시 알림 테스트예요.` |
| `recipientUserIds` | array | `["Firebase UID"]` |
| `data` | map | `{ "path": "/notices" }` |

문서 생성 후 `status`가 `sent`로 바뀌고 `successCount`가 1 이상이면 FCM 발송에 성공한 것입니다. `failed`인 경우 같은 문서의 `errorMessage`와 Cloud Functions 로그를 확인합니다. 앱 클라이언트는 보안 규칙에 의해 `notificationJobs`를 직접 생성할 수 없습니다.

공지 실데이터와 리마인드 Callable을 반영할 때는 저장소 루트에서 다음을
배포합니다.

```bash
pnpm dlx firebase-tools deploy --only firestore:rules,functions --project chongchong-86716
```

배포 전 `studies/{studyId}`의 `leaderId`, `members` 하위 컬렉션의 활성 멤버,
`notices` 하위 컬렉션의 공지 문서가 준비되어 있어야 실제 리마인드 발송을
검증할 수 있습니다.
