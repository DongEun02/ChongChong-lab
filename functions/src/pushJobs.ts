import type { DocumentReference } from 'firebase-admin/firestore';
import type { BatchResponse } from 'firebase-admin/messaging';

const MAX_BODY_LENGTH = 500;
const MAX_DATA_ENTRIES = 20;
const MAX_DATA_KEY_LENGTH = 50;
const MAX_DATA_VALUE_LENGTH = 500;
const MAX_RECIPIENTS = 100;
const MAX_TITLE_LENGTH = 100;

export const FCM_BATCH_SIZE = 500;

export type NotificationJob = {
  body: string;
  data: Record<string, string>;
  recipientUserIds: string[];
  title: string;
};

export type PushTokenTarget = {
  reference: DocumentReference;
  token: string;
};

export function parseNotificationJob(value: unknown): NotificationJob {
  if (!isRecord(value)) {
    throw new Error('알림 작업은 객체여야 합니다.');
  }

  const title = parseRequiredString(value.title, 'title', MAX_TITLE_LENGTH);
  const body = parseRequiredString(value.body, 'body', MAX_BODY_LENGTH);
  const recipientUserIds = parseRecipientUserIds(value.recipientUserIds);
  const data = parseData(value.data);

  if (value.status !== 'pending') {
    throw new Error('status는 pending이어야 합니다.');
  }

  return { body, data, recipientUserIds, title };
}

export function chunkTargets(
  targets: PushTokenTarget[],
  size = FCM_BATCH_SIZE,
): PushTokenTarget[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('배치 크기는 1 이상의 정수여야 합니다.');
  }

  const chunks: PushTokenTarget[][] = [];
  for (let index = 0; index < targets.length; index += size) {
    chunks.push(targets.slice(index, index + size));
  }
  return chunks;
}

export function getInvalidTokenReferences(
  targets: PushTokenTarget[],
  response: BatchResponse,
): DocumentReference[] {
  return response.responses.flatMap((sendResponse, index) => {
    const target = targets[index];
    if (!target || sendResponse.success || !isInvalidTokenError(sendResponse.error?.code)) {
      return [];
    }
    return [target.reference];
  });
}

function parseRecipientUserIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('recipientUserIds에는 사용자가 한 명 이상 필요합니다.');
  }

  const recipientUserIds = [...new Set(value)];
  if (
    recipientUserIds.length > MAX_RECIPIENTS ||
    recipientUserIds.some(
      (userId) => typeof userId !== 'string' || userId.length === 0 || userId.length > 128,
    )
  ) {
    throw new Error('recipientUserIds 형식이 올바르지 않습니다.');
  }

  return recipientUserIds as string[];
}

function parseData(value: unknown): Record<string, string> {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new Error('data는 문자열 값만 포함한 객체여야 합니다.');
  }

  const entries = Object.entries(value);
  if (
    entries.length > MAX_DATA_ENTRIES ||
    entries.some(
      ([key, entryValue]) =>
        key.length === 0 ||
        key.length > MAX_DATA_KEY_LENGTH ||
        typeof entryValue !== 'string' ||
        entryValue.length > MAX_DATA_VALUE_LENGTH,
    )
  ) {
    throw new Error('data 형식이 올바르지 않습니다.');
  }

  return Object.fromEntries(entries) as Record<string, string>;
}

function parseRequiredString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new Error(`${field} 형식이 올바르지 않습니다.`);
  }
  return value;
}

function isInvalidTokenError(code?: string): boolean {
  return (
    code === 'messaging/invalid-registration-token' ||
    code === 'messaging/registration-token-not-registered'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
