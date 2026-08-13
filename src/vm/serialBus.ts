// 시리얼 채널 레지스트리.
// a0: 메인 VM ttyS0 — 터미널①이자 채점·시딩 채널
// a1: 메인 VM ttyS1 — 터미널② (terminals:2 문제)
// b0: VM B ttyS0 — Host B 터미널이자 on:"b" 채점 채널 (vms:2 문제)
import { SerialChannel } from "./serialChannel";

export const serialChannels = {
  a0: new SerialChannel(0),
  a1: new SerialChannel(1),
  b0: new SerialChannel(0),
} as const;

export type ChannelId = keyof typeof serialChannels;

/** 호환 별칭 — 기존 코드의 "메인 채널" 의미로 계속 사용 가능. */
export const serialBus = serialChannels.a0;

export type { TxOptions, TxResult } from "./serialChannel";
export { SerialChannel } from "./serialChannel";
