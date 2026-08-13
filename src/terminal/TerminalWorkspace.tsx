import { useEffect, useRef, type ReactNode } from "react";
import { useStore } from "../lib/store";
import { MOBILE_QUERY, TOUCH_QUERY, useMediaQuery } from "../lib/useMediaQuery";
import { vmService } from "../vm/vmService";
import type { ChannelId } from "../vm/serialBus";
import { terminals } from "./terminalService";
import { KeyBar } from "./KeyBar";
import { termWorkspace, type ServerId, type WsSession } from "./workspace";

/**
 * mRemoteNG/MobaXterm식 터미널 워크스페이스.
 * 데스크톱: 왼쪽 서버 목록 레일 + 열린 세션 전부를 분할 표시.
 * 모바일: 세션 탭 + 활성 세션 하나만 표시 (레일 없음).
 */
interface Props {
  lockedA: boolean;
  overlayA?: ReactNode;
  lockedB?: boolean;
  overlayB?: ReactNode;
}

const PHASE_LABEL: Record<string, string> = {
  idle: "대기",
  booting: "부팅 중",
  ready: "연결됨",
  error: "오류",
};

const CIRCLED = ["①", "②"];

export function TerminalWorkspace({ lockedA, overlayA, lockedB = false, overlayB }: Props) {
  const ws = useStore(termWorkspace.store);
  const vmA = useStore(vmService.store);
  const vmB = useStore(vmService.bStore);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const phaseOf = (id: ServerId) => (id === "a" ? vmA.phase : vmB.phase);
  const ctlOf = (id: ServerId) =>
    id === "a" ? { locked: lockedA, overlay: overlayA } : { locked: lockedB, overlay: overlayB };
  const sessionsOf = (id: ServerId) => ws.sessions.filter((s) => s.server === id);
  const canDuplicate = (id: ServerId) =>
    phaseOf(id) === "ready" && !ctlOf(id).locked && !sessionsOf(id).some((s) => s.n === 2);

  const activeCh = ws.active ?? ws.sessions[0]?.channel ?? null;
  const panes = isMobile ? ws.sessions.filter((s) => s.channel === activeCh) : ws.sessions;
  const showTabs = isMobile && (ws.servers.length > 1 || ws.sessions.length !== 1);

  return (
    <div className="term-ws">
      {!isMobile && (
        <aside className="server-rail">
          <div className="rail-head">서버 목록</div>
          {ws.servers.map((sv) => {
            const phase = phaseOf(sv.id);
            const open = sessionsOf(sv.id);
            const isActive = open.some((s) => s.channel === activeCh);
            return (
              <div key={sv.id} className={`rail-server ${isActive ? "rail-server-active" : ""}`}>
                <button
                  className="rail-main"
                  onClick={() => termWorkspace.connect(sv.id)}
                  title={open.length ? "세션으로 이동" : "접속"}
                >
                  <span className={`rail-dot rail-dot-${phase}`} />
                  <span className="rail-name">{sv.name}</span>
                </button>
                <div className="rail-sub">
                  {sv.ip ? `ssh root@${sv.ip}` : "로컬 콘솔 (root)"} · {PHASE_LABEL[phase]}
                </div>
                <div className="rail-sessions">
                  {open.map((s) => (
                    <button
                      key={s.channel}
                      className={`rail-sess ${s.channel === activeCh ? "rail-sess-active" : ""}`}
                      onClick={() => termWorkspace.focus(s.channel)}
                    >
                      세션 {CIRCLED[s.n - 1]}
                    </button>
                  ))}
                  <button
                    className="rail-sess rail-sess-add"
                    disabled={!canDuplicate(sv.id)}
                    onClick={() => void termWorkspace.duplicate(sv.id)}
                    title="세션 복제 — 같은 서버의 셸을 하나 더 엽니다 (최대 2개)"
                  >
                    ⧉ 복제
                  </button>
                  <button
                    className="rail-sess rail-sess-add"
                    onClick={() => void (sv.id === "a" ? vmService.restart() : vmService.restartB())}
                    title="이 서버(VM)를 재시작합니다"
                  >
                    ⟳
                  </button>
                </div>
              </div>
            );
          })}
          <p className="rail-tip">서버를 클릭해 접속하고, ⧉ 복제로 같은 서버의 두 번째 터미널을 엽니다.</p>
        </aside>
      )}

      <div className="term-main">
        {showTabs && (
          <div className="term-tabs">
            {ws.servers.map((sv) => {
              const open = sessionsOf(sv.id);
              if (open.length === 0) {
                return (
                  <button key={sv.id} className="term-tab term-tab-off" onClick={() => termWorkspace.connect(sv.id)}>
                    ○ {sv.name}
                  </button>
                );
              }
              return open.map((s) => (
                <button
                  key={s.channel}
                  className={`term-tab ${s.channel === activeCh ? "term-tab-active" : ""}`}
                  onClick={() => termWorkspace.focus(s.channel)}
                >
                  {sv.name}
                  {open.length > 1 && ` ${CIRCLED[s.n - 1]}`}
                </button>
              ));
            })}
          </div>
        )}

        <div className="term-panes" data-n={panes.length}>
          {panes.map((sess) => (
            <TermPane
              key={sess.channel}
              sess={sess}
              name={ws.servers.find((sv) => sv.id === sess.server)?.name ?? sess.server}
              showN={sessionsOf(sess.server).length > 1}
              active={sess.channel === activeCh && ws.sessions.length > 1}
              ctl={ctlOf(sess.server)}
              canDup={canDuplicate(sess.server)}
            />
          ))}
          {panes.length === 0 && (
            <div className="term-empty">
              {isMobile ? "위 탭에서 서버를 선택해 접속하세요" : "왼쪽 서버 목록에서 서버를 선택해 접속하세요"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PaneProps {
  sess: WsSession;
  name: string;
  /** 같은 서버에 세션이 2개일 때 세션 번호를 제목에 표시 */
  showN: boolean;
  active: boolean;
  ctl: { locked: boolean; overlay?: ReactNode };
  canDup: boolean;
}

function TermPane({ sess, name, showN, active, ctl, canDup }: PaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const isTouch = useMediaQuery(TOUCH_QUERY);
  const ch: ChannelId = sess.channel;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const inst = terminals[ch];
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
  }, [ch]);

  return (
    <div
      className={`term-shell ${active ? "term-shell-active" : ""}`}
      onMouseDown={() => termWorkspace.focus(ch)}
    >
      <div className="term-chrome">
        <span className="term-dots" aria-hidden>
          <i className="dot-r" />
          <i className="dot-y" />
          <i className="dot-g" />
        </span>
        <span className="term-chrome-title">
          root@{name}
          {showN && ` — 세션 ${CIRCLED[sess.n - 1]}`}
          <span className="term-tty">ttyS{ch[1]}</span>
        </span>
        <span className="term-chrome-right">
          {isTouch && <KeyBar channel={ch} />}
          {canDup && (
            <button
              className="term-btn"
              onClick={() => void termWorkspace.duplicate(sess.server)}
              title="세션 복제 — 같은 서버의 셸을 하나 더 엽니다"
            >
              ⧉<span className="term-btn-label"> 복제</span>
            </button>
          )}
          {sess.server === "b" && (
            <button className="term-btn" onClick={() => void vmService.restartB()} title="VM B 재시작">
              ⟳
            </button>
          )}
          <button className="term-btn" onClick={() => termWorkspace.close(ch)} title="세션 닫기 (셸은 유지됨)">
            ✕
          </button>
        </span>
      </div>
      <div className="term-host term-host-titled" ref={hostRef} />
      {ctl.locked && <div className="term-overlay">{ctl.overlay}</div>}
      {sess.status === "connecting" && (
        <div className="term-overlay">
          <div className="overlay-box">
            <div className="spinner" />
            <p>세션 여는 중…</p>
          </div>
        </div>
      )}
      {sess.status === "error" && (
        <div className="term-overlay">
          <div className="overlay-box">
            <p className="overlay-error">⚠ 세션을 열지 못했습니다</p>
            <div className="grade-actions">
              <button className="btn" onClick={() => termWorkspace.retryDuplicate(sess.server)}>
                다시 시도
              </button>
              <button className="btn btn-secondary" onClick={() => termWorkspace.close(ch)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
