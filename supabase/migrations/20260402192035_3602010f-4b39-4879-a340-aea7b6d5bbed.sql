
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Campaign settings
CREATE TABLE public.campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_amount NUMERIC NOT NULL DEFAULT 0,
  campaign_name TEXT NOT NULL DEFAULT 'Restauración del Retablo de Ircio',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

-- Donations
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  donor_name TEXT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  description TEXT,
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME,
  location TEXT,
  max_attendees INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Event registrations
CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies

-- user_roles: only admins can read, no public access
CREATE POLICY "Authenticated users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- campaign_settings: public read, admin write
CREATE POLICY "Public can view campaign settings" ON public.campaign_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage campaign settings" ON public.campaign_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- donations: public read, admin write
CREATE POLICY "Public can view donations" ON public.donations
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage donations" ON public.donations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- expenses: public read, admin write
CREATE POLICY "Public can view expenses" ON public.expenses
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage expenses" ON public.expenses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- products: public read, admin write
CREATE POLICY "Public can view products" ON public.products
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- events: public read, admin write
CREATE POLICY "Public can view events" ON public.events
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- event_registrations: public read+insert, admin delete
CREATE POLICY "Public can view registrations" ON public.event_registrations
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can register for events" ON public.event_registrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage registrations" ON public.event_registrations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
