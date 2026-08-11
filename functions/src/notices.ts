export type CreateNoticeRequest = {
  content: string;
  reminderAts: Date[];
  studyId: string;
  title: string;
};

const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_REMINDER_COUNT = 5;
const MAX_REMINDER_DISTANCE_MS = 366 * 24 * 60 * 60 * 1000;

export function parseCreateNoticeRequest(
  value: unknown,
  now = new Date(),
): CreateNoticeRequest {
  if (!isRecord(value)) {
    throw new Error('공지 작성 요청 형식이 올바르지 않습니다.');
  }

  const studyId = parseDocumentId(value.studyId);
  const title = parseText(value.title, '공지 제목', 1, 50);
  const content = parseText(value.content, '공지 내용', 1, 3_000);

  if (
    !Array.isArray(value.reminderAts) ||
    value.reminderAts.length < 1 ||
    value.reminderAts.length > MAX_REMINDER_COUNT
  ) {
    throw new Error('리마인드 시각은 1개 이상 5개 이하로 설정해 주세요.');
  }

  const latestAllowedTime = now.getTime() + MAX_REMINDER_DISTANCE_MS;
  const reminderAts = value.reminderAts.map((rawValue) => {
    if (typeof rawValue !== 'string') {
      throw new Error('리마인드 시각 형식이 올바르지 않습니다.');
    }
    const reminderAt = new Date(rawValue);
    if (
      !Number.isFinite(reminderAt.getTime()) ||
      reminderAt.getTime() <= now.getTime() ||
      reminderAt.getTime() > latestAllowedTime
    ) {
      throw new Error('리마인드 시각은 현재부터 1년 이내로 설정해 주세요.');
    }
    return reminderAt;
  });

  reminderAts.sort((left, right) => left.getTime() - right.getTime());
  if (
    reminderAts.some(
      (reminderAt, index) =>
        index > 0 && reminderAt.getTime() === reminderAts[index - 1]?.getTime(),
    )
  ) {
    throw new Error('같은 리마인드 시각을 중복해서 설정할 수 없습니다.');
  }

  return { content, reminderAts, studyId, title };
}

function parseDocumentId(value: unknown) {
  if (typeof value !== 'string' || !DOCUMENT_ID_PATTERN.test(value)) {
    throw new Error('스터디 정보가 올바르지 않습니다.');
  }
  return value;
}

function parseText(
  value: unknown,
  label: string,
  minimumLength: number,
  maximumLength: number,
) {
  if (typeof value !== 'string') {
    throw new Error(`${label}을 입력해 주세요.`);
  }
  const parsed = value.trim();
  if (parsed.length < minimumLength || parsed.length > maximumLength) {
    throw new Error(
      `${label}은 ${minimumLength}자 이상 ${maximumLength}자 이하여야 합니다.`,
    );
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
