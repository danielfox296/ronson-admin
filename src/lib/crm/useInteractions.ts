import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import type { Interaction } from './types.js';

export function useInteractions(contactId: string | undefined) {
  return useQuery({
    queryKey: ['crm-interactions', contactId],
    queryFn: () => api<{ data: Interaction[] }>(`/api/crm/contacts/${contactId}/interactions`),
    enabled: !!contactId,
  });
}

export function useCreateInteraction(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      api(`/api/crm/contacts/${contactId}/interactions`, { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-interactions', contactId] });
      qc.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
    },
  });
}

export function useUpdateInteraction(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, any>) =>
      api(`/api/crm/interactions/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-interactions', contactId] }),
  });
}

export function useDeleteInteraction(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/crm/interactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-interactions', contactId] });
      qc.invalidateQueries({ queryKey: ['crm-contact', contactId] });
    },
  });
}
