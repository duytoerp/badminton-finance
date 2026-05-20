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

export interface Participant {
  id: string; sessionId: string; playerId: string;
  playerName: string; playerPhone?: string;
  gender?: Gender; skillLevel?: SkillLevel;
  slotCount: number; multiplier: number; fixedAmount: number;
  amountDue: number; amountPaid: number; debt: number;
  paymentStatus: PaymentStatus; isGuest: boolean;
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
  note?: string;
}

export const listCourtBookings = () =>
  api.get<ApiResponse<CourtBooking[]>>('/court-bookings').then(r => r.data);
export const previewCourtBooking = (body: CreateCourtBookingBody) =>
  api.post<ApiResponse<{ count: number; dates: string[] }>>('/court-bookings/preview', body).then(r => r.data);
export const createCourtBooking = (body: CreateCourtBookingBody) =>
  api.post<ApiResponse<CourtBooking>>('/court-bookings', body).then(r => r.data);
export const deleteCourtBooking = (id: string) =>
  api.delete<ApiResponse<boolean>>(`/court-bookings/${id}`).then(r => r.data);

// CSV export — return blob URLs caller can download
export const exportDebtsCsvUrl = () => `${import.meta.env.VITE_API_URL || '/api'}/admin/export/debts.csv`;
export const exportFinanceCsvUrl = (from: string, to: string) =>
  `${import.meta.env.VITE_API_URL || '/api'}/admin/export/finance.csv?from=${from}&to=${to}`;
