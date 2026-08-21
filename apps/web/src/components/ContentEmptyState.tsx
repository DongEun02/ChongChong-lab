import reminderMascot from '../assets/figma/reminder-mascot-green.png'
import './ContentEmptyState.css'

type ContentEmptyStateProps = {
  description: string
  title: string
}

export function ContentEmptyState({ description, title }: ContentEmptyStateProps) {
  return (
    <div className="content-empty-state" role="status">
      <img alt="" src={reminderMascot} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}
