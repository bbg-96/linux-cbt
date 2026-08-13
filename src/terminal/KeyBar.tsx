import { serialChannels, type ChannelId } from "../vm/serialBus";
import { terminals } from "./terminalService";

/** 소프트 키보드에 없는 특수키를 보내는 모바일용 툴바. */
const KEYS: { label: string; seq: string }[] = [
  { label: "Tab", seq: "\t" },
  { label: "Ctrl+C", seq: "\x03" },
  { label: "Ctrl+D", seq: "\x04" },
  { label: "Esc", seq: "\x1b" },
  { label: "↑", seq: "\x1b[A" },
  { label: "↓", seq: "\x1b[B" },
];

export function KeyBar({ channel }: { channel: ChannelId }) {
  return (
    <div className="keybar">
      {KEYS.map((k) => (
        <button
          key={k.label}
          className="keybar-btn"
          // 터미널 포커스를 뺏지 않도록 pointerdown에서 처리
          onPointerDown={(e) => {
            e.preventDefault();
            serialChannels[channel].userInput(k.seq); // 입력 게이트 잠금 시 자동 무시
            terminals[channel].term.focus();
          }}
        >
          {k.label}
        </button>
      ))}
    </div>
  );
}
