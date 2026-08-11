export type AppTab = 'home' | 'notices' | 'assignments' | 'members';

export type WebViewMessage =
  | { type: 'close-notice' }
  | { type: 'create-notice' }
  | { type: 'delete-notice'; noticeId: string }
  | { type: 'edit-notice'; noticeId: string }
  | { type: 'exit-study' }
  | { type: 'open-notice'; noticeId: string }
  | { type: 'open-notifications' }
  | { type: 'open-profile' }
  | { type: 'send-notice-reminder'; memberIds: string[]; noticeId: string }
  | { type: 'study-selected'; studyId: string };
