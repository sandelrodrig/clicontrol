-- Add slot_type to panel_clients to track if client uses IPTV or P2P slot
ALTER TABLE public.panel_clients 
ADD COLUMN IF NOT EXISTS slot_type text NOT NULL DEFAULT 'iptv';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_panel_clients_slot_type ON public.panel_clients(slot_type);

-- Add columns to shared_panels for tracking individual slot usage
ALTER TABLE public.shared_panels 
ADD COLUMN IF NOT EXISTS used_iptv_slots integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS used_p2p_slots integer NOT NULL DEFAULT 0;

-- Create or replace function to update slot counts
CREATE OR REPLACE FUNCTION public.update_panel_slot_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.slot_type = 'iptv' THEN
      UPDATE public.shared_panels SET used_iptv_slots = used_iptv_slots + 1 WHERE id = NEW.panel_id;
    ELSE
      UPDATE public.shared_panels SET used_p2p_slots = used_p2p_slots + 1 WHERE id = NEW.panel_id;
    END IF;
    -- Update used_slots as total clients / max(iptv_per_credit, p2p_per_credit) to track credits used
    UPDATE public.shared_panels 
    SET used_slots = GREATEST(
      CEIL(used_iptv_slots::numeric / NULLIF(iptv_per_credit, 0)),
      CEIL(used_p2p_slots::numeric / NULLIF(p2p_per_credit, 0))
    )
    WHERE id = NEW.panel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.slot_type = 'iptv' THEN
      UPDATE public.shared_panels SET used_iptv_slots = GREATEST(0, used_iptv_slots - 1) WHERE id = OLD.panel_id;
    ELSE
      UPDATE public.shared_panels SET used_p2p_slots = GREATEST(0, used_p2p_slots - 1) WHERE id = OLD.panel_id;
    END IF;
    -- Update used_slots
    UPDATE public.shared_panels 
    SET used_slots = GREATEST(
      CEIL(GREATEST(0, used_iptv_slots - CASE WHEN OLD.slot_type = 'iptv' THEN 0 ELSE 0 END)::numeric / NULLIF(iptv_per_credit, 0)),
      CEIL(GREATEST(0, used_p2p_slots - CASE WHEN OLD.slot_type = 'p2p' THEN 0 ELSE 0 END)::numeric / NULLIF(p2p_per_credit, 0))
    )
    WHERE id = OLD.panel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS update_panel_slots_trigger ON public.panel_clients;
CREATE TRIGGER update_panel_slot_counts_trigger
AFTER INSERT OR DELETE ON public.panel_clients
FOR EACH ROW EXECUTE FUNCTION public.update_panel_slot_counts();