export type CreateStudyRequest = {
  description: string;
  memberLimit: number;
  name: string;
};

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
