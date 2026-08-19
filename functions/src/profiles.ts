const MAX_DISPLAY_NAME_LENGTH = 8;

export function parseUpdateProfileRequest(value: unknown) {
  if (!isRecord(value) || typeof value.displayName !== 'string') {
    throw new Error('이름을 입력해 주세요.');
  }

  const displayName = value.displayName.trim();
  if (displayName.length === 0) {
    throw new Error('이름을 입력해 주세요.');
  }
  if (Array.from(displayName).length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error('이름은 8글자 이하로 입력할 수 있어요.');
  }

  return { displayName };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
