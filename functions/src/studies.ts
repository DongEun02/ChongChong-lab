export type CreateStudyRequest = {
  description: string;
  memberLimit: number;
  name: string;
};

export type JoinStudyRequest = {
  studyId: string;
};

const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function parseCreateStudyRequest(value: unknown): CreateStudyRequest {
  if (!isRecord(value)) {
    throw new Error('스터디 생성 요청 형식이 올바르지 않습니다.');
  }

  const name = parseText(value.name, '스터디 이름', 1, 15);
  const description = parseOptionalText(value.description, '스터디 설명', 30);
  const memberLimit = value.memberLimit;

  if (
    typeof memberLimit !== 'number' ||
    !Number.isInteger(memberLimit) ||
    memberLimit < 2 ||
    memberLimit > 30
  ) {
    throw new Error('스터디 인원은 2명 이상 30명 이하여야 합니다.');
  }

  return { description, memberLimit, name };
}

export function parseJoinStudyRequest(value: unknown): JoinStudyRequest {
  if (!isRecord(value) || typeof value.inviteUrl !== 'string') {
    throw new Error('초대 링크를 입력해 주세요.');
  }

  const rawUrl = value.inviteUrl.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(
      rawUrl.startsWith('chongchong.app/') ? `https://${rawUrl}` : rawUrl,
    );
  } catch {
    throw new Error('초대 링크 형식이 올바르지 않습니다.');
  }

  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
  const studyId = pathSegments[1];
  if (
    parsedUrl.hostname !== 'chongchong.app' ||
    pathSegments.length !== 2 ||
    pathSegments[0] !== 'join' ||
    !studyId ||
    !DOCUMENT_ID_PATTERN.test(studyId)
  ) {
    throw new Error('총총에서 발급된 초대 링크만 사용할 수 있습니다.');
  }

  return { studyId };
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

function parseOptionalText(value: unknown, label: string, maximumLength: number) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new Error(`${label} 형식이 올바르지 않습니다.`);
  }

  const parsed = value.trim();
  if (parsed.length > maximumLength) {
    throw new Error(`${label}은 ${maximumLength}자 이하여야 합니다.`);
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
