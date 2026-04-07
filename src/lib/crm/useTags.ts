import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

export function useCRMTags() {
  return useQuery({
    queryKey: ['crm-tags'],
    queryFn: () => api<{ data: { tag: string; count: number }[] }>('/api/crm/tags'),
  });
}

export function useAddTag(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tag: string) => api(`/api/crm/contacts/${contactId}/tags`, { method: 'POST', body: { tag } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      qc.invalidateQueries({ queryKey: ['crm-tags'] });
    },
  });
}

export function useRemoveTag(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tag: string) => api(`/api/crm/contacts/${contactId}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      qc.invalidateQueries({ queryKey: ['crm-tags'] });
    },
  });
}
