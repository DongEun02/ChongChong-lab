export type NoticeReminderRequest = {
  noticeId: string;
  recipientUserIds: string[];
  studyId: string;
};

const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function parseNoticeReminderRequest(
  value: unknown,
): NoticeReminderRequest {
  if (!isRecord(value)) {
    throw new Error('리마인드 요청 형식이 올바르지 않습니다.');
  }

  const studyId = parseDocumentId(value.studyId, '스터디');
  const noticeId = parseDocumentId(value.noticeId, '공지');
  if (!Array.isArray(value.recipientUserIds)) {
    throw new Error('리마인드 수신자 목록이 필요합니다.');
  }

  const recipientUserIds = [
    ...new Set(
      value.recipientUserIds.map((userId) =>
        parseDocumentId(userId, '수신자'),
      ),
    ),
  ];

  if (recipientUserIds.length === 0 || recipientUserIds.length > 100) {
    throw new Error('리마인드 수신자는 1명 이상 100명 이하여야 합니다.');
  }

  return { noticeId, recipientUserIds, studyId };
}

export function resolveUnreadRecipients(
  requestedUserIds: string[],
  activeMemberIds: string[],
  readByUserIds: string[],
) {
  const activeMembers = new Set(activeMemberIds);
  const readers = new Set(readByUserIds);

  return requestedUserIds.filter(
    (userId) => activeMembers.has(userId) && !readers.has(userId),
  );
}

function parseDocumentId(value: unknown, label: string) {
  if (typeof value !== 'string' || !DOCUMENT_ID_PATTERN.test(value)) {
    throw new Error(`${label} ID가 올바르지 않습니다.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
