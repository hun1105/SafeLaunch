import { NextRequest, NextResponse } from 'next/server';
import { auditWithGemini, auditReadmeWithGemini } from '@/lib/gemini-auditor';
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

    const mode = body?.mode || 'url';
    const apiKey = process.env.GEMINI_API_KEY;

    // A. README 문서 분석 모드
    if (mode === 'readme') {
      const readmeContent = body?.readmeContent || '';
      const report = await auditReadmeWithGemini(readmeContent, apiKey);
      return NextResponse.json(report);
    }

    // B. 웹 URL 감사 모드
    const target = body?.target || body?.url || '';

    // 1. 유효한 HTTP URL이고 Gemini API 키가 존재할 경우: 실시간 크롤링 & AI 정밀 감사 실행
    if (apiKey && target.startsWith('http')) {
      try {
        const liveReport = await auditWithGemini(target, apiKey);
        return NextResponse.json(liveReport);
      } catch (geminiError) {
        console.warn('[Gemini Call Failed, fallback to preset]:', geminiError);
      }
    }

    // 2. 키 부재 또는 폴백 상황: 고품질 도메인 프리셋으로 무중단 반환
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
  } catch (error: any) {
    console.error('Audit Route Fatal Error:', error);
    return NextResponse.json(
      { error: '감사 프로세스 중 오류가 발생했습니다.', message: error?.message },
      { status: 500 }
    );
  }
}
