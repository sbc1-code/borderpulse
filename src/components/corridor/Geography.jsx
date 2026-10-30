import React, { useEffect, useRef } from "react";

export default function Geography({ geo, label }) {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const { width: w, height: h } = c.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = w * dpr;
      c.height = h * dpr;
      const ctx = c.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      const x = (lon) => ((lon + 117.15) / 0.29) * w,
        y = (lat) => (((w < 700 ? 32.69 : 32.66) - lat) / 0.24) * h;
      ctx.fillStyle = "#14252c";
      ctx.fillRect(0, 0, w, h);
      if (geo)
        for (const f of geo.features) {
          ctx.beginPath();
          for (const poly of f.geometry.coordinates) {
            for (const ring of poly) {
              ring.forEach(([lon, lat], i) =>
                i ? ctx.lineTo(x(lon), y(lat)) : ctx.moveTo(x(lon), y(lat)),
              );
              ctx.closePath();
            }
          }
          ctx.fillStyle =
            f.properties["ISO3166-1-Alpha-2"] === "US" ? "#25332f" : "#2d3430";
          ctx.fill();
          ctx.strokeStyle = "#5b6458";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      ctx.strokeStyle = "rgba(179,197,182,.075)";
      ctx.lineWidth = 1;
      for (let lon = -117.15; lon <= -116.85; lon += 0.025) {
        ctx.beginPath();
        ctx.moveTo(x(lon), 0);
        ctx.lineTo(x(lon), h);
        ctx.stroke();
      }
      for (let lat = 32.42; lat <= 32.67; lat += 0.025) {
        ctx.beginPath();
        ctx.moveTo(0, y(lat));
        ctx.lineTo(w, y(lat));
        ctx.stroke();
      }
      // Country boundary is traced from the source polygons, rather than invented road or queue geometry.
      if (geo) {
        const mex = geo.features.find(
          (f) => f.properties["ISO3166-1-Alpha-2"] === "MX",
        );
        ctx.beginPath();
        for (const poly of mex.geometry.coordinates) {
          const line = poly[0].filter(
            ([lon, lat]) => lat > 32.52 && lon > -117.14 && lon < -116.85,
          );
          line.forEach(([lon, lat], i) =>
            i ? ctx.lineTo(x(lon), y(lat)) : ctx.moveTo(x(lon), y(lat)),
          );
        }
        ctx.strokeStyle = "#b9a781";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(c);
    return () => observer.disconnect();
  }, [geo]);
  return (
    <canvas className="geography" ref={ref} aria-label={label} role="img" />
  );
}
