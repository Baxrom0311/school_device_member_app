import type { AnyRouter } from '@tanstack/react-router'

let _router: AnyRouter | null = null

export function setRouter(router: AnyRouter) {
  _router = router
}

export function navigateTo(to: string, opts?: { replace?: boolean }) {
  if (_router) {
    _router.navigate({ to, replace: opts?.replace })
  } else {
    window.location.href = to
  }
}
