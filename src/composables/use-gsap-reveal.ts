import { onIonViewWillEnter } from '@ionic/vue'
import { gsap } from 'gsap'
import { nextTick } from 'vue'

interface GsapRevealOptions {
  rootSelector: string
  itemSelector?: string
  once?: boolean
  y?: number
  duration?: number
  stagger?: number
}

export const useGsapReveal = (options: GsapRevealOptions): void => {
  let hasPlayed = false
  let revealTween: gsap.core.Tween | null = null

  onIonViewWillEnter(() => {
    void nextTick(() => {
      if (typeof document === 'undefined') {
        return
      }

      if (options.once && hasPlayed) {
        return
      }

      if (revealTween?.isActive()) {
        return
      }

      const root = document.querySelector(options.rootSelector)

      if (!(root instanceof HTMLElement)) {
        return
      }

      const itemSelector = options.itemSelector ?? '.senvia-reveal'
      const nodes = Array.from(root.querySelectorAll(itemSelector)).filter(
        (node): node is HTMLElement => node instanceof HTMLElement,
      )

      if (nodes.length === 0) {
        return
      }

      gsap.killTweensOf(nodes)
      revealTween = gsap.fromTo(
        nodes,
        {
          autoAlpha: 0,
          y: options.y ?? 14,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: options.duration ?? 0.42,
          stagger: options.stagger ?? 0.045,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        },
      )

      hasPlayed = true
    })
  })
}
