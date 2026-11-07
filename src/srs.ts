// Spaced repetition with ts-fsrs. Pure logic, no database access.
import { DefaultScheduler, Rating } from 'ts-fsrs'

export { Rating }
/** 1 Again, 2 Hard, 3 Good, 4 Easy: the same as the keyboard keys. */
export type Grade = 1 | 2 | 3 | 4
export const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]

const scheduler = DefaultScheduler({ enableFuzz: true })
type Scheduler = Awaited<typeof scheduler>
export type FsrsCard = ReturnType<Scheduler['newCard']>
export type FsrsLog = ReturnType<Scheduler['review']>['revlog']

export async function newFsrsCard(cardId: string, now: Date): Promise<FsrsCard> {
  return { ...(await scheduler).newCard({ now }), cardId }
}

export async function review(card: FsrsCard, grade: Grade, now: Date) {
  return (await scheduler).review({ card, grade, now })
}

/** Next due date for each grade, to show on the rating buttons. */
export async function preview(card: FsrsCard, now: Date): Promise<Map<Grade, Date>> {
  const out = new Map<Grade, Date>()
  for (const p of (await scheduler).preview({ card, now })) out.set(p.grade as Grade, p.card.dueAt)
  return out
}

/** Short Russian text for a time span: "10 мин", "3 д", "2 мес". */
export function formatInterval(from: Date, to: Date): string {
  const min = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60000))
  if (min < 60) return `${min} мин`
  if (min < 60 * 24) return `${Math.round(min / 60)} ч`
  const days = Math.round(min / 60 / 24)
  if (days < 31) return `${days} д`
  if (days < 365) return `${Math.round(days / 30)} мес`
  return `${(days / 365).toFixed(1)} г`
}
