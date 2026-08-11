export type StudyMember = {
  displayName: string
  id: string
  role: 'leader' | 'member'
}

export function parseStudyMembers(value: unknown): StudyMember[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const members = value.map(parseStudyMember)
  return members.every((member) => member !== null)
    ? (members as StudyMember[])
    : null
}

function parseStudyMember(value: unknown): StudyMember | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const member = value as Record<string, unknown>
  if (
    typeof member.id !== 'string' ||
    typeof member.displayName !== 'string' ||
    (member.role !== 'leader' && member.role !== 'member')
  ) {
    return null
  }

  return {
    displayName: member.displayName,
    id: member.id,
    role: member.role,
  }
}
