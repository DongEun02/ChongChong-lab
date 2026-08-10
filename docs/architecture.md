# 애플리케이션 아키텍처

## 런타임 경계

### Web

React와 TypeScript로 로그인 이후의 서비스 화면과 비즈니스 UI를 구현합니다. 웹은 Firebase Authentication 세션과 Firestore 데이터를 사용하며 모바일 셸과 타입이 지정된 메시지로 통신합니다.

### Mobile

React Native와 Expo로 다음 네이티브 기능을 담당합니다.

- Android Google 로그인
- iOS Apple 로그인
- 홈, 공지, 과제, 멤버 하단 탭
- WebView 생명주기, 뒤로가기, 외부 링크 처리
- FCM 토큰 등록, 푸시 수신, 알림 딥링크

### Firebase

- Authentication: 플랫폼별 OAuth 계정을 동일한 사용자 모델로 연결
- Firestore: 사용자, 스터디, 공지, 과제, 제출, 알림 데이터
- Cloud Functions: 권한이 필요한 쓰기, 리마인드 예약, 푸시 발송, 연쇄 삭제
- Cloud Messaging: 네이티브 푸시 전송

## 계정 삭제 규칙

스터디 리드는 리드 권한을 다른 멤버에게 양도하기 전에는 회원 탈퇴를 완료할 수 없습니다. 모든 리드 권한을 양도한 사용자는 계정과 연결 데이터를 삭제할 수 있습니다.

## WebView 보안 원칙

- 허용된 자사 origin만 WebView 내부에서 엽니다.
- 외부 URL은 시스템 브라우저로 전달합니다.
- 네이티브 브리지는 명시된 메시지 타입만 처리합니다.
- OAuth 자격 증명과 장기 토큰을 WebView 메시지에 직접 노출하지 않습니다.
