/**
 * Interactive SVG Chart Renderer for Algorithm Comparison
 * Renders WT & TAT comparison bars with modern styling and responsive tooltips.
 */

class SchedulingChart {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  renderComparison(data) {
    if (!this.container) return;
    // data: [{ name: 'FCFS', wt: 3.75, tat: 6.50 }, { name: 'SJF', wt: 3.00, tat: 5.75 }, { name: 'RR (q=2)', wt: 4.25, tat: 7.00 }]
    const maxVal = Math.max(...data.map(d => Math.max(d.wt, d.tat)), 1) * 1.25;

    // Dimensions
    const width = 680;
    const height = 300;
    const padding = { top: 35, right: 30, bottom: 45, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const groupWidth = chartW / data.length;
    const barWidth = Math.min(38, groupWidth * 0.35);

    // Y ticks
    const tickCount = 5;
    let yTicksHtml = '';
    for (let i = 0; i <= tickCount; i++) {
      const val = (maxVal / tickCount) * i;
      const y = padding.top + chartH - (val / maxVal) * chartH;
      yTicksHtml += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border-color, #e2e8f0)" stroke-dasharray="4,4" opacity="0.6"/>
        <text x="${padding.left - 10}" y="${y + 4}" font-size="11" fill="var(--text-muted, #64748b)" text-anchor="end">${val.toFixed(1)}</text>
      `;
    }

    // Bars
    let barsHtml = '';
    data.forEach((item, idx) => {
      const groupCenter = padding.left + idx * groupWidth + groupWidth / 2;
      const xWt = groupCenter - barWidth - 4;
      const xTat = groupCenter + 4;

      const hWt = (item.wt / maxVal) * chartH;
      const yWt = padding.top + chartH - hWt;

      const hTat = (item.tat / maxVal) * chartH;
      const yTat = padding.top + chartH - hTat;

      const isMinWt = item.wt === Math.min(...data.map(d => d.wt));

      barsHtml += `
        <!-- Group: ${item.name} -->
        <g class="chart-bar-group" data-name="${item.name}">
          <!-- WT Bar -->
          <rect class="bar-wt" x="${xWt}" y="${yWt}" width="${barWidth}" height="${hWt}" rx="5" 
            fill="url(#grad-wt)" filter="drop-shadow(0 2px 4px rgba(99,102,241,0.25))">
            <title>${item.name} - Waiting Time: ${item.wt.toFixed(2)} หน่วย</title>
          </rect>
          <text x="${xWt + barWidth / 2}" y="${yWt - 6}" font-size="11" font-weight="700" fill="#4f46e5" text-anchor="middle">
            ${item.wt.toFixed(2)}
          </text>

          <!-- TAT Bar -->
          <rect class="bar-tat" x="${xTat}" y="${yTat}" width="${barWidth}" height="${hTat}" rx="5" 
            fill="url(#grad-tat)" filter="drop-shadow(0 2px 4px rgba(16,185,129,0.25))">
            <title>${item.name} - Turnaround Time: ${item.tat.toFixed(2)} หน่วย</title>
          </rect>
          <text x="${xTat + barWidth / 2}" y="${yTat - 6}" font-size="11" font-weight="700" fill="#059669" text-anchor="middle">
            ${item.tat.toFixed(2)}
          </text>

          <!-- X Label -->
          <text x="${groupCenter}" y="${height - padding.bottom + 22}" font-size="13" font-weight="700" 
            fill="var(--text-main, #1e293b)" text-anchor="middle">
            ${item.name} ${isMinWt ? '★' : ''}
          </text>
          ${isMinWt ? `<text x="${groupCenter}" y="${height - padding.bottom + 36}" font-size="10" font-weight="600" fill="#10b981" text-anchor="middle">(WT น้อยสุด)</text>` : ''}
        </g>
      `;
    });

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" style="width: 100%; height: auto; max-height: 320px;">
        <defs>
          <linearGradient id="grad-wt" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#818cf8"/>
            <stop offset="100%" stop-color="#4f46e5"/>
          </linearGradient>
          <linearGradient id="grad-tat" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
        </defs>

        <!-- Background grid lines -->
        ${yTicksHtml}

        <!-- Baseline -->
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="var(--border-color, #cbd5e1)" stroke-width="1.5"/>

        <!-- Bars -->
        ${barsHtml}
      </svg>
    `;

    this.container.innerHTML = svg;
  }

  renderQuantumExperiment(results) {
    // results: [{ q: 1, wt: 4.5, tat: 7.2 }, { q: 2, wt: 4.25, tat: 7.0 }, ...]
    if (!this.container) return;
    const maxVal = Math.max(...results.map(r => Math.max(r.wt, r.tat)), 1) * 1.3;
    const width = 600;
    const height = 260;
    const padding = { top: 30, right: 30, bottom: 45, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const groupWidth = chartW / results.length;
    const barWidth = Math.min(32, groupWidth * 0.35);

    let barsHtml = '';
    results.forEach((item, idx) => {
      const groupCenter = padding.left + idx * groupWidth + groupWidth / 2;
      const xWt = groupCenter - barWidth - 3;
      const xTat = groupCenter + 3;

      const hWt = (item.wt / maxVal) * chartH;
      const yWt = padding.top + chartH - hWt;

      const hTat = (item.tat / maxVal) * chartH;
      const yTat = padding.top + chartH - hTat;

      barsHtml += `
        <g class="chart-bar-group">
          <rect x="${xWt}" y="${yWt}" width="${barWidth}" height="${hWt}" rx="4" fill="#6366f1"/>
          <text x="${xWt + barWidth / 2}" y="${yWt - 5}" font-size="11" font-weight="700" fill="#4f46e5" text-anchor="middle">${item.wt.toFixed(2)}</text>

          <rect x="${xTat}" y="${yTat}" width="${barWidth}" height="${hTat}" rx="4" fill="#10b981"/>
          <text x="${xTat + barWidth / 2}" y="${yTat - 5}" font-size="11" font-weight="700" fill="#059669" text-anchor="middle">${item.tat.toFixed(2)}</text>

          <text x="${groupCenter}" y="${height - padding.bottom + 20}" font-size="12" font-weight="700" fill="var(--text-main, #1e293b)" text-anchor="middle">q = ${item.q}</text>
        </g>
      `;
    });

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" style="width: 100%; height: auto; max-height: 280px;">
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
        ${barsHtml}
      </svg>
    `;
    this.container.innerHTML = svg;
  }
}
