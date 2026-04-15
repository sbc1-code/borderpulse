import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SharedStatus() {
  const lang = typeof window !== 'undefined' ? localStorage.getItem('borderPulse_language') || 'en' : 'en';
  return (
    <div className="p-4 max-w-xl mx-auto">
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <h1 className="text-xl font-bold text-slate-900">
            {lang === 'en' ? 'Shared status not available' : 'Estado compartido no disponible'}
          </h1>
          <p className="text-sm text-slate-500">
            {lang === 'en'
              ? 'Shared status snapshots are coming in a future update. See the live dashboard for current wait times.'
              : 'Los estados compartidos estarán disponibles en una actualización futura. Mira el panel en vivo para tiempos actuales.'}
          </p>
          <Link to="/">
            <Button>{lang === 'en' ? 'Go to dashboard' : 'Ir al panel'}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
