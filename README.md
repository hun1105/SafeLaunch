# SafeLaunch AI // Automated Compliance Auditor

> **원티드 AI Championship 2026 출품작**  
> 배포 웹 URL과 GitHub README만으로 10대 국내·글로벌 규제 위반을 사전 차단하는 AI 컴플라이언스 감사 터미널

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/AI_Engine-Gemini_3.6_Flash-orange?style=flat-square&logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 💡 프로젝트 개요 (Overview)

**SafeLaunch AI**는 1인 AI 개발자, 인디 빌더, 스타트업이 배포 직전 맞닥뜨리는 **법률·규제·약관 위반 리스크(위치정보법, 개인정보보호법, 전자상거래법, EU AI Act, GDPR 등)**를 단 10초 만에 전수 진단하고 즉시 적용 가능한 해결 코드를 제공하는 올인원 컴플라이언스 백신 플랫폼입니다.

기존의 단순 크롤러나 텍스트 래퍼와 달리, **실제 배포 화면(Live Web)**과 **소스코드 기획서(README)**를 결합한 **Dual-Source 하이브리드 교차 검증 파이프라인**을 통해 오탐(False Positive)을 원천 차단합니다.

---

## ✨ 핵심 기능 (Key Features)

### 1. Dual-Source 하이브리드 교차 검증 (Cross-Verification)
- **URL 단독 입력**: 라이브 웹사이트의 푸터 고지, 약관 링크, 메타 태그, 쿠키 동의창을 0.2초 만에 스캔.
- **README 단독 입력**: 배포 전 아키텍처 명세서 상의 API 목록, 데이터베이스 구조, LLM 호출 여부를 진단.
- **동시 입력 (하이브리드)**: 화면 표출 내용과 내부 기획서를 대조하여 오탐을 방지하고 정확도 99% 달성.

### 2. Seline Editorial 3단 터미널 UI
- **1단 (Flagged Regulations)**: 대한민국 법령(🇰🇷)과 글로벌 규제(🌐)를 탭으로 분리하여 위험도별 전수 표시.
- **2단 (Problem Diagnosis)**: 난해한 법률 용어를 **위반 사유(RISK)**와 **준수 기준(SAFE)**으로 2분할 대조 진단.
- **3단 (Resolution & Gauge)**: 100점 만점 실시간 준수율 게이지 및 원클릭 복사 가능한 표준 해결 코드 스니펫.

### 3. 회색지대(Grey Zone) 인터랙티브 핀셋 판별
- 외부 LLM 호출 여부나 라이선스 적용 등 구현 방식에 따라 합법/불법이 갈리는 항목은 1문 1답 모달을 통해 시스템 구조를 확인 후 실시간 점수를 재계산합니다.

### 4. 10대 전수 규제 커버리지
- **국내법 (DOMESTIC)**: 위치정보법 제9조(신고), 위치정보법 제19조(제3자 전송), 개인정보보호법 제30조(방침), 전자상거래법 제10조(신원표시), 관광진흥법 제4조(무등록 알선), 공공데이터법 & 저작권법(출처).
- **글로벌 규제 (GLOBAL)**: EU AI Act 제50조(투명성 고시), GDPR 제13/44조(국외 이전), 디지털세 & MoR(Stripe/LemonSqueezy), 플랫폼 Safe Harbor(면책 약관).

---

## 🏛️ 아키텍처 다이어그램 (Architecture)

```
[사용자 입력]
 ├── 배포 웹 URL (Live Web) ──────> [경량 Native 크롤러 (DOM/푸터)] ──┐
 └── GitHub README.md (Markdown) ─> [아키텍처 명세서 파서 (API/데이터)] ─┤
                                                                      │
                                          ┌───────────────────────────┘
                                          ▼
                         [Gemini 3.6 Flash 교차 추론 엔진]
                          (오탐 방지 및 10대 법령 전수 감사)
                                          │
                                          ▼
                              [3단 컴플라이언스 터미널]
        ┌─────────────────────────────────┼────────────────────────────────┐
        ▼                                 ▼                                ▼
[1단: 위반 법령 목록]            [2단: 위반 사유 vs 준수 기준]      [3단: 준수율 & 해결 코드]
(국내법 🇰🇷 / 글로벌 🌐)          (RISK vs SAFE 자연어 대조)         (원클릭 복사 & Safe Harbor)
```

---

## 🚀 빠른 시작 (Quick Start)

### 사전 준비 (Prerequisites)
- Node.js 18.17.0 이상
- npm 또는 pnpm

### 설치 및 로컬 서버 실행

```bash
# 1. 저장소 클론
git clone https://github.com/hun1105/SafeLaunch.git
cd SafeLaunch

# 2. 의존성 패키지 설치
npm install

# 3. 환경 변수 설정 (.env.local)
# GEMINI_API_KEY=your_gemini_api_key_here

# 4. 프로덕션 빌드 및 실행
npm run build
npm run start
```

브라우저에서 `http://localhost:3000`으로 접속하여 즉시 사용할 수 있습니다.

---

## 📁 주요 프로젝트 구조 (Directory Structure)

```
safelaunch-ai/
├── app/
│   ├── api/audit/route.ts      # 하이브리드 교차 감사 API 엔드포인트
│   ├── layout.tsx              # 전역 메타데이터 및 에디토리얼 레이아웃
│   └── page.tsx                # 3단 터미널 및 통합 워크스페이스 클라이언트
├── lib/
│   ├── audit-data.ts           # 10대 법령 도메인 지식 베이스 및 기본 프리셋
│   ├── gemini-auditor.ts       # Gemini 3.6 Flash 실시간 교차 추론 엔진
│   └── types.ts                # TypeScript 감사 인터페이스 타입 정의
├── docs/
│   ├── SUBMISSION_WANTED_2026.md   # 원티드 AI Championship 2026 공식 과제 제출서
│   └── PROJECT_PROPOSAL_SAFELAUNCH.md # 원티드 심사위원 평가용 상세 서비스 기획서
└── package.json
```

---

## 📄 대회 제출 서류 (Competition Documents)

- **[공식 과제 제출서 (Wanted Submission Form)](docs/SUBMISSION_WANTED_2026.md)**: 원티드 4대 필수 제출 문항 1:1 완벽 대응본
- **[상세 서비스 기획서 (Project Proposal)](docs/PROJECT_PROPOSAL_SAFELAUNCH.md)**: 심사위원 평가용 심층 기획 및 경쟁 분석서

---

## 📜 라이선스 (License)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
