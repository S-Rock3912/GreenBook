import { PALETTE, STROKE_WIDTHS, useEditorStore } from '../stores/editorStore';
import type { Tool } from '../types';

const TOOLS: { tool: Tool; label: string; icon: JSX.Element }[] = [
  {
    tool: 'pen',
    label: 'ペン',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" />
      </svg>
    ),
  },
  {
    tool: 'line',
    label: '直線',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M5 19L19 5" />
      </svg>
    ),
  },
  {
    tool: 'arrow',
    label: '矢印',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 19L19 5M19 5h-8M19 5v8" />
      </svg>
    ),
  },
  {
    tool: 'rect',
    label: '四角',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="5" width="16" height="14" rx="1" />
      </svg>
    ),
  },
  {
    tool: 'ellipse',
    label: '円',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="12" rx="8" ry="7" />
      </svg>
    ),
  },
  {
    tool: 'text',
    label: '文字',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M5 6V4h14v2M12 4v16M9 20h6" />
      </svg>
    ),
  },
  {
    tool: 'eraser',
    label: '消す',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 20l-5-5L14 4l6 6-9 10H8zM6 12l6 6" />
      </svg>
    ),
  },
];

export default function Toolbar() {
  const { tool, color, strokeWidth, setTool, setColor, setStrokeWidth } =
    useEditorStore();

  return (
    <div className="toolbar">
      <div className="toolbar-row tools">
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            className={`tool-btn ${tool === t.tool ? 'active' : ''}`}
            onClick={() => setTool(t.tool)}
            aria-label={t.label}
            aria-pressed={tool === t.tool}
          >
            {t.icon}
            <span className="tool-label">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="toolbar-row options">
        <div className="color-swatches">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`swatch ${color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`色 ${c}`}
            />
          ))}
        </div>
        <div className="width-options">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              className={`width-btn ${strokeWidth === w ? 'active' : ''}`}
              onClick={() => setStrokeWidth(w)}
              aria-label={`線の太さ ${w}`}
            >
              <span
                className="width-dot"
                style={{ width: w + 4, height: w + 4 }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
