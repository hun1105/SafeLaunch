export type RiskLevel = 'CRITICAL' | 'WARNING' | 'CAUTION' | 'PASSED';
export type Jurisdiction = 'DOMESTIC' | 'GLOBAL';

export interface AuditIssue {
  id: string;
  lawName: string;
  koreanName: string;
  jurisdiction: Jurisdiction;
  status: RiskLevel;
  tag: string;
  problemTitle: string;
  problemDesc: string;
  offendingCode: string;
  penaltyText: string;
  solutionTitle: string;
  solutionDesc: string[];
  solutionCode: string;
  wrongReason?: string;
  correctReason?: string;
  isAmbiguous?: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: {
    label: string;
    resolvedStatus: RiskLevel;
    impactText: string;
  }[];
}

export interface AuditReport {
  target: string;
  overallScore: number;
  grade: string;
  latencyMs: number;
  isLiveAi?: boolean;
  issues: AuditIssue[];
}
