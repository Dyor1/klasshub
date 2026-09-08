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

    // A GET form submits every field it owns, so an untouched bar produces
    // ?q=&class=&gender=female&status= — which works, but makes a nonsense of
    // the point of putting filters in the URL. Empty controls are disabled for
    // the instant of submission so the browser leaves them out; the page
    // re-renders immediately afterwards, so nothing stays disabled.
    const onSubmit = () => {
      const emptied: HTMLInputElement[] | HTMLSelectElement[] = [];
      const controls = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input[name], select[name]"
      );
      controls.forEach((el) => {
        if (el instanceof HTMLInputElement && el.type === "checkbox") return;
        if (el.name.startsWith("$")) return; // React's own action fields
        if (el.value === "") {
          el.disabled = true;
          (emptied as HTMLElement[]).push(el);
        }
      });
      // Re-enable on the next tick in case the navigation is cancelled.
      setTimeout(() => (emptied as HTMLElement[]).forEach((el) => {
        (el as HTMLInputElement).disabled = false;
      }), 0);
    };
    form.addEventListener("submit", onSubmit);

    const onChangeHandler = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.hasAttribute("data-no-auto-submit")) return;
      if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) {
        return;
      }
      if (target instanceof HTMLInputElement && target.type === "search") return;

      form.requestSubmit();
    };

    form.addEventListener("change", onChangeHandler);
    return () => {
      form.removeEventListener("change", onChangeHandler);
      form.removeEventListener("submit", onSubmit);
    };
  }, []);

  return <span ref={anchor} hidden />;
}
