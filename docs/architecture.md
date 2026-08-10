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

### 푸시 발송 경계

앱은 FCM 토큰 등록과 알림 수신만 담당합니다. 실제 발송은 Firebase Admin SDK 권한을 가진 서버가 `notificationJobs/{jobId}` 문서를 생성하면 Cloud Functions가 처리합니다. 클라이언트는 Firestore 보안 규칙상 발송 작업을 읽거나 쓸 수 없습니다.

발송 함수는 다음 순서로 동작합니다.

1. `pending` 작업의 필수 필드와 크기 제한을 검증합니다.
2. 트랜잭션으로 작업을 선점해 중복 이벤트 처리를 막습니다.
3. 수신자별 활성 FCM 토큰을 조회하고 500개 단위로 발송합니다.
4. FCM에서 만료 또는 미등록으로 응답한 토큰을 삭제합니다.
5. 작업 문서에 성공·실패·대상 수와 완료 상태를 기록합니다.

## 계정 삭제 규칙

스터디 리드는 리드 권한을 다른 멤버에게 양도하기 전에는 회원 탈퇴를 완료할 수 없습니다. 모든 리드 권한을 양도한 사용자는 계정과 연결 데이터를 삭제할 수 있습니다.

## WebView 보안 원칙

- 허용된 자사 origin만 WebView 내부에서 엽니다.
- 외부 URL은 시스템 브라우저로 전달합니다.
- 네이티브 브리지는 명시된 메시지 타입만 처리합니다.
- OAuth 자격 증명과 장기 토큰을 WebView 메시지에 직접 노출하지 않습니다.
