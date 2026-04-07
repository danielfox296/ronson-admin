import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import type { NextAction } from './types.js';

export interface ActionFilters {
  due_before?: string;
  due_after?: string;
  priority?: number;
  completed?: boolean;
  contact_category?: string;
}

export function useGlobalActions(filters: ActionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.due_before) params.set('due_before', filters.due_before);
  if (filters.due_after) params.set('due_after', filters.due_after);
  if (filters.priority != null) params.set('priority', String(filters.priority));
  if (filters.completed != null) params.set('completed', String(filters.completed));
  if (filters.contact_category) params.set('contact_category', filters.contact_category);
  const qs = params.toString();

  return useQuery({
    queryKey: ['crm-actions', filters],
    queryFn: () => api<{ data: NextAction[] }>(`/api/crm/actions${qs ? `?${qs}` : ''}`),
  });
}

export function useContactActions(contactId: string | undefined) {
  return useQuery({
    queryKey: ['crm-contact-actions', contactId],
    queryFn: () => api<{ data: NextAction[] }>(`/api/crm/contacts/${contactId}/actions`),
    enabled: !!contactId,
  });
}

export function useCreateAction(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      api(`/api/crm/contacts/${contactId}/actions`, { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contact-actions', contactId] });
      qc.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      qc.invalidateQueries({ queryKey: ['crm-actions'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
    },
  });
}

export function useUpdateAction(contactId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, any>) =>
      api(`/api/crm/actions/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      if (contactId) {
        qc.invalidateQueries({ queryKey: ['crm-contact-actions', contactId] });
        qc.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      }
      qc.invalidateQueries({ queryKey: ['crm-actions'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
    },
  });
}

export function useDeleteAction(contactId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/crm/actions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      if (contactId) {
        qc.invalidateQueries({ queryKey: ['crm-contact-actions', contactId] });
        qc.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      }
      qc.invalidateQueries({ queryKey: ['crm-actions'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
    },
  });
}
