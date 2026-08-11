export type ReadNotificationRequest = {
  notificationId: string;
};

const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function parseReadNotificationRequest(
  value: unknown,
): ReadNotificationRequest {
  if (!isRecord(value)) {
    throw new Error('알림 읽음 요청 형식이 올바르지 않습니다.');
  }

  if (
    typeof value.notificationId !== 'string' ||
    !DOCUMENT_ID_PATTERN.test(value.notificationId)
  ) {
    throw new Error('알림 정보가 올바르지 않습니다.');
  }

  return { notificationId: value.notificationId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
