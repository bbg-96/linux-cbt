import { problems } from "./index";
import type { CategoryId, Problem } from "../engine/types";

export interface CommandGroup {
  cmd: string;
  problems: Problem[];
}

/**
 * 카테고리의 명령어 노드를 문제들의 `commands`에서 파생한다 (순서 보존 합집합).
 * 한 문제가 여러 명령어를 연습하면 여러 노드에 중복 등장한다 — 의도된 동작.
 */
export function categoryCommands(categoryId: CategoryId): CommandGroup[] {
  const groups: CommandGroup[] = [];
  const byCmd = new Map<string, CommandGroup>();
  for (const p of problems) {
    if (p.category !== categoryId) continue;
    for (const cmd of p.commands ?? []) {
      let g = byCmd.get(cmd);
      if (!g) {
        g = { cmd, problems: [] };
        byCmd.set(cmd, g);
        groups.push(g);
      }
      g.problems.push(p);
    }
  }
  return groups;
}
