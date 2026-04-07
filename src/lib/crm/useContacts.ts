import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import type { Contact, ContactListMeta } from './types.js';

export interface ContactFilters {
  category?: string;
  status?: string;
  priority?: number;
  tag?: string;
  search?: string;
  has_open_actions?: boolean;
  last_contacted_before?: string;
  last_contacted_after?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  include_archived?: boolean;
}

function buildQuery(filters: ContactFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority != null) params.set('priority', String(filters.priority));
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.search) params.set('search', filters.search);
  if (filters.has_open_actions) params.set('has_open_actions', 'true');
  if (filters.last_contacted_before) params.set('last_contacted_before', filters.last_contacted_before);
  if (filters.last_contacted_after) params.set('last_contacted_after', filters.last_contacted_after);
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_dir) params.set('sort_dir', filters.sort_dir);
  if (filters.limit != null) params.set('limit', String(filters.limit));
  if (filters.offset != null) params.set('offset', String(filters.offset));
  if (filters.include_archived) params.set('include_archived', 'true');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useContacts(filters: ContactFilters = {}) {
  return useQuery({
    queryKey: ['crm-contacts', filters],
    queryFn: () => api<{ data: Contact[]; meta: ContactListMeta }>(`/api/crm/contacts${buildQuery(filters)}`),
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-contact', id],
    queryFn: () => api<{ data: Contact }>(`/api/crm/contacts/${id}`),
    enabled: !!id,
  });
}
