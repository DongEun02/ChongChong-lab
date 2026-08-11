export type AppTab = 'home' | 'notices' | 'assignments' | 'members';

export type WebViewMessage =
  | { type: 'close-create-study' }
  | { type: 'close-notice' }
  | {
      type: 'create-study';
      description: string;
      memberLimit: number;
      name: string;
    }
  | { type: 'create-notice' }
  | { type: 'delete-notice'; noticeId: string }
  | { type: 'edit-notice'; noticeId: string }
  | { type: 'exit-study' }
  | { type: 'join-study'; inviteUrl: string }
  | { type: 'open-notice'; noticeId: string }
  | { type: 'open-create-study' }
  | { type: 'open-join-study' }
  | { type: 'open-notifications' }
  | { type: 'open-profile' }
  | { type: 'send-notice-reminder'; memberIds: string[]; noticeId: string }
  | { type: 'study-selected'; studyId: string };
