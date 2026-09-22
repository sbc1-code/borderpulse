-- One evaluation record per rule and CBP snapshot. This prevents a scheduled
-- retry or overlapping worker from sending the same alert twice.
alter table public.alert_deliveries
  add constraint alert_deliveries_rule_snapshot_unique unique (rule_id, source_snapshot_at);
