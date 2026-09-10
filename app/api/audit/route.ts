import { NextRequest, NextResponse } from 'next/server';
import { auditWithGemini, auditReadmeWithGemini, auditHybridWithGemini } from '@/lib/gemini-auditor';
import { getIssuesByTarget } from '@/lib/audit-data';
import { AuditReport } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const target = (body?.target || body?.url || '').trim();
    const readmeContent = (body?.readmeContent || '').trim();

    // 1. URL과 README가 둘 다 있는 경우: 교차 검증 하이브리드 감사
    if (target && readmeContent) {
      const report = await auditHybridWithGemini(target, readmeContent, apiKey);
      return NextResponse.json(report);
    }

    // 2. README만 있는 경우: README 단독 분석
    if (readmeContent && !target) {
      const report = await auditReadmeWithGemini(readmeContent, apiKey);
      return NextResponse.json(report);
    }

    // 3. URL만 있는 경우: 웹 크롤링 및 라이브 감사
    if (target && !readmeContent) {
      if (apiKey && target.startsWith('http')) {
        try {
          const liveReport = await auditWithGemini(target, apiKey);
          return NextResponse.json(liveReport);
        } catch (geminiError) {
          console.warn('[Gemini URL Call Failed, fallback to preset]:', geminiError);
        }
      }

      // 키 부재 또는 폴백
      const startTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const issues = getIssuesByTarget(target);

      let score = 100;
      issues.forEach((issue) => {
        if (issue.status === 'CRITICAL') score -= 20;
        else if (issue.status === 'WARNING') score -= 12;
        else if (issue.status === 'CAUTION') score -= 6;
      });

      let grade = 'GRADE A (STABLE)';
      if (score < 70) grade = 'GRADE C (HIGH RISK)';
      else if (score < 85) grade = 'GRADE B (ACTION REQUIRED)';

      const report: AuditReport = {
        target: target || 'https://github.com/founder/ai-service-template',
        overallScore: Math.max(0, score),
        grade,
        latencyMs: Date.now() - startTime,
        isLiveAi: false,
        issues,
      };

      return NextResponse.json(report);
    }

    // 둘 다 비어있는 경우
    return NextResponse.json(
      { error: 'URL 또는 README 중 적어도 하나는 입력해야 합니다.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Audit Route Fatal Error:', error);
    return NextResponse.json(
      { error: '감사 프로세스 중 오류가 발생했습니다.', message: error?.message },
      { status: 500 }
    );
  }
}
