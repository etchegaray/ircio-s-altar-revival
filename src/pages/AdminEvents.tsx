import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type Event = Tables<'events'>;
type EventRegistration = Tables<'event_registrations'>;

const emptyForm = { title: '', description: '', date: '', time: '', location: '', max_attendees: '' };

const EventFormDialog = ({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: typeof emptyForm;
  onSubmit: (data: typeof emptyForm) => void;
  isPending: boolean;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);

  // Sync when initial changes (edit mode)
  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial.title ? t('admin.edit_event') : t('admin.add_event')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('events.title')}</Label>
            <Input value={form.title} onChange={set('title')} />
          </div>
          <div>
            <Label>{t('finances.description')}</Label>
            <Textarea value={form.description} onChange={set('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('finances.date')}</Label>
              <Input type="date" value={form.date} onChange={set('date')} />
            </div>
            <div>
              <Label>{t('events.time') ?? 'Hora'}</Label>
              <Input type="time" value={form.time} onChange={set('time')} />
            </div>
          </div>
          <div>
            <Label>{t('events.location')}</Label>
            <Input value={form.location} onChange={set('location')} />
          </div>
          <div>
            <Label>{t('events.attendees')} (máx.)</Label>
            <Input type="number" min="1" value={form.max_attendees} onChange={set('max_attendees')} />
          </div>
          <Button
            className="w-full"
            disabled={!form.title || !form.date || isPending}
            onClick={() => onSubmit(form)}
          >
            {t('admin.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AdminEvents = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [registrationsEvent, setRegistrationsEvent] = useState<Event | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ['admin_events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: registrations = [] } = useQuery<EventRegistration[]>({
    queryKey: ['admin_registrations', registrationsEvent?.id],
    enabled: !!registrationsEvent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', registrationsEvent!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const toInsert = (form: typeof emptyForm) => ({
    title: form.title,
    description: form.description || null,
    date: form.date,
    time: form.time || null,
    location: form.location || null,
    max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
  });

  const addEvent = useMutation({
    mutationFn: async (form: typeof emptyForm) => {
      const { error } = await supabase.from('events').insert(toInsert(form));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setAddOpen(false);
      toast.success(t('admin.saved'));
    },
    onError: () => toast.error(t('admin.error')),
  });

  const updateEvent = useMutation({
    mutationFn: async (form: typeof emptyForm) => {
      const { error } = await supabase
        .from('events')
        .update(toInsert(form))
        .eq('id', editEvent!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEditEvent(null);
      toast.success(t('admin.saved'));
    },
    onError: () => toast.error(t('admin.error')),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(t('admin.deleted'));
    },
    onError: () => toast.error(t('admin.error')),
  });

  const deleteRegistration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('event_registrations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_registrations', registrationsEvent?.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: () => toast.error(t('admin.error')),
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const eventToForm = (e: Event): typeof emptyForm => ({
    title: e.title,
    description: e.description ?? '',
    date: e.date,
    time: e.time ? e.time.slice(0, 5) : '',
    location: e.location ?? '',
    max_attendees: e.max_attendees !== null ? String(e.max_attendees) : '',
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Link to="/admin" className="text-primary hover:underline mb-6 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> {t('admin.dashboard')}
        </Link>

        <h1 className="text-3xl font-bold mb-8">{t('admin.events_title')}</h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('nav.events')}</CardTitle>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t('admin.add_event')}
            </Button>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t('events.no_events')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('events.title') ?? 'Título'}</TableHead>
                      <TableHead>{t('finances.date')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('events.location')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('events.attendees')} (máx.)</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(event.date)}
                          {event.time && (
                            <span className="text-muted-foreground ml-1 text-xs">
                              {event.time.slice(0, 5)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {event.location ?? '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {event.max_attendees ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('admin.view_registrations')}
                              onClick={() => setRegistrationsEvent(event)}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('admin.edit_event')}
                              onClick={() => setEditEvent(event)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('admin.deleted')}
                              onClick={() => deleteEvent.mutate(event.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add dialog */}
        <EventFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          initial={emptyForm}
          onSubmit={(form) => addEvent.mutate(form)}
          isPending={addEvent.isPending}
        />

        {/* Edit dialog */}
        {editEvent && (
          <EventFormDialog
            open={!!editEvent}
            onOpenChange={(open) => { if (!open) setEditEvent(null); }}
            initial={eventToForm(editEvent)}
            onSubmit={(form) => updateEvent.mutate(form)}
            isPending={updateEvent.isPending}
          />
        )}

        {/* Registrations dialog */}
        <Dialog open={!!registrationsEvent} onOpenChange={(open) => { if (!open) setRegistrationsEvent(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {t('admin.registrations')} — {registrationsEvent?.title}
              </DialogTitle>
            </DialogHeader>
            {registrations.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">{t('admin.no_registrations')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('events.name')}</TableHead>
                    <TableHead>{t('events.email')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>{reg.name}</TableCell>
                      <TableCell className="text-muted-foreground">{reg.email}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRegistration.mutate(reg.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminEvents;
