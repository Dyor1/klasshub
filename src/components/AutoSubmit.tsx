"use client";

import { useEffect, useRef } from "react";

/** Submits the surrounding filter form when a dropdown or date changes.
 *
 *  Progressive enhancement only. The form is a real GET form with a real
 *  submit button, so every filter works with JavaScript off or still loading —
 *  this just removes the extra click for everyone else.
 *
 *  Text inputs are excluded (`data-no-auto-submit`): submitting per keystroke
 *  would be a request per character. Those submit on Enter or via Apply. */
export default function AutoSubmit() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;

    const onChange = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.hasAttribute("data-no-auto-submit")) return;
      if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) {
        return;
      }
      if (target instanceof HTMLInputElement && target.type === "search") return;

      form.requestSubmit();
    };

    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);

  return <span ref={anchor} hidden />;
}
