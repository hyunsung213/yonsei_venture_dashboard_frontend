import { TeamType, Season } from "./constants";

export const API_BASE = "http://localhost:5000/api";

export type DashboardTeam = {
  id: number;
  team_name: string;
  team_type: TeamType;
  season: Season;
  support_fund: number;
  support_fund_used: number;
  support_fund_balance: number;
  talent_scholarship: number;
  talent_scholarship_used: number;
  talent_scholarship_balance: number;
  created_at: string;
  updated_at: string;
};

export type ExpenseRow = {
  id: number;
  team_id: number;
  team_name: string;
  executed_at: string;
  fund_type: string;
  funding_purpose: string;
  item_name: string;
  purpose: string;
  specification: string;
  unit_price: number;
  quantity: number;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type ExpensesResponse = {
  schema: string[];
  rows: ExpenseRow[];
  total_count: number;
};

// Custom API Error class
export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// Helper to handle API response
async function handleResponse(res: Response) {
  if (res.status === 204) {
    return null;
  }
  
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new ApiError(data.message || "요청에 실패했습니다.", res.status, data.details);
  }
  return data;
}

// Handle network / CORS errors
function handleFetchError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }
  // If it's a TypeError, it's likely CORS or network down
  if (error instanceof Error && error.name === "TypeError") {
    throw new ApiError(
      "서버와 통신할 수 없거나 CORS 오류가 발생했습니다. 백엔드 서버(http://localhost:5000)가 정상 작동 중이고 CORS가 허용되어 있는지 확인해 주세요.",
      0
    );
  }
  if (error instanceof Error) {
    throw new ApiError(error.message || "알 수 없는 네트워크 오류가 발생했습니다.");
  }
  throw new ApiError("알 수 없는 네트워크 오류가 발생했습니다.");
}

// 1. Dashboard View
export async function getTeamsDashboard(): Promise<DashboardTeam[]> {
  try {
    const res = await fetch(`${API_BASE}/teams/dashboard`, {
      cache: "no-store",
    });
    const data = await handleResponse(res);
    return data.teams || [];
  } catch (err) {
    handleFetchError(err);
  }
}

// 2. Create Team
export async function createTeam(payload: {
  team_name: string;
  team_type: TeamType;
  season: Season;
  support_fund?: number;
  talent_scholarship?: number;
}): Promise<DashboardTeam> {
  try {
    const res = await fetch(`${API_BASE}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse(res);
    return data.team;
  } catch (err) {
    handleFetchError(err);
  }
}

// 3. Get Team Detail
export async function getTeam(teamId: number): Promise<DashboardTeam> {
  try {
    const res = await fetch(`${API_BASE}/teams/${teamId}`, {
      cache: "no-store",
    });
    const data = await handleResponse(res);
    return data.team;
  } catch (err) {
    handleFetchError(err);
  }
}

// 4. Update Team
export async function updateTeam(
  teamId: number,
  payload: {
    team_name?: string;
    team_type?: TeamType;
    season?: Season;
    support_fund?: number;
    talent_scholarship?: number;
    reset_budget_by_rule?: boolean;
  }
): Promise<DashboardTeam> {
  try {
    const res = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse(res);
    return data.team;
  } catch (err) {
    handleFetchError(err);
  }
}

// 5. Delete Team
export async function deleteTeam(teamId: number): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: "DELETE",
    });
    await handleResponse(res);
  } catch (err) {
    handleFetchError(err);
  }
}

// 6. Get Expenses list with query filters
export async function getExpenses(
  teamId: number,
  query?: {
    funding_purpose?: string;
    fund_type?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ExpensesResponse> {
  try {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, val]) => {
        if (val) params.append(key, val);
      });
    }
    const qs = params.toString();
    const url = `${API_BASE}/teams/${teamId}/expenses${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await handleResponse(res);
    return data;
  } catch (err) {
    handleFetchError(err);
  }
}

// 7. Create Expense
export async function createExpense(
  teamId: number,
  payload: {
    item_name: string;
    purpose: string;
    funding_purpose: string;
    fund_type: string;
    specification?: string;
    unit_price: number;
    quantity: number;
    executed_at: string;
  }
): Promise<ExpenseRow> {
  try {
    const res = await fetch(`${API_BASE}/teams/${teamId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse(res);
    return data.expense;
  } catch (err) {
    handleFetchError(err);
  }
}

// 8. Update Expense
export async function updateExpense(
  teamId: number,
  expenseId: number,
  payload: {
    item_name?: string;
    purpose?: string;
    funding_purpose?: string;
    fund_type?: string;
    specification?: string;
    unit_price?: number;
    quantity?: number;
    executed_at?: string;
  }
): Promise<ExpenseRow> {
  try {
    const res = await fetch(`${API_BASE}/teams/${teamId}/expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse(res);
    return data.expense;
  } catch (err) {
    handleFetchError(err);
  }
}

// 9. Delete Expense
export async function deleteExpense(teamId: number, expenseId: number): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/teams/${teamId}/expenses/${expenseId}`, {
      method: "DELETE",
    });
    await handleResponse(res);
  } catch (err) {
    handleFetchError(err);
  }
}
