import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
} from 'react'

import './ReminderDateTimePicker.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const PERIODS = ['오전', '오후'] as const
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1)
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5)
const ITEM_HEIGHT = 44
const CLOSE_VELOCITY = 0.6

type PickerStep = 'date' | 'time'
type WheelType = 'period' | 'hour' | 'minute'

type DragState = {
  lastTime: number
  lastY: number
  pointerId: number
  startY: number
  velocity: number
}

type ReminderDateTimePickerProps = {
  max?: string
  min?: string
  onClose: () => void
  onConfirm: (value: string) => void
  value?: string
}

export function ReminderDateTimePicker({
  max,
  min,
  onClose,
  onConfirm,
  value,
}: ReminderDateTimePickerProps) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const dragOffsetRef = useRef(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const [step, setStep] = useState<PickerStep>('date')
  const [minimum] = useState(() => getMinimumDate(min))
  const [maximum] = useState(() => parseOptionalDate(max))
  const [selected, setSelected] = useState(() => getInitialDate(value, min, max))

  const updateDragOffset = (offset: number) => {
    dragOffsetRef.current = offset
    setDragOffset(offset)
  }

  const requestClose = useCallback(() => {
    setIsOpen(false)
    window.setTimeout(onClose, 280)
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheetRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [requestClose])

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isOpen || event.button !== 0) return

    dragStateRef.current = {
      lastTime: event.timeStamp,
      lastY: event.clientY,
      pointerId: event.pointerId,
      startY: event.clientY,
      velocity: 0,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const handleDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const elapsed = Math.max(event.timeStamp - dragState.lastTime, 1)
    dragState.velocity = (event.clientY - dragState.lastY) / elapsed
    dragState.lastY = event.clientY
    dragState.lastTime = event.timeStamp
    updateDragOffset(Math.max(0, event.clientY - dragState.startY))
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>, allowClose: boolean) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const sheetHeight = sheetRef.current?.offsetHeight ?? 0
    const closeThreshold = Math.min(160, Math.max(80, sheetHeight * 0.3))
    const shouldClose =
      allowClose &&
      (dragOffsetRef.current >= closeThreshold || dragState.velocity >= CLOSE_VELOCITY)

    event.currentTarget.releasePointerCapture(event.pointerId)
    dragStateRef.current = null
    setIsDragging(false)

    if (shouldClose) requestClose()
    else updateDragOffset(0)
  }

  const complete = () => {
    const completedValue = toLocalDateTime(clampDate(selected, minimum, maximum))
    setIsOpen(false)
    window.setTimeout(() => onConfirm(completedValue), 280)
  }

  const sheetTransform = isOpen
    ? `translate3d(0, ${dragOffset}px, 0)`
    : 'translate3d(0, 100%, 0)'
  const backdropOpacity = isOpen ? Math.max(0, 1 - dragOffset / 320) : 0

  return (
    <div
      aria-hidden={!isOpen}
      className={`reminder-picker-overlay ${isOpen ? 'is-open' : ''}`}
    >
      <button
        aria-label="리마인드 시각 설정 닫기"
        className="reminder-picker-backdrop"
        onClick={requestClose}
        style={{ opacity: backdropOpacity }}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={`reminder-picker-sheet ${isDragging ? 'is-dragging' : ''}`}
        ref={sheetRef}
        role="dialog"
        style={{ transform: sheetTransform }}
        tabIndex={-1}
      >
        <div
          aria-hidden="true"
          className="reminder-picker-handle-area"
          onPointerCancel={(event) => finishDrag(event, false)}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={(event) => finishDrag(event, true)}
        >
          <span />
        </div>
        <header className="reminder-picker-header">
          <h2 id={titleId}>리마인드 시각 설정</h2>
          <button onClick={step === 'date' ? () => setStep('time') : complete} type="button">
            {step === 'date' ? '다음' : '완료'}
          </button>
        </header>

        {step === 'date' ? (
          <DatePicker
            key={`${selected.getFullYear()}-${selected.getMonth()}`}
            maximum={maximum}
            minimum={minimum}
            onChange={(nextValue) => setSelected(clampDate(nextValue, minimum, maximum))}
            value={selected}
          />
        ) : (
          <TimePicker
            maximum={maximum}
            minimum={minimum}
            onChange={(nextValue) => setSelected(clampDate(nextValue, minimum, maximum))}
            value={selected}
          />
        )}
      </div>
    </div>
  )
}

function DatePicker({
  maximum,
  minimum,
  onChange,
  value,
}: {
  maximum?: Date
  minimum: Date
  onChange: (value: Date) => void
  value: Date
}) {
  const [viewDate, setViewDate] = useState(
    () => new Date(value.getFullYear(), value.getMonth(), 1),
  )
  const minimumMonth = new Date(minimum.getFullYear(), minimum.getMonth(), 1)
  const maximumMonth = maximum
    ? new Date(maximum.getFullYear(), maximum.getMonth(), 1)
    : undefined
  const days = getCalendarDays(viewDate, minimum, maximum)

  const selectDate = (date: Date) => {
    const nextValue = new Date(value)
    nextValue.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
    onChange(nextValue)
  }

  return (
    <div className="reminder-date-picker">
      <div className="reminder-picker-summary">날짜 · {formatDate(value)}</div>
      <div className="reminder-month-header">
        <button
          aria-label="이전 달"
          disabled={viewDate.getTime() <= minimumMonth.getTime()}
          onClick={() =>
            setViewDate((current) =>
              new Date(current.getFullYear(), current.getMonth() - 1, 1),
            )
          }
          type="button"
        >
          ‹
        </button>
        <span>{viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월</span>
        <button
          aria-label="다음 달"
          disabled={Boolean(maximumMonth && viewDate.getTime() >= maximumMonth.getTime())}
          onClick={() =>
            setViewDate((current) =>
              new Date(current.getFullYear(), current.getMonth() + 1, 1),
            )
          }
          type="button"
        >
          ›
        </button>
      </div>
      <div aria-hidden="true" className="reminder-weekdays">
        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div aria-label="날짜 선택" className="reminder-calendar-grid">
        {days.map(({ date, disabled, isCurrentMonth }) => {
          const selectedDay = isSameDay(date, value)
          return (
            <button
              aria-label={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`}
              aria-pressed={selectedDay}
              className={`${selectedDay ? 'is-selected' : ''} ${date.getDay() === 0 ? 'is-sunday' : ''}`}
              disabled={!isCurrentMonth || disabled}
              key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
              onClick={() => selectDate(date)}
              type="button"
            >
              {isCurrentMonth ? date.getDate() : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimePicker({
  maximum,
  minimum,
  onChange,
  value,
}: {
  maximum?: Date
  minimum: Date
  onChange: (value: Date) => void
  value: Date
}) {
  const periodRef = useRef<HTMLDivElement>(null)
  const hourRef = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<Partial<Record<WheelType, number>>>({})
  const periodIndex = value.getHours() >= 12 ? 1 : 0
  const hourIndex = (value.getHours() % 12 || 12) - 1
  const minuteIndex = Math.round(value.getMinutes() / 5)

  useEffect(() => {
    if (periodRef.current) periodRef.current.scrollTop = periodIndex * ITEM_HEIGHT
    if (hourRef.current) hourRef.current.scrollTop = hourIndex * ITEM_HEIGHT
    if (minuteRef.current) minuteRef.current.scrollTop = minuteIndex * ITEM_HEIGHT
  }, [hourIndex, minuteIndex, periodIndex])

  useEffect(() => {
    const timers = timersRef.current
    return () => Object.values(timers).forEach(window.clearTimeout)
  }, [])

  const dateForIndex = (type: WheelType, index: number) => {
    const nextValue = new Date(value)
    const selectedHour = value.getHours() % 12 || 12
    if (type === 'period') nextValue.setHours((selectedHour % 12) + (index === 1 ? 12 : 0))
    if (type === 'hour') nextValue.setHours((HOURS[index] % 12) + (periodIndex === 1 ? 12 : 0))
    if (type === 'minute') nextValue.setMinutes(MINUTES[index], 0, 0)
    return nextValue
  }

  const selectIndex = (type: WheelType, index: number) => {
    onChange(dateForIndex(type, index))
  }

  const isDisabled = (type: WheelType, index: number) => {
    const candidate = dateForIndex(type, index).getTime()
    return candidate < minimum.getTime() || Boolean(maximum && candidate >= maximum.getTime())
  }

  const handleScroll = (
    type: WheelType,
    event: UIEvent<HTMLDivElement>,
    itemCount: number,
  ) => {
    const element = event.currentTarget
    window.clearTimeout(timersRef.current[type])
    timersRef.current[type] = window.setTimeout(() => {
      const index = Math.min(Math.max(Math.round(element.scrollTop / ITEM_HEIGHT), 0), itemCount - 1)
      element.scrollTo({ behavior: 'smooth', top: index * ITEM_HEIGHT })
      if (!isDisabled(type, index)) selectIndex(type, index)
    }, 80)
  }

  return (
    <div className="reminder-time-picker">
      <div className="reminder-picker-summary">시간 · {formatTime(value)}</div>
      <div aria-label="시간 선택" className="reminder-wheel-picker">
        <div aria-hidden="true" className="reminder-wheel-selection" />
        <WheelColumn
          activeIndex={periodIndex}
          disabledAt={(index) => isDisabled('period', index)}
          labels={PERIODS}
          onScroll={(event) => handleScroll('period', event, PERIODS.length)}
          onSelect={(index) => selectIndex('period', index)}
          ref={periodRef}
        />
        <WheelColumn
          activeIndex={hourIndex}
          disabledAt={(index) => isDisabled('hour', index)}
          labels={HOURS.map(String)}
          onScroll={(event) => handleScroll('hour', event, HOURS.length)}
          onSelect={(index) => selectIndex('hour', index)}
          ref={hourRef}
        />
        <WheelColumn
          activeIndex={minuteIndex}
          disabledAt={(index) => isDisabled('minute', index)}
          labels={MINUTES.map((minute) => String(minute).padStart(2, '0'))}
          onScroll={(event) => handleScroll('minute', event, MINUTES.length)}
          onSelect={(index) => selectIndex('minute', index)}
          ref={minuteRef}
        />
      </div>
    </div>
  )
}

function WheelColumn({
  activeIndex,
  disabledAt,
  labels,
  onScroll,
  onSelect,
  ref,
}: {
  activeIndex: number
  disabledAt: (index: number) => boolean
  labels: readonly string[]
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  onSelect: (index: number) => void
  ref: React.Ref<HTMLDivElement>
}) {
  return (
    <div className="reminder-wheel-column" onScroll={onScroll} ref={ref}>
      {labels.map((label, index) => {
        const disabled = disabledAt(index)
        return (
          <button
            aria-pressed={activeIndex === index}
            className={activeIndex === index ? 'is-active' : ''}
            disabled={disabled}
            key={label}
            onClick={() => onSelect(index)}
            type="button"
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function getMinimumDate(min?: string) {
  const now = new Date()
  const parsedMinimum = parseOptionalDate(min)
  return roundUpToFiveMinutes(
    parsedMinimum && parsedMinimum.getTime() > now.getTime() ? parsedMinimum : now,
  )
}

function getInitialDate(value?: string, min?: string, max?: string) {
  const minimum = getMinimumDate(min)
  const maximum = parseOptionalDate(max)
  const parsedValue = parseOptionalDate(value) ?? minimum
  return clampDate(roundUpToFiveMinutes(parsedValue), minimum, maximum)
}

function parseOptionalDate(value?: string) {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : undefined
}

function roundUpToFiveMinutes(value: Date) {
  const result = new Date(value)
  const remainder = result.getMinutes() % 5
  const partialMinute = result.getSeconds() > 0 || result.getMilliseconds() > 0
  const addition = remainder === 0 ? (partialMinute ? 5 : 0) : 5 - remainder
  result.setSeconds(0, 0)
  result.setMinutes(result.getMinutes() + addition)
  return result
}

function clampDate(value: Date, minimum: Date, maximum?: Date) {
  if (value.getTime() < minimum.getTime()) return new Date(minimum)
  if (maximum && value.getTime() >= maximum.getTime()) {
    const lastAllowed = new Date(maximum)
    lastAllowed.setMinutes(lastAllowed.getMinutes() - 5)
    return lastAllowed.getTime() >= minimum.getTime() ? lastAllowed : new Date(minimum)
  }
  return value
}

function getCalendarDays(viewDate: Date, minimum: Date, maximum?: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const day = startOfDay(date).getTime()
    return {
      date,
      disabled:
        day < startOfDay(minimum).getTime() ||
        Boolean(maximum && day > startOfDay(maximum).getTime()),
      isCurrentMonth: date.getMonth() === viewDate.getMonth(),
    }
  })
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
}

function formatDate(value: Date) {
  return `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, '0')}.${String(value.getDate()).padStart(2, '0')}`
}

function formatTime(value: Date) {
  const period = value.getHours() < 12 ? '오전' : '오후'
  const hour = value.getHours() % 12 || 12
  return `${period} ${hour}:${String(value.getMinutes()).padStart(2, '0')}`
}

function toLocalDateTime(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}
