import React, { useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Download, ImagePlus, Share2, Trash2 } from 'lucide-react';
import { DEFAULT_LANE, laneLabel, withLane } from '@/lib/laneContext';
import { availableLaneWait } from '@/lib/crossingAvailability';
import { crossingDisplayName } from '@/lib/crossingNames';
import { reportTimeLabel } from '@/lib/trustState';
import { track } from '@/lib/analytics';
import styles from './CrossingPhotoCard.module.css';

const FORMATS = {
  post: { width: 1080, height: 1350, label: { en: 'Post 4:5', es: 'Post 4:5' } },
  story: { width: 1080, height: 1920, label: { en: 'Story 9:16', es: 'Historia 9:16' } },
};

const QUICK_TAGS = [
  { id: 'steady', en: 'Moving steady', es: 'Avanza fluido' },
  { id: 'slow', en: 'Slow queue', es: 'Fila lenta' },
  { id: 'booths', en: 'Near booths', es: 'Cerca de casetas' },
  { id: 'pedestrian', en: 'Pedestrian line', es: 'Fila peatonal' },
];

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth, maxLines = 2) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function accentFor(wait, closed) {
  if (closed || wait == null) return '#64748b';
  if (wait < 30) return '#10b981';
  if (wait < 60) return '#f59e0b';
  return '#e11d48';
}

function formatHour(h, es) {
  if (h == null || !Number.isFinite(h)) return '';
  const h12 = h % 12 || 12;
  if (es) return `${h12} ${h >= 12 ? 'p. m.' : 'a. m.'}`;
  return `${h12} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function CrossingPhotoCard({
  crossing,
  slug,
  language = 'en',
  lane = DEFAULT_LANE,
  crossingBase = '/crossing',
  aggregate = null,
  fetchedAt = null,
}) {
  const es = language === 'es';
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState('post');
  const [noteTag, setNoteTag] = useState('');
  const [photoImg, setPhotoImg] = useState(null);
  const [status, setStatus] = useState('');
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

  const dims = FORMATS[format] || FORMATS.post;
  const isClosed = String(crossing?.port_status || '').trim().toLowerCase() === 'closed';
  const wait = isClosed ? null : availableLaneWait(crossing, lane);
  const accent = accentFor(wait, isClosed);
  const displayName = crossingDisplayName(crossing, language);
  const laneText = laneLabel(lane, language);
  const base = crossingBase === '/cruce' ? '/cruce' : '/crossing';
  const sharePath = withLane(`${base}/${slug}/`, lane);
  const shareUrl = `https://borderpulse.com${sharePath}`;

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open || !canvasRef.current || !crossing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: W, height: H } = dims;
    canvas.width = W;
    canvas.height = H;

    // Background layer: either cropped user line photo or dark status plate.
    if (photoImg) {
      const iw = photoImg.naturalWidth || photoImg.width;
      const ih = photoImg.naturalHeight || photoImg.height;
      const scale = Math.max(W / iw, H / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(photoImg, (W - dw) / 2, (H - dh) / 2, dw, dh);

      const topFade = ctx.createLinearGradient(0, 0, 0, H * 0.32);
      topFade.addColorStop(0, 'rgba(2, 6, 23, 0.78)');
      topFade.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = topFade;
      ctx.fillRect(0, 0, W, H * 0.34);

      const bottomFade = ctx.createLinearGradient(0, H * 0.38, 0, H);
      bottomFade.addColorStop(0, 'rgba(2, 6, 23, 0)');
      bottomFade.addColorStop(0.55, 'rgba(2, 6, 23, 0.76)');
      bottomFade.addColorStop(1, 'rgba(2, 6, 23, 0.94)');
      ctx.fillStyle = bottomFade;
      ctx.fillRect(0, H * 0.38, W, H * 0.62);
    } else {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(0.55, '#0b1120');
      bg.addColorStop(1, '#020617');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, W, 16);
    }

    const pad = 64;
    // Header pill: brand + lane context
    drawRoundedRect(ctx, pad, 56, W - pad * 2, 74, 20);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(pad + 34, 93, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textBaseline = 'middle';
    ctx.fillText('Border Pulse', pad + 60, 94);

    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    const rightTag = laneText.toUpperCase();
    const rightTagW = ctx.measureText(rightTag).width;
    ctx.fillText(rightTag, W - pad - 28 - rightTagW, 94);

    // Lower summary card container
    const cardH = format === 'story' ? 670 : 590;
    const cardY = H - pad - cardH;
    const cardW = W - pad * 2;
    drawRoundedRect(ctx, pad, cardY, cardW, cardH, 32);
    ctx.fillStyle = photoImg ? 'rgba(11, 17, 32, 0.86)' : 'rgba(15, 23, 42, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = accent;
    ctx.stroke();

    ctx.textBaseline = 'alphabetic';
    let y = cardY + 62;

    // State + CBP kicker
    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = accent;
    const kicker = `${crossing.state || 'US-MX'} · ${es ? 'REPORTE OFICIAL CBP' : 'OFFICIAL CBP REPORT'}`;
    ctx.fillText(kicker, pad + 42, y);
    y += 58;

    // Crossing name (1-2 wrapped lines)
    ctx.font = '800 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    const nameLines = wrapLines(ctx, displayName, cardW - 84, 2);
    for (const line of nameLines) {
      ctx.fillText(line, pad + 42, y);
      y += 62;
    }

    y += 18;
    // Wait metric value
    const waitHeadline = isClosed
      ? (es ? 'Cerrado' : 'Closed')
      : wait == null
        ? (es ? 'Sin reporte' : 'No report')
        : `${wait} min`;

    ctx.font = '900 128px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(waitHeadline, pad + 42, y + 92);
    y += 132;

    // Optional commuter tag chip
    const activeTag = QUICK_TAGS.find((t) => t.id === noteTag);
    if (activeTag) {
      const chipText = `${es ? 'En la fila' : 'Line note'}: ${activeTag[es ? 'es' : 'en']}`;
      ctx.font = '700 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const chipW = Math.min(cardW - 84, ctx.measureText(chipText).width + 44);
      drawRoundedRect(ctx, pad + 42, y, chipW, 50, 25);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ecfdf5';
      ctx.fillText(chipText, pad + 64, y + 34);
      y += 72;
    } else {
      y += 14;
    }

    // Report clock & retrieval line
    const reportTime = crossing.lanes?.[lane] ? reportTimeLabel(crossing.lanes[lane], language) : '';
    const fetchedText = fetchedAt && Number.isFinite(Date.parse(fetchedAt))
      ? new Date(fetchedAt).toLocaleString(es ? 'es-MX' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
      : '';
    const clockLine = [
      reportTime ? `CBP: ${reportTime}` : null,
      fetchedText ? `${es ? 'Consulta' : 'Fetched'}: ${fetchedText}` : null,
    ].filter(Boolean).join(' · ');

    if (clockLine) {
      ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(clockLine, pad + 42, y);
      y += 38;
    }

    if (lane === DEFAULT_LANE && aggregate?.overall_best_hour != null && aggregate?.overall_best_median != null) {
      const patternLine = es
        ? `Patrón 30 días: ${formatHour(aggregate.overall_best_hour, true)} (${aggregate.overall_best_median} min) · No es pronóstico`
        : `30-day pattern: ${formatHour(aggregate.overall_best_hour, false)} (${aggregate.overall_best_median} min) · Not a forecast`;
      ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(patternLine, pad + 42, y);
    }

    // Bottom domain footer bar inside the card
    const footY = cardY + cardH - 34;
    ctx.font = '700 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`borderpulse.com${base}/${slug}/`, pad + 42, footY);
  }, [accent, aggregate, base, crossing, dims, displayName, es, fetchedAt, format, isClosed, lane, laneText, language, noteTag, open, photoImg, slug, wait]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      objectUrlRef.current = url;
      setPhotoImg(img);
      setStatus(es ? 'Foto lista en tu dispositivo.' : 'Photo ready on your device.');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus(es ? 'No se pudo leer esa imagen.' : 'Could not read that image file.');
    };
    img.src = url;
  };

  const clearPhoto = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPhotoImg(null);
    setStatus(es ? 'Foto quitada.' : 'Photo removed.');
  };

  const exportBlob = () =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(null);
        return;
      }
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      } else {
        resolve(null);
      }
    });

  const downloadImage = async () => {
    const blob = await exportBlob();
    if (!blob) {
      setStatus(es ? 'No se pudo generar la imagen.' : 'Could not create the image.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `borderpulse-${slug}-${format}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(es ? 'Imagen PNG descargada. Lista para publicar o enviar.' : 'PNG downloaded. Ready to post or send.');
  };

  const shareImage = async () => {
    const blob = await exportBlob();
    if (!blob) {
      setStatus(es ? 'No se pudo generar la imagen.' : 'Could not create the image.');
      return;
    }
    const filename = `borderpulse-${slug}-${format}.png`;
    if (typeof File === 'function' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const file = new File([blob], filename, { type: 'image/png' });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${displayName} | BorderPulse`,
            text: es
              ? `Reporte de ${displayName} (${laneText}) en BorderPulse`
              : `${displayName} (${laneText}) wait report on BorderPulse`,
            url: shareUrl,
          });
          track('crossing-share', { slug, method: 'native' });
          setStatus(es ? 'Tarjeta compartida.' : 'Card shared.');
          return;
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    await downloadImage();
  };

  return (
    <section
      aria-label={es ? 'Tarjeta visual y foto de la fila' : 'Visual card and line photo'}
      className={styles.studio}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={styles.toggleBtn}
      >
        <div>
          <div className={styles.toggleTitle}>
            <Camera size={18} aria-hidden="true" />
            <span>
              {es
                ? 'Crear tarjeta visual o sellar foto de la fila'
                : 'Create visual status card or stamp a line photo'}
            </span>
            <span className={styles.badgeNew}>{es ? 'Nuevo' : 'New'}</span>
          </div>
          <p className={styles.toggleHint}>
            {es
              ? 'Descarga una imagen para WhatsApp, grupos de Facebook, Stories o TikTok con los datos oficiales de CBP.'
              : 'Make a shareable image for WhatsApp, Facebook groups, Stories, or TikTok with official CBP data.'}
          </p>
        </div>
        {open ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.previewWrap}>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={es ? `Vista previa de tarjeta para ${displayName}` : `Share card preview for ${displayName}`}
              className={styles.canvas}
            />
          </div>

          <div className={styles.controls}>
            <div>
              <span className={styles.groupLabel}>{es ? 'Formato' : 'Format'}</span>
              <div className={styles.chipRow} role="group" aria-label={es ? 'Formato de tarjeta' : 'Card format'}>
                {Object.entries(FORMATS).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={format === key}
                    onClick={() => setFormat(key)}
                    className={`${styles.chip} ${format === key ? styles.chipActive : ''}`}
                  >
                    {cfg.label[es ? 'es' : 'en']}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={styles.groupLabel}>{es ? 'Foto opcional de la fila' : 'Optional line photo'}</span>
              <div className={styles.chipRow}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  id="bp-photo-stamp-input"
                  onChange={handlePhotoChange}
                  className={styles.fileInput}
                />
                <label htmlFor="bp-photo-stamp-input" className={styles.secondaryBtn}>
                  <ImagePlus size={16} aria-hidden="true" />
                  <span>{photoImg ? (es ? 'Cambiar foto' : 'Change photo') : (es ? 'Agregar foto de la fila' : 'Add line photo')}</span>
                </label>
                {photoImg && (
                  <button type="button" onClick={clearPhoto} className={styles.secondaryBtn}>
                    <Trash2 size={16} aria-hidden="true" />
                    <span>{es ? 'Quitar foto' : 'Remove photo'}</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className={styles.groupLabel}>{es ? 'Etiqueta rápida (opcional)' : 'Quick line note (optional)'}</span>
              <div className={styles.chipRow} role="group" aria-label={es ? 'Etiqueta de la fila' : 'Line condition note'}>
                {QUICK_TAGS.map((tag) => {
                  const active = noteTag === tag.id;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setNoteTag((prev) => (prev === tag.id ? '' : tag.id))}
                      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                    >
                      {tag[es ? 'es' : 'en']}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.chipRow}>
              <button type="button" onClick={shareImage} className={styles.primaryBtn}>
                <Share2 size={16} aria-hidden="true" />
                <span>{es ? 'Compartir imagen' : 'Share image'}</span>
              </button>
              <button type="button" onClick={downloadImage} className={styles.secondaryBtn}>
                <Download size={16} aria-hidden="true" />
                <span>{es ? 'Descargar PNG' : 'Download PNG'}</span>
              </button>
            </div>

            <p className={styles.privacyNote}>
              {es
                ? 'Tu foto se queda en tu dispositivo. BorderPulse nunca sube ni guarda tu imagen.'
                : 'Photos stay on your device. BorderPulse never uploads or stores your image.'}
            </p>
            <p role="status" className={styles.status}>{status}</p>
          </div>
        </div>
      )}
    </section>
  );
}
