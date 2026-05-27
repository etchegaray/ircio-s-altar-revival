import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

export const SECTION_ROLES = {
  finances: ['admin', 'gestorCuentas'] as AppRole[],
  shop:     ['admin', 'gestorTienda']  as AppRole[],
  events:   ['admin', 'gestorEventos'] as AppRole[],
} as const;

// Any role that grants access to the admin panel
export const MANAGER_ROLES: AppRole[] = [
  'admin',
  'gestorTienda',
  'gestorEventos',
  'gestorCuentas',
];

// Roles available for assignment in the Users admin UI (excludes legacy 'user')
export const ASSIGNABLE_ROLES: AppRole[] = [
  'admin',
  'gestorTienda',
  'gestorEventos',
  'gestorCuentas',
];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin:         'Admin',
  user:          'User',
  gestorTienda:  'Tienda',
  gestorEventos: 'Eventos',
  gestorCuentas: 'Cuentas',
};

export const hasAnyRole = (userRoles: AppRole[], required: AppRole[]): boolean =>
  required.some((r) => userRoles.includes(r));
