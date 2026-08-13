import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useStore } from "../lib/store";
import { MOBILE_QUERY, TOUCH_QUERY, useMediaQuery } from "../lib/useMediaQuery";
import { vmService } from "../vm/vmService";
import type { ChannelId } from "../vm/serialBus";
import { terminals } from "./terminalService";
import { KeyBar } from "./KeyBar";
import {
  termWorkspace,
  type PaneLayout,
  type ServerId,
  type ServerInfo,
  type WsSession,
} from "./workspace";

/**
 * mRemoteNG/MobaXterm식 터미널 워크스페이스.
 * 데스크톱: 왼쪽 서버 목록 레일(이름+⋯ 메뉴) + 팬 그리드(1·2·4 선택),
 *           각 팬은 세션 탭 바를 갖고 탭은 팬 사이를 드래그앤드롭으로 이동한다.
 * 모바일: 팬 하나 + 모든 세션의 탭 바.
 */
interface Props {
  lockedA: boolean;
  overlayA?: ReactNode;
  lockedB?: boolean;
  overlayB?: ReactNode;
}

const CIRCLED = ["①", "②"];
const DND_TYPE = "text/x-cbt-session";

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

  return (
    <div className="term-ws">
      {!isMobile && (
        <ServerRail
          servers={ws.servers}
          sessions={ws.sessions}
          activeCh={activeCh}
          phaseOf={phaseOf}
          canDuplicate={canDuplicate}
        />
      )}

      <div className="term-main">
        {isMobile ? (
          <Pane
            paneIdx={0}
            sessions={ws.sessions}
            activeCh={activeCh}
            servers={ws.servers}
            ctlOf={ctlOf}
            canDuplicate={canDuplicate}
            dnd={false}
          />
        ) : (
          <>
            <div className="ws-toolbar">
              <span className="ws-toolbar-label">화면 분할</span>
              {([1, 2, 4] as PaneLayout[]).map((n) => (
                <button
                  key={n}
                  className={`ws-layout-btn ${ws.layout === n ? "ws-layout-active" : ""}`}
                  title={`터미널 화면 ${n}개`}
                  onClick={() => termWorkspace.setLayout(n)}
                >
                  {n === 1 ? "▬" : n === 2 ? "◫" : "⊞"} {n}
                </button>
              ))}
              <span className="ws-toolbar-hint">탭을 끌어 다른 화면으로 옮길 수 있습니다</span>
            </div>
            <div className="pane-grid" data-n={ws.layout}>
              {Array.from({ length: ws.layout }, (_, p) => (
                <Pane
                  key={p}
                  paneIdx={p}
                  sessions={ws.sessions.filter((s) => (ws.paneOf[s.channel] ?? 0) === p)}
                  activeCh={ws.paneActive[p] ?? null}
                  servers={ws.servers}
                  ctlOf={ctlOf}
                  canDuplicate={canDuplicate}
                  dnd
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── 서버 레일 (이름 + 상태점 + ⋯ 메뉴) ──────────────────────────────

interface RailProps {
  servers: ServerInfo[];
  sessions: WsSession[];
  activeCh: ChannelId | null;
  phaseOf: (id: ServerId) => string;
  canDuplicate: (id: ServerId) => boolean;
}

function ServerRail({ servers, sessions, activeCh, phaseOf, canDuplicate }: RailProps) {
  const [menuFor, setMenuFor] = useState<ServerId | null>(null);

  // 메뉴 밖 클릭으로 닫기
  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuFor]);

  return (
    <aside className="server-rail">
      <div className="rail-head">서버 목록</div>
      {servers.map((sv) => {
        const open = sessions.filter((s) => s.server === sv.id);
        const isActive = open.some((s) => s.channel === activeCh);
        return (
          <div key={sv.id} className={`rail-server ${isActive ? "rail-server-active" : ""}`}>
            <button
              className="rail-main"
              onClick={() => termWorkspace.connect(sv.id)}
              title={open.length ? "세션으로 이동" : "접속"}
            >
              <span className={`rail-dot rail-dot-${phaseOf(sv.id)}`} />
              <span className="rail-name">{sv.name}</span>
            </button>
            <button
              className="rail-more"
              title="서버 메뉴"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setMenuFor((m) => (m === sv.id ? null : sv.id))}
            >
              ⋯
            </button>
            {menuFor === sv.id && (
              <div className="rail-menu" onPointerDown={(e) => e.stopPropagation()}>
                <div className="rail-menu-head">{sv.ip ? `ssh root@${sv.ip}` : "로컬 콘솔 (root)"}</div>
                <button
                  onClick={() => {
                    termWorkspace.connect(sv.id);
                    setMenuFor(null);
                  }}
                >
                  기본 세션 열기
                </button>
                <button
                  disabled={!canDuplicate(sv.id)}
                  onClick={() => {
                    void termWorkspace.duplicate(sv.id);
                    setMenuFor(null);
                  }}
                >
                  ⧉ 세션 복제
                </button>
                <button
                  onClick={() => {
                    void (sv.id === "a" ? vmService.restart() : vmService.restartB());
                    setMenuFor(null);
                  }}
                >
                  ⟳ 서버 재시작
                </button>
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

// ── 터미널 팬 (탭 바 + 활성 세션 화면) ──────────────────────────────

interface PaneProps {
  paneIdx: number;
  sessions: WsSession[];
  activeCh: ChannelId | null;
  servers: ServerInfo[];
  ctlOf: (id: ServerId) => { locked: boolean; overlay?: ReactNode };
  canDuplicate: (id: ServerId) => boolean;
  dnd: boolean;
}

function Pane({ paneIdx, sessions, activeCh, servers, ctlOf, canDuplicate, dnd }: PaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const isTouch = useMediaQuery(TOUCH_QUERY);
  const [dragOver, setDragOver] = useState(false);

  const active = sessions.find((s) => s.channel === activeCh) ?? sessions[0] ?? null;
  const nameOf = (id: ServerId) => servers.find((sv) => sv.id === id)?.name ?? id;

  // 활성 세션의 xterm을 이 팬에 붙인다 (탭 전환·드래그 이동 시 재부착)
  useEffect(() => {
    const el = hostRef.current;
    if (!el || !active) return;
    const inst = terminals[active.channel];
    inst.attachTo(el);
    inst.term.focus();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => inst.fitNow(), 120);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
      // 다른 팬으로 이동할 때 이전 컨테이너에 남지 않도록 떼어낸다
      if (inst.term.element && inst.term.element.parentElement === el) {
        el.removeChild(inst.term.element);
      }
    };
  }, [active?.channel]);

  const onDragOver = (e: DragEvent) => {
    if (!dnd || !e.dataTransfer.types.includes(DND_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };
  const onDrop = (e: DragEvent) => {
    if (!dnd) return;
    const ch = e.dataTransfer.getData(DND_TYPE) as ChannelId;
    if (ch) termWorkspace.moveToPane(ch, paneIdx);
    setDragOver(false);
    e.preventDefault();
  };

  const ctl = active ? ctlOf(active.server) : null;

  return (
    <div
      className={`term-shell pane ${dragOver ? "pane-dragover" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onMouseDown={() => active && termWorkspace.focus(active.channel)}
    >
      <div className="pane-tabs">
        {sessions.map((s) => (
          <button
            key={s.channel}
            className={`pane-tab ${s.channel === active?.channel ? "pane-tab-active" : ""}`}
            draggable={dnd}
            onDragStart={(e) => {
              e.dataTransfer.setData(DND_TYPE, s.channel);
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => termWorkspace.focus(s.channel)}
            title={`root@${nameOf(s.server)} — 세션 ${CIRCLED[s.n - 1]} (ttyS${s.channel[1]})`}
          >
            <span className={`tab-dot ${s.status === "open" ? "tab-dot-open" : ""}`} />
            {nameOf(s.server)} {CIRCLED[s.n - 1]}
            <span
              className="tab-close"
              title={s.n === 2 ? "세션 종료" : "화면에서 닫기"}
              onClick={(e) => {
                e.stopPropagation();
                termWorkspace.close(s.channel);
              }}
            >
              ×
            </span>
          </button>
        ))}
        {sessions.length === 0 && <span className="pane-tabs-empty">탭을 이곳으로 끌어오세요</span>}
        <span className="pane-tabs-right">
          {isTouch && active && <KeyBar channel={active.channel} />}
          {active && canDuplicate(active.server) && (
            <button
              className="term-btn"
              title="세션 복제 — 같은 서버의 셸을 하나 더 엽니다"
              onClick={() => void termWorkspace.duplicate(active.server)}
            >
              ⧉
            </button>
          )}
        </span>
      </div>

      <div className="term-host term-host-titled" ref={hostRef} />

      {!active && (
        <div className="pane-empty">
          {servers.map((sv) => (
            <button key={sv.id} className="btn btn-secondary btn-sm" onClick={() => termWorkspace.connect(sv.id)}>
              {sv.name} 접속
            </button>
          ))}
        </div>
      )}
      {active && ctl?.locked && <div className="term-overlay">{ctl.overlay}</div>}
      {active?.status === "connecting" && (
        <div className="term-overlay">
          <div className="overlay-box">
            <div className="spinner" />
            <p>세션 여는 중…</p>
          </div>
        </div>
      )}
      {active?.status === "error" && (
        <div className="term-overlay">
          <div className="overlay-box">
            <p className="overlay-error">⚠ 세션을 열지 못했습니다</p>
            <div className="grade-actions">
              <button className="btn" onClick={() => termWorkspace.retryDuplicate(active.server)}>
                다시 시도
              </button>
              <button className="btn btn-secondary" onClick={() => termWorkspace.close(active.channel)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
