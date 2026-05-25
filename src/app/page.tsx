"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  SlidersHorizontal,
  FolderKanban,
  ChevronRight,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import Modal from "@/components/Modal";
import {
  DashboardTeam,
  getTeamsDashboard,
  createTeam,
  updateTeam,
  deleteTeam,
} from "@/lib/api";
import {
  TEAM_TYPES,
  SEASONS,
  TEAM_TYPE_NAMES,
  SEASON_NAMES,
  BUDGET_GUIDES,
  TeamType,
  Season,
} from "@/lib/constants";

function DashboardContent() {
  const { showToast } = useToast();
  const [teams, setTeams] = useState<DashboardTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedSeason, setSelectedSeason] = useState<string>("All");

  // Sorting States
  const [sortField, setSortField] = useState<"support_fund_balance" | "talent_scholarship_balance" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Form State
  const [teamName, setTeamName] = useState("");
  const [teamType, setTeamType] = useState<TeamType>("Wave-Innovation");
  const [season, setSeason] = useState<Season>("First Half");
  const [supportFund, setSupportFund] = useState(6000000);
  const [talentScholarship, setTalentScholarship] = useState(0);
  const [resetBudgetByRule, setResetBudgetByRule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<DashboardTeam | null>(null);

  // Load Dashboard Data
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTeamsDashboard();
      setTeams(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "데이터 로딩 실패";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadDashboard();
    }, 0);
    return () => clearTimeout(handle);
  }, [loadDashboard]);

  // Handle Budget Auto-Fill based on Type & Season
  useEffect(() => {
    if (modalMode === "create") {
      const guide = BUDGET_GUIDES[teamType]?.[season];
      if (guide) {
        const handle = setTimeout(() => {
          setSupportFund(guide.support_fund);
          setTalentScholarship(guide.talent_scholarship);
        }, 0);
        return () => clearTimeout(handle);
      }
    }
  }, [teamType, season, modalMode]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setTeamName("");
    setTeamType("Wave-Innovation");
    setSeason("First Half");
    setResetBudgetByRule(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (team: DashboardTeam) => {
    setModalMode("edit");
    setSelectedTeamId(team.id);
    setTeamName(team.team_name);
    setTeamType(team.team_type);
    setSeason(team.season);
    setSupportFund(team.support_fund);
    setTalentScholarship(team.talent_scholarship);
    setResetBudgetByRule(false);
    setIsModalOpen(true);
  };

  // Handle form submit (Create or Edit Team)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      showToast("팀 이름을 입력해 주세요.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        await createTeam({
          team_name: teamName,
          team_type: teamType,
          season,
          support_fund: supportFund,
          talent_scholarship: talentScholarship,
        });
        showToast("새 창업팀이 성공적으로 등록되었습니다.", "success");
      } else if (modalMode === "edit" && selectedTeamId !== null) {
        await updateTeam(selectedTeamId, {
          team_name: teamName,
          team_type: teamType,
          season,
          support_fund: supportFund,
          talent_scholarship: talentScholarship,
          reset_budget_by_rule: resetBudgetByRule,
        });
        showToast("창업팀 정보가 수정되었습니다.", "success");
      }
      setIsModalOpen(false);
      loadDashboard();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "작업에 실패했습니다.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Team
  const handleDeleteClick = (team: DashboardTeam) => {
    setTeamToDelete(team);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!teamToDelete) return;
    try {
      await deleteTeam(teamToDelete.id);
      showToast(`${teamToDelete.team_name} 팀이 삭제되었습니다.`, "success");
      setIsDeleteModalOpen(false);
      setTeamToDelete(null);
      loadDashboard();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "팀 삭제 실패";
      showToast(msg, "error");
    }
  };

  // Format Currency
  const formatKRW = (value: number) => {
    return `${value.toLocaleString()}원`;
  };

  const getBalanceColorClass = (balance: number, budget: number, defaultClass: string) => {
    if (budget <= 0) return "text-slate-400 font-medium";
    const ratio = (balance / budget) * 100;
    if (ratio < 10) return "text-rose-600 font-black";
    if (ratio <= 30) return "text-amber-600 font-bold";
    return defaultClass;
  };

  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "all";

  // 1차 카테고리 필터링 (시리즈 & 혁신형, 일반형 (LAB), 로컬 (LOCAL))
  const categoryTeams = teams.filter((t) => {
    if (category === "series-innovation") {
      return t.team_type === "Wave-Innovation" || t.team_type === "Wave-Series";
    }
    if (category === "lab") {
      return t.team_type === "Wave-Lab-1" || t.team_type === "Wave-Lab-2";
    }
    if (category === "local") {
      return t.team_type === "Wave-Local-Practical" || t.team_type === "Wave-Local-Experience";
    }
    return true; // all
  });

  // Filtering Teams (검색어, 개별 팀 유형, 시즌 추가 필터링)
  const filteredTeams = categoryTeams.filter((t) => {
    const matchesSearch = t.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "All" || t.team_type === selectedType;
    const matchesSeason = selectedSeason === "All" || t.season === selectedSeason;
    return matchesSearch && matchesType && matchesSeason;
  });

  // Calculate Aggregates
  const totalTeamsCount = categoryTeams.length;

  const handleSort = (field: "support_fund_balance" | "talent_scholarship_balance") => {
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

  const renderSortIcon = (field: "support_fund_balance" | "talent_scholarship_balance") => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-[#002060] shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#002060] shrink-0" />
    );
  };

  const sortedTeams = (() => {
    if (!sortField || !sortDirection) return filteredTeams;
    return [...filteredTeams].sort((a, b) => {
      const valA = a[sortField] || 0;
      const valB = b[sortField] || 0;
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  })();
 
  // Subsets for grouping in LAB & LOCAL categories
  const lab1Teams = sortedTeams.filter((t) => t.team_type === "Wave-Lab-1");
  const lab2Teams = sortedTeams.filter((t) => t.team_type === "Wave-Lab-2");
  const localPracticalTeams = sortedTeams.filter((t) => t.team_type === "Wave-Local-Practical");
  const localExperienceTeams = sortedTeams.filter((t) => t.team_type === "Wave-Local-Experience");

  const renderTeamRow = (team: DashboardTeam) => (
    <tr key={team.id} className="group/row">
      <td className="font-semibold text-slate-800">
        <Link
          href={`/teams/${team.id}`}
          className="hover:text-[#002060] transition-colors flex items-center gap-1"
        >
          {team.team_name}
          <ChevronRight className="w-4 h-4 opacity-0 group-hover/row:opacity-100 transition-opacity text-[#002060]" />
        </Link>
      </td>
      <td>
        <span className="text-xs px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold">
          {TEAM_TYPE_NAMES[team.team_type as keyof typeof TEAM_TYPE_NAMES] || team.team_type}
        </span>
      </td>
      <td className={`text-right font-mono ${getBalanceColorClass(team.support_fund_balance, team.support_fund, "text-emerald-600 font-semibold")}`}>
        {formatKRW(team.support_fund_balance)}
      </td>
      <td className={`text-right font-mono ${getBalanceColorClass(team.talent_scholarship_balance, team.talent_scholarship, "text-indigo-600 font-semibold")}`}>
        {formatKRW(team.talent_scholarship_balance)}
      </td>
      <td>
        <div className="flex items-center justify-center gap-1">
          <Link
            href={`/teams/${team.id}`}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            title="상세 내역 조회"
          >
            <Search className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => handleOpenEditModal(team)}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#002060] hover:bg-slate-50 transition-colors"
            title="팀 수정"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteClick(team)}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-slate-50 transition-colors"
            title="팀 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            창업 자금 현황 대시보드
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            미래창업지원단 소속 팀들의 지원금 및 인재장학금 예산과 실시간 지출 내역을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboard}
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
            새 창업팀 등록
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-900">데이터를 불러오는 중 오류가 발생했습니다.</h3>
            <p className="text-sm text-rose-800/80 mt-1">{error}</p>
            <button
              onClick={loadDashboard}
              className="mt-3 px-4 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 border border-rose-300 text-xs font-semibold text-rose-800 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Teams Card */}
        <div className="glass-card p-6 flex flex-col justify-between h-40 relative overflow-hidden group border-l-4 border-l-[#002060]">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <FolderKanban className="w-24 h-24 text-blue-800" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">전체 창업팀</span>
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-[#002060]">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-800">{loading ? "-" : totalTeamsCount}</span>
            <span className="text-xs text-slate-500 ml-1">개 팀</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            등록되어 운영 중인 총 팀 수
          </div>
        </div>

        {/* Innovation & Series Card */}
        <div className="glass-card p-6 flex flex-col justify-between h-40 relative overflow-hidden group border-l-4 border-l-cyan-500">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <FolderKanban className="w-24 h-24 text-cyan-800" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wave-혁신형 / Wave-시리즈</span>
            <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-700">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-800">
              {loading ? "-" : teams.filter((t) => t.team_type === "Wave-Innovation" || t.team_type === "Wave-Series").length}
            </span>
            <span className="text-xs text-slate-500 ml-1">개 팀</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Wave-혁신형, Wave-시리즈
          </div>
        </div>

        {/* Lab Card */}
        <div className="glass-card p-6 flex flex-col justify-between h-40 relative overflow-hidden group border-l-4 border-l-indigo-500">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <FolderKanban className="w-24 h-24 text-indigo-800" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">LAB-1부 / LAB-2부</span>
            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-800">
              {loading ? "-" : teams.filter((t) => t.team_type === "Wave-Lab-1" || t.team_type === "Wave-Lab-2").length}
            </span>
            <span className="text-xs text-slate-500 ml-1">개 팀</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            LAB-1부, LAB-2부
          </div>
        </div>

        {/* Local Card */}
        <div className="glass-card p-6 flex flex-col justify-between h-40 relative overflow-hidden group border-l-4 border-l-amber-500">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <FolderKanban className="w-24 h-24 text-amber-800" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">LOCAL-실전창업형 / LOCAL-창업체험형</span>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-700">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-800">
              {loading ? "-" : teams.filter((t) => t.team_type === "Wave-Local-Practical" || t.team_type === "Wave-Local-Experience").length}
            </span>
            <span className="text-xs text-slate-500 ml-1">개 팀</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            LOCAL-실전창업형, LOCAL-창업체험형
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-card p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="팀 이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 glass-input text-sm text-slate-800"
          />
        </div>

        {/* Type / Season Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            필터:
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3.5 py-2 glass-input text-xs font-medium cursor-pointer text-slate-700"
          >
            <option value="All">전체 팀 유형</option>
            {TEAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {TEAM_TYPE_NAMES[t]}
              </option>
            ))}
          </select>

          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-3.5 py-2 glass-input text-xs font-medium cursor-pointer text-slate-700"
          >
            <option value="All">전체 시즌</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {SEASON_NAMES[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Team List Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">등록 창업팀 목록</h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
            총 {filteredTeams.length}개 팀 검색됨
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#002060]" />
              <span>창업팀 데이터를 불러오는 중...</span>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              {teams.length === 0
                ? "등록된 창업팀이 없습니다. 우측 상단의 새 창업팀 등록 버튼을 눌러 추가해 주세요."
                : "검색 및 필터 조건에 부합하는 팀이 없습니다."}
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th className="w-1/3">팀명</th>
                  <th>구분</th>
                  <th 
                    className="text-right cursor-pointer select-none hover:bg-slate-200 transition-colors"
                    onClick={() => handleSort("support_fund_balance")}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      지원금 잔액
                      {renderSortIcon("support_fund_balance")}
                    </div>
                  </th>
                  <th 
                    className="text-right cursor-pointer select-none hover:bg-slate-200 transition-colors"
                    onClick={() => handleSort("talent_scholarship_balance")}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      인재장학금 잔액
                      {renderSortIcon("talent_scholarship_balance")}
                    </div>
                  </th>
                  <th className="text-center w-40">관리</th>
                </tr>
              </thead>
              <tbody>
                {category === "lab" ? (
                  <>
                    {lab1Teams.length > 0 && (
                      <>
                        <tr className="bg-slate-50/80 no-copy">
                          <td colSpan={5} className="font-bold text-[#002060] text-xs px-5 py-2.5 border-y border-slate-200/80 tracking-wide bg-blue-50/20">
                            LAB-1부
                          </td>
                        </tr>
                        {lab1Teams.map(renderTeamRow)}
                      </>
                    )}
                    {lab2Teams.length > 0 && (
                      <>
                        <tr className="bg-slate-50/80 no-copy">
                          <td colSpan={5} className="font-bold text-[#002060] text-xs px-5 py-2.5 border-y border-slate-200/80 tracking-wide bg-blue-50/20">
                            LAB-2부
                          </td>
                        </tr>
                        {lab2Teams.map(renderTeamRow)}
                      </>
                    )}
                    {lab1Teams.length === 0 && lab2Teams.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-500">
                          검색 및 필터 조건에 부합하는 팀이 없습니다.
                        </td>
                      </tr>
                    )}
                  </>
                ) : category === "local" ? (
                  <>
                    {localPracticalTeams.length > 0 && (
                      <>
                        <tr className="bg-slate-50/80 no-copy">
                          <td colSpan={5} className="font-bold text-[#002060] text-xs px-5 py-2.5 border-y border-slate-200/80 tracking-wide bg-blue-50/20">
                            LOCAL-실전창업형
                          </td>
                        </tr>
                        {localPracticalTeams.map(renderTeamRow)}
                      </>
                    )}
                    {localExperienceTeams.length > 0 && (
                      <>
                        <tr className="bg-slate-50/80 no-copy">
                          <td colSpan={5} className="font-bold text-[#002060] text-xs px-5 py-2.5 border-y border-slate-200/80 tracking-wide bg-blue-50/20">
                            LOCAL-창업체험형
                          </td>
                        </tr>
                        {localExperienceTeams.map(renderTeamRow)}
                      </>
                    )}
                    {localPracticalTeams.length === 0 && localExperienceTeams.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-500">
                          검색 및 필터 조건에 부합하는 팀이 없습니다.
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  sortedTeams.map(renderTeamRow)
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create & Edit Team Modal */}
      {isModalOpen && (
  <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
      <h3 className="font-bold text-lg text-slate-800">
        {modalMode === "create" ? "새 창업팀 등록" : "창업팀 정보 수정"}
      </h3>
      <button
        onClick={() => setIsModalOpen(false)}
        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
      >
        <XCircle className="w-5 h-5" />
      </button>
    </div>
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          팀 이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="예: Wave Alpha"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="w-full px-4 py-2.5 glass-input text-sm text-slate-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            팀 유형 <span className="text-red-500">*</span>
          </label>
          <select
            value={teamType}
            onChange={(e) => setTeamType(e.target.value as TeamType)}
            className="w-full px-3 py-2.5 glass-input text-sm cursor-pointer text-slate-700"
          >
            {TEAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {TEAM_TYPE_NAMES[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            활동 시즌 <span className="text-red-500">*</span>
          </label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value as Season)}
            className="w-full px-3 py-2.5 glass-input text-sm cursor-pointer text-slate-700"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {SEASON_NAMES[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-2.5 text-blue-800">
        <HelpCircle className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-[11px] text-blue-800/90 leading-4">
          <span className="font-semibold text-blue-900">유형별 권장 예산 가이드:</span>
          <br />
          - {teamType} + {SEASON_NAMES[season as keyof typeof SEASON_NAMES]} 조합의 권장 예산은 아래와 같으며,
          원하는 경우 직접 수정 가능합니다.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            초기 지원금 예산 (원)
          </label>
          <input
            type="text"
            value={supportFund === 0 ? "" : supportFund.toLocaleString()}
            onChange={(e) => {
              const numericStr = e.target.value.replace(/[^0-9]/g, "");
              const numericVal = numericStr ? parseInt(numericStr, 10) : 0;
              setSupportFund(numericVal);
            }}
            placeholder="0"
            className="w-full px-4 py-2.5 glass-input font-mono text-sm text-slate-800"
          />
          <div className="text-[10px] text-slate-400 mt-1">
            가이드: {BUDGET_GUIDES[teamType]?.[season]?.support_fund.toLocaleString()} 원
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            초기 인재장학금 예산 (원)
          </label>
          <input
            type="text"
            value={talentScholarship === 0 ? "" : talentScholarship.toLocaleString()}
            onChange={(e) => {
              const numericStr = e.target.value.replace(/[^0-9]/g, "");
              const numericVal = numericStr ? parseInt(numericStr, 10) : 0;
              setTalentScholarship(numericVal);
            }}
            placeholder="0"
            className="w-full px-4 py-2.5 glass-input font-mono text-sm text-slate-800"
          />
          <div className="text-[10px] text-slate-400 mt-1">
            가이드: {BUDGET_GUIDES[teamType]?.[season]?.talent_scholarship.toLocaleString()} 원
          </div>
        </div>
      </div>

      {modalMode === "edit" && (
        <div className="flex items-center gap-2 py-2">
          <input
            type="checkbox"
            id="reset-budget-check"
            checked={resetBudgetByRule}
            onChange={(e) => {
              setResetBudgetByRule(e.target.checked);
              if (e.target.checked) {
                const guide = BUDGET_GUIDES[teamType]?.[season];
                if (guide) {
                  setSupportFund(guide.support_fund);
                  setTalentScholarship(guide.talent_scholarship);
                }
              }
            }}
            className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="reset-budget-check" className="text-xs text-slate-600 font-medium cursor-pointer">
            시즌 변경에 맞춰 기본 권장 예산으로 재설정 (reset_budget_by_rule)
          </label>
        </div>
      )}

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
          {isSubmitting ? "저장 중..." : modalMode === "create" ? "창업팀 등록" : "변경사항 저장"}
        </button>
      </div>
    </form>
  </Modal>
)}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && teamToDelete && (
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-lg text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              창업팀 삭제 경고
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 leading-6">
              정말로 <span className="font-bold text-slate-800">[{teamToDelete.team_name}]</span> 팀을 삭제하시겠습니까?
              <br />
              팀을 삭제하면 해당 팀에 등록된 모든 <span className="text-rose-600 font-semibold">지원금/인재장학금 예산 및 사용 내역이 영구히 삭제</span>되며 복구할 수 없습니다.
            </p>
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-[11px] text-rose-700 leading-4">
              * 관련 데이터가 서버 데이터베이스에서 즉시 삭제 처리됩니다.
            </div>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#002060]" />
        <span>대시보드를 로딩하는 중...</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
