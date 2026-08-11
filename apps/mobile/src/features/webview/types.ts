export type AppTab = 'home' | 'notices' | 'assignments' | 'members';

export type AssignmentAttachmentMessage = {
  contentType: 'application/pdf';
  name: string;
  size: number;
  storagePath?: string;
  uri?: string;
};

export type WebViewMessage =
  | { type: 'close-notifications' }
  | { type: 'close-create-notice' }
  | { type: 'close-create-assignment' }
  | { type: 'close-assignment' }
  | { type: 'close-create-study' }
  | { type: 'close-join-study' }
  | { type: 'close-notice' }
  | { type: 'copy-invite-link'; inviteUrl: string }
  | {
      type: 'create-study';
      description: string;
      memberLimit: number;
      name: string;
    }
  | {
      type: 'create-notice';
      content: string;
      reminderAts: string[];
      title: string;
    }
  | {
      type: 'create-assignment';
      content: string;
      deadlineAt: string;
      reminderAts: string[];
      submissionInstructions: string;
      title: string;
    }
  | { type: 'delete-notice'; noticeId: string }
  | { type: 'delete-study'; studyName: string }
  | { type: 'edit-notice'; noticeId: string }
  | { type: 'exit-study' }
  | { type: 'join-study'; inviteUrl: string }
  | { type: 'open-notice'; noticeId: string }
  | { type: 'open-create-study' }
  | { type: 'open-create-notice' }
  | { type: 'open-assignment'; assignmentId: string }
  | { type: 'open-create-assignment' }
  | { type: 'open-join-study' }
  | { type: 'open-notifications' }
  | {
      type: 'open-notification';
      assignmentId?: string;
      notificationId: string;
      noticeId?: string;
      studyId?: string;
    }
  | { type: 'open-profile' }
  | { type: 'pick-assignment-attachment'; assignmentId: string }
  | { type: 'remove-study-member'; displayName: string; memberId: string }
  | { type: 'send-notice-reminder'; memberIds: string[]; noticeId: string }
  | { type: 'send-assignment-reminder'; assignmentId: string; memberIds: string[] }
  | { type: 'study-selected'; studyId: string }
  | {
      type: 'submit-assignment';
      assignmentId: string;
      attachment?: AssignmentAttachmentMessage;
      content: string;
      link?: string;
      previousStoragePath?: string;
    }
  | {
      type: 'update-notice';
      content: string;
      noticeId: string;
      reminderAts: string[];
      title: string;
    };
