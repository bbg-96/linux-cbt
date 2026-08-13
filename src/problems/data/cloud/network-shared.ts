// 클라우드 트랙의 네트워크 문제도 기초 트랙과 같은 리셋 프리앰블을 쓴다.
// 프리앰블이 갈라지면 두 트랙에서 네트워크 초기 상태가 달라지므로 재수출만 한다.
export { MAC_REFRESH, NET_RESET } from "../network/shared";
