import type { Problem } from "../engine/types";
import { files01 } from "./data/files/files-01";
import { files02 } from "./data/files/files-02";
import { files03 } from "./data/files/files-03";
import { perm01 } from "./data/permissions/perm-01";
import { perm02 } from "./data/permissions/perm-02";
import { perm03 } from "./data/permissions/perm-03";
import { text01 } from "./data/text/text-01";
import { text02 } from "./data/text/text-02";
import { text03 } from "./data/text/text-03";
import { text04 } from "./data/text/text-04";
import { text05 } from "./data/text/text-05";
import { search01 } from "./data/search/search-01";
import { search02 } from "./data/search/search-02";
import { search03 } from "./data/search/search-03";
import { proc01 } from "./data/process/proc-01";
import { proc02 } from "./data/process/proc-02";
import { proc03 } from "./data/process/proc-03";
import { arch01 } from "./data/archive/arch-01";
import { arch02 } from "./data/archive/arch-02";
import { arch03 } from "./data/archive/arch-03";
import { sys01 } from "./data/system/sys-01";
import { sys02 } from "./data/system/sys-02";
import { net01 } from "./data/network/net-01";
import { net02 } from "./data/network/net-02";
import { net03 } from "./data/network/net-03";
import { net04 } from "./data/network/net-04";
import { net05 } from "./data/network/net-05";
import { net06 } from "./data/network/net-06";

export const problems: Problem[] = [
  files01,
  files02,
  files03,
  perm01,
  perm02,
  perm03,
  text01,
  text02,
  text03,
  text04,
  text05,
  search01,
  search02,
  search03,
  proc01,
  proc02,
  proc03,
  arch01,
  arch02,
  arch03,
  sys01,
  sys02,
  net01,
  net02,
  net03,
  net04,
  net05,
  net06,
];

export function findProblem(id: string): Problem | undefined {
  return problems.find((p) => p.id === id);
}
