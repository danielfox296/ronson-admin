import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import type { CRMStats } from './types.js';

export function useCRMStats() {
  return useQuery({
    queryKey: ['crm-stats'],
    queryFn: () => api<{ data: CRMStats }>('/api/crm/stats'),
    refetchInterval: 60_000,
  });
}
