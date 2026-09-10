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
  Bot
} from 'lucide-react';

export default function Home() {
  const defaultTarget = 'https://alternative-travel-destination.onrender.com/?trip=72a3915c360c';
  const [issues, setIssues] = useState<AuditIssue[]>(() => getIssuesByTarget(defaultTarget));
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [targetInput, setTargetInput] = useState<string>(defaultTarget);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);
  const [modalIssue, setModalIssue] = useState<AuditIssue | null>(null);
  const [isLiveAi, setIsLiveAi] = useState<boolean>(false);
  
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
  const currentIssue = filteredIssues[selectedIndex] || filteredIssues[0] || issues[0];

  // 선택된 관할 필터(전체/국내/글로벌)에 따른 동적 준수율 계산
  const calculateScore = () => {
    if (filteredIssues.length === 0) return 100;
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

  const handleRunAudit = async (customTarget?: string) => {
    const targetToScan = customTarget || targetInput;
    setIsScanning(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: targetToScan }),
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
    handleRunAudit(sampleUrl);
  };

  const handleApplySolution = () => {
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
              <Bot className="w-3 h-3" /> Gemini 1.5 Live AI
            </span>
          )}
        </nav>
      </header>

      {/* Seline Command Bar Input */}
      <div className="my-4">
        <div className="flex items-center gap-2.5 bg-white border border-[#e8e6e5] rounded-xl px-3.5 py-2 text-xs shadow-sm">
          <span className="px-1.5 py-0.5 rounded bg-[#f4f4f5] text-[10px] text-[#78716c] font-mono font-bold">
            ⌘K
          </span>
          <input 
            type="text" 
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="Enter Target URL or Repository (e.g. travel, health, fin, shop)..." 
            className="flex-1 bg-transparent text-xs text-[#0c0a09] font-mono focus:outline-none placeholder:text-[#a8a29e]"
          />
          <button
            onClick={() => handleRunAudit()}
            disabled={isScanning}
            className="bg-[#0c0a09] hover:bg-[#1c1917] text-white px-4 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#3ba6f1]" />
            {isScanning ? 'AI Auditing...' : 'Run Audit'}
          </button>
        </div>

        {/* Quick Sample Presets Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px]">
          <span className="text-[#a8a29e] font-mono">Quick Test:</span>
          <button
            onClick={() => handleSelectSample('https://alternative-travel-destination.onrender.com/?trip=72a3915c360c')}
            className="px-2.5 py-0.5 rounded-full border border-[#3ba6f1] bg-[#eff6ff] text-[#1e40af] font-medium transition-all font-mono shadow-xs"
          >
            ✈️ Plan B 여행 일정 (Live)
          </button>
          <button
            onClick={() => handleSelectSample('https://github.com/sample/ai-health-advisor')}
            className="px-2.5 py-0.5 rounded-full border border-[#e8e6e5] bg-white hover:border-[#3ba6f1] text-[#78716c] hover:text-[#0c0a09] transition-all font-mono"
          >
            🩺 헬스케어 AI
          </button>
          <button
            onClick={() => handleSelectSample('https://github.com/sample/crypto-fin-trader')}
            className="px-2.5 py-0.5 rounded-full border border-[#e8e6e5] bg-white hover:border-[#3ba6f1] text-[#78716c] hover:text-[#0c0a09] transition-all font-mono"
          >
            📈 핀테크 AI
          </button>
          <button
            onClick={() => handleSelectSample('https://github.com/sample/ai-ecommerce-shop')}
            className="px-2.5 py-0.5 rounded-full border border-[#e8e6e5] bg-white hover:border-[#3ba6f1] text-[#78716c] hover:text-[#0c0a09] transition-all font-mono"
          >
            🛍️ 이커머스 AI
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

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1.5 custom-scrollbar">
              {filteredIssues.map((issue, idx) => {
                const isSelected = currentIssue.id === issue.id;
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
          </div>
        </div>

        {/* 2단: 2. Problem Diagnosis (Diff Inspector) (6 cols) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-[#e8e6e5] rounded-[10px] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex flex-col justify-between">
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
        </div>

        {/* 3단: 3. Resolution & Telemetry (3 cols) */}
        <div className="col-span-12 lg:col-span-3 bg-white border border-[#e8e6e5] rounded-[10px] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex flex-col justify-between">
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
