/* ============================================================
   FOCUZ — icon set (simple line icons, lucide-style)
   ============================================================ */
const ICON_PATHS = {
  search:   '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  filter:   '<path d="M3 5h18M6 12h12M10 19h4"/>',
  cart:     '<circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.5 3h2l2.2 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21.5 7H6"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  lock:     '<rect x="4.5" y="11" width="15" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  user:     '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>',
  chevron:  '<path d="m6 9 6 6 6-6"/>',
  chevronR: '<path d="m9 6 6 6-6 6"/>',
  sun:      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:     '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  trash:    '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>',
  edit:     '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  x:        '<path d="M18 6 6 18M6 6l12 12"/>',
  menu:     '<path d="M3 6h18M3 12h18M3 18h18"/>',
  check:    '<path d="M20 6 9 17l-5-5"/>',
  star:     '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.4 6.1 21l1.2-6.5L2.5 9.9l6.6-.9z"/>',
  image:    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-5-5L5 21"/>',
  link:     '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  spark:    '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',
  bolt:     '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  grid:     '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  layout:   '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
  box:      '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  tag:      '<path d="M3 11V5a2 2 0 0 1 2-2h6l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  arrowDown:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  trend:    '<path d="M3 17l6-6 4 4 8-8M21 7v5h-5"/>',
  globe:    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
  shield:   '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  sliders:  '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
};

function Icon({ name, size = 20, stroke = 2, fill = 'none', style, className }) {
  const d = ICON_PATHS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className} dangerouslySetInnerHTML={{ __html: d }} />
  );
}

window.Icon = Icon;
