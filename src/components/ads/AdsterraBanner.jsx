import React, { useEffect, useRef } from 'react';

/**
 * AdsterraBanner — lazy-injects the Adsterra Native Banner script.
 * Container id + script URL come from the publisher dashboard at
 * https://beta.publishers.adsterra.com (account: sbecerra).
 *
 * Renders a stable <div id={containerId}> into which Adsterra's runtime
 * writes the ad. If the script is blocked (ad-blocker, network), the ad
 * simply doesn't render — nothing else breaks.
 */
const DEFAULT_CONTAINER = 'container-38623b438448656f55dd47ec2b4b5cdb';
const DEFAULT_SCRIPT = '//pl29144493.profitablecpmratenetwork.com/38623b438448656f55dd47ec2b4b5cdb/invoke.js';

export default function AdsterraBanner({
  containerId = DEFAULT_CONTAINER,
  scriptSrc = DEFAULT_SCRIPT,
  label = 'Advertisement',
}) {
  const hostRef = useRef(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (injectedRef.current) return;
    if (!hostRef.current) return;
    injectedRef.current = true;

    const s = document.createElement('script');
    s.async = true;
    s.src = scriptSrc;
    s.onerror = () => {
      // Silent fail — don't surface ad-network errors to users.
    };
    hostRef.current.appendChild(s);
  }, [scriptSrc]);

  return (
    <div className="w-full flex flex-col items-center my-6">
      <span className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <div ref={hostRef} className="w-full flex justify-center">
        <div id={containerId} />
      </div>
    </div>
  );
}
