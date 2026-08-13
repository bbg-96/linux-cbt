import { useEffect, useRef, type ReactNode } from "react";
import { terminals } from "./terminalService";
import type { ChannelId } from "../vm/serialBus";

interface Props {
  locked: boolean;
  overlay?: ReactNode;
  channel?: ChannelId;
  title?: string;
  /** 패널 우측에 붙는 액션 버튼 등 */
  titleExtra?: ReactNode;
}

export function TerminalPanel({ locked, overlay, channel = "a0", title, titleExtra }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const inst = terminals[channel];
    inst.attachTo(el);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => inst.fitNow(), 120);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [channel]);

  return (
    <div className="term-shell">
      {title && (
        <div className="term-title">
          <span>{title}</span>
          {titleExtra}
        </div>
      )}
      <div className={`term-host ${title ? "term-host-titled" : ""}`} ref={hostRef} />
      {locked && <div className="term-overlay">{overlay}</div>}
    </div>
  );
}
