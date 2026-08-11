export type AppTab = 'home' | 'notices' | 'assignments' | 'members';

export type WebViewMessage =
  | { type: 'exit-study' }
  | { type: 'open-notifications' }
  | { type: 'open-profile' }
  | { type: 'study-selected'; studyId: string };
