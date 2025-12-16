-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'tenant');

-- Create user_roles table (security best practice - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'tenant',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  room_no TEXT NOT NULL,
  contact TEXT NOT NULL,
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rent_payments table
CREATE TABLE public.rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  amount NUMERIC(10,2) NOT NULL,
  paid_on DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (tenant_id, month, year)
);

-- Create maintenance_requests table
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  room_no TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
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

-- Function to get tenant_id for current user
CREATE OR REPLACE FUNCTION public.get_tenant_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE auth_user_id = _user_id LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tenants
CREATE POLICY "Admins can do everything with tenants" ON public.tenants
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenants can view their own record" ON public.tenants
  FOR SELECT USING (auth.uid() = auth_user_id);

-- RLS Policies for rent_payments
CREATE POLICY "Admins can manage all rent payments" ON public.rent_payments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenants can view their own rent payments" ON public.rent_payments
  FOR SELECT USING (
    tenant_id = public.get_tenant_id_for_user(auth.uid())
  );

-- RLS Policies for maintenance_requests
CREATE POLICY "Admins can manage all maintenance requests" ON public.maintenance_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenants can view their own maintenance requests" ON public.maintenance_requests
  FOR SELECT USING (
    tenant_id = public.get_tenant_id_for_user(auth.uid())
  );

CREATE POLICY "Tenants can create maintenance requests" ON public.maintenance_requests
  FOR INSERT WITH CHECK (
    tenant_id = public.get_tenant_id_for_user(auth.uid())
  );

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on tenants
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();