import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import EmailCapture from './EmailCapture';

// Mounts an EmailCapture immediately after the first <h2> rendered inside the
// referenced container. We do this in the DOM rather than overriding the MDX
// `h2` component because MDX renders are stateless — there's no clean way to
// know "this is the first h2 in this post" from inside the component override.
export default function InlineAfterFirstH2({ containerRef, source = 'blog-inline', language = 'en' }) {
  const [target, setTarget] = useState(null);
  const slotRef = useRef(null);

  useEffect(() => {
    if (!containerRef?.current) return;
    const h2 = containerRef.current.querySelector('h2');
    if (!h2) return;
    if (!slotRef.current) {
      const slot = document.createElement('div');
      slot.setAttribute('data-newsletter-slot', '');
      slot.className = 'my-6 not-prose';
      slotRef.current = slot;
    }
    h2.insertAdjacentElement('afterend', slotRef.current);
    setTarget(slotRef.current);
    return () => {
      if (slotRef.current && slotRef.current.parentNode) {
        slotRef.current.parentNode.removeChild(slotRef.current);
      }
    };
  }, [containerRef]);

  if (!target) return null;
  return createPortal(
    <EmailCapture variant="inline" source={source} language={language} />,
    target,
  );
}
