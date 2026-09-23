import { effect, signal } from 'faisceau'
import { raf, resizeObserverContentBox, observeChildren } from '@zag-js/dom-query'

/** Scroll-edge shadow state for overlay bodies. Only the body part scrolls, so
 * this binding watches the body scroller and flags which edges hide content:
 * `data-scroll-top` when the user can scroll toward the top, `data-scroll-bottom`
 * when the user can scroll toward the bottom. Stylesheets render the matching
 * edge shadows. Returns a cleanup that also removes the flags. */
export function bindScrollShadows(scroller: HTMLElement): () => void {
  const state = signal({ canScrollTop: false, canScrollBottom: false })
  const disposers: (() => void)[] = []
  let cancelFrame: (() => void) | null = null

  const update = () => {
    cancelFrame = null
    state.set({
      canScrollTop: scroller.scrollTop > 1,
      canScrollBottom: scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1,
    })
  }

  disposers.push(
    effect(() => {
      const { canScrollTop, canScrollBottom } = state.get()
      scroller.toggleAttribute('data-scroll-top', canScrollTop)
      scroller.toggleAttribute('data-scroll-bottom', canScrollBottom)
    }),
  )

  const schedule = () => {
    if (!cancelFrame) cancelFrame = raf(update)
  }

  disposers.push(resizeObserverContentBox.observe(scroller, schedule))
  disposers.push(
    observeChildren(scroller, { callback: schedule, subtree: true, characterData: true }),
  )
  scroller.addEventListener('scroll', schedule, { passive: true })
  disposers.push(() => scroller.removeEventListener('scroll', schedule))
  update()

  return () => {
    for (const dispose of disposers) dispose()
    if (cancelFrame) cancelFrame()
    scroller.removeAttribute('data-scroll-top')
    scroller.removeAttribute('data-scroll-bottom')
  }
}
