# ChongChong

스터디 운영 서비스 총총의 웹뷰 및 Expo 애플리케이션 모노레포입니다.

## 구성

- `apps/web`: React + TypeScript 기반 웹뷰 UI
- `apps/mobile`: React Native + Expo 기반 네이티브 셸
- `docs`: 아키텍처와 개발 규칙

## 시작하기

```bash
pnpm install
```

Android 에뮬레이터에서 로그인 이후 WebView까지 확인하려면 터미널 두 개를 엽니다.

```bash
# 터미널 1: React 웹 앱
pnpm dev:web

# 터미널 2: Expo 개발 서버
pnpm dev:mobile
```

WebView 같은 네이티브 의존성을 처음 설치하거나 변경한 뒤에는 개발 빌드를 한 번 다시 설치합니다.

```bash
pnpm --dir apps/mobile android
```

개발 중 Android 에뮬레이터는 기본으로 `http://10.0.2.2:5173`의 웹 앱을 엽니다. 배포 빌드에는 `EXPO_PUBLIC_WEB_APP_URL` 환경 변수로 HTTPS 웹 배포 주소를 지정합니다.

## 검증

```bash
pnpm check
```

`pnpm check`는 웹·모바일·Functions 린트, TypeScript 검사, 단위 테스트, 웹 프로덕션 빌드, Expo 프로젝트 진단을 차례로 실행합니다. 동일한 검사는 `main` 또는 `develop` 대상 PR과 두 브랜치의 push에서 GitHub Actions로 실행됩니다.

## 브랜치와 커밋

- `main`: 배포 가능한 코드
- `develop`: 다음 배포를 위한 통합 브랜치
- `feature/*`: 기능 또는 페이지 단위 작업 브랜치
- 커밋 메시지는 Angular 형식인 `type(scope): subject`를 사용합니다.

배포 환경과 EAS 빌드 방법은 [`docs/release.md`](docs/release.md)를 참고합니다.
