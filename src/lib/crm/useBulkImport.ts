import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

export interface BulkImportResult {
  success: number;
  errors: { index: number; error: string }[];
}

export function useBulkImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contacts: Record<string, any>[]) =>
      api<{ data: BulkImportResult }>('/api/crm/contacts/bulk', { method: 'POST', body: { contacts } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
    },
  });
}
