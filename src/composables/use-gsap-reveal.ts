import { onIonViewDidEnter } from '@ionic/vue'
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

  onIonViewDidEnter(() => {
    void nextTick(() => {
      if (typeof document === 'undefined') {
        return
      }

      if (options.once && hasPlayed) {
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
      gsap.fromTo(
        nodes,
        {
          autoAlpha: 0,
          y: options.y ?? 14,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: options.duration ?? 0.5,
          stagger: options.stagger ?? 0.06,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        },
      )

      hasPlayed = true
    })
  })
}
