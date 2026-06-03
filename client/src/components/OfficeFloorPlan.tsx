import { MAP_WIDTH, MAP_HEIGHT } from "../types";

/** 壁・外周の余白（アバター移動範囲と一致） */
export const MAP_PADDING = 36;

type Rect = { x: number; y: number; w: number; h: number; label?: string };

function Room({
  x,
  y,
  w,
  h,
  fill,
  stroke = "#94a3b8",
  label,
  rx = 4,
}: Rect & { fill: string; stroke?: string; rx?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.5} rx={rx} />
      {label && (
        <text x={x + w / 2} y={y + 18} textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">
          {label}
        </text>
      )}
    </g>
  );
}

function MeetingTableShape({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) {
  const chairs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4} fill="#a67c52" stroke="#8b6914" strokeWidth={1} />
      {chairs.map(([dx, dy], i) => (
        <circle
          key={i}
          cx={cx + dx * (w / 2 + 14)}
          cy={cy + dy * (h / 2 + 14)}
          r={7}
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

function DeskBlock({
  x,
  y,
  w,
  h,
  chairs,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  chairs: number;
}) {
  const chairR = 6;
  const gap = w / (chairs + 1);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill="#a67c52" stroke="#8b6914" strokeWidth={1} />
      {Array.from({ length: chairs }, (_, i) => (
        <circle
          key={i}
          cx={x + gap * (i + 1)}
          cy={y - 12}
          r={chairR}
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: chairs }, (_, i) => (
        <circle
          key={`b-${i}`}
          cx={x + gap * (i + 1)}
          cy={y + h + 12}
          r={chairR}
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

function WindowDeskRow({
  x,
  y,
  w,
  h,
  count,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
}) {
  const step = h / (count + 1);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill="#a67c52" stroke="#8b6914" strokeWidth={1} />
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={x - 12}
          cy={y + step * (i + 1)}
          r={6}
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

export function OfficeFloorPlan() {
  const W = MAP_WIDTH;
  const H = MAP_HEIGHT;

  return (
    <>
      <defs>
        <pattern id="wood-floor" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#d4b896" />
          <line x1="0" y1="24" x2="24" y2="24" stroke="#c4a574" strokeWidth="0.5" />
          <line x1="24" y1="0" x2="24" y2="24" stroke="#b8956a" strokeWidth="0.5" opacity="0.4" />
        </pattern>
        <pattern id="carpet-grey" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#8b939c" />
          <circle cx="4" cy="4" r="1" fill="#7a828a" opacity="0.5" />
          <circle cx="12" cy="12" r="1" fill="#9aa3ac" opacity="0.4" />
        </pattern>
        <pattern id="carpet-warm" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#9a8f84" />
          <circle cx="8" cy="8" r="1.5" fill="#8a7f74" opacity="0.35" />
        </pattern>
      </defs>

      {/* 外壁 */}
      <rect x={0} y={0} width={W} height={H} fill="url(#wood-floor)" />
      <rect
        x={12}
        y={12}
        width={W - 24}
        height={H - 24}
        fill="none"
        stroke="#64748b"
        strokeWidth={6}
        rx={2}
      />

      {/* ── 上段: 会議室・応接 ── */}
      <Room x={28} y={28} w={148} h={152} fill="url(#carpet-warm)" label="応接" />
      <MeetingTableShape cx={102} cy={108} w={56} h={36} />

      <Room x={188} y={28} w={118} h={152} fill="url(#carpet-grey)" label="会議室 A" />
      <MeetingTableShape cx={247} cy={108} w={48} h={32} />

      <Room x={318} y={28} w={118} h={152} fill="url(#carpet-grey)" label="会議室 B" />
      <MeetingTableShape cx={377} cy={108} w={48} h={32} />

      <Room x={448} y={28} w={118} h={152} fill="url(#carpet-grey)" label="会議室 C" />
      <MeetingTableShape cx={507} cy={108} w={48} h={32} />

      <Room x={578} y={28} w={794} h={152} fill="url(#carpet-warm)" label="役員室・ラウンジ" rx={6} />
      <rect x={620} y={70} width={120} height={48} rx={4} fill="#a67c52" stroke="#8b6914" strokeWidth={1} />
      <rect x={780} y={55} width={200} height={90} rx={8} fill="#94a3b8" opacity={0.35} />
      <text x={880} y={108} textAnchor="middle" fontSize="10" fill="#64748b">
        ソファエリア
      </text>

      {/* 区画壁（ガラス風） */}
      {[188, 318, 448, 578].map((x) => (
        <line key={x} x1={x} y1={28} x2={x} y2={180} stroke="#7dd3fc" strokeWidth={2} opacity={0.6} />
      ))}
      <line x1={28} y1={180} x2={1372} y2={180} stroke="#94a3b8" strokeWidth={2} />

      {/* ── 左: キッチン・ラウンジ ── */}
      <Room x={28} y={196} w={300} h={668} fill="#e8dfd4" stroke="#c4b5a0" label="ラウンジ" rx={6} />
      <text x={48} y={228} fontSize="10" fill="#78716c">
        KITCHEN
      </text>
      <rect x={48} y={238} width={80} height={48} rx={4} fill="#cbd5e1" stroke="#94a3b8" />

      <circle cx={120} cy={340} r={36} fill="none" stroke="#a67c52" strokeWidth={8} />
      <circle cx={120} cy={340} r={8} fill="#4ade80" />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={120 + Math.cos(a) * 52}
            cy={340 + Math.sin(a) * 52}
            r={7}
            fill="#f8fafc"
            stroke="#cbd5e1"
          />
        );
      })}

      <rect x={48} y={400} width={200} height={28} rx={4} fill="#a67c52" stroke="#8b6914" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={68 + i * 32} cy={448} r={6} fill="#f8fafc" stroke="#cbd5e1" />
      ))}

      <rect x={48} y={500} width={100} height={40} rx={20} fill="#94a3b8" opacity={0.5} />
      <circle cx={200} cy={540} r={22} fill="#86efac" opacity={0.7} />
      <circle cx={200} cy={540} r={10} fill="#a67c52" />

      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={48 + i * 72} y={600} width={48} height={36} rx={12} fill="#d6b88a" stroke="#a67c52" />
          <circle cx={72 + i * 72} cy={652} r={14} fill="#ca8a04" opacity={0.6} />
        </g>
      ))}

      {/* 観葉植物 */}
      {[
        [260, 260],
        [280, 520],
        [80, 680],
      ].map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={10} fill="#4ade80" stroke="#16a34a" strokeWidth={1} />
      ))}

      {/* ── 中央: オープンデスク ── */}
      <rect
        x={348}
        y={200}
        width={748}
        height={480}
        rx={24}
        fill="url(#carpet-grey)"
        stroke="#6b7280"
        strokeWidth={2}
      />
      <text x={722} y={228} textAnchor="middle" fontSize="12" fontWeight="600" fill="#e2e8f0">
        オープンワークスペース
      </text>

      <DeskBlock x={420} y={280} w={280} h={44} chairs={6} />
      <DeskBlock x={420} y={400} w={280} h={44} chairs={6} />
      <DeskBlock x={420} y={520} w={280} h={44} chairs={6} />

      <DeskBlock x={780} y={280} w={280} h={44} chairs={6} />
      <DeskBlock x={780} y={400} w={280} h={44} chairs={6} />
      <DeskBlock x={780} y={520} w={280} h={44} chairs={6} />

      {/* ── 右: 窓際デスク ── */}
      <rect x={1120} y={200} width={252} height={620} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} rx={4} />
      <text x={1246} y={224} textAnchor="middle" fontSize="10" fill="#64748b">
        窓際席
      </text>
      <WindowDeskRow x={1180} y={248} w={36} h={520} count={7} />

      {/* 窓の表現 */}
      <rect x={1360} y={200} width={16} height={620} fill="#bae6fd" opacity={0.5} />

      {/* ── 下: 個人ブース・複合機 ── */}
      <line x1={348} y1={700} x2={1120} y2={700} stroke="#94a3b8" strokeWidth={2} />

      <text x={380} y={728} fontSize="10" fill="#64748b">
        複合機
      </text>
      <rect x={380} y={738} width={48} height={40} rx={4} fill="#e2e8f0" stroke="#94a3b8" />

      <Room x={520} y={712} w={100} h={88} fill="url(#carpet-grey)" label="ブース 1" />
      <Room x={640} y={712} w={100} h={88} fill="url(#carpet-grey)" label="ブース 2" />
      <rect x={548} y={748} width={44} height={28} rx={2} fill="#64748b" />
      <rect x={668} y={748} width={44} height={28} rx={2} fill="#64748b" />

      <DeskBlock x={820} y={728} w={200} h={40} chairs={4} />
      <DeskBlock x={1060} y={728} w={120} h={40} chairs={2} />
    </>
  );
}
