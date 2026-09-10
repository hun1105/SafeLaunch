import { AuditIssue } from './types';

// 1. 일반 생성형 AI SaaS 프리셋
export const SAAS_ISSUES: AuditIssue[] = [
  {
    id: 'pipa-28-8',
    lawName: 'PIPA Art. 28-8',
    koreanName: '개인정보보호법: 국외이전 사전 동의 누락',
    jurisdiction: 'DOMESTIC',
    status: 'CRITICAL',
    tag: 'VIOLATION FOUND',
    problemTitle: '프롬프트 무단 국외 전송 (OpenAI US Server)',
    problemDesc: '이용자의 민감 텍스트를 마스킹 없이 미국 소재 OpenAI API 엔드포인트로 직접 전송하고 있습니다. 개인정보보호법 제28조의8에 따른 국외이전 항목, 목적, 보유기간 사전 고지 및 별도 동의 절차가 누락되었습니다.',
    wrongReason: '이용자가 입력한 프롬프트 속 성명·연락처 등 개인식별정보를 비식별화(마스킹) 없이 미국 OpenAI 클라우드 서버로 직접 전송하면서도, 국외이전 항목과 보유 기간에 대해 사전 동의를 받지 않아 개인정보보호법 제28조의8 위반에 해당합니다.',
    correctReason: '서버 전송 전 정규식 기반 개인정보 자동 마스킹 미들웨어를 거치도록 구성하고, 가입 및 입력 화면에 "해외 제3자(OpenAI US) 데이터 처리 위탁 동의" 필수 고지 체크박스를 연동하면 적법한 데이터 이전이 보장됩니다.',
    offendingCode: `// routes/api/chat.ts
export async function POST(req: Request) {
  const { userPrompt } = await req.json();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: userPrompt }],
  });
  return Response.json(response);
}`,
    penaltyText: '개인정보보호법 제75조: 매출액 3% 이하 과징금 또는 5천만 원 이하 과태료',
    solutionTitle: 'PII 마스킹 미들웨어 주입 & 국외이전 동의 약관 부착',
    solutionDesc: [
      '1) API 전송 전 개인식별자 Regex 자동 마스킹 필터 추가',
      '2) 가입/결제 폼에 [개인정보 국외이전 동의] 필수 체크박스 연동',
      '3) OpenAI Enterprise DPA 체결 후 방침에 수탁자 명시'
    ],
    solutionCode: `// middleware/pii-sanitizer.ts
import { sanitizePII } from '@/lib/masking';
export async function guardPrompt(rawText: string, userConsent: boolean) {
  if (!userConsent) throw new Error("LEGAL_ERROR: PIPA 국외이전 사전 동의 필요");
  return sanitizePII(rawText);
}`,
    isAmbiguous: false
  },
  {
    id: 'pipa-37-2',
    lawName: 'PIPA Art. 37-2',
    koreanName: '개인정보보호법: 자동화 결정 거부권 미보장',
    jurisdiction: 'DOMESTIC',
    status: 'WARNING',
    tag: 'REGULATORY RISK',
    problemTitle: 'AI 자동 평가/의사결정에 대한 설명 요구 창구 부재',
    problemDesc: '2024년 신설된 완전 자동화 결정권 규정. AI가 산출한 결과에 대해 이용자가 거부하거나 사람이 재검토하도록 요구할 수 있는 창구가 약관에 명시되지 않았습니다.',
    wrongReason: 'AI 알고리즘이 이용자의 자격이나 추천 결과를 전적으로 자동 산정함에도 불구하고, 2024년 개정된 개인정보보호법 제37조의2에 따른 "결정 이유에 대한 설명 요구" 및 "인간에 의한 재검토 요청(Human-in-the-loop)" 창구를 약관과 UI에 전혀 제공하지 않아 위반 위험이 있습니다.',
    correctReason: '결과 화면 하단에 "결과에 대한 설명 및 인간 재검토 요청" 문의 창구를 명시하고, 이용약관에 자동화 결정의 기준과 이의신청 절차를 상세히 수록하여 정보주체의 방어권을 보장하면 완벽히 적법합니다.',
    offendingCode: `// service/evaluator.ts
export function evaluateUser(input: any) {
  return aiModel.predict(input);
}`,
    penaltyText: '개인정보보호법 제75조: 3천만 원 이하 과태료 및 시정명령',
    solutionTitle: '사람의 개입(Human-in-the-loop) 이의제기 창구 마련',
    solutionDesc: [
      '1) 결과 화면에 "인간 검토 요청하기" 문의 버튼 추가',
      '2) 이용약관에 자동화 결정의 기준 및 거부 절차 수록'
    ],
    solutionCode: `// lib/human-appeal.ts
export const HUMAN_REVIEW_ENDPOINT = "/api/appeal-decision";
export function enableHumanInTheLoop() {
  return { allowAppeal: true, maxResponseDays: 7 };
}`,
    isAmbiguous: false
  },
  {
    id: 'stripe-mor',
    lawName: 'Stripe ToS / MoR',
    koreanName: '결제/세무: 글로벌 판매세(VAT) 미처리',
    jurisdiction: 'GLOBAL',
    status: 'CAUTION',
    tag: 'FINANCIAL RISK',
    problemTitle: 'Stripe 계정 직연동 시 국가별 디지털 서비스세 누락',
    problemDesc: '해외 유저 결제 시 EU VAT 및 미국 주별 판매세를 징수/신고하지 않고 있습니다. Stripe 계정 결제 대금 동결 또는 해외 세무 과태료가 발생할 수 있습니다.',
    wrongReason: '해외 거주 이용자에게 유료 구독료를 청구하면서 미국 주별 판매세나 유럽연합(EU) 부가가치세(VAT)를 계산·징수·신고하지 않고 국내 법인 Stripe 계정으로 직수취하여, 현지 세법 위반 및 Stripe 정산 대금 지급 동결 위험에 노출되어 있습니다.',
    correctReason: '해외 조세 징수와 송금을 판매대행사(Merchant of Record, 예: Lemon Squeezy, Paddle)에 위탁하여 전 세계 디지털 서비스세를 자동 원천 징수·신고하도록 위임하면 1인 개발자도 글로벌 세무 분쟁 없이 안전하게 운영할 수 있습니다.',
    offendingCode: `// payment/checkout.ts
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: 'price_123', quantity: 1 }],
});`,
    penaltyText: 'Stripe 계정 정지(결제 대금 90일 동결) 및 해외 부가세 추징',
    solutionTitle: 'Merchant of Record (Lemon Squeezy) 대행 전환',
    solutionDesc: [
      '1) 1인 개발자 직접 세무 대신 MoR 플랫폼으로 세금 납부 위임',
      '2) 전 세계 세금 징수, 환율 계산 및 인보이스 자동 발행'
    ],
    solutionCode: `// payment/mor-adapter.ts
import { createCheckout } from "@lemonsqueezy/lemonsqueezy.js";
export async function createSafeCheckout() {
  return await createCheckout(storeId, variantId, { dark: true });
}`,
    isAmbiguous: false
  },
  {
    id: 'agpl-3',
    lawName: 'AGPL-3.0 License',
    koreanName: '오픈소스: 소스코드 강제 공개 충돌 없음',
    jurisdiction: 'GLOBAL',
    status: 'PASSED',
    tag: 'COMPLIANT',
    problemTitle: '오픈소스 라이선스 오염 및 전염성 충돌 없음',
    problemDesc: 'AGPL-3.0 등 카피레프트 라이브러리가 탐지되지 않았습니다. 현재 상용 비공개 SaaS 배포에 법적 제약이 없습니다.',
    wrongReason: '상용 비공개 웹 서비스가 AGPL-3.0이나 GPL 계열의 강한 카피레프트 라이선스를 포함할 경우, 네트워크 통신만으로도 전체 핵심 비즈니스 로직과 소스코드를 대중에 무료 공개해야 하는 심각한 지식재산권 누출 위험이 있습니다.',
    correctReason: '현재 프로젝트 종속성 트리 검사 결과 MIT, Apache-2.0 등 허용적(Permissive) 오픈소스 라이브러리만 사용 중이므로, 상용 독점 비공개 소스코드로 유지 배포하는 데 법적 충돌이 전혀 없습니다.',
    offendingCode: `// package.json (Clean)
"dependencies": {
  "next": "14.2.5",
  "lucide-react": "^0.428.0"
}`,
    penaltyText: '해당 없음 (Clean: 상용 소스 비공개 유지 가능)',
    solutionTitle: '현재 클린 아키텍처 유지',
    solutionDesc: ['1) 향후 패키지 설치 시 AGPL 자동 차단 룰 유지'],
    solutionCode: `// .licenserc.json
{ "disallow": ["AGPL-3.0", "GPL-3.0"] }`,
    isAmbiguous: false
  }
];

// 2. 헬스케어/의료 AI 프리셋
export const HEALTHCARE_ISSUES: AuditIssue[] = [
  {
    id: 'med-27',
    lawName: 'Medical Act Art. 27',
    koreanName: '의료법: 무면허 의료 처방/진단 위반',
    jurisdiction: 'DOMESTIC',
    status: 'CRITICAL',
    tag: 'CRIMINAL RISK',
    problemTitle: 'AI에 의한 특정 질병 진단 및 복약 투약 용량 결정',
    problemDesc: '환자가 증상을 입력하면 AI가 진단명을 확정하고 복약 용량을 처방하고 있습니다. 의사 면허 없는 자의 불법 무면허 의료행위(의료법 제27조)로 즉각 형사 고발될 수 있습니다.',
    offendingCode: `// services/doctor-ai.ts
export function diagnosePatient(symptoms: string) {
  if (symptoms.includes("혈당 190")) {
    return "당뇨병 2형 확진. 메트포르민 500mg을 아침 식후 즉시 복용하세요.";
  }
}`,
    penaltyText: '의료법 제87조: 5년 이하의 징역 또는 5천만 원 이하의 벌금',
    solutionTitle: '단순 로깅 도구로 피보팅 & Safe Harbor 면책 워터마크',
    solutionDesc: [
      '1) 진단 대신 [환자 일일 혈당 기록 및 리포트 출력기]로 피보팅',
      '2) "본 서비스는 의료행위를 하지 않습니다" 면책 조항 필수 고지'
    ],
    solutionCode: `// safe-harbor/disclaimer.ts
export const MEDICAL_SAFE_HARBOR = {
  notice: "[법적 고지] 본 AI는 진단을 내리지 않으며 의학적 판단을 대체할 수 없습니다.",
  mode: "RECORD_LOGS_ONLY"
};`,
    isAmbiguous: true,
    clarificationQuestion: '실제 면허를 소지한 의사가 최종 처방 결과를 검수하는 단계가 워크플로우에 있습니까?',
    clarificationOptions: [
      {
        label: '아니오 (환자에게 직접 진단 결과 노출)',
        resolvedStatus: 'CRITICAL',
        impactText: '무면허 의료행위 성립 (형사 처벌 대상)'
      },
      {
        label: '예 (의사의 처방 보조용 내부 EMR 시스템)',
        resolvedStatus: 'PASSED',
        impactText: '의료기기 보조 소프트웨어로 합법 인정 가능'
      }
    ]
  },
  {
    id: 'pipa-sensitive',
    lawName: 'PIPA Art. 23',
    koreanName: '개인정보보호법: 건강 민감정보 별도 동의 누락',
    jurisdiction: 'DOMESTIC',
    status: 'WARNING',
    tag: 'PRIVACY VIOLATION',
    problemTitle: '건강/의료 데이터에 대한 별도 분리 동의 절차 부재',
    problemDesc: '개인정보보호법 제23조에 따라 건강에 관한 정보는 일반 개인정보와 반드시 분리하여 별도로 동의를 받아야 합니다.',
    offendingCode: `// auth/signup.ts
const user = await db.user.create({
  data: { email, medicalHistory: req.body.diseases }
});`,
    penaltyText: '개인정보보호법 제75조: 5천만 원 이하 과태료',
    solutionTitle: '민감정보 별도 동의 체크박스 분리 구현',
    solutionDesc: ['1) 건강 정보 입력 폼 상단에 [민감정보 처리 별도 동의] 독립 배치'],
    solutionCode: `// components/sensitive-consent.tsx
<Checkbox required name="sensitive_consent">[필수] 질병 정보 처리 별도 동의</Checkbox>`,
    isAmbiguous: false
  },
  {
    id: 'openai-safety',
    lawName: 'OpenAI Usage Policies',
    koreanName: 'API 약관: 고위험 의료 진단 API 재판매 금지',
    jurisdiction: 'GLOBAL',
    status: 'CAUTION',
    tag: 'TOS BAN RISK',
    problemTitle: 'OpenAI 상용 정책상 무검수 의료 조언 생성 금지',
    problemDesc: 'OpenAI 비즈니스 약관에 따라 전문가 검수 없는 진단 서비스에 API를 재판매할 경우 사전 통보 없이 계정이 영구 정지됩니다.',
    offendingCode: `// openai.ts
// [약관 위반] 의사 검수 없는 진단 프롬프트 전송`,
    penaltyText: 'OpenAI API 계정 즉시 영구 정지 및 결제 크레딧 몰수',
    solutionTitle: '의료 대신 일반 웰니스 라이프로그로 전환',
    solutionDesc: ['1) 시스템 프롬프트에 진단 거부 지침 강제 주입'],
    solutionCode: `// system-prompt.ts
export const PROMPT = "You are a general wellness assistant. Refuse medical diagnosis.";`,
    isAmbiguous: false
  },
  {
    id: 'mit-clean',
    lawName: 'MIT License',
    koreanName: '오픈소스: 라이선스 오염 없음',
    jurisdiction: 'GLOBAL',
    status: 'PASSED',
    tag: 'CLEAN',
    problemTitle: '오픈소스 라이선스 적합',
    problemDesc: '표준 허용 라이선스만 사용되었습니다.',
    offendingCode: `// package.json (Clean)`,
    penaltyText: '해당 없음',
    solutionTitle: '현재 구성 유지',
    solutionDesc: ['1) 상용 서비스 배포 가능'],
    solutionCode: `// clean`,
    isAmbiguous: false
  }
];

// 3. 핀테크/투자 AI 프리셋
export const FINTECH_ISSUES: AuditIssue[] = [
  {
    id: 'capital-17',
    lawName: 'Capital Markets Act Art. 17',
    koreanName: '자본시장법: 미등록 유사투자자문업 위반',
    jurisdiction: 'DOMESTIC',
    status: 'CRITICAL',
    tag: 'FINANCIAL CRIME',
    problemTitle: '개별 종목 매수/매도 타이밍 자동 추천',
    problemDesc: 'AI가 특정 주식이나 암호화폐의 목표가와 매수 시점을 일대일로 조언하고 있습니다. 금융위 신고 없는 무등록 유사투자자문업에 해당합니다.',
    offendingCode: `// services/trade-bot.ts
export function recommendStock(ticker: string) {
  return "삼성전자 오늘 72,000원에 풀매수 권장. 목표가 85,000원.";
}`,
    penaltyText: '자본시장법 제445조: 3년 이하의 징역 또는 1억 원 이하 벌금',
    solutionTitle: '단순 공시/뉴스 요약 도구로 피보팅 & 투자 경고문 삽입',
    solutionDesc: [
      '1) 매수 추천 대신 [기업 실적 공시 3줄 요약기]로 피보팅',
      '2) "투자 손실에 대한 책임은 본인에게 귀속됨" 고지 강제'
    ],
    solutionCode: `// lib/invest-disclaimer.ts
export const INVEST_SAFE_HARBOR = {
  disclaimer: "본 정보는 투자 권유가 아니며 모든 투자의 책임은 본인에게 있습니다."
};`,
    isAmbiguous: false
  },
  {
    id: 'fin-protect',
    lawName: 'Financial Consumer Protection Act',
    koreanName: '금소법: 금융상품 비교·추천 등록 요건',
    jurisdiction: 'DOMESTIC',
    status: 'WARNING',
    tag: 'REGULATORY RISK',
    problemTitle: '대출/보험 상품 추천 알고리즘 심사 누락',
    problemDesc: '대출 금리 비교 시 코스콤 알고리즘 심사를 거치지 않은 AI 모델을 직접 노출하고 있습니다.',
    offendingCode: `// finance/loans.ts
export function matchLoan(user: any) {
  return "A저축은행 5.2% 신용대출 즉시 가입 권장";
}`,
    penaltyText: '금융소비자보호법 위반: 1억 원 이하 과태료',
    solutionTitle: '금감원 오픈API 기반 단순 공시 랭킹 표시',
    solutionDesc: ['1) 개별 추천 배제, 금융감독원 오픈API 기반 공시 금리 순위만 나열'],
    solutionCode: `// loans/ranking.ts
export const fetchPublicRates = () => fssApi.getOfficialRates();`,
    isAmbiguous: false
  },
  {
    id: 'sec-reg',
    lawName: 'US SEC Investment Advice',
    koreanName: '미국 SEC: 무등록 투자 조언(Investment Advice) 규제',
    jurisdiction: 'GLOBAL',
    status: 'CAUTION',
    tag: 'SEC RISK',
    problemTitle: '미국 거주자 대상 주식 포트폴리오 매매 시그널 생성',
    problemDesc: '미국 유저에게 매수/매도 시그널을 유료 판매할 경우 SEC RIA(Registered Investment Advisor) 등록이 요구됩니다.',
    offendingCode: `// trading/signals.ts
export const signals = { buy: "NVDA", target: 140 };`,
    penaltyText: 'SEC 민사 제재 및 미국 결제망 차단',
    solutionTitle: '단순 거시경제 지표 브리핑으로 포지셔닝',
    solutionDesc: ['1) 종목별 매수 시그널 폐지, 거시경제 지표 데이터셋 제공으로 전환'],
    solutionCode: `// macro/data.ts
export const getMacroData = () => fedApi.getRates();`,
    isAmbiguous: false
  },
  {
    id: 'sec-clean',
    lawName: 'Fin-Cloud Compliance',
    koreanName: '금융보안원: 클라우드 가이드라인 충족',
    jurisdiction: 'GLOBAL',
    status: 'PASSED',
    tag: 'CLEAN',
    problemTitle: '금융 전용 보안 망분리 요건 적합',
    problemDesc: '고객 식별정보 분리 보관 규정을 준수하고 있습니다.',
    offendingCode: `// config/security.ts (Compliant)`,
    penaltyText: '해당 없음',
    solutionTitle: '현재 보안 아키텍처 유지',
    solutionDesc: ['1) 무결성 검증 완료'],
    solutionCode: `// verified`,
    isAmbiguous: false
  }
];

// 4. 이커머스/쇼핑 AI 프리셋
export const ECOMMERCE_ISSUES: AuditIssue[] = [
  {
    id: 'ecom-17',
    lawName: 'E-Commerce Act Art. 17',
    koreanName: '전자상거래법: 7일 이내 청약철회 환불 불가 조항',
    jurisdiction: 'DOMESTIC',
    status: 'CRITICAL',
    tag: 'CONSUMER LAW',
    problemTitle: '디지털 콘텐츠 "결제 후 환불 불가" 일방적 약관',
    problemDesc: '전자상거래법 제17조에 따라 미열람 디지털 재화는 7일 이내 무조건 환불이 가능해야 하나, 약관상 "디지털 상품 특성상 환불 절대 불가"를 명시하여 무효인 독소조항을 부착했습니다.',
    offendingCode: `// terms/refund-policy.ts
export const REFUND_TERMS = 
  "본 AI 서비스는 디지털 라이선스이므로 결제 즉시 환불이 불가합니다.";`,
    penaltyText: '전자상거래법 제45조: 공정거래위원회 시정명령 및 1천만 원 이하 과태료',
    solutionTitle: '공정위 표준약관 7일 청약철회 조항 부착',
    solutionDesc: [
      '1) "다운로드 또는 API 미사용 시 7일 이내 전액 환불"로 약관 수정',
      '2) 사용한 토큰 비율에 따른 일할 계산 환불 시스템 구현'
    ],
    solutionCode: `// terms/compliant-refund.ts
export const REFUND_POLICY = 
  "결제 후 7일 이내 토큰 미사용 시 전액 환불되며, 사용 시 잔여분 일할 환불됩니다.";`,
    isAmbiguous: false
  },
  {
    id: 'ecom-10',
    lawName: 'E-Commerce Act Art. 10',
    koreanName: '전자상거래법: 사업자 신원정보 푸터 누락',
    jurisdiction: 'DOMESTIC',
    status: 'WARNING',
    tag: 'LEGAL REQUIREMENT',
    problemTitle: '푸터 통신판매업 신고번호 및 대표자 정보 누락',
    problemDesc: '인디해커 랜딩페이지 하단에 상호, 대표자 성명, 사업자등록번호, 통신판매업 신고번호가 표기되지 않아 국내 PG 심사 거절 및 과태료 대상입니다.',
    offendingCode: `// components/Footer.tsx
<footer>© 2026 AI Store. All rights reserved.</footer>`,
    penaltyText: '전자상거래법 제45조: 500만 원 이하 과태료',
    solutionTitle: '사업자 신원정보 푸터 컴포넌트 자동 주입',
    solutionDesc: ['1) 공정위 공정거래 포털 사업자 정보 링크 포함 푸터 부착'],
    solutionCode: `// components/LegalFooter.tsx
<div className="text-xs text-zinc-500">
  상호: 주식회사 세이프 | 대표: 홍길동 | 사업자등록번호: 123-45-67890 | 통신판매업: 2026-서울-0001
</div>`,
    isAmbiguous: false
  },
  {
    id: 'chargeback-1',
    lawName: 'Payment Network Rule',
    koreanName: 'PG 규정: 글로벌 카드사 차지백 분쟁 위험',
    jurisdiction: 'GLOBAL',
    status: 'CAUTION',
    tag: 'PAYMENT RISK',
    problemTitle: '무료 체험 후 유료 결제 전환 7일 전 사전 알림 부재',
    problemDesc: '정기결제 갱신 전 이메일 통지 의무를 이행하지 않아 분쟁(Chargeback) 비율이 1%를 초과할 수 있습니다.',
    offendingCode: `// cron/billing.ts
await billCustomerMonthly(user);`,
    penaltyText: 'PG사 가맹점 계약 해지 및 정산 보증금 동결',
    solutionTitle: '결제 7일 전 리마인더 웹훅 발송',
    solutionDesc: ['1) 결제일 D-7 안내 이메일 자동 발송 트리거 연결'],
    solutionCode: `// cron/notify.ts
if (daysUntilRenewal === 7) sendRenewalNoticeEmail(user.email);`,
    isAmbiguous: false
  },
  {
    id: 'pci-dss',
    lawName: 'PCI-DSS SAQ-A',
    koreanName: '카드 결제 보안: 클린 결제창 연동',
    jurisdiction: 'GLOBAL',
    status: 'PASSED',
    tag: 'SECURITY PASSED',
    problemTitle: '카드번호 서버 직접 저장 없음',
    problemDesc: '토스페이먼츠 / Stripe SDK를 통한 토큰화 결제로 안전합니다.',
    offendingCode: `// checkout.ts (Compliant Tokenization)`,
    penaltyText: '해당 없음',
    solutionTitle: '보안 아키텍처 적합',
    solutionDesc: ['1) 고객 카드정보 서버 미보관 준수'],
    solutionCode: `// compliant`,
    isAmbiguous: false
  }
];

// 5. 여행 및 위치기반 AI 프리셋 (일반 여행 및 위치기반 서비스)
export const TRAVEL_ISSUES: AuditIssue[] = [
  {
    id: 'location-9',
    lawName: 'Location Information Act Art. 9',
    koreanName: '위치정보법: 위치기반서비스사업자 신고 누락',
    jurisdiction: 'DOMESTIC',
    status: 'CRITICAL',
    tag: 'LOCATION COMPLIANCE',
    problemTitle: 'GPS 및 사용자 위치 기반 여행 경로/장소 추천 시 방통위 미신고',
    problemDesc: '위치정보의 보호 및 이용 등에 관한 법률 제9조에 따라 이용자의 위치정보(좌표, 방문지 경로)를 수집·이용하여 서비스를 제공할 경우 방송통신위원회에 [위치기반서비스사업] 신고를 필수로 완료해야 합니다. 미신고 서비스 운영 시 형사처벌 대상입니다.',
    wrongReason: '이용자의 위치 좌표(GPS 및 경로)를 수집해 주변 대체 관광지를 실시간 탐색·추천하면서도, 방송통신위원회에 [위치기반서비스사업] 간이 신고를 하지 않고 위치정보 이용약관도 사이트에 게시하지 않아 위치정보법 제9조를 위반하고 있습니다.',
    correctReason: '방송통신위원회 전자민원창구에서 10분 만에 무료로 처리되는 [간이 신고]를 완료하고, "경로 산출 즉시 위치 데이터 영구 파기" 방침을 담은 표준 위치정보 이용약관을 사이트 하단에 게시하면 법적 책임을 완벽히 면책받습니다.',
    offendingCode: `// services/route-planner.ts
export function calculateItinerary(userCoords: Coordinates) {
  return aiEngine.recommendNearbyPlaces(userCoords);
}`,
    penaltyText: '위치정보법 제40조: 3년 이하의 징역 또는 3천만 원 이하의 벌금',
    solutionTitle: '방통위 위치기반서비스 간이 신고 & 위치정보 이용약관 부착',
    solutionDesc: [
      '1) 방송통신위원회 전자민원창구에서 [위치기반서비스사업 간이 신고(무료, 10분 소요)] 접수',
      '2) 서비스 하단에 [위치기반서비스 이용약관] 독립 게재',
      '3) "위치정보는 실시간 경로 계산 외 별도 영구 저장되지 않음" 명시'
    ],
    solutionCode: `// terms/location-policy.ts
export const LOCATION_TERMS = {
  regNumber: "방통위 위치기반서비스 신고 완료",
  purpose: "대체 여행지 및 최적 이동 경로 안내 목적 한정",
  retention: "경로 계산 즉시 파기 (서버 영구 미보관)"
};`,
    isAmbiguous: false
  },
  {
    id: 'pipa-footer',
    lawName: 'PIPA Art. 30',
    koreanName: '개인정보보호법: 개인정보처리방침 및 푸터 고지 전무',
    jurisdiction: 'DOMESTIC',
    status: 'WARNING',
    tag: 'POLICY MISSING',
    problemTitle: '사이트 하단 개인정보처리방침 및 이용약관 링크 누락',
    problemDesc: '개인정보보호법 제30조에 따라 이용자의 여행 계획, 검색 기록, 선호도를 처리하는 웹 서비스는 반드시 첫 화면(푸터)에 개인정보 처리방침을 상시 게재해야 합니다. 현재 사이트 하단에 법적 고지가 전무합니다.',
    wrongReason: '웹 서비스 첫 화면(푸터)에 사업자/개발팀 식별 정보, 이용약관, 개인정보처리방침 링크가 일체 없어, 방문자가 서비스 제공 주체를 확인할 수 없고 정보주체 권리 행사 창구가 없어 개인정보보호법 제30조 위반에 해당합니다.',
    correctReason: '웹사이트 최하단 푸터에 서비스 개발팀 명칭과 문의 이메일을 기재하고, 수집하는 비식별 여행 데이터의 처리 목적과 파기 절차를 담은 개인정보처리방침 팝업을 연동하면 필수 법정 고시 요건을 100% 충족합니다.',
    offendingCode: `// components/Footer.tsx
<footer>
  <p>© 2026 TravelService. All rights reserved.</p>
</footer>`,
    penaltyText: '개인정보보호법 제75조: 1천만 원 이하 과태료 및 시정명령',
    solutionTitle: '개인정보처리방침 및 여행 서비스 표준 푸터 컴포넌트 삽입',
    solutionDesc: [
      '1) 하단에 [이용약관], [개인정보처리방침], [책임의 한계] 3종 링크 부착',
      '2) 공공데이터 및 서비스 이용 안내 명시'
    ],
    solutionCode: `// components/CompliantFooter.tsx
export function CompliantFooter() {
  return (
    <footer className="text-xs text-zinc-500 border-t py-4">
      <div className="flex gap-4">
        <a href="/terms">이용약관</a>
        <a href="/privacy">개인정보처리방침</a>
        <a href="/disclaimer">공공데이터 출처 표기</a>
      </div>
    </footer>
  );
}`,
    isAmbiguous: false
  },
  {
    id: 'location-19',
    lawName: 'Location Information Act Art. 19',
    koreanName: '위치정보법: 제3자 지도 API(티맵/카카오) 좌표 전송 사전동의 누락',
    jurisdiction: 'DOMESTIC',
    status: 'WARNING',
    tag: '3RD PARTY DISCLOSURE',
    problemTitle: '외부 경로 탐색 API로 사용자 좌표 전송 시 사전 고지 부재',
    problemDesc: '사용자 위치에서 추천 관광지까지의 도보/차량 소요시간을 계산하기 위해 티맵(TMap) 등 외부 API로 좌표를 전송할 때, 위치정보법 제19조에 따른 [제3자 제공 내역 통지]가 필요합니다.',
    wrongReason: '경로 산출을 위해 사용자 위치 좌표를 티맵/카카오 등 외부 모빌리티 API 서버로 전송하면서도, 수탁자 명칭과 전송 목적을 이용자에게 사전에 알리지 않아 위치정보 제3자 제공 의무를 위반하고 있습니다.',
    correctReason: '위치기반서비스 이용약관 내 [위치정보 제3자 제공 내역] 항목을 신설하여 "최적 경로 및 소요시간 계산을 위해 SK Open API(티맵)에 암호화된 좌표가 전송됨"을 명시하면 적법합니다.',
    offendingCode: `// route_client.py
fetch("https://apis.openapi.sk.com/tmap/routes", { coords });`,
    penaltyText: '위치정보법 제41조: 1천만 원 이하 과태료',
    solutionTitle: '위치정보 약관 내 제3자 수탁자(TMap API) 명시',
    solutionDesc: ['1) 위치약관에 TMap API 수탁자 항목 추가', '2) 좌표 비식별 처리 유지'],
    solutionCode: `// terms/third-party.ts
export const THIRD_PARTY_TERMS = { trustee: "SK텔레콤(TMap)", purpose: "경로 계산" };`,
    isAmbiguous: false
  },
  {
    id: 'ecommerce-10',
    lawName: 'E-Commerce Act Art. 10',
    koreanName: '전자상거래법: 통신판매업 신고 및 개발자 신원 표시의무',
    jurisdiction: 'DOMESTIC',
    status: 'CAUTION',
    tag: 'LEGAL IDENTITY',
    problemTitle: '온라인 웹 서비스의 기본 신원(개발 주체) 표시 미흡',
    problemDesc: '전자상거래 등에서의 소비자보호에 관한 법률 제10조에 따라 온라인에서 정보를 제공하는 서비스는 이용자가 신뢰할 수 있도록 운영 주체 식별 정보를 표기해야 합니다.',
    wrongReason: '서비스 제공자의 상호, 대표자명, 연락처 등이 일체 표시되지 않아 서비스 장애나 피해 발생 시 이용자가 법적 구제를 요청할 창구가 차단되어 있습니다.',
    correctReason: '하단 푸터에 "프로젝트 개발팀", 대표 이메일, GitHub 저장소 링크를 기재함으로써 비상업적 공모전 프로젝트의 식별 의무를 충족할 수 있습니다.',
    offendingCode: `// footer without developer identity`,
    penaltyText: '전자상거래법 제45조: 500만 원 이하 과태료',
    solutionTitle: '프로젝트 운영 주체 및 문의처 투명 공개',
    solutionDesc: ['1) 푸터에 팀명 및 공식 문의 이메일 기재'],
    solutionCode: `// footer/contact.ts
export const TEAM_INFO = { team: "Travel App Project", email: "contact@project.dev" };`,
    isAmbiguous: false
  },
  {
    id: 'tourism-4',
    lawName: 'Tourism Promotion Act Art. 4',
    koreanName: '관광진흥법: 무등록 여행업 및 중개 수수료 경계',
    jurisdiction: 'DOMESTIC',
    status: 'CAUTION',
    tag: 'BUSINESS MODEL',
    problemTitle: '숙소/티켓 제휴 예약 대행 시 여행업 등록 요건 충돌',
    problemDesc: 'AI 또는 알고리즘이 일정을 짠 후 특정 숙소나 관광지 티켓을 직접 결제·알선하거나 수수료를 수취할 경우 관광진흥법상 [여행업(자본금 1,500만~5,000만 원)] 등록 의무가 발생할 수 있습니다.',
    wrongReason: '추천된 대체 일정의 숙소나 액티비티 티켓을 플랫폼 내부에서 직접 결제하거나 수수료를 차감 수취할 경우, 자본금 요건을 갖춘 관할 지자체 정식 여행업 등록증이 없어 관광진흥법상 무등록 불법 여행업으로 처벌받을 수 있습니다.',
    correctReason: '서비스 내 직접 결제를 일체 배제하고 네이버 지도, 아고다, 인터파크 등의 외부 예약 페이지로 아웃링크(Outlink) 단순 연결하며, "본 플랫폼은 여행 상품을 직접 판매하거나 알선하지 않는다"는 비개입 면책 고지를 두면 법적으로 완전히 안전합니다.',
    offendingCode: `// booking/affiliate.ts
export function bookHotelForUser(tripId: string) {
  return directBookingEngine.chargeAndReserve();
}`,
    penaltyText: '관광진흥법 제82조: 3년 이하의 징역 또는 3천만 원 이하 벌금',
    solutionTitle: '아웃링크(Outlink) 제휴 방식으로 전환 & 단순 정보제공 유지',
    solutionDesc: [
      '1) 직접 결제 대행 대신 단순 아웃링크 제휴로 전환',
      '2) "본 서비스는 여행 상품을 직접 판매하거나 알선하지 않음" 고지'
    ],
    solutionCode: `// lib/safe-booking.ts
export function getSafeAffiliateLink(hotelUrl: string) {
  return hotelUrl + "?ref=partner";
}`,
    isAmbiguous: false
  },
  {
    id: 'kogl-37',
    lawName: 'Copyright Act Art. 37 & KOGL',
    koreanName: '저작권법: 한국관광공사 TourAPI 공공누리(KOGL 제1유형) 출처표기',
    jurisdiction: 'DOMESTIC',
    status: 'PASSED',
    tag: 'DATA LICENSE OK',
    problemTitle: '공공데이터 활용 및 저작권법상 출처 명시 준수 여부',
    problemDesc: '한국관광공사 TourAPI 4.0 및 기상청 공공데이터를 활용할 경우 공공누리 제1유형(출처표시 조건 자유이용)에 따라 출처를 적법하게 표시해야 합니다.',
    wrongReason: '공공데이터 포털에서 제공받은 관광지 및 기상 데이터를 활용하면서 출처를 누락할 경우 저작권법 제37조(출처의 명시) 위반 및 공공데이터 라이선스 취소 사유가 됩니다.',
    correctReason: '본 서비스 기획서 및 데이터 구조상 한국관광공사 TourAPI 콘텐츠 ID와 공공데이터 출처를 시스템에 유지하고 있으므로, 하단에 출처 배지만 부착하면 완벽히 적법합니다.',
    offendingCode: `// clean public data pipeline`,
    penaltyText: '해당 없음 (Clean: 공공데이터 라이선스 적법)',
    solutionTitle: '공공누리 제1유형 출처 배지 상시 노출',
    solutionDesc: ['1) 푸터에 "한국관광공사 TourAPI 4.0 활용" 배지 부착'],
    solutionCode: `// data-attribution.ts
export const DATA_ATTRIBUTION = "출처: 한국관광공사 TourAPI (공공누리 제1유형)";`,
    isAmbiguous: false
  },
  {
    id: 'llm-vs-rulebased',
    lawName: 'EU AI Act & Open Data Licensing',
    koreanName: 'AI 규제 vs 공공데이터 규칙 엔진: 아키텍처 판별',
    jurisdiction: 'GLOBAL',
    status: 'WARNING',
    tag: 'ARCHITECTURE AUDIT',
    problemTitle: '외부 크롤링 기반 AI(LLM) 오추정 vs 결정론적 알고리즘 판별',
    problemDesc: '외부 크롤러는 웹 화면의 "돌발 대체 일정 추천" 문구만 보고 백엔드에서 OpenAI 등 서드파티 LLM을 호출하는 것으로 과추정하여 EU AI Act 위반으로 오진할 위험이 있습니다. 실제 소스코드 상 결정론적 알고리즘인지 확인해야 합니다.',
    wrongReason: '(위반 가정 시) 만약 백엔드에서 OpenAI/Claude 등 제3자 LLM을 직접 호출하면서도 사용자 입력(선호도, 예산)을 미국 서버로 전송한다는 사실과 AI 생성물임을 고지하지 않았다면 EU AI Act 제50조 및 OpenAI API 약관 위반에 해당합니다.',
    correctReason: '(실제 코드 확인 준수) 본 서비스의 실제 소스코드는 한국관광공사 TourAPI, 기상청, TMap, 서울시 실시간 도시데이터 기반의 [결정론적 점수 알고리즘]을 사용하므로 LLM 규제 대상이 아니며, 공공누리(KOGL) 출처 표기만으로 완벽히 적법합니다.',
    offendingCode: `// [외부 크롤러의 가상 오추정 코드]
async function fetchAIItinerary(userPreferences) {
  return await openai.chat.completions.create({ ... });
}`,
    penaltyText: 'EU AI Act 제99조: 최대 1,500만 유로 과징금 (단, 공공데이터 규칙 알고리즘 시 과태료 해당 없음)',
    solutionTitle: '결정론적 알고리즘 증명 & 공공데이터(TourAPI) 출처 표기',
    solutionDesc: [
      '1) 1문1답 인터랙션을 통해 "공공데이터 기반 규칙 엔진"임을 확정',
      '2) 사이트 하단에 한국관광공사 TourAPI 공공누리(KOGL 제1유형) 출처 배지 부착'
    ],
    solutionCode: `// data-license/kogl-attribution.ts
export const DATA_ATTRIBUTION = {
  source: "한국관광공사 TourAPI 4.0 및 기상청 공공데이터 포털",
  license: "공공누리 제1유형 (출처표시 조건 무료이용)",
  engineType: "Deterministic Heuristic Scoring Engine (Zero-LLM)"
};`,
    isAmbiguous: true,
    clarificationQuestion: '해당 서비스의 대체 일정 추천 엔진은 어떤 기술 아키텍처로 구현되어 있습니까?',
    clarificationOptions: [
      {
        label: '공공데이터(TourAPI, 기상청, TMap) 기반 결정론적 규칙 알고리즘 (실제 소스코드 기준)',
        resolvedStatus: 'PASSED',
        impactText: '[적법 확정] LLM을 사용하지 않으므로 EU AI Act 및 OpenAI 약관 규제 대상에서 완전 제외되며, 점수가 상향됩니다.'
      },
      {
        label: '외부 OpenAI/Claude 등 생성형 AI(LLM) API 직접 호출',
        resolvedStatus: 'CRITICAL',
        impactText: '[위반 확정] 제3자 AI 데이터 위탁 처리 및 AI 생성물 사전 고지 의무가 발생합니다.'
      }
    ]
  },
  {
    id: 'gdpr-render',
    lawName: 'GDPR Art. 13 & Art. 44',
    koreanName: 'GDPR: 해외 호스팅(Render) 기반 사용자 일정 데이터 국외이전 고시',
    jurisdiction: 'GLOBAL',
    status: 'CAUTION',
    tag: 'HOSTING COMPLIANCE',
    problemTitle: '해외 클라우드 인프라(Render US/EU) 사용에 따른 역외 이전 고시',
    problemDesc: '웹 서비스가 해외 호스팅 인프라(Render.com 등)에 배포된 경우, 글로벌 이용자의 접속 로그 및 생성 일정 데이터가 국외 서버에 저장되므로 GDPR 제44조에 따른 사전 고지가 권장됩니다.',
    wrongReason: '미국/유럽 소재 Render 클라우드 서버에 서비스가 호스팅되면서도, 글로벌 이용자에게 데이터 보관 장소 및 역외 이전 사유를 고지하지 않아 GDPR 제13조 위반 소지가 있습니다.',
    correctReason: '개인정보처리방침에 "서비스 호스팅 인프라로 Render.com(미국/유럽 리전)을 사용하며, 모든 전송 데이터는 TLS 1.3으로 암호화되어 안전하게 관리됨"을 명시하면 면책됩니다.',
    offendingCode: `// deployment: onrender.com without host location notice`,
    penaltyText: 'GDPR 제83조: 최대 2,000만 유로 또는 전 세계 매출액의 4% 과징금',
    solutionTitle: '개인정보처리방침에 해외 호스팅(Render) 인프라 명시',
    solutionDesc: ['1) 처리방침에 Render 호스팅 위탁 내역 기재', '2) 데이터 전송 암호화 명시'],
    solutionCode: `// terms/hosting.ts
export const HOSTING_NOTICE = "인프라 위탁: Render Inc. (미국 리전, 전송 암호화 적용)";`,
    isAmbiguous: false
  },
  {
    id: 'stripe-tax',
    lawName: 'Global Digital Tax & MoR',
    koreanName: '세무/결제: 유료 프리미엄 모델 도입 시 글로벌 부가세(VAT) 누락 경계',
    jurisdiction: 'GLOBAL',
    status: 'CAUTION',
    tag: 'TAX COMPLIANCE',
    problemTitle: '향후 유료 기능 도입 시 해외 국가별 디지털 서비스세 미신고 위험',
    problemDesc: '여행객 대상 유료 일정 PDF 다운로드나 제휴 멤버십 도입 시, 해외 결제자에 대한 현지 부가가치세(EU VAT, 일본 소비세 등)를 징수·납부하지 않으면 세무 과태료가 발생할 수 있습니다.',
    wrongReason: '직접 결제 연동(Stripe)으로 해외 결제를 받을 경우 각국의 디지털 세금을 직접 신고·납부해야 하며, 미이행 시 결제 대금 지급 동결 및 세무 조사를 받을 수 있습니다.',
    correctReason: '유료 결제 시 Merchant of Record(Lemon Squeezy, Paddle 등)를 활용하여 전 세계 세금 징수와 신고를 자동 대행 처리하도록 설계하면 세무 리스크가 0이 됩니다.',
    offendingCode: `// payment without tax automation`,
    penaltyText: '해외 과세관청의 디지털 서비스세 추징 및 결제 계정 동결',
    solutionTitle: '유료화 전환 시 MoR(Lemon Squeezy) 결제 대행 채택',
    solutionDesc: ['1) 유료화 시 판매대행사(MoR) 채택으로 세금 대행 위임'],
    solutionCode: `// payment/mor.ts
export const PAYMENT_ENGINE = "Lemon Squeezy MoR (Tax Compliant)";`,
    isAmbiguous: false
  },
  {
    id: 'hallucination-disclaimer',
    lawName: 'Global Travel Disclaimer Standard',
    koreanName: '글로벌 약관: 여행지 환각 및 도로 통제/폐업 Safe Harbor 법적 면책',
    jurisdiction: 'GLOBAL',
    status: 'PASSED',
    tag: 'SAFE HARBOR OK',
    problemTitle: '기상 악화 및 실제 매장 폐업/통제 상황에 대한 플랫폼 면책 요건',
    problemDesc: '알고리즘이 추천한 장소가 갑작스러운 기상 이변이나 공사로 통제되어 여행객이 손실을 입었을 때 플랫폼의 책임을 방어하는 표준 면책 조항입니다.',
    wrongReason: '현장 변동(갑작스러운 폭우, 도로 파손, 폐업)으로 인한 이용자의 피해에 대해 플랫폼의 귀책사유 없음을 사전에 고지하지 않으면 손해배상 분쟁에 휘말릴 수 있습니다.',
    correctReason: '본 서비스는 기상청 초단기실황 API 및 실시간 데이터를 연동하며, "현장 기상 및 영업 상황에 따라 차이가 있을 수 있으므로 방문 전 유선 확인 요망" 면책 조항을 두어 법적 책임을 완벽히 방어합니다.',
    offendingCode: `// clean disclaimer implementation`,
    penaltyText: '해당 없음 (Clean: Safe Harbor 면책 완료)',
    solutionTitle: '실시간 여행 안내 Safe Harbor 면책 문구 유지',
    solutionDesc: ['1) 추천 결과 상단에 현장 확인 권장 안내 유지'],
    solutionCode: `// disclaimer.ts
export const TRAVEL_SAFE_HARBOR = "본 일정은 실시간 공공데이터를 기반으로 생성되었으며 현장 상황에 따라 변동될 수 있습니다.";`,
    isAmbiguous: false
  }
];

// 타겟 문자열에 따른 동적 프리셋 선택 함수
export function getIssuesByTarget(target: string): AuditIssue[] {
  const t = (target || '').toLowerCase();
  if (t.includes('trip') || t.includes('travel') || t.includes('tour') || t.includes('dest') || t.includes('hotel') || t.includes('flight')) {
    return TRAVEL_ISSUES;
  }
  if (t.includes('health') || t.includes('med') || t.includes('doctor') || t.includes('care') || t.includes('bio')) {
    return HEALTHCARE_ISSUES;
  }
  if (t.includes('fin') || t.includes('trade') || t.includes('stock') || t.includes('invest') || t.includes('crypto') || t.includes('coin')) {
    return FINTECH_ISSUES;
  }
  if (t.includes('shop') || t.includes('store') || t.includes('pay') || t.includes('commerce') || t.includes('mall') || t.includes('cart')) {
    return ECOMMERCE_ISSUES;
  }
  return SAAS_ISSUES;
}

export const DEFAULT_ISSUES = SAAS_ISSUES;
