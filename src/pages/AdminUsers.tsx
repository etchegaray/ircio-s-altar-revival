import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Plus, X } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ASSIGNABLE_ROLES, ROLE_LABELS, type AppRole } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface UserWithRoles {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: AppRole[];
}

const ROLE_COLORS: Record<AppRole, string> = {
  admin:         'bg-red-100 text-red-800 border-red-200',
  gestorTienda:  'bg-blue-100 text-blue-800 border-blue-200',
  gestorEventos: 'bg-green-100 text-green-800 border-green-200',
  gestorCuentas: 'bg-amber-100 text-amber-800 border-amber-200',
  user:          'bg-gray-100 text-gray-800 border-gray-200',
};

async function callAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('admin-users', { body });
  if (error) throw error;
  return data as T;
}

const AdminUsers = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: users = [], isLoading } = useQuery<UserWithRoles[]>({
    queryKey: ['admin_users'],
    queryFn: () => callAdminUsers<UserWithRoles[]>({ action: 'list' }),
  });

  // ── Invite ────────────────────────────────────────────────────────────────
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoles, setInviteRoles] = useState<AppRole[]>([]);

  const toggleInviteRole = (role: AppRole) =>
    setInviteRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );

  const inviteUser = useMutation({
    mutationFn: () =>
      callAdminUsers({ action: 'invite', email: inviteEmail, roles: inviteRoles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      toast.success(t('admin.users_invite_success', { email: inviteEmail }));
      setInviteEmail('');
      setInviteRoles([]);
      setInviteDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Role management ───────────────────────────────────────────────────────
  const assignRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      callAdminUsers({ action: 'assign_role', userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      toast.success(t('admin.users_role_added'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      callAdminUsers({ action: 'remove_role', userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      toast.success(t('admin.users_role_removed'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteUser = useMutation({
    mutationFn: (userId: string) =>
      callAdminUsers({ action: 'delete_user', userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      toast.success(t('admin.users_deleted'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-3xl font-bold flex-1">{t('admin.users_title')}</h1>

          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('admin.users_invite')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.users_invite')}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{t('admin.users_invite_desc')}</p>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>{t('admin.users_email')}</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">{t('admin.users_roles')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ASSIGNABLE_ROLES.map((role) => (
                      <label key={role} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={inviteRoles.includes(role)}
                          onCheckedChange={() => toggleInviteRole(role)}
                        />
                        <span className="text-sm">{ROLE_LABELS[role]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => inviteUser.mutate()}
                  disabled={!inviteEmail || inviteUser.isPending}
                >
                  {inviteUser.isPending ? '...' : t('admin.users_invite')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.users_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('admin.users_no_users')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.users_email')}</TableHead>
                      <TableHead>{t('admin.users_roles')}</TableHead>
                      <TableHead>{t('admin.users_last_login')}</TableHead>
                      <TableHead>{t('admin.users_created')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const unassignedRoles = ASSIGNABLE_ROLES.filter(
                        (r) => !u.roles.includes(r)
                      );
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.email}
                            {isSelf && (
                              <Badge variant="outline" className="ml-2 text-xs">yo</Badge>
                            )}
                          </TableCell>

                          {/* Role badges + add role popover */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1 items-center">
                              {u.roles.length === 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {t('admin.users_no_roles')}
                                </span>
                              )}
                              {(u.roles as AppRole[]).map((role) => (
                                <span
                                  key={role}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[role] ?? ROLE_COLORS.user}`}
                                >
                                  {ROLE_LABELS[role] ?? role}
                                  {/* Prevent removing own admin role */}
                                  {!(isSelf && role === 'admin') && (
                                    <button
                                      onClick={() => removeRole.mutate({ userId: u.id, role })}
                                      className="ml-0.5 hover:opacity-70"
                                      aria-label={`Remove ${role}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </span>
                              ))}
                              {unassignedRoles.length > 0 && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border border-dashed border-muted-foreground text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-40 p-2" align="start">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      {t('admin.users_add_role')}
                                    </p>
                                    {unassignedRoles.map((role) => (
                                      <button
                                        key={role}
                                        className="w-full text-left text-sm px-2 py-1 rounded hover:bg-muted transition-colors"
                                        onClick={() => assignRole.mutate({ userId: u.id, role })}
                                      >
                                        {ROLE_LABELS[role]}
                                      </button>
                                    ))}
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : t('admin.users_never')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(u.created_at)}
                          </TableCell>

                          {/* Delete — disabled for self */}
                          <TableCell>
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (window.confirm(t('admin.users_delete_confirm'))) {
                                    deleteUser.mutate(u.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminUsers;
