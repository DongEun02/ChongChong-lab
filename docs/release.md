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
