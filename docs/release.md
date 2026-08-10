# 배포 환경

## EAS 프로젝트

- 소유자: `eunnns-team`
- 프로젝트: `chongchong`
- Android application ID: `com.chongchong.app`

EAS 프로젝트 연결 ID는 `apps/mobile/app.json`의 `extra.eas.projectId`에서 관리합니다. GitHub 저장소를 이전해도 이 설정을 함께 옮기면 같은 EAS 프로젝트를 계속 사용합니다.

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
