# PagePost: DB & 데이터 모델 가이드

## 1. 데이터 아키텍처 (Data Architecture)
PagePost는 **Local-First Sync** 전략을 따릅니다.
- **Local**: `IndexedDB` (Dexie.js 활용) 를 사용하여 오프라인에서도 즉각적인 응답성을 보장합니다.
- **Cloud**: `Supabase`를 통해 기기간 실시간 데이터 동기화 및 백업을 수행합니다.

## 2. Note 객체 데이터 모델 (TypeScript Definition)

```typescript
interface Note {
  id: string;          // UUID v4
  url: string;         // 페이지 전체 URL
  domain: string;      // 도메인 (필터용, 예: google.com)
  
  // 3중 앵커링 데이터 (Triple Anchor)
  anchor: {
    dom: {
      selector: string; // CSS 선택자
      xpath: string;    // XPath (구조적 위치 보완)
    };
    context: {
      beforeText: string;  // 요소 앞 50자
      afterText: string;   // 요소 뒤 50자
      elementText: string; // 요소 내부 텍스트
    };
    position: {
      x: number;       // Viewport 내 상대 X 좌표 (%)
      y: number;       // Viewport 내 상대 Y 좌표 (%)
      scrollY: number; // 생성 시점의 스크롤 위치
    };
  };

  // 콘텐츠 및 스타일
  content: string;     // 마크다운 형식 메모 본문
  color: string;       // HEX 코드 또는 프리셋 키
  size: {
    width: number;     // 기본 200px
    height: number;    // 기본 150px
  };
  notePosition: {      // 포스트잇이 화면에 떠 있는 좌표
    x: number;
    y: number;
  };

  // 상태 관리
  tags: string[];      // '#' 태그 리스트
  status: 'active' | 'done' | 'archived';
  isPinned: boolean;
  isCollapsed: boolean;

  // 메타데이터
  createdAt: number;   // Timestamp (ms)
  updatedAt: number;   // Timestamp (ms)
}
```

## 3. 로컬 스토리지 스키마 (IndexedDB)
- **DB명**: `pagepost_db`
- **Store 명**: `notes`
- **인덱스 전략**:
  - `++id` (기본키)
  - `url` (현재 페이지 메모 로드용)
  - `domain` (사이트별 모아보기용)
  - `updatedAt` (동기화 기준)

## 4. 클라우드 DB 스키마 (Supabase / Postgres)

```sql
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    anchor JSONB NOT NULL,
    content TEXT,
    color VARCHAR(20),
    size JSONB,
    note_position JSONB,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    is_pinned BOOLEAN DEFAULT false,
    is_collapsed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 설정
CREATE INDEX idx_notes_user_url ON notes(user_id, url);
CREATE INDEX idx_notes_domain ON notes(domain);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
```

## 5. 충돌 해결 전략 (Conflict Resolution)
- **Last Write Wins**: `updatedAt` 필드를 기준으로 가장 최근에 수정된 데이터를 최종본으로 채택합니다.
- **Real-time Sync**: Supabase Realtime을 사용하여 다른 기기에서 수정한 내용을 즉시 반영합니다.
