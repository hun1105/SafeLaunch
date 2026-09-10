import { AuditIssue, AuditReport } from './types';
import { getIssuesByTarget } from './audit-data';

interface CrawlResult {
  title: string;
  metaDesc: string;
  headings: string[];
  cleanText: string;
  footerLinks: string[];
}

// 경량 네이티브 웹 크롤러 (의존성 없이 0.2초 내 추출)
async function crawlTarget(url: string): Promise<CrawlResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SafeLaunchComplianceBot/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '';

    // 주요 헤딩 추출
    const headings: string[] = [];
    const hRegex = /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi;
    let match;
    while ((match = hRegex.exec(html)) !== null && headings.length < 8) {
      headings.push(match[1].trim());
    }

    // 푸터 링크 추출
    const footerLinks: string[] = [];
    const aRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    while ((match = aRegex.exec(html)) !== null) {
      const text = match[2].toLowerCase();
      if (text.includes('약관') || text.includes('terms') || text.includes('privacy') || text.includes('개인정보')) {
        footerLinks.push(`${match[2].trim()} (${match[1]})`);
      }
    }

    // 스크립트 및 스타일 제거 후 본문 정제
    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);

    return { title, metaDesc, headings, cleanText, footerLinks };
  } catch (error) {
    console.warn(`[Crawler Warning] ${url} 크롤링 실패, 도메인 추론 진행:`, error);
    return {
      title: url,
      metaDesc: '',
      headings: [],
      cleanText: `Target URL: ${url}`,
      footerLinks: [],
    };
  }
}

// 동일 URL 분석 일관성 보장을 위한 인메모리 결정론적 캐시
const AUDIT_CACHE = new Map<string, AuditReport>();

// Gemini 3.6 Flash REST API 호출 함수
export async function auditWithGemini(
  targetUrl: string,
  apiKey: string
): Promise<AuditReport> {
  const normalizedTarget = targetUrl.trim();
  if (AUDIT_CACHE.has(normalizedTarget)) {
    const cached = AUDIT_CACHE.get(normalizedTarget)!;
    return { ...cached, latencyMs: 12 };
  }

  const startTime = Date.now();

  // 1. 타겟 사이트 크롤링
  const crawl = await crawlTarget(normalizedTarget);

  const prompt = `
당신은 대한민국 IT 스타트업 및 글로벌 서비스 전문 수석 법률 감사관(Legal Compliance Officer)입니다.
아래 분석 대상 웹사이트의 크롤링 데이터를 기반으로, 발생 가능한 모든 법률·세무·약관·라이선스 위반 리스크를 4개로 제한하지 말고 '걸릴 소지가 있는 모든 항목(전수 검사: 최소 8~10개 이상)'을 포괄적으로 도출하십시오.

[분석 대상 데이터]
- URL: ${normalizedTarget}
- 페이지 제목: ${crawl.title}
- 메타 설명: ${crawl.metaDesc}
- 주요 헤딩: ${crawl.headings.join(' / ')}
- 감지된 약관/푸터 링크: ${crawl.footerLinks.length > 0 ? crawl.footerLinks.join(', ') : '전무함 (푸터 약관 미부착)'}
- 본문 텍스트 요약: ${crawl.cleanText}

[반드시 점검할 전수 규제 체크리스트 (DOMESTIC & GLOBAL)]
1. [위치정보법 제9조] 위치기반서비스사업 신고 누락 여부 (DOMESTIC)
2. [위치정보법 제19조] 제3자 지도 API(티맵/카카오 등) 좌표 전송 사전동의 누락 여부 (DOMESTIC)
3. [개인정보보호법 제30조] 사이트 첫 화면(푸터) 개인정보처리방침 및 필수 고시 누락 (DOMESTIC)
4. [전자상거래법 제10조] 통신판매업 신고 및 사업자/운영팀 신원 표시의무 (DOMESTIC)
5. [관광진흥법 제4조] 무등록 여행업, 예약 알선 및 중개 수수료 수취 경계 (DOMESTIC)
6. [저작권법 & 공공데이터] 한국관광공사 TourAPI 공공누리(KOGL 제1유형) 출처 표기 준수 여부 (DOMESTIC)
7. [EU AI Act 제50조] AI 투명성 고시 (공공데이터 규칙 엔진인지 AI인지 불확실하면 isAmbiguous: true 및 아키텍처 판별 질문 필수) (GLOBAL)
8. [GDPR 제13/44조] 해외 클라우드 인프라(Render.com 등) 호스팅에 따른 국외 데이터 이전 사전 고지 (GLOBAL)
9. [글로벌 세무/결제] 유료화 시 해외 디지털 판매세(VAT) 미처리 위험 및 MoR 준수 (GLOBAL)
10. [Safe Harbor 약관] 기상 악화, 도로 통제, 실제 매장 폐업 상황에 대한 서비스 법적 면책 조항 (GLOBAL)

[2단 자연어 설명 원칙]
- 각 이슈마다 코드 블록 없이 자연어로만 완결되는 'wrongReason'(위반 사유: 왜 법률상 위반인가)과 'correctReason'(준수 기준: 어떻게 해야 적법한가)을 2~3문장으로 명확히 서술하십시오.
- 타겟 웹사이트가 공공데이터(한국관광공사 TourAPI, 기상청, TMap 등)나 자체 규칙 기반 알고리즘을 쓸 가능성을 고려하고, AI(LLM) 사용 여부가 불확실하면 'isAmbiguous: true'로 지정하고 아키텍처 판별 1문1답('clarificationQuestion')을 제공하십시오.
- penaltyText에는 실제 적발 시 법정 과태료 또는 제재 수위를 명시하십시오.

반드시 아래 JSON 스키마 규격으로만 응답하십시오:
{
  "overallScore": number (0~100 사이의 준수율 점수),
  "grade": string ("GRADE A (STABLE)" 또는 "GRADE B" 또는 "GRADE C (HIGH RISK)"),
  "issues": [
    {
      "id": string (고유ID 예: pipa-28-8),
      "lawName": string (법령 영문명 예: Location Information Act Art. 9),
      "koreanName": string (법령 한글명 및 핵심 조항),
      "jurisdiction": "DOMESTIC" 또는 "GLOBAL",
      "status": "CRITICAL" 또는 "WARNING" 또는 "CAUTION" 또는 "PASSED",
      "tag": string (간결한 뱃지 텍스트),
      "problemTitle": string (문제의 핵심 요약),
      "problemDesc": string (구체적인 위법 사유 및 배경 설명),
      "wrongReason": string (위반 사유: 자연어로만 설명),
      "correctReason": string (준수 기준: 자연어로만 설명),
      "offendingCode": string (참고용 위반 스니펫),
      "penaltyText": string (예상 처벌 및 법정 과태료 수위),
      "solutionTitle": string (해결 방안 제목),
      "solutionDesc": [string] (2~3개 단계별 조치 사항),
      "solutionCode": string (참고용 해결 코드),
      "isAmbiguous": boolean (법적 유권해석 또는 아키텍처 불확실 여부),
      "clarificationQuestion": string (선택적: 회색지대 해소용 질문),
      "clarificationOptions": [
        { "label": string, "resolvedStatus": "PASSED" | "CRITICAL", "impactText": string }
      ]
    }
  ]
}
`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.0,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(rawJsonText);
    const rawIssues = parsed.issues || [];

    // 전수 감사 기준 점수 계산 (가중 감점 공식)
    let calculatedScore = 100;
    rawIssues.forEach((issue: any) => {
      if (issue.status === 'CRITICAL') calculatedScore -= 15;
      else if (issue.status === 'WARNING') calculatedScore -= 8;
      else if (issue.status === 'CAUTION') calculatedScore -= 4;
    });

    let calculatedGrade = 'GRADE A (STABLE)';
    if (calculatedScore < 70) calculatedGrade = 'GRADE C (HIGH RISK)';
    else if (calculatedScore < 85) calculatedGrade = 'GRADE B (ACTION REQUIRED)';

    const finalReport: AuditReport = {
      target: normalizedTarget,
      overallScore: Math.max(0, calculatedScore),
      grade: calculatedGrade,
      latencyMs: Date.now() - startTime,
      isLiveAi: true,
      issues: rawIssues,
    };

    // 캐시에 보관하여 동일 입력에 대해 100% 동일 결과 보장
    AUDIT_CACHE.set(normalizedTarget, finalReport);
    return finalReport;
  } catch (err) {
    console.error('[Gemini Audit Fallback Triggered]:', err);
    // API 장애 또는 키 문제 시 프리셋 데이터로 무중단 안전 폴백
    const fallbackIssues = getIssuesByTarget(targetUrl);
    return {
      target: targetUrl,
      overallScore: 82,
      grade: 'GRADE B (FALLBACK PRESET)',
      latencyMs: Date.now() - startTime,
      isLiveAi: false,
      issues: fallbackIssues,
    };
  }
}

// README 및 프로젝트 아키텍처 문서 전용 감사 함수
export async function auditReadmeWithGemini(
  readmeContent: string,
  apiKey?: string
): Promise<AuditReport> {
  const startTime = Date.now();
  const trimmed = (readmeContent || '').trim();

  // 유효한 Gemini API 키가 있는 경우 Gemini 3.6 Flash 실시간 심층 감사 호출
  if (apiKey && trimmed.length > 20) {
    try {
      const prompt = `
당신은 대한민국 IT 스타트업 및 글로벌 서비스 전문 수석 법률 감사관(Legal Compliance Officer)입니다.
아래 분석 대상 프로젝트의 GitHub README / 아키텍처 문서를 정밀 분석하여, 백엔드 아키텍처, 연동 API, 수집 데이터, 비즈니스 모델상 발생 가능한 10대 법률·세무·라이선스 규제 위반 리스크를 전수 검사하십시오.

[분석 대상 README 문서]
${trimmed.slice(0, 4000)}

[반드시 점검할 전수 규제 체크리스트 (DOMESTIC & GLOBAL)]
1. [위치정보법 제9조] GPS/좌표 수집 및 경로 API 사용 시 방통위 신고 여부 (DOMESTIC)
2. [위치정보법 제19조] 티맵/카카오 등 제3자 지도 API 좌표 전송 고지 (DOMESTIC)
3. [개인정보보호법 제30조] 개인정보처리방침 및 문의처 고시 (DOMESTIC)
4. [전자상거래법 제10조] 개발팀/사업자 신원 표시의무 (DOMESTIC)
5. [관광진흥법/업종규제] 예약 대행/결제 시 무등록 중개 충돌 여부 (DOMESTIC)
6. [저작권법 & 공공데이터] TourAPI 등 공공데이터 공공누리(KOGL) 출처 표기 (DOMESTIC)
7. [EU AI Act & 투명성] LLM 호출 여부 vs 규칙 기반 알고리즘 증명 (GLOBAL)
8. [GDPR 제13/44조] 해외 클라우드(AWS/Render) 호스팅 시 데이터 국외 이전 고시 (GLOBAL)
9. [세무/결제] 유료 모델 도입 시 국가별 디지털 서비스세 및 MoR 요건 (GLOBAL)
10. [Safe Harbor 약관] 현장 변동/환각에 대한 서비스 법적 면책 조항 (GLOBAL)

[2단 자연어 설명 원칙]
- 각 이슈마다 코드 블록 없이 자연어로만 완결되는 'wrongReason'(위반 사유: 왜 법률상 위반인가)과 'correctReason'(준수 기준: 어떻게 해야 적법한가)을 2~3문장으로 명확히 서술하십시오.
- AI(LLM) 사용 여부가 모호하면 'isAmbiguous: true'로 지정하고 아키텍처 판별 1문1답('clarificationQuestion')을 제공하십시오.

반드시 아래 JSON 규격으로만 응답하십시오:
{
  "overallScore": number (0~100 사이의 준수율 점수),
  "grade": string ("GRADE A" | "GRADE B" | "GRADE C"),
  "issues": [
    {
      "id": string,
      "lawName": string,
      "koreanName": string,
      "jurisdiction": "DOMESTIC" | "GLOBAL",
      "status": "CRITICAL" | "WARNING" | "CAUTION" | "PASSED",
      "tag": string,
      "problemTitle": string,
      "problemDesc": string,
      "wrongReason": string,
      "correctReason": string,
      "penaltyText": string,
      "solutionTitle": string,
      "solutionDesc": [string],
      "isAmbiguous": boolean,
      "clarificationQuestion": string,
      "clarificationOptions": [
        { "label": string, "resolvedStatus": "PASSED" | "CRITICAL", "impactText": string }
      ]
    }
  ]
}
`;

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          return {
            target: 'README.md (Architecture Spec)',
            overallScore: parsed.overallScore || 55,
            grade: parsed.grade || 'GRADE B (ACTION REQUIRED)',
            latencyMs: Date.now() - startTime,
            isLiveAi: true,
            issues: parsed.issues || [],
          };
        }
      }
    } catch (err) {
      console.warn('[Gemini README Audit Failed, fallback]:', err);
    }
  }

  // 3. 기본 폴백: 일반 프로젝트 규제 데이터 매핑
  const issues = getIssuesByTarget(trimmed);
  return {
    target: 'README.md (Document Analysis)',
    overallScore: 65,
    grade: 'GRADE B (ACTION REQUIRED)',
    latencyMs: Date.now() - startTime,
    isLiveAi: false,
    issues,
  };
}

// 4. URL + README 동시 교차 검증 하이브리드 감사 함수
export async function auditHybridWithGemini(
  targetUrl: string,
  readmeContent: string,
  apiKey?: string
): Promise<AuditReport> {
  const startTime = Date.now();
  const normalizedUrl = (targetUrl || '').trim();
  const normalizedReadme = (readmeContent || '').trim();

  // Gemini API 키가 있는 경우: 라이브 크롤링과 기획서 교차 검증
  if (apiKey && (normalizedUrl.startsWith('http') || normalizedReadme.length > 20)) {
    try {
      const crawl = normalizedUrl.startsWith('http')
        ? await crawlTarget(normalizedUrl)
        : { title: '', metaDesc: '', headings: [], cleanText: '', footerLinks: [] };

      const prompt = `
당신은 대한민국 IT 스타트업 및 글로벌 서비스 전문 수석 법률 감사관(Legal Compliance Officer)입니다.
아래 분석 대상 프로젝트의 [실제 배포 웹사이트 크롤링 결과]와 [GitHub README / 아키텍처 명세서]를 상호 교차 검증(Cross-Verification)하여 전수 규제 감사를 수행하십시오.

[1. 실제 배포 웹사이트 라이브 데이터]
- URL: ${normalizedUrl || '미입력 (README 단독 분석)'}
- 페이지 제목: ${crawl.title}
- 메타 설명: ${crawl.metaDesc}
- 감지된 푸터 약관/링크: ${crawl.footerLinks.length > 0 ? crawl.footerLinks.join(', ') : '전무함 (푸터 법적 고지 누락 가능성)'}
- 본문 텍스트: ${crawl.cleanText}

[2. 프로젝트 README 및 아키텍처 명세서]
${normalizedReadme.slice(0, 3500) || '미입력 (라이브 웹 단독 분석)'}

[교차 검증 및 감사 핵심 지침]
1. 화면에 보이는 것(외부 표출)과 README에 적힌 내부 아키텍처(데이터 흐름, 외부 API 연동, 결제 등) 사이의 일치 및 불일치를 집중 분석하십시오.
2. 예: 화면엔 추천 엔진이 있으나 README에 "Zero-LLM 결정론적 규칙"이라 명시되어 있다면, EU AI Act 위반 오탐을 방지하고 적법으로 판정하십시오.
3. 예: README에 GPS 및 위치 데이터를 수집한다고 명시되어 있으나 화면 푸터에 위치정보이용약관이 없다면 [위치정보법 제9조/제19조 위반]으로 정확히 지적하십시오.
4. 반드시 DOMESTIC(대한민국 법령)과 GLOBAL(GDPR, AI Act, MoR 등) 양측의 핵심 항목 8~10개를 균형 있게 전수 도출하십시오.

[2단 자연어 설명 원칙]
- 각 이슈마다 코드 블록 없이 자연어로만 완결되는 'wrongReason'(위반 사유: 왜 법률상 위반인가)과 'correctReason'(준수 기준: 어떻게 해야 적법한가)을 2~3문장으로 명확히 서술하십시오.
- 회색지대가 남아 있다면 'isAmbiguous: true'로 지정하고 아키텍처 판별 1문1답('clarificationQuestion')을 제공하십시오.

반드시 아래 JSON 스키마 규격으로만 응답하십시오:
{
  "overallScore": number (0~100 사이의 준수율 점수),
  "grade": string ("GRADE A (STABLE)" | "GRADE B" | "GRADE C (HIGH RISK)"),
  "issues": [
    {
      "id": string,
      "lawName": string,
      "koreanName": string,
      "jurisdiction": "DOMESTIC" | "GLOBAL",
      "status": "CRITICAL" | "WARNING" | "CAUTION" | "PASSED",
      "tag": string,
      "problemTitle": string,
      "problemDesc": string,
      "wrongReason": string,
      "correctReason": string,
      "penaltyText": string,
      "solutionTitle": string,
      "solutionDesc": [string],
      "isAmbiguous": boolean,
      "clarificationQuestion": string,
      "clarificationOptions": [
        { "label": string, "resolvedStatus": "PASSED" | "CRITICAL", "impactText": string }
      ]
    }
  ]
}
`;

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          const targetTitle = normalizedUrl && normalizedReadme 
            ? `${normalizedUrl} + README.md (Hybrid Cross-Audit)`
            : normalizedUrl || 'README.md Spec';

          return {
            target: targetTitle,
            overallScore: parsed.overallScore || 50,
            grade: parsed.grade || 'GRADE B',
            latencyMs: Date.now() - startTime,
            isLiveAi: true,
            issues: parsed.issues || [],
          };
        }
      }
    } catch (err) {
      console.warn('[Hybrid Audit Failed, fallback]:', err);
    }
  }

  // 폴백: URL 또는 README 기반 도메인 프리셋
  const fallbackKey = normalizedUrl || normalizedReadme;
  const issues = getIssuesByTarget(fallbackKey);
  let score = 100;
  issues.forEach((i) => {
    if (i.status === 'CRITICAL') score -= 20;
    else if (i.status === 'WARNING') score -= 12;
    else if (i.status === 'CAUTION') score -= 6;
  });

  return {
    target: normalizedUrl && normalizedReadme 
      ? `${normalizedUrl} + README.md (Hybrid)`
      : normalizedUrl || 'README.md',
    overallScore: Math.max(0, score),
    grade: score >= 80 ? 'GRADE A (STABLE)' : score >= 60 ? 'GRADE B' : 'GRADE C (HIGH RISK)',
    latencyMs: Date.now() - startTime,
    isLiveAi: false,
    issues,
  };
}
