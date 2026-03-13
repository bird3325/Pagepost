# PagePost: 프리미엄 디자인 가이드

## 1. 디자인 원칙 (Design Principles)
- **Minimalism & Functionalism**: 웹페이지 본연의 콘텐츠를 방해하지 않으면서 필요한 정보만 최적의 위치에 제공합니다.
- **Micro-Animations**: 모든 인터랙션(접기, 펼치기, 리사이즈)에는 부드러운 트랜지션을 적용하여 "생동감 넘치는" 느낌을 줍니다.
- **Visual Hierarchy**: 그림자와 명암을 사용하여 레이어 간의 구분을 명확히 하고, 사용자의 시선 흐름을 유도합니다.

## 2. 컬러 시스템 (Color System)

### 2.1 브랜드 & 시스템 컬러
| 분류 | HEX | 용도 |
| --- | --- | --- |
| **Primary** | `#FFD54F` | 브랜드 대표 컬러 (Yellow-400), 강조 버튼 |
| **Secondary** | `#4FC3F7` | 보조 컬러, 사용자 안내 요소 |
| **Background** | `#FAFAFA` | UI 배경 |
| **Text Primary** | `#212121` | 본문 텍스트 |
| **Text Secondary** | `#757575` | 부가 설명, 메타데이터 |
| **Border** | `#E0E0E0` | 경계선 및 디바이더 |

### 2.2 포스트잇 컬러 팔레트 (Note Palette)
| 이름 | HEX | 테마 |
| --- | --- | --- |
| **Butter Yellow** | `#FFF9C4` | 클래식 포스트잇, 기본 메모 |
| **Mint Green** | `#B2DFDB` | 아이디어, 영감, 참고자료 |
| **Soft Pink** | `#F8BBD0` | 중요, 주의사항, 긴급 |
| **Lavender** | `#E1BEE7` | 할 일(TODO), 태스크 관리 |
| **Sky Blue** | `#BBDEFB` | 비교, 쇼핑 정보, 가격 |

## 3. 타이포그래피 (Typography)
- **Primary Font**: `Pretendard Variable` (가독성 중심의 모던 산세리프)
- **Monospace**: `JetBrains Mono` (코드 및 기술 데이터용)

| 용도 | 크기 | Weight | Line Height |
| --- | --- | --- | --- |
| **Note Title** | 14px | 600 (Semibold) | 1.4 |
| **Note Body** | 13px | 400 (Regular) | 1.6 |
| **UI Label** | 12px | 500 (Medium) | 1.4 |
| **Popup Header** | 16px | 600 (Semibold) | 1.3 |

## 4. UI 컴포넌트 스타일 (Component Styles)

### 4.1 포스트잇 레이어 (Note Card)
- **Shadow**: `0 2px 8px rgba(0, 0, 0, 0.1)` (공중에 떠 있는 입체감)
- **Border-radius**: `8px` (부드러운 라운딩)
- **Glassmorphism**: 살짝 불투명한 배경(`opacity 0.95`)과 백드롭 블러를 추천합니다.

### 4.2 인터랙션 가이드
- **Hover**: `scale(1.02)`, 그림자 강도 증가.
- **Drag**: `cursor: grabbing`, 드래그 중인 요소를 약간 반투명하게(`opacity 0.8`) 처리.
- **Fold/Unfold**: CSS `height` 또는 `scale` 애니메이션을 300ms(`cubic-bezier(0.4, 0, 0.2, 1)`)로 설정.

## 5. 아이콘 시스템
- **Library**: `Lucide Icons` (일관된 선 두께와 미니멀한 디자인)
- **Primary Icons**: `Pin` (고정), `CheckCircle` (완료), `Trash2` (삭제), `Palette` (색상), `Maximise-2` (펼치기).
