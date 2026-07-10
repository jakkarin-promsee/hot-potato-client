import { useEffect, useState } from "react";

/** True once `active` has been continuously true for `delayMs` (default 6000). */
export function useColdStartHint(active: boolean, delayMs = 6000): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    const timer = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return show;
}
