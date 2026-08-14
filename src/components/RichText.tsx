import { Fragment, type ReactNode } from "react";

/**
 * 문제 본문용 초경량 마크다운 렌더러.
 * 지원: ``` 코드 펜스, | 표 |, - 목록, `인라인 코드`, **굵게**.
 *
 * 마크다운 표식이 전혀 없는 텍스트는 기존처럼 <pre>(고정폭·pre-line)로 렌더한다 —
 * 기존 30문제의 해설은 공백 정렬에 의존하므로 이 폴백이 픽셀 호환을 보장한다.
 */

function renderInline(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2) {
      return <code key={i}>{p.slice(1, -1)}</code>;
    }
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

/** 한 줄짜리 텍스트(힌트 등)에 인라인 서식만 적용 */
export function RichInline({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}

const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEP = /^:?-{2,}:?$/;

export function RichText({ text }: { text: string }) {
  const hasMd = text.includes("```") || /^\s*\|.*\|\s*$/m.test(text);
  if (!hasMd) return <pre className="explanation-text">{text}</pre>;

  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) buf.push(lines[i++]);
      i++; // 닫는 펜스
      blocks.push(
        <pre key={key++} className="rt-code">
          {buf.join("\n")}
        </pre>,
      );
      continue;
    }

    if (TABLE_ROW.test(line)) {
      const rows: string[][] = [];
      let sawHeaderSep = false;
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        if (cells.every((c) => TABLE_SEP.test(c))) sawHeaderSep = true;
        else rows.push(cells);
        i++;
      }
      const [head, ...body] = sawHeaderSep ? rows : [null as unknown as string[], ...rows];
      blocks.push(
        <table key={key++} className="rt-table">
          {head && (
            <thead>
              <tr>
                {head.map((c, ci) => (
                  <th key={ci}>{renderInline(c)}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci}>{renderInline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    if (/^\s*- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*- /.test(lines[i])) items.push(lines[i++].replace(/^\s*- /, ""));
      blocks.push(
        <ul key={key++} className="rt-list">
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    // 문단 — 빈 줄 전까지 모으고 줄바꿈은 유지한다
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trimStart().startsWith("```") &&
      !TABLE_ROW.test(lines[i]) &&
      !/^\s*- /.test(lines[i])
    ) {
      buf.push(lines[i++]);
    }
    blocks.push(
      <p key={key++} className="rt-p">
        {buf.map((l, li) => (
          <Fragment key={li}>
            {li > 0 && <br />}
            {renderInline(l)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className="rt">{blocks}</div>;
}
