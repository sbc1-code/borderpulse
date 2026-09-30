import { dataService } from '../components/utils/dataService.js';

// Every current-waits view uses the same refresh lifecycle, including embeds.
export function subscribeToBorderData(listener, {
  service = dataService,
  page = globalThis.document,
  connection = globalThis.window,
} = {}) {
  service.addListener(listener);
  if (service.cache) listener(service.cache);
  service.startAutoRefresh(5 * 60_000);
  const refresh = () => service.getBorderData();
  const onVisible = () => {
    if (page.visibilityState === 'visible') refresh();
  };
  page?.addEventListener('visibilitychange', onVisible);
  connection?.addEventListener('online', refresh);
  refresh();

  return () => {
    service.removeListener(listener);
    page?.removeEventListener('visibilitychange', onVisible);
    connection?.removeEventListener('online', refresh);
    if (!service.listeners.size) service.stopAutoRefresh();
  };
}
