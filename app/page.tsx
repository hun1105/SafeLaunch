'use client';

import React, { useState } from 'react';
import { DEFAULT_ISSUES, getIssuesByTarget } from '@/lib/audit-data';
import { AuditIssue, RiskLevel, Jurisdiction } from '@/lib/types';
import { 
  Sparkles, 
  HelpCircle, 
  X, 
  Check, 
  Copy, 
  ChevronRight,
  Globe,
  MapPin,
  Bot,
  FileText,
  UploadCloud,
  Trash2
} from 'lucide-react';

export default function Home() {
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [targetInput, setTargetInput] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);
  const [modalIssue, setModalIssue] = useState<AuditIssue | null>(null);
  const [isLiveAi, setIsLiveAi] = useState<boolean>(false);
  
  // URL 및 README 통합 입력 상태
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [attachedFileName, setAttachedFileName] = useState<string>('');

  // 국내 / 해외 분리 필터 상태 ('ALL' | 'DOMESTIC' | 'GLOBAL')
  const [jurisdictionFilter, setJurisdictionFilter] = useState<'ALL' | Jurisdiction>('ALL');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('filter');
      if (p === 'DOMESTIC' || p === 'GLOBAL' || p === 'ALL') {
        setJurisdictionFilter(p);
      }
    }
  }, []);

  // 필터링된 이슈 목록
  const filteredIssues = issues.filter((issue) => {
    if (jurisdictionFilter === 'ALL') return true;
    return issue.jurisdiction === jurisdictionFilter;
  });

  // 현재 선택된 이슈 (필터 변경 시 유효성 보장)
  const currentIssue = filteredIssues[selectedIndex] || filteredIssues[0] || null;

  // 선택된 관할 필터(전체/국내/글로벌)에 따른 동적 준수율 계산
  const calculateScore = () => {
    if (filteredIssues.length === 0) return 0;
    let score = 100;
    const critPenalty = jurisdictionFilter === 'ALL' ? 15 : 22;
    const warnPenalty = jurisdictionFilter === 'ALL' ? 8 : 12;
    const cautPenalty = jurisdictionFilter === 'ALL' ? 4 : 6;

    filteredIssues.forEach((i) => {
      if (i.status === 'CRITICAL') score -= critPenalty;
      else if (i.status === 'WARNING') score -= warnPenalty;
      else if (i.status === 'CAUTION') score -= cautPenalty;
    });
    return Math.max(0, score);
  };

  const currentScore = calculateScore();

  const handleRunAudit = async (customTarget?: string, customReadme?: string) => {
    const targetToScan = customTarget !== undefined ? customTarget : targetInput;
    const readmeToScan = customReadme !== undefined ? customReadme : readmeContent;

    if (!targetToScan.trim() && !readmeToScan.trim()) return;

    setIsScanning(true);
    try {
      const payload = {
        target: targetToScan.trim(),
        readmeContent: readmeToScan.trim(),
      };

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.issues && data.issues.length > 0) {
        setIssues(data.issues);
        setIsLiveAi(!!data.isLiveAi);
        setSelectedIndex(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    setTargetInput(sampleUrl);
    handleRunAudit(sampleUrl, undefined);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setReadmeContent(text || '');
    };
    reader.readAsText(file);
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setAttachedFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setReadmeContent(text || '');
    };
    reader.readAsText(file);
  };

  const handleApplySolution = () => {
    if (!currentIssue) return;
    navigator.clipboard.writeText(currentIssue.solutionCode);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  const handleResolveAmbiguity = (resolvedStatus: RiskLevel) => {
    if (!modalIssue) return;
    setIssues((prev) =>
      prev.map((item) =>
        item.id === modalIssue.id
          ? { ...item, status: resolvedStatus, isAmbiguous: false }
          : item
      )
    );
    setModalIssue(null);
  };

  const getStatusDot = (status: RiskLevel) => {
    switch (status) {
      case 'CRITICAL':
        return <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" title="Critical Violation" />;
      case 'WARNING':
        return <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" title="Warning" />;
      case 'CAUTION':
        return <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" title="Caution" />;
      case 'PASSED':
        return <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" title="Passed" />;
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-5 font-sans">
      {/* Top Header: 불필요한 죽은 탭 전면 삭제, Overview만 유지 */}
      <header className="flex flex-wrap items-center justify-between pb-3.5 border-b border-[#e8e6e5] text-xs gap-3">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[#0c0a09]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
          </svg>
          <span className="font-medium tracking-tight text-sm text-[#0c0a09]">
            SAFELAUNCH // AUDIT TERMINAL
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] text-[10px] font-mono font-medium">
            Live system latency 12ms
          </span>
        </div>

        {/* Overview 단일 항목만 유지 (불필요한 탭 제거 완료) */}
        <nav className="flex items-center gap-3 text-xs">
          <span className="text-[#0c0a09] font-medium border-b-2 border-[#0c0a09] pb-0.5">
            Overview
          </span>
          {isLiveAi && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] font-mono">
              <Bot className="w-3 h-3" /> Gemini 3.6 Live AI
            </span>
          )}
        </nav>
      </header>

      {/* Seline Unified Target Workspace (URL + README 동시 지원) */}
      <div className="my-4 bg-white border border-[#e8e6e5] rounded-xl p-3.5 shadow-sm space-y-3">
        {/* 상단 안내 & 상태 배지 */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#f0eeec]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0c0a09] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3ba6f1]" />
              통합 컴플라이언스 대상 입력 (Dual-Source Workspace)
            </span>
            <span className="text-[11px] text-[#78716c]">
              (배포 URL과 README 중 하나만 있어도 되며, 둘 다 입력 시 교차 검증)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {targetInput.trim() && readmeContent.trim() ? (
              <span className="px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] text-[10px] font-mono font-medium">
                하이브리드 교차 검증 활성 (정밀도 극대화)
              </span>
            ) : targetInput.trim() ? (
              <span className="px-2 py-0.5 rounded-full bg-[#f4f4f5] text-[#0c0a09] border border-[#e8e6e5] text-[10px] font-mono">
                웹 라이브 단독 모드
              </span>
            ) : readmeContent.trim() ? (
              <span className="px-2 py-0.5 rounded-full bg-[#f4f4f5] text-[#0c0a09] border border-[#e8e6e5] text-[10px] font-mono">
                README 기획서 단독 모드
              </span>
            ) : null}

            {(targetInput || readmeContent) && (
              <button
                type="button"
                onClick={() => { setTargetInput(''); setReadmeContent(''); setAttachedFileName(''); }}
                className="px-2 py-1 text-xs text-[#78716c] hover:text-[#ef4444] transition-colors flex items-center gap-1 border border-[#e8e6e5] rounded hover:border-[#fecaca] bg-white"
                title="전체 초기화"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#ef4444]" />
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 1. 배포 웹 URL 입력란 */}
        <div>
          <div className="flex items-center justify-between mb-1.5 text-[11px]">
            <span className="font-semibold text-[#0c0a09] flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-[#3ba6f1]" />
              배포된 웹 서비스 URL (Live Web)
            </span>
            <span className="text-[#a8a29e] font-mono text-[10px]">선택 입력</span>
          </div>
          <div className="flex items-center gap-2.5 bg-[#fafaf9] border border-[#e8e6e5] rounded-lg px-3 py-2 text-xs">
            <span className="px-1.5 py-0.5 rounded bg-[#f4f4f5] text-[10px] text-[#78716c] font-mono font-bold">
              URL
            </span>
            <input 
              type="text" 
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="https://your-service.com (실제 배포 화면, 푸터 약관, 쿠키 등 검사)..." 
              className="flex-1 bg-transparent text-xs text-[#0c0a09] font-mono focus:outline-none placeholder:text-[#a8a29e]"
            />
          </div>
        </div>

        {/* 2. README / 아키텍처 명세서 입력란 */}
        <div>
          <div className="flex items-center justify-between mb-1.5 text-[11px]">
            <span className="font-semibold text-[#0c0a09] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#3ba6f1]" />
              GitHub README / 아키텍처 명세서 (Markdown)
            </span>
            <span className="text-[#a8a29e] font-mono text-[10px]">선택 입력</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* 드롭존 (4 cols) */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropFile}
              className="col-span-1 md:col-span-4 border-2 border-dashed border-[#e8e6e5] hover:border-[#3ba6f1] rounded-lg p-3 bg-[#fafaf9] flex flex-col items-center justify-center text-center transition-colors cursor-pointer relative min-h-[90px]"
            >
              <input
                type="file"
                accept=".md,.markdown,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <UploadCloud className="w-5 h-5 text-[#3ba6f1] mb-1" />
              <div className="text-[11px] font-medium text-[#0c0a09] mb-0.5">
                README.md 드래그 또는 클릭
              </div>
              <div className="text-[9px] text-[#a8a29e]">
                .md, .txt 마크다운 파일 지원
              </div>
              {attachedFileName && (
                <div className="mt-1.5 text-[10px] px-2 py-0.5 bg-white border border-[#bbf7d0] text-[#166534] rounded flex items-center gap-1 font-mono">
                  <Check className="w-3 h-3 text-[#10b981]" />
                  {attachedFileName}
                </div>
              )}
            </div>

            {/* 마크다운 텍스트 영역 (8 cols) */}
            <div className="col-span-1 md:col-span-8 flex flex-col">
              <textarea
                value={readmeContent}
                onChange={(e) => setReadmeContent(e.target.value)}
                placeholder="README 내용을 붙여넣으세요... (연동 API, 라이브러리, 데이터 처리 흐름, LLM 사용 여부 등)"
                rows={3}
                className="w-full h-24 p-2.5 bg-[#fafaf9] border border-[#e8e6e5] rounded-lg text-xs font-mono text-[#0c0a09] focus:outline-none focus:border-[#3ba6f1] resize-none leading-relaxed placeholder:text-[#a8a29e]"
              />
            </div>
          </div>
        </div>

        {/* 하단 감사 실행 바 & 퀵 프리셋 */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#f0eeec] gap-2">
          {/* 퀵 테스트 칩 */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-[#a8a29e] font-mono">Quick Test:</span>
            <button
              onClick={() => handleSelectSample('https://github.com/sample/ai-health-advisor')}
              className="px-2.5 py-0.5 rounded-full border border-[#e8e6e5] bg-white hover:border-[#3ba6f1] text-[#78716c] hover:text-[#0c0a09] transition-all font-mono"
            >
              헬스케어 AI
            </button>
            <button
              onClick={() => handleSelectSample('https://github.com/sample/crypto-fin-trader')}
              className="px-2.5 py-0.5 rounded-full border border-[#e8e6e5] bg-white hover:border-[#3ba6f1] text-[#78716c] hover:text-[#0c0a09] transition-all font-mono"
            >
              핀테크 AI
            </button>
            <button
              onClick={() => handleSelectSample('https://github.com/sample/ai-ecommerce-shop')}
              className="px-2.5 py-0.5 rounded-full border border-[#e8e6e5] bg-white hover:border-[#3ba6f1] text-[#78716c] hover:text-[#0c0a09] transition-all font-mono"
            >
              이커머스 AI
            </button>
          </div>

          {/* 통합 감사 실행 버튼 */}
          <button
            onClick={() => handleRunAudit()}
            disabled={isScanning || (!targetInput.trim() && !readmeContent.trim())}
            className="bg-[#0c0a09] hover:bg-[#1c1917] text-white px-5 py-2 rounded-full text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#3ba6f1]" />
            {isScanning
              ? '컴플라이언스 교차 감사 중...'
              : targetInput.trim() && readmeContent.trim()
              ? '하이브리드 교차 감사 실행 (URL + README)'
              : targetInput.trim()
              ? '배포 웹 URL 감사 실행'
              : readmeContent.trim()
              ? 'README 명세 감사 실행'
              : '감사 실행 (최소 1개 입력 필요)'}
          </button>
        </div>
      </div>

      {/* 3-Column Seline Terminal Layout */}
      <div className="grid grid-cols-12 gap-4 text-xs">
        
        {/* 1단: 1. Flagged Regulations (3 cols) + 국내/해외 탭 분리 */}
        <div className="col-span-12 lg:col-span-3 bg-white border border-[#e8e6e5] rounded-[10px] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="text-xl font-bold text-[#0c0a09] tracking-tight mb-2.5">
              1. Flagged Regulations
            </div>

            {/* 국내법 vs 글로벌 규제 분리 필터 탭 */}
            <div className="flex items-center gap-1 p-1 bg-[#f4f4f5] rounded-lg mb-3 text-[11px] font-mono">
              <button
                onClick={() => { setJurisdictionFilter('ALL'); setSelectedIndex(0); }}
                className={`flex-1 py-1 rounded-md text-center transition-all ${
                  jurisdictionFilter === 'ALL'
                    ? 'bg-white text-[#0c0a09] font-bold shadow-xs'
                    : 'text-[#78716c] hover:text-[#0c0a09]'
                }`}
              >
                전체 ({issues.length})
              </button>
              <button
                onClick={() => { setJurisdictionFilter('DOMESTIC'); setSelectedIndex(0); }}
                className={`flex-1 py-1 rounded-md text-center flex items-center justify-center gap-1 transition-all ${
                  jurisdictionFilter === 'DOMESTIC'
                    ? 'bg-white text-[#0c0a09] font-bold shadow-xs'
                    : 'text-[#78716c] hover:text-[#0c0a09]'
                }`}
              >
                <MapPin className="w-3 h-3 text-[#ef4444]" /> 국내법
              </button>
              <button
                onClick={() => { setJurisdictionFilter('GLOBAL'); setSelectedIndex(0); }}
                className={`flex-1 py-1 rounded-md text-center flex items-center justify-center gap-1 transition-all ${
                  jurisdictionFilter === 'GLOBAL'
                    ? 'bg-white text-[#0c0a09] font-bold shadow-xs'
                    : 'text-[#78716c] hover:text-[#0c0a09]'
                }`}
              >
                <Globe className="w-3 h-3 text-[#3ba6f1]" /> 글로벌
              </button>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="h-[360px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#e8e6e5] rounded-lg bg-[#fafaf9]">
                <div className="w-10 h-10 rounded-full bg-[#f4f4f5] flex items-center justify-center text-[#78716c] mb-3">
                  <FileText className="w-5 h-5 text-[#a8a29e]" />
                </div>
                <div className="text-xs font-bold text-[#0c0a09] mb-1">감사 대기 상태</div>
                <p className="text-[11px] text-[#78716c] leading-relaxed break-keep">
                  URL을 입력하거나 README 문서를 등록하여 실시간 규제 감사를 실행하세요.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1.5 custom-scrollbar">
                {filteredIssues.map((issue, idx) => {
                  const isSelected = currentIssue?.id === issue.id;
                  const rawName = issue.koreanName || issue.lawName;
                  const [badgeText, ...rest] = rawName.includes(':') 
                    ? rawName.split(':') 
                    : [issue.jurisdiction === 'DOMESTIC' ? '국내 법령' : '글로벌 규제', rawName];
                  const detailTitle = rest.join(':').trim() || rawName;

                  return (
                    <div key={issue.id}>
                      <div
                        onClick={() => setSelectedIndex(idx)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#fafaf9] border-[#e8e6e5] shadow-xs ring-1 ring-[#0c0a09]/10'
                            : 'bg-white border-[#f0eeec] hover:bg-[#fafaf9] hover:border-[#e8e6e5]'
                        }`}
                      >
                        {/* 상단: 법령 배지 & 관할/상태 */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#f4f4f5] text-[#0c0a09] font-sans">
                            {badgeText.trim()}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#f4f4f5] text-[#78716c] font-sans">
                              {issue.jurisdiction === 'DOMESTIC' ? '국내' : '글로벌'}
                            </span>
                            {getStatusDot(issue.status)}
                          </div>
                        </div>

                        {/* 하단: 핵심 내용 (말줄임 없이 전문 2줄 줄바꿈) */}
                        <div className="flex items-start gap-1.5">
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 transition-transform ${isSelected ? 'text-[#3ba6f1]' : 'text-[#a8a29e]'}`} />
                          <span className={`text-xs break-keep leading-snug font-sans ${isSelected ? 'text-[#0c0a09] font-semibold' : 'text-[#57534e]'}`}>
                            {detailTitle}
                          </span>
                        </div>
                      </div>

                      {/* 조건부 모호함 핀셋 버튼 */}
                      {issue.isAmbiguous && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalIssue(issue);
                          }}
                          className="mt-1 ml-3 w-[calc(100%-0.75rem)] flex items-center justify-center gap-1 bg-[#fffbeb] border border-[#fef3c7] hover:bg-[#fef3c7] text-[#b45309] text-[10px] py-1 rounded transition-colors font-sans"
                        >
                          <HelpCircle className="w-3 h-3" />
                          판별 필요 (1문1답 확인)
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2단: 2. Problem Diagnosis (Diff Inspector) (6 cols) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-[#e8e6e5] rounded-[10px] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          {!currentIssue ? (
            <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#e8e6e5] rounded-lg bg-[#fafaf9]">
              <div className="w-12 h-12 rounded-full bg-[#eff6ff] flex items-center justify-center text-[#3ba6f1] mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-[#0c0a09] mb-1">규제 진단 대기 중</div>
              <p className="text-xs text-[#78716c] max-w-sm leading-relaxed break-keep">
                감사를 실행하면 위반 사유(RISK)와 안전 준수 기준(SAFE)을 자연어로 명확하게 대조 진단합니다.
              </p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between text-xl font-bold text-[#0c0a09] tracking-tight mb-2.5">
                  <span>2. Problem Diagnosis</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#f4f4f5] text-[#0c0a09] font-mono">
                    {currentIssue.jurisdiction === 'DOMESTIC' ? '대한민국 법령' : '글로벌 규제'}
                  </span>
                </div>

                <div className="font-bold text-sm text-[#0c0a09] mb-1">
                  {currentIssue.problemTitle}
                </div>
                <p className="text-[12px] text-[#78716c] leading-relaxed mb-3">
                  {currentIssue.problemDesc}
                </p>

                {/* 2단: 자연어 기반 법률 분석 대조 (위반 사유 vs 준수 기준) */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* 위반 사유 (RISK) */}
                  <div className="border border-[#fecaca] bg-[#fef2f2]/70 rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="text-[#991b1b] font-bold pb-1.5 mb-2 border-b border-[#fecaca] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#ef4444]" />
                          위반 사유
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#fee2e2] text-[#b91c1c] font-semibold rounded">RISK</span>
                      </div>
                      <p className="text-[#991b1b] text-[12px] leading-relaxed font-sans">
                        {currentIssue.wrongReason || currentIssue.problemDesc}
                      </p>
                    </div>
                  </div>

                  {/* 준수 기준 (SAFE) */}
                  <div className="border border-[#bbf7d0] bg-[#f0fdf4]/70 rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="text-[#166534] font-bold pb-1.5 mb-2 border-b border-[#bbf7d0] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#10b981]" />
                          준수 기준
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#dcfce7] text-[#15803d] font-semibold rounded">SAFE</span>
                      </div>
                      <p className="text-[#166534] text-[12px] leading-relaxed font-sans">
                        {currentIssue.correctReason || (currentIssue.solutionDesc ? currentIssue.solutionDesc.join(' ') : currentIssue.solutionTitle)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2.5 bg-[#fafaf9] border border-[#e8e6e5] rounded-lg text-[11px] text-[#78716c]">
                <strong>법적 제재 수위:</strong>{' '}
                <span className="text-[#0c0a09] font-medium">{currentIssue.penaltyText}</span>
              </div>
            </>
          )}
        </div>

        {/* 3단: 3. Resolution & Telemetry (3 cols) */}
        <div className="col-span-12 lg:col-span-3 bg-white border border-[#e8e6e5] rounded-[10px] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          {!currentIssue ? (
            <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#e8e6e5] rounded-lg bg-[#fafaf9]">
              <div className="w-10 h-10 rounded-full bg-[#f4f4f5] flex items-center justify-center text-[#78716c] mb-3">
                <Check className="w-5 h-5 text-[#a8a29e]" />
              </div>
              <div className="text-xs font-bold text-[#0c0a09] mb-1">해결 방안 대기</div>
              <p className="text-[11px] text-[#78716c] leading-relaxed break-keep mb-6">
                감사 완료 후 즉시 복사 가능한 해결 코드와 원클릭 규제 조치안이 제공됩니다.
              </p>
              <button 
                disabled
                className="w-full py-2.5 rounded-full text-xs font-medium bg-[#f4f4f5] text-[#a8a29e] cursor-not-allowed"
              >
                감사 실행 대기 중
              </button>
            </div>
          ) : (
            <>
              <div>
                <div className="text-xl font-bold text-[#0c0a09] tracking-tight mb-2">
                  3. Resolution
                </div>

                {/* Circular Gauge */}
                <div className="flex flex-col items-center justify-center py-3">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#e8e6e5" strokeWidth="7" fill="none"/>
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        stroke={currentScore >= 70 ? '#10b981' : currentScore >= 50 ? '#3ba6f1' : '#ef4444'} 
                        strokeWidth="7" 
                        fill="none"
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - (251.2 * currentScore) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <div className="text-2xl font-bold tracking-tight text-[#0c0a09]">
                        {currentScore}<span className="text-xs text-[#78716c] font-normal">/100</span>
                      </div>
                      <div className="text-[11px] text-[#78716c] font-medium mt-0.5">
                        준수율
                      </div>
                    </div>
                  </div>
                </div>

                {/* 해결 방안 */}
                <div className="space-y-1.5 mb-3.5">
                  <div className="text-[11px] font-bold text-[#78716c] tracking-wider">
                    해결 방안
                  </div>
                  <div className="space-y-1 text-xs text-[#44403c] leading-relaxed">
                    {currentIssue.solutionDesc?.slice(0, 2).map((desc, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[#3ba6f1] font-bold shrink-0">•</span>
                        <span>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seline Signature Cyan Pill Button (#3ba6f1) */}
              <button 
                onClick={handleApplySolution}
                className={`w-full py-2.5 rounded-full text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5 ${
                  applied
                    ? 'bg-[#0c0a09] text-white'
                    : 'bg-[#3ba6f1] hover:bg-[#3398e1] text-white'
                }`}
              >
                {applied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {applied ? 'Solution Applied & Copied!' : 'Apply Solution & Export'}
              </button>
            </>
          )}
        </div>

      </div>

      {/* Interactive Clarification Modal */}
      {modalIssue && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e8e6e5] rounded-[16px] max-w-lg w-full p-5 shadow-[0_12px_45px_rgba(17,12,46,0.12)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#e8e6e5]">
              <span className="font-medium text-sm text-[#0c0a09] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#3ba6f1]" />
                조건부 규제 핀셋 질의 (Grey Zone)
              </span>
              <button onClick={() => setModalIssue(null)} className="text-[#a8a29e] hover:text-[#0c0a09]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4">
              <div className="text-xs font-medium text-[#0c0a09] mb-1.5">
                {modalIssue.lawName}: {modalIssue.koreanName}
              </div>
              <p className="text-xs text-[#78716c] leading-relaxed mb-4">
                {modalIssue.clarificationQuestion}
              </p>

              <div className="space-y-2 text-xs">
                {modalIssue.clarificationOptions?.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleResolveAmbiguity(opt.resolvedStatus)}
                    className="w-full text-left p-3 rounded-lg border border-[#e8e6e5] bg-[#fafaf9] hover:border-[#3ba6f1] hover:bg-white transition-all"
                  >
                    <div className="font-medium text-[#0c0a09]">{opt.label}</div>
                    <div className="text-[11px] text-[#78716c] mt-0.5">➔ {opt.impactText}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
