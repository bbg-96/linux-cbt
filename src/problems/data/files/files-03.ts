import type { Problem } from "../../../engine/types";

export const files03 = {
  id: "files-03",
  category: "files",
  title: "설정 파일 심볼릭 링크",
  difficulty: 2,
  tags: ["ln -s", "readlink"],
  commands: ["ln", "readlink"],
  scenario:
    "애플리케이션이 /root/work/current.conf 경로의 설정을 읽도록 되어 있습니다. " +
    "실제 설정 파일은 versions 디렉터리에 버전별로 보관합니다.\n" +
    "새 버전(v2.conf)을 배포해야 합니다. 파일을 복사하면 버전 관리가 꼬이므로, " +
    "심볼릭 링크로 연결하는 것이 관례입니다.",
  objectives: [
    "/root/work/current.conf 를 versions/v2.conf 를 가리키는 심볼릭 링크로 만드세요.",
  ],
  setup: [
    "mkdir -p /root/work/versions",
    "printf 'version=1\\ntimeout=10\\n' > /root/work/versions/v1.conf",
    "printf 'version=2\\ntimeout=30\\n' > /root/work/versions/v2.conf",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "test -L /root/work/current.conf",
      label: "current.conf가 심볼릭 링크인가",
    },
    {
      id: "c2",
      type: "file_content",
      path: "/root/work/current.conf",
      expect: { includes: "version=2" },
      label: "링크를 따라가면 v2 설정이 보이는가",
    },
    {
      id: "c3",
      type: "command",
      cmd: 't=$(readlink /root/work/current.conf); test "$t" = versions/v2.conf -o "$t" = /root/work/versions/v2.conf',
      label: "링크 대상이 versions/v2.conf인가",
    },
  ],
  hints: [
    "심볼릭 링크는 ln -s <대상> <링크이름> 으로 만듭니다.",
    "/root/work 에서 ln -s versions/v2.conf current.conf 를 실행해 보세요. 링크는 ls -l 로 확인할 수 있습니다.",
  ],
  explanation:
    "정답 예시 (/root/work 에서):\n" +
    "ln -s versions/v2.conf current.conf\n\n" +
    "심볼릭 링크는 다른 경로를 가리키는 특수 파일입니다. cat current.conf 를 읽으면 " +
    "링크를 따라가 v2.conf 내용이 보입니다. 나중에 v3를 배포할 때는 링크만 바꾸면 되므로 " +
    "(ln -sf versions/v3.conf current.conf) 애플리케이션 설정 경로는 그대로 유지됩니다.\n" +
    "하드 링크(ln)와 달리 심볼릭 링크는 디렉터리나 다른 파일시스템도 가리킬 수 있습니다.",
  verify: { answer: ["cd /root/work; ln -s versions/v2.conf current.conf"] },
} satisfies Problem;
