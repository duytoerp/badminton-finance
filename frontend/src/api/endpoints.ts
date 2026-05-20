import { api, ApiResponse } from './client';

export type PaymentStatus = 'Unpaid' | 'PartialPaid' | 'Paid' | 'OverPaid';
export type SessionStatus = 'Draft' | 'Open' | 'Closed' | 'Cancelled';
export type Gender = 'Male' | 'Female' | 'Other';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type PricingMode = 'WeightedSlot' | 'FixedAmount' | 'EqualPerHead';

export interface Player {
  id: string; fullName: string; nickName?: string; phoneNumber?: string;
  email?: string; playerType: 'Member' | 'Guest';
  gender?: Gender; skillLevel?: SkillLevel;
  isActive: boolean; currentDebt: number;
}

export interface PricingTemplateRule {
  id?: string;
  gender?: Gender | null;
  skillLevel?: SkillLevel | null;
  multiplier: number;
  fixedAmount: number;
}

export interface PricingTemplate {
  id: string;
  name: string;
  description?: string;
  mode: PricingMode;
  isDefault: boolean;
  isActive: boolean;
  rules: PricingTemplateRule[];
}

export interface Court { id: string; name: string; address?: string; defaultHourlyRate: number; isActive: boolean; }

export type PlayerGroupType = 'Fixed' | 'Casual' | 'Tournament' | 'Other';

export interface Participant {
  id: string; sessionId: string; playerId: string;
  playerName: string; playerPhone?: string;
  gender?: Gender; skillLevel?: SkillLevel;
  slotCount: number; multiplier: number; fixedAmount: number;
  amountDue: number; amountPaid: number; debt: number;
  paymentStatus: PaymentStatus; isGuest: boolean;
  joinedViaGroupId?: string;
  joinedViaGroupName?: string;
  joinedViaGroupType?: PlayerGroupType;
}

export interface Session {
  id: string; title: string; courtId: string; courtName?: string;
  playDate: string; startTime: string; endTime: string; courtCount: number;
  pricingTemplateId?: string;
  pricingTemplateName?: string;
  pricingMode?: PricingMode;
  status: SessionStatus;
  totalIncome: number; totalExpense: number; balance: number;
  feePerSlot: number; totalSlots: number; participantCount: number;
  note?: string;
  reopenCount?: number;
  reopenReason?: string;
}

export interface SessionDetail extends Session {
  participants: Participant[];
  transactions: TransactionDto[];
}

export interface TransactionDto {
  id: string; sessionId?: string; playerId?: string; playerName?: string;
  transactionType: 'Income' | 'Expense' | 'Adjustment';
  paymentMethod: string; amount: number; description: string; transactionDate: string;
}

// Auth
export const login = (u: string, p: string) =>
  api.post<ApiResponse<{ accessToken: string; refreshToken: string; userName: string; fullName: string; roles: string[] }>>(
    '/auth/login', { userName: u, password: p }
  ).then(r => r.data);

// Players
export const listPlayers = (search?: string, page = 1) =>
  api.get<ApiResponse<{ items: Player[]; total: number }>>('/players', { params: { search, page, pageSize: 50 } }).then(r => r.data);
export const quickAddPlayer = (fullName: string, phoneNumber?: string) =>
  api.post<ApiResponse<Player>>('/players/quick', { fullName, phoneNumber }).then(r => r.data);
export const createPlayer = (body: Partial<Player>) =>
  api.post<ApiResponse<Player>>('/players', body).then(r => r.data);

// Courts
export const listCourts = () => api.get<ApiResponse<Court[]>>('/courts').then(r => r.data);
export const createCourt = (body: Partial<Court>) => api.post<ApiResponse<Court>>('/courts', body).then(r => r.data);

// Sessions
export const listSessions = (page = 1) =>
  api.get<ApiResponse<{ items: Session[]; total: number }>>('/sessions', { params: { page, pageSize: 20 } }).then(r => r.data);
export const getSession = (id: string) => api.get<ApiResponse<SessionDetail>>(`/sessions/${id}`).then(r => r.data);
export const createSession = (body: Partial<Session>) =>
  api.post<ApiResponse<Session>>('/sessions', body).then(r => r.data);
export const addParticipant = (sessionId: string, playerId: string, slotCount = 1) =>
  api.post<ApiResponse<Participant>>('/sessions/participants', { sessionId, playerId, slotCount }).then(r => r.data);
export interface AddParticipantsBulkResult {
  added: number; skippedDuplicate: number; skippedInactive: number;
  addedPlayerIds: string[]; participantCount: number; totalSlots: number;
}
export const addParticipantsBulk = (
  sessionId: string, playerIds: string[],
  opts: { slotCount?: number; includeInactive?: boolean } = {}
) =>
  api.post<ApiResponse<AddParticipantsBulkResult>>('/sessions/participants/bulk', {
    sessionId, playerIds,
    slotCount: opts.slotCount ?? 1,
    includeInactive: opts.includeInactive ?? false
  }).then(r => r.data);
export const removeParticipant = (participantId: string) =>
  api.delete<ApiResponse<boolean>>(`/sessions/participants/${participantId}`).then(r => r.data);
export const addExpense = (sessionId: string, amount: number, description: string) =>
  api.post<ApiResponse<TransactionDto>>('/sessions/expenses', { sessionId, amount, description }).then(r => r.data);
export const quickPayment = (sessionId: string, playerId: string, amount: number, paymentMethod = 'Cash') =>
  api.post<ApiResponse<TransactionDto>>('/sessions/payments/quick',
    { sessionId, playerId, amount, paymentMethod }).then(r => r.data);
export const closeSession = (id: string) => api.post<ApiResponse<Session>>(`/sessions/${id}/close`).then(r => r.data);
export const reopenSession = (id: string, reason: string) =>
  api.post<ApiResponse<Session>>('/sessions/reopen', { sessionId: id, reason }).then(r => r.data);

// Fund + reports
export const getMainFund = () =>
  api.get<ApiResponse<{ id: string; name: string; currentBalance: number }>>('/funds/main').then(r => r.data);
export const getReport = (from: string, to: string) =>
  api.get<ApiResponse<any>>('/reports/finance', { params: { from, to } }).then(r => r.data);
export const getDebts = () => api.get<ApiResponse<any[]>>('/reports/debts').then(r => r.data);

// Dashboard / admin
export const getDashboardStats = () =>
  api.get<ApiResponse<any>>('/dashboard/stats').then(r => r.data);
export const listAuditLogs = (params: any) =>
  api.get<ApiResponse<{ items: any[]; total: number }>>('/admin/audit-logs', { params }).then(r => r.data);
export const listUsers = (params: any) =>
  api.get<ApiResponse<{ items: any[]; total: number }>>('/admin/users', { params }).then(r => r.data);
export const createUser = (body: any) =>
  api.post<ApiResponse<any>>('/admin/users', body).then(r => r.data);
export const updateUser = (id: string, body: any) =>
  api.put<ApiResponse<any>>(`/admin/users/${id}`, body).then(r => r.data);
export const deleteUser = (id: string) =>
  api.delete<ApiResponse<boolean>>(`/admin/users/${id}`).then(r => r.data);
export const listRoles = () =>
  api.get<ApiResponse<string[]>>('/admin/roles').then(r => r.data);
export const getPlayerHistory = (id: string) =>
  api.get<ApiResponse<any>>(`/admin/players/${id}/history`).then(r => r.data);

// Filtered sessions
export const filterSessions = (params: any) =>
  api.get<ApiResponse<{ items: Session[]; total: number }>>('/sessions/filter', { params }).then(r => r.data);
export const cancelSession = (id: string, reason: string) =>
  api.post<ApiResponse<Session>>('/sessions/cancel', { sessionId: id, reason }).then(r => r.data);

// Pricing templates
export const listPricingTemplates = () =>
  api.get<ApiResponse<PricingTemplate[]>>('/pricing-templates').then(r => r.data);
export const getDefaultPricingTemplate = () =>
  api.get<ApiResponse<PricingTemplate | null>>('/pricing-templates/default').then(r => r.data);
export const createPricingTemplate = (body: Omit<PricingTemplate, 'id' | 'isActive'> & { isActive?: boolean }) =>
  api.post<ApiResponse<PricingTemplate>>('/pricing-templates', body).then(r => r.data);
export const updatePricingTemplate = (id: string, body: Omit<PricingTemplate, 'id' | 'isActive'> & { isActive?: boolean }) =>
  api.put<ApiResponse<PricingTemplate>>(`/pricing-templates/${id}`, body).then(r => r.data);
export const deletePricingTemplate = (id: string) =>
  api.delete<ApiResponse<boolean>>(`/pricing-templates/${id}`).then(r => r.data);

// Expense templates
export type ExpenseCalcType = 'FixedAmount' | 'CourtHourlyRate' | 'PerHour' | 'PerCourt' | 'PerHourPerCourt';

export interface ExpenseTemplateItem {
  id?: string;
  name: string;
  calculationType: ExpenseCalcType;
  amount: number;
  sortOrder: number;
}

export interface ExpenseTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  items: ExpenseTemplateItem[];
}

export interface ResolvedExpenseLine {
  name: string;
  calculationType: ExpenseCalcType;
  amount: number;
  formula: string;
}

export interface ResolvedExpenses {
  expenseTemplateId?: string;
  expenseTemplateName?: string;
  hours: number;
  courtCount: number;
  courtHourlyRate: number;
  lines: ResolvedExpenseLine[];
  total: number;
}

export const listExpenseTemplates = () =>
  api.get<ApiResponse<ExpenseTemplate[]>>('/expense-templates').then(r => r.data);
export const getDefaultExpenseTemplate = () =>
  api.get<ApiResponse<ExpenseTemplate | null>>('/expense-templates/default').then(r => r.data);
export const getExpenseTemplate = (id: string) =>
  api.get<ApiResponse<ExpenseTemplate>>(`/expense-templates/${id}`).then(r => r.data);
export const createExpenseTemplate = (body: Omit<ExpenseTemplate, 'id'>) =>
  api.post<ApiResponse<ExpenseTemplate>>('/expense-templates', body).then(r => r.data);
export const updateExpenseTemplate = (id: string, body: Omit<ExpenseTemplate, 'id'>) =>
  api.put<ApiResponse<ExpenseTemplate>>(`/expense-templates/${id}`, body).then(r => r.data);
export const deleteExpenseTemplate = (id: string) =>
  api.delete<ApiResponse<boolean>>(`/expense-templates/${id}`).then(r => r.data);
export const resolveExpenses = (params: {
  templateId?: string; courtId: string; start: string; end: string; courtCount: number;
}) => api.get<ApiResponse<ResolvedExpenses>>('/expense-templates/resolve', { params }).then(r => r.data);

// Court bookings
export type BookingRecurrenceType = 'SingleDates' | 'MonthlyByWeekday' | 'MonthlyByDayOfMonth';

export interface CourtBooking {
  id: string;
  title: string;
  courtId: string;
  courtName?: string;
  recurrenceType: BookingRecurrenceType;
  pattern: string;
  fromDate: string;
  toDate: string;
  startTime: string;
  endTime: string;
  courtCount: number;
  pricingTemplateId?: string;
  pricingTemplateName?: string;
  expenseTemplateId?: string;
  expenseTemplateName?: string;
  note?: string;
  generatedSessionCount: number;
  createdAt: string;
}

export interface CreateCourtBookingBody {
  title: string;
  courtId: string;
  recurrenceType: BookingRecurrenceType;
  pattern: string;
  fromDate?: string;
  toDate?: string;
  startTime: string;
  endTime: string;
  courtCount: number;
  pricingTemplateId?: string;
  expenseTemplateId?: string;
  note?: string;
}

export interface CourtBookingPreview {
  count: number;
  dates: string[];
  estimatedExpense?: ResolvedExpenses;
  estimatedTotalExpense: number;
}

export const listCourtBookings = () =>
  api.get<ApiResponse<CourtBooking[]>>('/court-bookings').then(r => r.data);
export const previewCourtBooking = (body: CreateCourtBookingBody) =>
  api.post<ApiResponse<CourtBookingPreview>>('/court-bookings/preview', body).then(r => r.data);
export const createCourtBooking = (body: CreateCourtBookingBody) =>
  api.post<ApiResponse<CourtBooking>>('/court-bookings', body).then(r => r.data);
export const deleteCourtBooking = (id: string) =>
  api.delete<ApiResponse<boolean>>(`/court-bookings/${id}`).then(r => r.data);

// Player groups
export interface PlayerGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  groupType: PlayerGroupType;
  isActive: boolean;
  memberCount: number;
}

export interface PlayerGroupMemberView {
  playerId: string;
  fullName: string;
  nickName?: string;
  phoneNumber?: string;
  gender?: Gender;
  skillLevel?: SkillLevel;
  isActive: boolean;
  currentDebt: number;
}

export interface PlayerGroupDetail extends PlayerGroup {
  members: PlayerGroupMemberView[];
}

export interface UpsertPlayerGroupBody {
  name: string;
  description?: string;
  color?: string;
  groupType: PlayerGroupType;
  isActive: boolean;
  playerIds: string[];
}

export const GROUP_TYPE_LABEL: Record<PlayerGroupType, string> = {
  Fixed: 'Cố định',
  Casual: 'Vãng lai',
  Tournament: 'Đội thi đấu',
  Other: 'Khác'
};

export const GROUP_TYPE_BADGE_CLS: Record<PlayerGroupType, string> = {
  Fixed: 'paid',
  Casual: 'partial',
  Tournament: 'over',
  Other: 'draft'
};

export const updatePlayer = (id: string, body: Partial<Player>) =>
  api.put<ApiResponse<Player>>(`/players/${id}`, body).then(r => r.data);

// Admin maintenance — wipe transactional data
export interface WipeResult {
  executedAt: string;
  counts: Record<string, number>;
  totalRowsDeleted: number;
}
export const wipeTransactional = (confirmation: string, reason?: string) =>
  api.post<ApiResponse<WipeResult>>('/admin/maintenance/wipe-transactional',
    { confirmation, reason }).then(r => r.data);

export interface PreviewGroupPlayer {
  playerId: string;
  fullName: string;
  phoneNumber?: string;
  isActive: boolean;
  currentDebt: number;
  alreadyInSession: boolean;
  groupIds: string[];
}

export interface PreviewGroup {
  groupId: string;
  name: string;
  color?: string;
  memberCount: number;
  alreadyInSession: number;
  newToAdd: number;
  inactiveSkipped: number;
  members: PreviewGroupPlayer[];
}

export interface PreviewAddGroupsResult {
  groups: PreviewGroup[];
  totalMembers: number;
  uniquePlayers: number;
  newToAdd: number;
  alreadyInSession: number;
  inactiveSkipped: number;
  playersToAdd: PreviewGroupPlayer[];
  inactivePlayers: PreviewGroupPlayer[];
  debtPlayers: PreviewGroupPlayer[];
  alreadyPlayers: PreviewGroupPlayer[];
}

export interface AddGroupsResult {
  added: number;
  skippedDuplicate: number;
  skippedInactive: number;
  addedPlayerIds: string[];
  appliedGroupIds: string[];
  participantCount: number;
  totalSlots: number;
}

export interface SessionGroupHistory {
  id: string;
  sessionId: string;
  sessionTitle?: string;
  sessionPlayDate: string;
  playerGroupId: string;
  groupNameSnapshot: string;
  membersTotal: number;
  membersAdded: number;
  membersSkippedDuplicate: number;
  membersSkippedInactive: number;
  appliedAt: string;
}

export const listPlayerGroups = (search?: string, page = 1, pageSize = 100) =>
  api.get<ApiResponse<{ items: PlayerGroup[]; total: number }>>('/player-groups',
    { params: { search, page, pageSize } }).then(r => r.data);
export const getPlayerGroup = (id: string) =>
  api.get<ApiResponse<PlayerGroupDetail>>(`/player-groups/${id}`).then(r => r.data);
export const createPlayerGroup = (body: UpsertPlayerGroupBody) =>
  api.post<ApiResponse<PlayerGroup>>('/player-groups', body).then(r => r.data);
export const updatePlayerGroup = (id: string, body: UpsertPlayerGroupBody) =>
  api.put<ApiResponse<PlayerGroup>>(`/player-groups/${id}`, body).then(r => r.data);
export const deletePlayerGroup = (id: string) =>
  api.delete<ApiResponse<boolean>>(`/player-groups/${id}`).then(r => r.data);
export const addGroupMembers = (groupId: string, playerIds: string[]) =>
  api.post<ApiResponse<PlayerGroupDetail>>('/player-groups/members/add',
    { groupId, playerIds }).then(r => r.data);
export const removeGroupMembers = (groupId: string, playerIds: string[]) =>
  api.post<ApiResponse<PlayerGroupDetail>>('/player-groups/members/remove',
    { groupId, playerIds }).then(r => r.data);
export const getGroupUsageHistory = (groupId: string) =>
  api.get<ApiResponse<SessionGroupHistory[]>>(`/player-groups/${groupId}/usage-history`).then(r => r.data);

export const previewAddGroupsToSession = (sessionId: string, groupIds: string[], includeInactive = false) =>
  api.post<ApiResponse<PreviewAddGroupsResult>>('/sessions/groups/preview',
    { sessionId, groupIds, includeInactive }).then(r => r.data);
export const addGroupsToSession = (
  sessionId: string, groupIds: string[],
  opts: { includeInactive?: boolean; slotCount?: number; selectedPlayerIds?: string[] } = {}
) =>
  api.post<ApiResponse<AddGroupsResult>>('/sessions/groups/add', {
    sessionId, groupIds,
    includeInactive: opts.includeInactive ?? false,
    slotCount: opts.slotCount ?? 1,
    selectedPlayerIds: opts.selectedPlayerIds ?? []
  }).then(r => r.data);
export const getSessionGroups = (sessionId: string) =>
  api.get<ApiResponse<SessionGroupHistory[]>>(`/sessions/${sessionId}/groups`).then(r => r.data);

// CSV export — return blob URLs caller can download
export const exportDebtsCsvUrl = () => `${import.meta.env.VITE_API_URL || '/api'}/admin/export/debts.csv`;
export const exportFinanceCsvUrl = (from: string, to: string) =>
  `${import.meta.env.VITE_API_URL || '/api'}/admin/export/finance.csv?from=${from}&to=${to}`;
