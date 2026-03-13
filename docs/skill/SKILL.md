# SKILL: PagePost 개발 가이드

이 가이드는 PagePost 프로젝트의 핵심 로직인 3중 앵커링 시스템과 크롬 확장프로그램 아키텍처 구현을 위한 기술적 세부 사항을 다룹니다.

## 1. 3중 앵커링 알고리즘 (Triple Anchoring)

페이지 구조 변경 시에도 메모 위치를 복원하기 위해 다음 로직을 순차적으로 수행합니다.

### Step 1: DOM Selector Match
- CSS Selector 및 XPath를 사용하여 정확한 요소를 찾습니다.
- ID가 있는 경우 ID 우선, 없는 경우 전체 경로(Full Path)를 사용합니다.

### Step 2: Contextual Text Match
- 대상 요소 주변의 `beforeText`와 `afterText` (각 50자)를 획득합니다.
- 페이지 내에서 해당 텍스트 패턴을 검색하여 유사도가 0.8 이상인 요소를 매칭합니다.

### Step 3: Absolute Coordinate Match
- 위 두 단계가 실패할 경우, 저장된 Viewport 상대 좌표(%)를 사용하여 근사 위치에 배치합니다.

## 2. 보안 및 격리 (Security & Isolation)

- **Shadow DOM**: 포스트잇 UI가 호스트 페이지의 CSS 영향을 받지 않도록 Shadow DOM 내부에 렌더링합니다.
- **Z-index**: `2147483647` (최대치)를 사용하여 항상 최상단에 표시되도록 합니다.
- **CSP**: 외부 스크립트 실행을 방지하고 유효한 통신 경로(Supabase API)만 허용합니다.

## 3. Local-First 동기화 전략

1. **Write Local**: 모든 변경사항은 즉시 `IndexedDB`에 기록됩니다.
2. **Background Sync**: Service Worker가 온라인 상태를 감지하면 Supabase로 변경사항을 푸시합니다.
3. **Optimistic UI**: 서버 응답을 기다리지 않고 UI를 즉시 업데이트합니다.

## 4. 성능 최적화 (Performance)

- **Intersection Observer**: 뷰포트 영역 외부에 있는 메모 렌더링을 지연시킵니다.
- **RequestIdleCallback**: 페이지 로드 직후가 아닌, 브라우저가 유휴 상태일 때 메모 데이터를 불러옵니다.
- **Web Workers**: 복잡한 텍스트 매칭 알고리즘은 메인 스레드 부하를 줄이기 위해 워커에서 처리합니다.
