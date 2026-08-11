import submissionLinkIcon from '../../assets/figma/submission-link.svg'
import clockIcon from '../../assets/figma/clock.svg'
import {
  formatAssignmentDeadline,
  getAssignmentPreview,
  type AssignmentSummary,
} from './assignments'
import './AssignmentListPage.css'

type AssignmentListPageProps = {
  assignments: AssignmentSummary[]
  onCreate: () => void
  onOpen: (assignmentId: string) => void
  role: 'leader' | 'member'
  status: 'error' | 'loading' | 'ready'
}

export function AssignmentListPage({
  assignments,
  onCreate,
  onOpen,
  role,
  status,
}: AssignmentListPageProps) {
  return (
    <section className="assignment-list-page">
      {status === 'loading' ? (
        <p className="assignment-data-state">과제 데이터를 불러오고 있어요.</p>
      ) : status === 'error' ? (
        <p className="assignment-data-state is-error">
          과제 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      ) : assignments.length === 0 ? (
        <p className="assignment-data-state">아직 등록된 과제가 없어요.</p>
      ) : null}

      <div aria-label="과제 목록" className="assignment-list">
        {assignments.map((assignment) => (
          <button className="assignment-card" key={assignment.id} onClick={() => onOpen(assignment.id)} type="button">
            <span className="assignment-badges">
              <span
                className={`assignment-status ${role === 'member' && assignment.isSubmitted ? 'is-submitted' : ''}`}
              >
                {role === 'leader'
                  ? `${assignment.submittedCount}/${assignment.totalMemberCount} 제출`
                  : assignment.isSubmitted
                    ? '제출 완료'
                    : '미제출'}
              </span>
              {role === 'leader' && assignment.reminderLabel ? (
                <span className="assignment-reminder">
                  <img alt="" src={clockIcon} />
                  {assignment.reminderLabel}
                </span>
              ) : null}
            </span>
            <strong>{assignment.title}</strong>
            <span className="assignment-preview">
              {getAssignmentPreview(assignment.content)}
            </span>
            <small className="assignment-deadline">
              {formatAssignmentDeadline(assignment.deadlineAt)}
            </small>
            <span className="assignment-submission-type">
              <img alt="" src={submissionLinkIcon} />
              정리 글 링크로 제출
            </span>
          </button>
        ))}
      </div>
      {role === 'leader' ? (
        <button className="create-assignment-button" onClick={onCreate} type="button">
          과제 추가하기
        </button>
      ) : null}
    </section>
  )
}
