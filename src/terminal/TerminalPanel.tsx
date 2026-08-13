import { useEffect, useRef, type ReactNode } from "react";
import { terminalService } from "./terminalService";

interface Props {
  locked: boolean;
  overlay?: ReactNode;
}

export function TerminalPanel({ locked, overlay }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    terminalService.attachTo(el);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => terminalService.fitNow(), 120);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="term-shell">
      <div className="term-host" ref={hostRef} />
      {locked && <div className="term-overlay">{overlay}</div>}
    </div>
  );
}
