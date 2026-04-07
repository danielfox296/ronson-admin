import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) => api('/api/crm/contacts', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-contacts'] }),
  });
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) => api(`/api/crm/contacts/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      qc.invalidateQueries({ queryKey: ['crm-contact', id] });
    },
  });
}

export function useDeleteContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/api/crm/contacts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-contacts'] }),
  });
}

export function useRestoreContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/api/crm/contacts/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      qc.invalidateQueries({ queryKey: ['crm-contact', id] });
    },
  });
}
