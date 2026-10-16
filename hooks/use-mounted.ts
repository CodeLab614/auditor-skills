import * as React from "react"

const subscribe = () => () => {}

// false during SSR and hydration, true on the client afterwards
export function useMounted() {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
