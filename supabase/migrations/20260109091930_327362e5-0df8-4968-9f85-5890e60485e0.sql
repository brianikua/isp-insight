-- Add unique constraint for session upsert
ALTER TABLE public.pppoe_sessions 
ADD CONSTRAINT pppoe_sessions_router_username_unique 
UNIQUE (router_id, username);