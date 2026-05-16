import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Mail } from 'lucide-react';
import EmailCapture from './EmailCapture';

// Picks the right CTA for a blog post:
//  - Ops / freight / business framing -> /services audit pitch
//  - Practical / commuter framing      -> newsletter signup
//
// Selection priority:
//  1) Explicit `cta` frontmatter field ("ops" | "newsletter")
//  2) Pillar heuristic: policy-programs + freight tags -> ops, default newsletter
//  3) Tag heuristic: freight/logistics/maquila/customs/commercial -> ops
const OPS_TAGS = new Set([
  'freight', 'logistics', 'commercial', 'cargo', 'maquila',
  'customs', 'broker', 'supply-chain', 'business', 'fleet',
]);

function pickIntent(frontmatter) {
  if (frontmatter?.cta === 'ops' || frontmatter?.cta === 'services') return 'ops';
  if (frontmatter?.cta === 'newsletter') return 'newsletter';
  const tags = Array.isArray(frontmatter?.tags) ? frontmatter.tags : [];
  if (tags.some((t) => OPS_TAGS.has(String(t).toLowerCase()))) return 'ops';
  return 'newsletter';
}

export default function PostCta({ frontmatter, language = 'en' }) {
  const intent = pickIntent(frontmatter);
  const lang = (frontmatter?.lang === 'es' ? 'es' : language) || 'en';

  if (intent === 'ops') {
    const servicesHref = lang === 'es' ? '/servicios' : '/services';
    return (
      <aside
        className="my-8 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950"
        aria-label={lang === 'en' ? 'Cross-border ops services' : 'Servicios de operaciones transfronterizas'}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0b0b0b] text-white dark:bg-white dark:text-[#0b0b0b]">
            <Briefcase className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {lang === 'en'
                ? 'Running a cross-border operation? Get an audit.'
                : '¿Operas una empresa transfronteriza? Obtén una auditoría.'}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {lang === 'en'
                ? '10-day cross-border digital ops audit — analytics, conversion paths, ES/EN parity, freight UX. $1,500, delivered bilingual.'
                : 'Auditoría digital transfronteriza de 10 días — analítica, rutas de conversión, paridad EN/ES, UX para carga. $1,500, entregable bilingüe.'}
            </p>
            <Link
              to={servicesHref}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              {lang === 'en' ? 'See what the audit includes' : 'Ver qué incluye la auditoría'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="my-8"
      aria-label={lang === 'en' ? 'Newsletter signup' : 'Suscripción al boletín'}
    >
      <EmailCapture variant="inline" source={`post:${frontmatter?.slug || 'unknown'}`} language={lang} />
    </aside>
  );
}
