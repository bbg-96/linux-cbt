import type { Problem } from "../engine/types";
import { files01 } from "./data/files/files-01";
import { perm01 } from "./data/permissions/perm-01";

export const problems: Problem[] = [files01, perm01];

export function findProblem(id: string): Problem | undefined {
  return problems.find((p) => p.id === id);
}
