# SafeLaunch AI // Automated Compliance Auditor

원티드 AI 챔피언십 2026 출품작: AI 1인 창업가 및 인디해커를 위한 3단 규제 진단 & Safe Harbor 플랫폼

---

## 🚀 빠른 실행 가이드

```bash
# 1. 종속성 설치
npm install

# 2. 로컬 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

---

## 🛠️ 핵심 아키텍처

- **1단 (Flagged Regulations)**: 위반/주의 법률군 실시간 탐지 (개인정보보호법, 의료법, Stripe MoR, 오픈소스 라이선스)
- **2단 (Problem Diagnosis)**: 무엇이 위법인지 코드 및 법률 근거 제시, 예상 과태료 수치화
- **3단 (Resolution & Safe Harbor)**: 1-Click 해결 방안, 즉시 교체 가능한 정상 코드 스니펫 복사 제공
- **회색지대(Grey Zone) 인터랙티브 판별**: 모호한 규제(의료/법률 경계)를 1문1답으로 즉각 해결하여 점수 실시간 재계산
