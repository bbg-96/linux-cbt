import { Link } from "react-router-dom";

export function ProblemListPage() {
  return (
    <div className="list-page">
      <h1>문제 목록</h1>
      <p className="muted">문제 엔진 준비 중입니다. 먼저 터미널을 사용해 보세요.</p>
      <Link className="btn" to="/terminal">
        연습 터미널 열기
      </Link>
    </div>
  );
}
