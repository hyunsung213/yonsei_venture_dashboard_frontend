export type TeamType =
  | "Wave-Innovation"
  | "Wave-Series"
  | "Wave-Lab-1"
  | "Wave-Lab-2"
  | "Wave-Local-Practical"
  | "Wave-Local-Experience";

export type Season = "First Half" | "Second Half";

export type FundType = "Support Fund" | "Talent Scholarship";

export type FundingPurpose =
  | "Office Supplies"
  | "Printed & Promotional"
  | "Meeting Expenses"
  | "Participation Fee"
  | "Materials Cost"
  | "Outsourcing Fee";

export const TEAM_TYPES: TeamType[] = [
  "Wave-Innovation",
  "Wave-Series",
  "Wave-Lab-1",
  "Wave-Lab-2",
  "Wave-Local-Practical",
  "Wave-Local-Experience",
];

export const SEASONS: Season[] = ["First Half", "Second Half"];

export const FUND_TYPES: FundType[] = ["Support Fund", "Talent Scholarship"];

export const FUNDING_PURPOSES: FundingPurpose[] = [
  "Office Supplies",
  "Printed & Promotional",
  "Meeting Expenses",
  "Participation Fee",
  "Materials Cost",
  "Outsourcing Fee",
];

// Korean Display Names Mapping
export const TEAM_TYPE_NAMES: Record<TeamType, string> = {
  "Wave-Innovation": "Wave-혁신형",
  "Wave-Series": "Wave-시리즈",
  "Wave-Lab-1": "LAB-1부",
  "Wave-Lab-2": "LAB-2부",
  "Wave-Local-Practical": "LOCAL-실전창업형",
  "Wave-Local-Experience": "LOCAL-창업체험형",
};

export const SEASON_NAMES: Record<Season, string> = {
  "First Half": "상반기",
  "Second Half": "하반기",
};

export const FUND_TYPE_NAMES: Record<FundType, string> = {
  "Support Fund": "지원금",
  "Talent Scholarship": "인재장학금",
};

export const FUNDING_PURPOSE_NAMES: Record<FundingPurpose, string> = {
  "Office Supplies": "사무용품",
  "Printed & Promotional": "인쇄물 및 홍보물",
  "Meeting Expenses": "회의비",
  "Participation Fee": "참가비",
  "Materials Cost": "재료비",
  "Outsourcing Fee": "용역비",
};

// Budget rules for initial budget guide
export interface BudgetGuide {
  support_fund: number;
  talent_scholarship: number;
}

export const BUDGET_GUIDES: Record<TeamType, Record<Season, BudgetGuide>> = {
  "Wave-Innovation": {
    "First Half": { support_fund: 6000000, talent_scholarship: 0 },
    "Second Half": { support_fund: 4000000, talent_scholarship: 0 },
  },
  "Wave-Series": {
    "First Half": { support_fund: 6000000, talent_scholarship: 0 },
    "Second Half": { support_fund: 4000000, talent_scholarship: 0 },
  },
  "Wave-Lab-1": {
    "First Half": { support_fund: 1000000, talent_scholarship: 500000 },
    "Second Half": { support_fund: 500000, talent_scholarship: 1000000 },
  },
  "Wave-Local-Practical": {
    "First Half": { support_fund: 1000000, talent_scholarship: 500000 },
    "Second Half": { support_fund: 500000, talent_scholarship: 1000000 },
  },
  "Wave-Lab-2": {
    "First Half": { support_fund: 300000, talent_scholarship: 250000 },
    "Second Half": { support_fund: 200000, talent_scholarship: 250000 },
  },
  "Wave-Local-Experience": {
    "First Half": { support_fund: 300000, talent_scholarship: 250000 },
    "Second Half": { support_fund: 200000, talent_scholarship: 250000 },
  },
};

// Housekeeping rules/limits for each category
export const TRANSACTION_LIMITS = {
  "Office Supplies": {
    maxSingle: 500000,
    cumulativePercentOfSupportFund: 0.30,
    msgSingle: "사무용품은 1회 집행 금액이 50만 원 이상일 수 없습니다.",
    msgCumulative: "사무용품 누적 사용액이 지원금 총액의 30%를 초과할 수 없습니다.",
  },
  "Meeting Expenses": {
    maxSingle: 500000,
    cumulativePercentOfSupportFund: 0.15,
    msgSingle: "회의비는 1회 집행 금액이 50만 원 이상일 수 없습니다.",
    msgCumulative: "회의비 누적 사용액이 지원금 총액의 15%를 초과할 수 없습니다.",
  },
  "Printed & Promotional": {
    maxSingle: 500000,
    msgSingle: "인쇄물 및 홍보물은 1회 집행 금액이 50만 원 이상일 수 없습니다.",
  },
  "Materials Cost": {
    minSingle: 10000,
    msgSingle: "재료비는 최소 1만 원 이상 집행해야 합니다.",
  },
};
