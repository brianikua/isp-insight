-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'readonly');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'readonly',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create routers table for MikroTik router configurations
CREATE TABLE public.routers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  site_name TEXT,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 8728,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  routeros_version TEXT DEFAULT 'v7',
  use_snmp BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resellers table
CREATE TABLE public.resellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  bandwidth_cap_mbps INTEGER,
  detection_rules JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pppoe_sessions table for active sessions snapshot
CREATE TABLE public.pppoe_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  router_id UUID NOT NULL REFERENCES public.routers(id) ON DELETE CASCADE,
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  profile TEXT,
  comment TEXT,
  assigned_ip TEXT,
  interface TEXT,
  uptime_seconds BIGINT DEFAULT 0,
  tx_bytes BIGINT DEFAULT 0,
  rx_bytes BIGINT DEFAULT 0,
  tx_rate_bps BIGINT DEFAULT 0,
  rx_rate_bps BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_history table for historical data
CREATE TABLE public.usage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE,
  router_id UUID REFERENCES public.routers(id) ON DELETE CASCADE,
  session_count INTEGER DEFAULT 0,
  total_tx_bytes BIGINT DEFAULT 0,
  total_rx_bytes BIGINT DEFAULT 0,
  avg_bandwidth_mbps NUMERIC(10,2) DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE,
  router_id UUID REFERENCES public.routers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reseller_user_mappings for manual PPPoE user to reseller assignments
CREATE TABLE public.reseller_user_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  pppoe_username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reseller_id, pppoe_username)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pppoe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_user_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for routers (all authenticated users can view, only admins can modify)
CREATE POLICY "Authenticated users can view routers" ON public.routers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert routers" ON public.routers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update routers" ON public.routers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete routers" ON public.routers FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for resellers
CREATE POLICY "Authenticated users can view resellers" ON public.resellers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert resellers" ON public.resellers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update resellers" ON public.resellers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete resellers" ON public.resellers FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for pppoe_sessions
CREATE POLICY "Authenticated users can view sessions" ON public.pppoe_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage sessions" ON public.pppoe_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for usage_history
CREATE POLICY "Authenticated users can view usage history" ON public.usage_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage usage history" ON public.usage_history FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for alerts
CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update alerts" ON public.alerts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage alerts" ON public.alerts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete alerts" ON public.alerts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for reseller_user_mappings
CREATE POLICY "Authenticated users can view mappings" ON public.reseller_user_mappings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage mappings" ON public.reseller_user_mappings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_routers_updated_at BEFORE UPDATE ON public.routers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resellers_updated_at BEFORE UPDATE ON public.resellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    CASE WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin'::user_role ELSE 'readonly'::user_role END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_pppoe_sessions_router ON public.pppoe_sessions(router_id);
CREATE INDEX idx_pppoe_sessions_reseller ON public.pppoe_sessions(reseller_id);
CREATE INDEX idx_pppoe_sessions_active ON public.pppoe_sessions(is_active);
CREATE INDEX idx_usage_history_reseller ON public.usage_history(reseller_id);
CREATE INDEX idx_usage_history_recorded ON public.usage_history(recorded_at);
CREATE INDEX idx_alerts_reseller ON public.alerts(reseller_id);
CREATE INDEX idx_alerts_unread ON public.alerts(is_read) WHERE is_read = false;