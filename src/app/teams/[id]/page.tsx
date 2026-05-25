"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  SlidersHorizontal,
  Coins,
  GraduationCap,
  FileSpreadsheet,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Search,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import Modal from "@/components/Modal";
import {
  DashboardTeam,
  ExpenseRow,
  getTeam,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/lib/api";
import {
  FUND_TYPES,
  FUNDING_PURPOSES,
  FUND_TYPE_NAMES,
  FUNDING_PURPOSE_NAMES,
  SEASON_NAMES,
  TEAM_TYPE_NAMES,
  TRANSACTION_LIMITS,
} from "@/lib/constants";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeamDetailPage({ params }: PageProps) {
  const { id: teamIdStr } = use(params);
  const teamId = Number(teamIdStr);

  const { showToast } = useToast();

  // Data State
  const [team, setTeam] = useState<DashboardTeam | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [allExpensesUnfiltered, setAllExpensesUnfiltered] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Sorting States
  const [filterFundType, setFilterFundType] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [sortField, setSortField] = useState<"executed_at" | "unit_price" | "quantity" | "amount" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null);

  // Form State
  const [executedAt, setExecutedAt] = useState("");
  const [fundType, setFundType] = useState<string>("Support Fund");
  const [fundingPurpose, setFundingPurpose] = useState<string>("Office Supplies");
  const [itemName, setItemName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [specification, setSpecification] = useState("");
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRow | null>(null);

  // Today YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Load team data and expenses
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch team details
      const teamData = await getTeam(teamId);
      setTeam(teamData);

      // 2. Fetch ALL expenses (unfiltered)
      const expenseData = await getExpenses(teamId);
      const rows = expenseData.rows || [];
      setExpenses(rows);
      setAllExpensesUnfiltered(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "데이터를 불러오는 데 실패했습니다.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [teamId, showToast]);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(handle);
  }, [loadData]);

  // Open Create Expense Modal
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setExecutedAt(getTodayString());
    setFundType("Support Fund");
    setFundingPurpose("Office Supplies");
    setItemName("");
    setPurpose("");
    setSpecification("");
    setUnitPrice(0);
    setQuantity(1);
    setIsModalOpen(true);
  };

  // Open Edit Expense Modal
  const handleOpenEditModal = (expense: ExpenseRow) => {
    setModalMode("edit");
    setSelectedExpenseId(expense.id);
    setExecutedAt(expense.executed_at);
    setFundType(expense.fund_type);
    setFundingPurpose(expense.funding_purpose);
    setItemName(expense.item_name);
    setPurpose(expense.purpose);
    setSpecification(expense.specification || "");
    setUnitPrice(expense.unit_price);
    setQuantity(expense.quantity);
    setIsModalOpen(true);
  };

  // Client Validation Logic
  const validateExpense = (): boolean => {
    if (!team) return false;
    
    // Talent Scholarship doesn't have use/purpose checks
    if (fundType === "Talent Scholarship") {
      return true;
    }
    
    const amount = unitPrice * quantity;

    // 1. Office Supplies (사무용품) & Meeting Expenses (회의비)
    if (fundingPurpose === "Office Supplies" || fundingPurpose === "Meeting Expenses") {
      // Rule A: Single transaction max 500,000 KRW
      if (amount >= TRANSACTION_LIMITS["Office Supplies"].maxSingle) {
        showToast(TRANSACTION_LIMITS["Office Supplies"].msgSingle, "error");
        return false;
      }

      // Rule B: Cumulative limits on support fund budget
      const totalSupportFund = team.support_fund;
      if (totalSupportFund <= 0) {
        showToast("지원금 예산이 설정되지 않아 집행 한도를 체크할 수 없습니다.", "error");
        return false;
      }

      // Sum all other expenses of this category (excluding current if editing)
      const otherCumulative = allExpensesUnfiltered.reduce((sum, item) => {
        if (item.funding_purpose === fundingPurpose && item.id !== selectedExpenseId) {
          return sum + item.amount;
        }
        return sum;
      }, 0);

      const limitPercent =
        fundingPurpose === "Office Supplies"
          ? TRANSACTION_LIMITS["Office Supplies"].cumulativePercentOfSupportFund
          : TRANSACTION_LIMITS["Meeting Expenses"].cumulativePercentOfSupportFund;

      const limitAmount = totalSupportFund * limitPercent;
      const totalCumulative = otherCumulative + amount;

      if (totalCumulative > limitAmount) {
        const msg =
          fundingPurpose === "Office Supplies"
            ? `${TRANSACTION_LIMITS["Office Supplies"].msgCumulative} (최대 한도: ${limitAmount.toLocaleString()}원, 예상 누적액: ${totalCumulative.toLocaleString()}원)`
            : `${TRANSACTION_LIMITS["Meeting Expenses"].msgCumulative} (최대 한도: ${limitAmount.toLocaleString()}원, 예상 누적액: ${totalCumulative.toLocaleString()}원)`;
        showToast(msg, "error");
        return false;
      }
    }

    // 2. Printed & Promotional (인쇄물 및 홍보물)
    if (fundingPurpose === "Printed & Promotional") {
      if (amount >= TRANSACTION_LIMITS["Printed & Promotional"].maxSingle) {
        showToast(TRANSACTION_LIMITS["Printed & Promotional"].msgSingle, "error");
        return false;
      }
    }

    // 3. Materials Cost (재료비)
    if (fundingPurpose === "Materials Cost") {
      if (amount < TRANSACTION_LIMITS["Materials Cost"].minSingle) {
        showToast(TRANSACTION_LIMITS["Materials Cost"].msgSingle, "error");
        return false;
      }
    }

    return true;
  };

  // Submit Expense (Create or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      showToast("품명을 입력해 주세요.", "warning");
      return;
    }
    if (!purpose.trim()) {
      showToast("집행 목적을 입력해 주세요.", "warning");
      return;
    }
    if (unitPrice < 0) {
      showToast("단가는 0원 이상이어야 합니다.", "warning");
      return;
    }
    if (quantity < 1) {
      showToast("수량은 최소 1개 이상이어야 합니다.", "warning");
      return;
    }
    if (!executedAt) {
      showToast("집행 날짜를 지정해 주세요.", "warning");
      return;
    }

    // Run custom client validations
    if (!validateExpense()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        item_name: itemName,
        purpose,
        funding_purpose: fundType === "Talent Scholarship" ? "Participation Fee" : fundingPurpose,
        fund_type: fundType,
        specification,
        unit_price: Number(unitPrice),
        quantity: Number(quantity),
        executed_at: executedAt,
      };

      if (modalMode === "create") {
        await createExpense(teamId, payload);
        showToast("사용 내역이 등록되었습니다.", "success");
      } else if (modalMode === "edit" && selectedExpenseId !== null) {
        await updateExpense(teamId, selectedExpenseId, payload);
        showToast("사용 내역이 수정되었습니다.", "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "요청 실패";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Expense Click
  const handleDeleteClick = (expense: ExpenseRow) => {
    setExpenseToDelete(expense);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpense(teamId, expenseToDelete.id);
      showToast("사용 내역이 삭제되었습니다.", "success");
      setIsDeleteModalOpen(false);
      setExpenseToDelete(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "삭제 실패";
      showToast(msg, "error");
    }
  };

  // Reset all sorting & search state
  const resetFilters = () => {
    setFilterFundType("");
    setSearchKeyword("");
    setSortField(null);
    setSortDirection(null);
  };

  // Client-side real-time filtering and sorting engine
  const processedExpenses = (() => {
    let result = expenses.filter((row) => {
      const matchesKeyword = !searchKeyword.trim() || 
        row.item_name.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchesFundType = !filterFundType || row.fund_type === filterFundType;
      return matchesKeyword && matchesFundType;
    });

    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        if (sortField === "executed_at") {
          const valA = a.executed_at || "";
          const valB = b.executed_at || "";
          return sortDirection === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        const valA = Number(a[sortField]) || 0;
        const valB = Number(b[sortField]) || 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      });
    }

    return result;
  })();

  const handleSort = (field: "executed_at" | "unit_price" | "quantity" | "amount") => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (field: "executed_at" | "unit_price" | "quantity" | "amount") => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-[#002060] shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#002060] shrink-0" />
    );
  };

  // Copy to Excel TSV (Tab Separated Values) - Premium clipboard integration
  const copyToClipboardTSV = () => {
    if (processedExpenses.length === 0) {
      showToast("복사할 데이터가 없습니다.", "warning");
      return;
    }

    // Column Headers
    const headers = [
      "일자",
      "자금 구분",
      "자금 용도",
      "품명",
      "집행 목적",
      "규격",
      "단가(원)",
      "수량",
      "총금액(원)",
    ];
    
    const rowsText = processedExpenses.map((row) => [
      row.executed_at,
      FUND_TYPE_NAMES[row.fund_type as keyof typeof FUND_TYPE_NAMES] || row.fund_type,
      row.fund_type === "Talent Scholarship"
        ? "-"
        : (FUNDING_PURPOSE_NAMES[row.funding_purpose as keyof typeof FUNDING_PURPOSE_NAMES] || row.funding_purpose),
      row.item_name,
      row.purpose,
      row.specification || "",
      row.unit_price,
      row.quantity,
      row.amount,
    ]);

    const tsvContent = [
      headers.join("\t"),
      ...rowsText.map((r) => r.join("\t")),
    ].join("\n");

    navigator.clipboard
      .writeText(tsvContent)
      .then(() => {
        showToast("자금 내역이 클립보드에 TSV 포맷(엑셀 붙여넣기 전용)으로 복사되었습니다. 엑셀에서 Ctrl+V 해보세요!", "success");
      })
      .catch(() => {
        showToast("클립보드 복사에 실패했습니다.", "error");
      });
  };

  const formatKRW = (value: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    })
      .format(value)
      .replace("₩", "₩ ");
  };

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Header and Back Link */}
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors group w-fit"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          목록으로 돌아가기
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {team ? `${team.team_name} 상세 및 내역` : "팀 상세 정보"}
            </h1>
            {team && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[#002060] font-semibold">
                  {TEAM_TYPE_NAMES[team.team_type as keyof typeof TEAM_TYPE_NAMES] || team.team_type}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                  {SEASON_NAMES[team.season as keyof typeof SEASON_NAMES] || team.season}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#002060] hover:bg-[#001238] font-semibold text-sm text-white transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              자금 사용 내역 등록
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-rose-900">오류가 발생했습니다.</h3>
            <p className="text-sm text-rose-800/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Team Budget Summary Cards */}
      {team && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Support Fund */}
          <div className="glass-card p-6 flex flex-col justify-between h-48 relative overflow-hidden group border-l-4 border-l-emerald-500">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <Coins className="w-32 h-32 text-emerald-500" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                지원금 현황
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                총 예산: {formatKRW(team.support_fund)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">누적 사용액</p>
                <p className="text-xl font-bold text-slate-700 font-mono mt-0.5">
                  {formatKRW(team.support_fund_used)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">잔액</p>
                <p className="text-2xl font-black text-emerald-600 font-mono mt-0.5">
                  {formatKRW(team.support_fund_balance)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    team.support_fund > 0 ? (team.support_fund_used / team.support_fund) * 100 : 0,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Talent Scholarship */}
          <div className="glass-card p-6 flex flex-col justify-between h-48 relative overflow-hidden group border-l-4 border-l-indigo-500">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <GraduationCap className="w-32 h-32 text-indigo-500" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                인재장학금 현황
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                총 예산: {formatKRW(team.talent_scholarship)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">누적 사용액</p>
                <p className="text-xl font-bold text-slate-700 font-mono mt-0.5">
                  {formatKRW(team.talent_scholarship_used)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">잔액</p>
                <p className="text-2xl font-black text-indigo-600 font-mono mt-0.5">
                  {formatKRW(team.talent_scholarship_balance)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    team.talent_scholarship > 0
                      ? (team.talent_scholarship_used / team.talent_scholarship) * 100
                      : 0,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Expenses Table & Filter Section */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">자금 집행 사용 내역</h2>
            <p className="text-xs text-slate-500 mt-1">
              마우스 드래그를 통해 표 전체 또는 부분을 복사하여 엑셀에 바로 붙여넣을 수 있습니다.
            </p>
          </div>
          
          <button
            onClick={copyToClipboardTSV}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm shrink-0 self-start sm:self-auto"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            엑셀용 데이터 복사 (TSV)
          </button>
        </div>

        {/* Search and Collapsible Accordion Filter Section */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="품명으로 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs glass-input text-slate-700 placeholder-slate-400 shadow-sm focus:border-[#002060] focus:ring-1 focus:ring-[#002060]"
            />
          </div>

          {/* Accordion Filter */}
          <div className="relative w-full md:w-64">
            <button
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              className="w-full px-4 py-2 flex items-center justify-between border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <span>
                구분: {filterFundType === "" ? "전체" : filterFundType === "Support Fund" ? "지원금" : "인재장학금"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transform transition-transform duration-200 ${isAccordionOpen ? "rotate-180" : ""}`} />
            </button>

            {isAccordionOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsAccordionOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden animate-slide-in">
                  {[
                    { value: "", label: "전체 구분" },
                    { value: "Support Fund", label: "지원금" },
                    { value: "Talent Scholarship", label: "인재장학금" }
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setFilterFundType(item.value);
                        setIsAccordionOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-slate-50 flex items-center justify-between
                        ${filterFundType === item.value ? "text-[#002060] bg-blue-50/50 font-bold" : "text-slate-600"}
                      `}
                    >
                      <span>{item.label}</span>
                      {filterFundType === item.value && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#002060]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#002060]" />
              <span>자금 집행 내역을 불러오는 중...</span>
            </div>
          ) : processedExpenses.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              조회된 자금 집행 내역이 없습니다.
            </div>
          ) : (
            <table className="excel-table" id="expense-data-table">
              <thead>
                <tr>
                  <th 
                    className="w-28 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("executed_at")}
                  >
                    <div className="flex items-center gap-1.5">
                      일자
                      {renderSortIcon("executed_at")}
                    </div>
                  </th>
                  <th className="w-24">구분</th>
                  <th className="w-32">용도</th>
                  <th className="w-48">품명</th>
                  <th>집행 목적</th>
                  <th className="w-24">규격</th>
                  <th 
                    className="text-right w-28 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("unit_price")}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      단가
                      {renderSortIcon("unit_price")}
                    </div>
                  </th>
                  <th 
                    className="text-right w-16 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("quantity")}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      수량
                      {renderSortIcon("quantity")}
                    </div>
                  </th>
                  <th 
                    className="text-right w-32 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      총 금액
                      {renderSortIcon("amount")}
                    </div>
                  </th>
                  <th className="text-center w-28 no-copy">작업</th>
                </tr>
              </thead>
              <tbody>
                {processedExpenses.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-slate-600">
                      {row.executed_at ? row.executed_at.substring(5) : "-"}
                    </td>
                    <td>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                          ${
                            row.fund_type === "Support Fund"
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                              : "bg-indigo-50 border border-indigo-200 text-indigo-700"
                          }
                        `}
                      >
                        {FUND_TYPE_NAMES[row.fund_type as keyof typeof FUND_TYPE_NAMES] || row.fund_type}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-700">
                        {row.fund_type === "Talent Scholarship"
                          ? "-"
                          : (FUNDING_PURPOSE_NAMES[row.funding_purpose as keyof typeof FUNDING_PURPOSE_NAMES] || row.funding_purpose)}
                      </span>
                    </td>
                    <td className="font-medium text-slate-800 max-w-[160px] truncate" title={row.item_name}>
                      {row.item_name}
                    </td>
                    <td className="text-slate-600 max-w-[200px] truncate" title={row.purpose}>
                      {row.purpose}
                    </td>
                    <td className="text-slate-500 text-xs">{row.specification || "-"}</td>
                    <td className="text-right font-mono text-slate-600">
                      {row.unit_price.toLocaleString()}원
                    </td>
                    <td className="text-right font-mono text-slate-600">{row.quantity}</td>
                    <td className="text-right font-mono font-bold text-slate-800">
                      {row.amount.toLocaleString()}원
                    </td>
                    <td className="no-copy">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(row)}
                          className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#002060] hover:bg-slate-50 transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(row)}
                          className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-slate-50 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create & Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="w-full max-w-lg glass-card overflow-hidden relative z-10 animate-slide-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">
                {modalMode === "create" ? "자금 사용 내역 등록" : "자금 사용 내역 수정"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    집행 일자 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={executedAt}
                    onChange={(e) => setExecutedAt(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    자금 구분 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fundType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFundType(val);
                      if (val === "Talent Scholarship") {
                        setFundingPurpose("Participation Fee");
                      } else {
                        setFundingPurpose("Office Supplies");
                      }
                    }}
                    className="w-full px-3 py-2.5 glass-input text-sm cursor-pointer text-slate-700"
                  >
                    {FUND_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {FUND_TYPE_NAMES[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  자금 용도 (분류) <span className="text-red-500">*</span>
                </label>
                <select
                  value={fundType === "Talent Scholarship" ? "Participation Fee" : fundingPurpose}
                  disabled={fundType === "Talent Scholarship"}
                  onChange={(e) => setFundingPurpose(e.target.value)}
                  className="w-full px-3 py-2.5 glass-input text-sm cursor-pointer text-slate-700 disabled:bg-slate-100/70 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {fundType === "Talent Scholarship" ? (
                    <option value="Participation Fee">-</option>
                  ) : (
                    FUNDING_PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {FUNDING_PURPOSE_NAMES[p]}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Validation Guides Tooltip depending on selected purpose */}
              {fundType !== "Talent Scholarship" &&
                (fundingPurpose === "Office Supplies" ||
                  fundingPurpose === "Meeting Expenses" ||
                  fundingPurpose === "Printed & Promotional" ||
                  fundingPurpose === "Materials Cost") && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5 text-amber-800">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] text-amber-800/90 leading-4">
                    <span className="font-semibold text-amber-900">이 분류의 집행 제한 기준:</span>
                    <br />
                    {fundingPurpose === "Office Supplies" && (
                      <>
                        - 1회 지출 한도 50만 원 미만
                        <br />- 누적 지출 한도: 지원금 총액의 30% 이하 (현재 한도:{" "}
                        {team ? (team.support_fund * 0.3).toLocaleString() : 0}원)
                      </>
                    )}
                    {fundingPurpose === "Meeting Expenses" && (
                      <>
                        - 1회 지출 한도 50만 원 미만
                        <br />- 누적 지출 한도: 지원금 총액의 15% 이하 (현재 한도:{" "}
                        {team ? (team.support_fund * 0.15).toLocaleString() : 0}원)
                      </>
                    )}
                    {fundingPurpose === "Printed & Promotional" && (
                      <>- 1회 지출 한도 50만 원 미만</>
                    )}
                    {fundingPurpose === "Materials Cost" && (
                      <>- 최소 집행 금액 1만 원 이상</>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    품명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 리플렛 인쇄"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input text-sm text-slate-800"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    규격
                  </label>
                  <input
                    type="text"
                    placeholder="예: A4 3단 접지"
                    value={specification}
                    onChange={(e) => setSpecification(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  집행 목적 및 용처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 2026 데모데이 홍보용 브로셔 제작"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    단가 (원) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unitPrice === 0 ? "" : unitPrice.toLocaleString()}
                    onChange={(e) => {
                      const numericStr = e.target.value.replace(/[^0-9]/g, "");
                      const numericVal = numericStr ? parseInt(numericStr, 10) : 0;
                      setUnitPrice(numericVal);
                    }}
                    placeholder="0"
                    className="w-full px-4 py-2.5 glass-input font-mono text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    수량 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2.5 glass-input font-mono text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Auto calculated amount display */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-600 rotate-180" />
                  <span className="text-xs text-slate-500 font-semibold">자동 계산된 총 집행 금액:</span>
                </div>
                <span className="text-lg font-black text-slate-800 font-mono">
                  {(unitPrice * quantity).toLocaleString()} 원
                </span>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors shadow-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#002060] hover:bg-[#001238] text-white font-semibold text-sm transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "저장 중..." : modalMode === "create" ? "집행 등록" : "수정 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Expense */}
      {isDeleteModalOpen && expenseToDelete && (
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-lg text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              집행 내역 삭제
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 leading-6">
              정말로 다음 집행 내역을 삭제하시겠습니까?
              <br />
              <span className="font-semibold text-slate-800">
                품명: {expenseToDelete.item_name} ({expenseToDelete.amount.toLocaleString()}원)
              </span>
              <br />
              삭제하면 자금 잔액에 해당 금액이 다시 반환되며 복구할 수 없습니다.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors shadow-sm"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all"
              >
                삭제 확인
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Custom Close Icon
const XCircle = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);
