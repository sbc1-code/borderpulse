import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

const SIZES = [
  { id: 'sm', w: 320, h: 180, labelEn: '320 × 180', labelEs: '320 × 180' },
  { id: 'md', w: 480, h: 220, labelEn: '480 × 220', labelEs: '480 × 220' },
  { id: 'wide', w: '100%', h: 200, labelEn: 'Responsive', labelEs: 'Adaptable' },
];

function buildSnippet(slug, theme, lang, direction, size) {
  const params = new URLSearchParams();
  if (theme === 'dark') params.set('theme', 'dark');
  if (lang === 'es') params.set('lang', 'es');
  if (direction === 'southbound') params.set('direction', 'southbound');
  const qs = params.toString();
  const src = `https://borderpulse.com/embed/${slug}${qs ? `?${qs}` : ''}`;
  const widthAttr = size.w === '100%' ? 'width="100%"' : `width="${size.w}"`;
  const styleAttr = size.w === '100%' ? ' style="max-width:100%"' : '';
  return `<iframe src="${src}" ${widthAttr} height="${size.h}" frameborder="0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"${styleAttr}></iframe>`;
}

export default function EmbedSnippetModal({ open, onOpenChange, slug, language = 'en' }) {
  const [theme, setTheme] = useState('light');
  const [lang, setLang] = useState(language);
  const [direction, setDirection] = useState('northbound');
  const [sizeId, setSizeId] = useState('sm');
  const [copied, setCopied] = useState(false);

  const size = SIZES.find((s) => s.id === sizeId) || SIZES[0];
  const snippet = useMemo(
    () => buildSnippet(slug, theme, lang, direction, size),
    [slug, theme, lang, direction, size],
  );

  const previewSrc = useMemo(() => {
    const params = new URLSearchParams();
    if (theme === 'dark') params.set('theme', 'dark');
    if (lang === 'es') params.set('lang', 'es');
    if (direction === 'southbound') params.set('direction', 'southbound');
    const qs = params.toString();
    return `/embed/${slug}${qs ? `?${qs}` : ''}`;
  }, [slug, theme, lang, direction]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.warn(e);
    }
  };

  const labelClass = 'text-[11px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wide';
  const selectClass = 'mt-1 w-full rounded-md border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm';

  const previewWidth = size.w === '100%' ? '100%' : `${size.w}px`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'Embed this widget' : 'Inserta este widget'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'en'
              ? 'Drop this iframe on your site to show live wait time. Free, no API key.'
              : 'Pon este iframe en tu sitio para mostrar el tiempo de espera en vivo. Gratis, sin API key.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className={labelClass}>{language === 'en' ? 'Theme' : 'Tema'}</label>
              <select className={selectClass} value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="light">{language === 'en' ? 'Light' : 'Claro'}</option>
                <option value="dark">{language === 'en' ? 'Dark' : 'Oscuro'}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{language === 'en' ? 'Language' : 'Idioma'}</label>
              <select className={selectClass} value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{language === 'en' ? 'Direction' : 'Dirección'}</label>
              <select className={selectClass} value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="northbound">{language === 'en' ? 'To USA' : 'Hacia EE.UU.'}</option>
                <option value="southbound">{language === 'en' ? 'To Mexico' : 'Hacia México'}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{language === 'en' ? 'Size' : 'Tamaño'}</label>
              <select className={selectClass} value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
                {SIZES.map((s) => (
                  <option key={s.id} value={s.id}>{language === 'en' ? s.labelEn : s.labelEs}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className={`${labelClass} mb-1`}>{language === 'en' ? 'Preview' : 'Vista previa'}</div>
            <div className="rounded-md border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-900 p-3 flex items-center justify-center overflow-hidden">
              <iframe
                key={previewSrc}
                src={previewSrc}
                title="Border Pulse embed preview"
                width={previewWidth}
                height={size.h}
                style={{ border: 0, maxWidth: '100%' }}
                loading="lazy"
              />
            </div>
          </div>

          <div>
            <div className={`${labelClass} mb-1`}>{language === 'en' ? 'Snippet' : 'Código'}</div>
            <textarea
              readOnly
              value={snippet}
              aria-label={language === 'en' ? 'Embed iframe code' : 'Código iframe'}
              className="w-full rounded-md border border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 h-20"
              onClick={(e) => e.target.select()}
            />
            <Button onClick={copy} className="mt-2 w-full gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied
                ? (language === 'en' ? 'Copied' : 'Copiado')
                : (language === 'en' ? 'Copy iframe code' : 'Copiar código iframe')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
