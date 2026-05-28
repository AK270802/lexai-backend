import api from '@/lib/api';
import type { ContractClause, Redline, RedlineAction, Document, PaginatedResponse } from '@/lib/types';

export const contractsApi = {
  getContract: (id: string) =>
    api.get<Document & { download_url?: string }>(`/contracts/${id}/`).then((r) => r.data),

  listClauses: (contractId: string, page?: number) =>
    api.get<PaginatedResponse<ContractClause> | ContractClause[]>(
      `/contracts/${contractId}/clauses/`,
      { params: page ? { page } : undefined }
    ).then((r) => {
      const d = r.data;
      return Array.isArray(d) ? d : d.results;
    }),

  createRedline: (contractId: string, data: { clause_id: string; action: RedlineAction; revised_text: string }) =>
    api.post<Redline>(`/contracts/${contractId}/redlines/`, data).then((r) => r.data),

  acceptRedline: (contractId: string, redlineId: string) =>
    api.post<Redline>(`/contracts/${contractId}/redlines/${redlineId}/accept/`).then((r) => r.data),

  rejectRedline: (contractId: string, redlineId: string) =>
    api.post<Redline>(`/contracts/${contractId}/redlines/${redlineId}/reject/`).then((r) => r.data),

  getMissingClauses: (contractId: string) =>
    api.get<{ missing: string[]; document_type?: string; error?: string }>(
      `/contracts/${contractId}/missing-clauses/`
    ).then((r) => r.data),
};
