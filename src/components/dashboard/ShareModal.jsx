import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Sharing is optional. A delayed or failed chunk must not block lane reports.
export default function ShareModal(props) {
  const [state, setState] = useState(null);
  const Share = typeof state === 'function' ? state : null;
  const es = props.language === 'es';
  useEffect(() => {
    if (!props.open || Share) return;
    let active = true;
    setState(null);
    import('./ShareModalContent').then(
      module => { if (active) setState(() => module.default); },
      () => { if (active) setState('failed'); },
    );
    return () => { active = false; };
  }, [props.open]);
  if (Share) return <Share {...props} />;
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{es ? 'Compartir' : 'Share'}</DialogTitle>
        <DialogDescription role="status">{state === 'failed'
          ? (es ? 'No se pudo cargar. Puedes copiar la URL del navegador o recargar para reintentar.' : 'Sharing could not load. Copy the browser URL or reload to retry.')
          : (es ? 'Cargando opciones para compartir…' : 'Loading sharing options…')}</DialogDescription>
      </DialogHeader>
      <Button variant="outline" onClick={() => props.onOpenChange(false)}>{es ? 'Cancelar' : 'Cancel'}</Button>
      {state === 'failed' && <Button onClick={() => window.location.reload()}>{es ? 'Recargar para reintentar' : 'Reload to retry'}</Button>}
    </DialogContent>
  </Dialog>;
}
