export type CreateAssignmentRequest = {
  content: string;
  deadlineAt: Date;
  reminderAts: Date[];
  studyId: string;
  submissionInstructions: string;
  title: string;
};

export type SubmitAssignmentRequest = {
  assignmentId: string;
  content: string;
  link?: string;
  studyId: string;
};

export type UpdateAssignmentRequest = CreateAssignmentRequest & {
  assignmentId: string;
};

export type DeleteAssignmentRequest = {
  assignmentId: string;
  studyId: string;
};

export type AssignmentReminderRequest = {
  assignmentId: string;
  recipientUserIds: string[];
  studyId: string;
};

export type AssignmentReminderSchedule = {
  dueAt?: Date;
  nextAt?: Date;
};

const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_DISTANCE_MS = 366 * 24 * 60 * 60 * 1000;

export function parseCreateAssignmentRequest(
  value: unknown,
  now = new Date(),
): CreateAssignmentRequest {
  if (!isRecord(value)) {
    throw new Error('과제 작성 요청 형식이 올바르지 않습니다.');
  }

  const deadlineAt = parseFutureDate(value.deadlineAt, '마감 시각', now);
  const reminderAts = parseReminderAts(value.reminderAts, now, deadlineAt);
  return {
    content: parseText(value.content, '과제 내용', 1, 3_000),
    deadlineAt,
    reminderAts,
    studyId: parseDocumentId(value.studyId, '스터디'),
    submissionInstructions: parseText(
      value.submissionInstructions,
      '제출 방법',
      1,
      1_000,
    ),
    title: parseText(value.title, '과제 제목', 1, 50),
  };
}

export function parseSubmitAssignmentRequest(
  value: unknown,
): SubmitAssignmentRequest {
  if (!isRecord(value)) {
    throw new Error('과제 제출 요청 형식이 올바르지 않습니다.');
  }

  return {
    assignmentId: parseDocumentId(value.assignmentId, '과제'),
    content: parseText(value.content, '제출 내용', 1, 3_000),
    link: parseOptionalHttpUrl(value.link),
    studyId: parseDocumentId(value.studyId, '스터디'),
  };
}

export function parseUpdateAssignmentRequest(
  value: unknown,
  now = new Date(),
): UpdateAssignmentRequest {
  if (!isRecord(value)) {
    throw new Error('과제 수정 요청 형식이 올바르지 않습니다.');
  }

  return {
    ...parseCreateAssignmentRequest(value, now),
    assignmentId: parseDocumentId(value.assignmentId, '과제'),
  };
}

export function parseDeleteAssignmentRequest(
  value: unknown,
): DeleteAssignmentRequest {
  if (!isRecord(value)) {
    throw new Error('과제 삭제 요청 형식이 올바르지 않습니다.');
  }

  return {
    assignmentId: parseDocumentId(value.assignmentId, '과제'),
    studyId: parseDocumentId(value.studyId, '스터디'),
  };
}

export function parseAssignmentReminderRequest(
  value: unknown,
): AssignmentReminderRequest {
  if (!isRecord(value) || !Array.isArray(value.recipientUserIds)) {
    throw new Error('과제 리마인드 요청 형식이 올바르지 않습니다.');
  }

  return {
    assignmentId: parseDocumentId(value.assignmentId, '과제'),
    recipientUserIds: [...new Set(value.recipientUserIds.map((userId) =>
      parseDocumentId(userId, '멤버'),
    ))],
    studyId: parseDocumentId(value.studyId, '스터디'),
  };
}

export function resolveAssignmentReminderSchedule(
  value: unknown,
  now = new Date(),
): AssignmentReminderSchedule {
  if (!Array.isArray(value)) {
    return {};
  }
  const reminderAts = value
    .filter((candidate): candidate is Date =>
      candidate instanceof Date && Number.isFinite(candidate.getTime())
    )
    .sort((left, right) => left.getTime() - right.getTime());
  const dueAts = reminderAts.filter((date) => date <= now);
  return {
    dueAt: dueAts.at(-1),
    nextAt: reminderAts.find((date) => date > now),
  };
}

function parseReminderAts(value: unknown, now: Date, deadlineAt: Date) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) {
    throw new Error('리마인드 시각은 1개 이상 5개 이하로 설정해 주세요.');
  }
  const reminderAts = value.map((candidate) => {
    const reminderAt = parseFutureDate(candidate, '리마인드 시각', now);
    if (reminderAt >= deadlineAt) {
      throw new Error('리마인드 시각은 마감 시각보다 빨라야 합니다.');
    }
    return reminderAt;
  }).sort((left, right) => left.getTime() - right.getTime());

  if (reminderAts.some((date, index) =>
    index > 0 && date.getTime() === reminderAts[index - 1]?.getTime()
  )) {
    throw new Error('같은 리마인드 시각을 중복해서 설정할 수 없습니다.');
  }
  return reminderAts;
}

function parseFutureDate(value: unknown, label: string, now: Date) {
  if (typeof value !== 'string') {
    throw new Error(`${label} 형식이 올바르지 않습니다.`);
  }
  const parsed = new Date(value);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed <= now ||
    parsed.getTime() > now.getTime() + MAX_DISTANCE_MS
  ) {
    throw new Error(`${label}은 현재부터 1년 이내로 설정해 주세요.`);
  }
  return parsed;
}

function parseOptionalHttpUrl(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string' || value.length > 2_000) {
    throw new Error('제출 링크 형식이 올바르지 않습니다.');
  }
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error('http 또는 https 링크를 입력해 주세요.');
  }
}

function parseDocumentId(value: unknown, label: string) {
  if (typeof value !== 'string' || !DOCUMENT_ID_PATTERN.test(value)) {
    throw new Error(`${label} 정보가 올바르지 않습니다.`);
  }
  return value;
}

function parseText(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== 'string') {
    throw new Error(`${label}을 입력해 주세요.`);
  }
  const parsed = value.trim();
  if (parsed.length < min || parsed.length > max) {
    throw new Error(`${label}은 ${min}자 이상 ${max}자 이하여야 합니다.`);
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
