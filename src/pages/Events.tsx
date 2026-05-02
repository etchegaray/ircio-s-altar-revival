import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

const Events = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [registrationEventId, setRegistrationEventId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [registered, setRegistered] = useState<Set<string>>(new Set());

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_registrations(id)')
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const register = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('event_registrations').insert({
        event_id: eventId,
        name: form.name,
        email: form.email,
      });
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setRegistered((prev) => new Set(prev).add(eventId));
      setRegistrationEventId(null);
      setForm({ name: '', email: '' });
      toast.success(t('events.registration_success'));
    },
    onError: () => toast.error(t('admin.error')),
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold">{t('events.title')}</h1>
          <Button asChild>
            <Link to="/donations">{t('hero.cta_donate')}</Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-lg mb-10">{t('events.subtitle')}</p>

        {events.length === 0 ? (
          <p className="text-muted-foreground italic">{t('events.no_events')}</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const attendeeCount = (event.event_registrations as { id: string }[])?.length ?? 0;
              const isFull = event.max_attendees !== null && attendeeCount >= event.max_attendees;
              const isRegistered = registered.has(event.id);

              return (
                <Card key={event.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span className="capitalize">{formatDate(event.date)}</span>
                      </div>
                      {event.time && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>{event.time.slice(0, 5)}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.max_attendees !== null && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 shrink-0" />
                          <span>
                            {attendeeCount} / {event.max_attendees} {t('events.attendees')}
                          </span>
                        </div>
                      )}
                    </div>
                    {event.description && <p className="text-sm">{event.description}</p>}

                    <div className="mt-auto pt-4">
                      <Dialog
                        open={registrationEventId === event.id}
                        onOpenChange={(open) => {
                          setRegistrationEventId(open ? event.id : null);
                          if (!open) setForm({ name: '', email: '' });
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            className="w-full"
                            disabled={isFull || isRegistered}
                            variant={isRegistered ? 'outline' : 'default'}
                          >
                            {isRegistered
                              ? t('events.registered')
                              : isFull
                              ? t('events.full')
                              : t('events.register')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{event.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>{t('events.name')}</Label>
                              <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>{t('events.email')}</Label>
                              <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                              />
                            </div>
                            <Button
                              className="w-full"
                              disabled={!form.name || !form.email || register.isPending}
                              onClick={() => register.mutate(event.id)}
                            >
                              {t('events.register_submit')}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Events;
