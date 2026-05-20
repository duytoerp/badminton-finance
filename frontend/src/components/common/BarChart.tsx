interface Point { label: string; values: number[]; }
interface Props {
  data: Point[];
  series: { name: string; color: string }[];
  height?: number;
  formatY?: (v: number) => string;
}

export default function BarChart({ data, series, height = 240, formatY }: Props) {
  const W = 600, H = height, padX = 40, padY = 28;
  const maxVal = Math.max(1, ...data.flatMap(p => p.values));
  const niceMax = Math.ceil(maxVal / 1000) * 1000 || maxVal;
  const groupWidth = (W - padX * 2) / Math.max(1, data.length);
  const barWidth = (groupWidth - 12) / series.length;
  const yScale = (v: number) => H - padY - ((v / niceMax) * (H - padY * 2));
  const fmt = formatY || ((v: number) => v.toLocaleString('vi-VN'));

  const gridLines = 4;
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* grid */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = padY + (i * (H - padY * 2) / gridLines);
          const v = niceMax * (1 - i / gridLines);
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#e2e8f0" strokeDasharray={i === gridLines ? '' : '3 3'} />
              <text x={padX - 6} y={y + 4} fontSize="10" textAnchor="end" fill="#94a3b8">{fmt(v)}</text>
            </g>
          );
        })}
        {/* bars */}
        {data.map((p, i) => {
          const gx = padX + i * groupWidth + 6;
          return (
            <g key={i}>
              {p.values.map((v, si) => {
                const x = gx + si * barWidth;
                const y = yScale(v);
                return (
                  <rect key={si} x={x} y={y} width={barWidth - 2} height={H - padY - y}
                        fill={series[si].color} rx={3}>
                    <title>{`${series[si].name}: ${fmt(v)}`}</title>
                  </rect>
                );
              })}
              <text x={gx + (groupWidth - 12) / 2} y={H - 8} fontSize="11" textAnchor="middle" fill="#64748b">{p.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        {series.map((s, i) => (
          <span key={i}><span className="dot" style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
    </div>
  );
}
