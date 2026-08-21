export function formatReminderDateTime(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '리마인드 시각 선택'

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
