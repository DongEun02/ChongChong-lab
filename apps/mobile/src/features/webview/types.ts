export type AppTab = 'home' | 'notices' | 'assignments' | 'members';

export type WebViewMessage =
  | { type: 'create-notice' }
  | { type: 'exit-study' }
  | { type: 'open-notice'; noticeId: string }
  | { type: 'open-notifications' }
  | { type: 'open-profile' }
  | { type: 'study-selected'; studyId: string };
