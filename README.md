# ChongChong

스터디 운영 서비스 총총의 웹뷰 및 Expo 애플리케이션 모노레포입니다.

## 구성

- `apps/web`: React + TypeScript 기반 웹뷰 UI
- `apps/mobile`: React Native + Expo 기반 네이티브 셸
- `docs`: 아키텍처와 개발 규칙

## 시작하기

```bash
pnpm install
pnpm dev:web
pnpm dev:mobile
```

## 검증

```bash
pnpm check
```

## 브랜치와 커밋

- `main`: 배포 가능한 코드
- `develop`: 다음 배포를 위한 통합 브랜치
- `feature/*`: 기능 또는 페이지 단위 작업 브랜치
- 커밋 메시지는 Angular 형식인 `type(scope): subject`를 사용합니다.
