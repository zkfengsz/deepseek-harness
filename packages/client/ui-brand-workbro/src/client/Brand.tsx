/**
 * WorkBro brand occupants for the generic sidebar and hero brand slots.
 * The mark is a rounded "W" monogram; the name is the WorkBro wordmark.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import css from './Brand.module.css'

/** Requested square edge for the WorkBro mark. */
export interface WorkBroMarkProps {
  size: number
}

/** Render the WorkBro "W" monogram at the host-requested size. */
export function WorkBroMark({ size }: WorkBroMarkProps) {
  return (
    <span
      className={css.mark}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
      aria-hidden="true"
    >
      W
    </span>
  )
}

/** Render the WorkBro name artwork. */
export function WorkBroName({ t }: PropsLocale<'workbroBrand'>) {
  return <span className={css.name}>{t('brand.name')}</span>
}
