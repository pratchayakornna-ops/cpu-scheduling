/**
 * Main Application Controller
 * Handles UI interactions, algorithm runs, practice checks, simulation playback, and printing
 */

// Application State
const state = {
  seed: 'OS-LAB-2026',
  taskCount: 5,
  quantum: 2,
  baseDate: new Date().toISOString().slice(0, 16),
  tasks: [],
  student: {
    name: '',
    id: '',
    group: '',
    instructor: '',
    date: new Date().toISOString().slice(0, 10)
  },
  hypotheses: {
    q1: '',
    q2: '',
    q3: ''
  },
  manualWork: {
    fcfs: {},
    sjf: {},
    rr: {}
  },
  results: null,
  simulator: null,
  chart: null,
  quantumChart: null,
  isDarkMode: false
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  initDateInputs();
  initTheme();
  initEventListeners();
  initStateFromUrlOrGenerate();
});

function initDateInputs() {
  const dateInput = document.getElementById('baseDateTime');
  const studentDate = document.getElementById('studentDate');
  if (dateInput) dateInput.value = state.baseDate;
  if (studentDate) studentDate.value = state.student.date;
}

function initTheme() {
  const savedTheme = localStorage.getItem('cpu_sched_theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    state.isDarkMode = true;
    document.body.classList.add('dark-mode');
    document.getElementById('themeIcon').textContent = '☀️';
  } else {
    state.isDarkMode = false;
    document.body.classList.remove('dark-mode');
    document.getElementById('themeIcon').textContent = '🌙';
  }
}

function toggleTheme() {
  state.isDarkMode = !state.isDarkMode;
  if (state.isDarkMode) {
    document.body.classList.add('dark-mode');
    document.getElementById('themeIcon').textContent = '☀️';
    localStorage.setItem('cpu_sched_theme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    document.getElementById('themeIcon').textContent = '🌙';
    localStorage.setItem('cpu_sched_theme', 'light');
  }
  // Re-render charts
  if (state.results) {
    renderCharts();
  }
}

function initStateFromUrlOrGenerate() {
  const params = new URLSearchParams(window.location.search);
  const urlSeed = params.get('seed');
  const urlQ = params.get('q');
  const urlCount = params.get('count');

  if (urlSeed) {
    state.seed = urlSeed;
    document.getElementById('seedInput').value = urlSeed;
  }
  if (urlQ) {
    state.quantum = parseInt(urlQ, 10) || 2;
    document.getElementById('quantumInput').value = state.quantum;
  }
  if (urlCount) {
    state.taskCount = parseInt(urlCount, 10) || 5;
    document.getElementById('taskCountSelect').value = state.taskCount;
  }

  // Load problem
  generateAndApplyProblem(state.seed, state.taskCount, state.quantum);
}

function generateAndApplyProblem(seed, count, quantum) {
  state.seed = seed;
  state.taskCount = count;
  state.quantum = quantum;

  const generated = generateProblem(seed, count, quantum);
  state.tasks = generated.tasks;

  updateInputsUI();
  runCalculations();
}

function updateInputsUI() {
  document.getElementById('seedInput').value = state.seed;
  document.getElementById('taskCountSelect').value = state.taskCount;
  document.getElementById('quantumInput').value = state.quantum;
  document.querySelectorAll('.badge-q-text').forEach(el => el.textContent = state.quantum);
  const qSummary = document.getElementById('summaryQ');
  if (qSummary) qSummary.textContent = state.quantum;
  const rrQDisplay = document.getElementById('rrQDisplay');
  if (rrQDisplay) rrQDisplay.textContent = state.quantum;
  const simQText = document.getElementById('simQText');
  if (simQText) simQText.textContent = state.quantum;

  renderTasksTable();
}

function renderTasksTable() {
  const tbody = document.getElementById('tasksTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  state.tasks.forEach((t, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="task-id-badge pid-${t.id}">${t.id}</span></td>
      <td><input type="text" class="form-control task-name-input" data-index="${idx}" value="${t.name}"></td>
      <td><input type="number" class="form-control task-at-input" data-index="${idx}" min="0" max="10" value="${t.at}"></td>
      <td><input type="number" class="form-control task-bt-input" data-index="${idx}" min="1" max="8" value="${t.bt}"></td>
      <td><button class="btn btn-ghost btn-sm btn-delete-task" data-index="${idx}" title="ลบงาน">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Attach event listeners for inline task editing
  tbody.querySelectorAll('.task-name-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      state.tasks[idx].name = e.target.value.trim() || `วิชา ${idx + 1}`;
      runCalculations();
    });
  });

  tbody.querySelectorAll('.task-at-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      state.tasks[idx].at = parseInt(e.target.value, 10) || 0;
      runCalculations();
    });
  });

  tbody.querySelectorAll('.task-bt-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      state.tasks[idx].bt = parseInt(e.target.value, 10) || 1;
      runCalculations();
    });
  });

  tbody.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (state.tasks.length <= 2) {
        alert('ต้องมีงานอย่างน้อย 2 งาน');
        return;
      }
      const idx = parseInt(e.target.dataset.index, 10);
      state.tasks.splice(idx, 1);
      // Re-index task IDs
      state.tasks.forEach((t, i) => t.id = `P${i + 1}`);
      state.taskCount = state.tasks.length;
      document.getElementById('taskCountSelect').value = state.taskCount;
      renderTasksTable();
      runCalculations();
    });
  });
}

function runCalculations() {
  const valAlert = document.getElementById('validationAlert');
  const res = runAllAlgorithms(state.tasks, state.quantum);

  if (!res.success) {
    if (valAlert) {
      valAlert.style.display = 'block';
      valAlert.innerHTML = `<strong>⚠️ ข้อมูลไม่ถูกต้อง:</strong><br>${res.errors.join('<br>')}`;
    }
    return;
  }

  if (valAlert) {
    valAlert.style.display = 'none';
  }

  state.results = res;
  renderResultsSummary(res);
  renderGanttChart('fcfs', res.fcfs);
  renderGanttChart('sjf', res.sjf);
  renderGanttChart('rr', res.rr);
  renderResultsTables(res);
  renderRoundRobinLog(res.rr.roundRobinLog);
  renderCharts();
  renderPracticeInputs();
  initSimulatorEngine();
}

function renderResultsSummary(res) {
  // Stats cards
  document.getElementById('fcfsAvgWt').textContent = res.fcfs.avgWt.toFixed(2);
  document.getElementById('fcfsAvgTat').textContent = res.fcfs.avgTat.toFixed(2);
  document.getElementById('sjfAvgWt').textContent = res.sjf.avgWt.toFixed(2);
  document.getElementById('sjfAvgTat').textContent = res.sjf.avgTat.toFixed(2);
  document.getElementById('rrAvgWt').textContent = res.rr.avgWt.toFixed(2);
  document.getElementById('rrAvgTat').textContent = res.rr.avgTat.toFixed(2);

  // Headers
  document.getElementById('fcfsTatDisplay').textContent = res.fcfs.avgTat.toFixed(2);
  document.getElementById('fcfsWtDisplay').textContent = res.fcfs.avgWt.toFixed(2);
  document.getElementById('sjfTatDisplay').textContent = res.sjf.avgTat.toFixed(2);
  document.getElementById('sjfWtDisplay').textContent = res.sjf.avgWt.toFixed(2);
  document.getElementById('rrTatDisplay').textContent = res.rr.avgTat.toFixed(2);
  document.getElementById('rrWtDisplay').textContent = res.rr.avgWt.toFixed(2);

  // Highlight Best
  ['cardFcfsSummary', 'cardSjfSummary', 'cardRrSummary'].forEach(id => {
    document.getElementById(id).classList.remove('best');
  });

  const bestAlgo = res.analysis.bestAlgo;
  if (bestAlgo === 'FCFS') document.getElementById('cardFcfsSummary').classList.add('best');
  else if (bestAlgo === 'SJF') document.getElementById('cardSjfSummary').classList.add('best');
  else if (bestAlgo === 'RR') document.getElementById('cardRrSummary').classList.add('best');

  // Textual Analysis
  const noteEl = document.getElementById('analysisNote');
  if (noteEl) {
    let text = `💡 <strong>บทวิเคราะห์จากผลการทดลอง:</strong> อัลกอริทึมที่ให้เวลารอเฉลี่ยต่ำที่สุดคือ <strong>${bestAlgo} (${res.analysis.minWt.toFixed(2)} หน่วย)</strong> `;
    if (bestAlgo === 'SJF') {
      text += `เนื่องจาก SJF ให้ความสำคัญกับงานที่ใช้เวลาสั้นที่สุดก่อน จึงลดเวลารอของงานส่วนใหญ่ลงได้มากที่สุดตามทฤษฎี`;
    } else if (bestAlgo === 'FCFS') {
      text += `เนื่องจากลำดับการมาถึงสอดคล้องกับขนาดงานพอดี ทำให้เกิด Convoy Effect น้อย`;
    } else {
      text += `เนื่องจากการแบ่งรอบ (Time Quantum = ${state.quantum}) ช่วยให้งานสั้นสลับเข้าไปทำงานได้เร็วขึ้น`;
    }
    noteEl.innerHTML = text;
  }
}

function renderGanttChart(prefix, scheduleData) {
  const barContainer = document.getElementById(`${prefix}GanttBar`);
  const timeContainer = document.getElementById(`${prefix}GanttTime`);
  if (!barContainer || !timeContainer) return;

  barContainer.innerHTML = '';
  timeContainer.innerHTML = '';

  const totalTime = scheduleData.totalTime || 1;
  const gantt = scheduleData.gantt;

  // Render Bar Blocks
  gantt.forEach((block) => {
    const duration = block.end - block.start;
    const widthPct = (duration / totalTime) * 100;

    const blockDiv = document.createElement('div');
    blockDiv.className = `gantt-block ${block.isIdle ? 'idle-block' : ''}`;
    blockDiv.style.width = `${widthPct}%`;

    if (!block.isIdle) {
      blockDiv.style.backgroundColor = `var(--${block.processId.toLowerCase()}-color, #4f46e5)`;
    }

    blockDiv.title = block.isIdle 
      ? `CPU ว่าง (Idle): ${block.start} - ${block.end} (${duration} ชม.)`
      : `${block.processId} (${block.name})\nช่วง: ${block.start} - ${block.end}\nใช้เวลา: ${duration} ชม.${block.remainingAfter !== undefined ? `\nเหลือ: ${block.remainingAfter} ชม.` : ''}`;

    blockDiv.innerHTML = `
      <span class="block-label">${block.processId}</span>
      <span class="block-sub">${duration > 1 ? block.name.slice(0, 10) : ''}</span>
    `;

    barContainer.appendChild(blockDiv);
  });

  // Render Time Ticks
  const timePoints = new Set([0]);
  gantt.forEach(b => {
    timePoints.add(b.start);
    timePoints.add(b.end);
  });

  const sortedPoints = Array.from(timePoints).sort((a, b) => a - b);
  sortedPoints.forEach(pt => {
    const leftPct = (pt / totalTime) * 100;
    const tick = document.createElement('div');
    tick.className = 'gantt-time-tick';
    tick.style.left = `${leftPct}%`;
    tick.textContent = pt;
    timeContainer.appendChild(tick);
  });
}

function renderResultsTables(res) {
  ['fcfs', 'sjf', 'rr'].forEach(algo => {
    const tbody = document.getElementById(`${algo}TableBody`);
    if (!tbody) return;
    const data = res[algo].table;

    tbody.innerHTML = '';
    data.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="task-id-badge pid-${t.id}">${t.id}</span></td>
        <td><strong>${t.name}</strong></td>
        <td>${t.at}</td>
        <td>${t.bt}</td>
        <td><strong>${t.ct}</strong></td>
        <td>${t.tat}</td>
        <td>${t.wt}</td>
      `;
      tbody.appendChild(tr);
    });

    // Summary Row
    const trSummary = document.createElement('tr');
    trSummary.className = 'total-row';
    trSummary.innerHTML = `
      <td colspan="4" style="text-align: right;">ค่าเฉลี่ย (Average):</td>
      <td>-</td>
      <td><strong style="color:var(--primary);">${res[algo].avgTat.toFixed(2)}</strong></td>
      <td><strong style="color:var(--primary);">${res[algo].avgWt.toFixed(2)}</strong></td>
    `;
    tbody.appendChild(trSummary);
  });
}

function renderRoundRobinLog(log) {
  const tbody = document.getElementById('rrLogTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  log.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.interval}</strong></td>
      <td><span class="task-id-badge pid-${item.processId}">${item.processId}</span></td>
      <td>${item.name}</td>
      <td><span class="badge ${item.remaining === 0 ? 'badge-success' : 'badge-warning'}">${item.remaining} หน่วย ${item.remaining === 0 ? '(เสร็จสมบูรณ์)' : ''}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCharts() {
  if (!state.chart) {
    state.chart = new SchedulingChart('comparisonChartContainer');
  }
  if (!state.quantumChart) {
    state.quantumChart = new SchedulingChart('quantumExperimentContainer');
  }

  if (state.results) {
    state.chart.renderComparison(state.results.analysis.wtComparison);
    renderQuantumSensitivity();
  }
}

function renderQuantumSensitivity() {
  const results = [];
  const tbody = document.getElementById('quantumExpTableBody');
  if (tbody) tbody.innerHTML = '';

  for (let q = 1; q <= 4; q++) {
    const schedule = scheduleRR(state.tasks, q);
    results.push({
      q,
      wt: schedule.avgWt,
      tat: schedule.avgTat,
      slices: schedule.gantt.filter(g => !g.isIdle).length
    });

    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>q = ${q}</strong></td>
        <td>${schedule.avgTat.toFixed(2)}</td>
        <td>${schedule.avgWt.toFixed(2)}</td>
        <td>${schedule.gantt.filter(g => !g.isIdle).length} ครั้ง</td>
      `;
      tbody.appendChild(tr);
    }
  }

  if (state.quantumChart) {
    state.quantumChart.renderQuantumExperiment(results);
  }
}

// -------------------------------------------------------------
// Simulator Engine Integration
// -------------------------------------------------------------
function initSimulatorEngine() {
  const algo = document.getElementById('simAlgoSelect').value;
  state.simulator = new SimulationEngine(state.tasks, algo, state.quantum);

  const scrubber = document.getElementById('simScrubber');
  const counter = document.getElementById('simFrameCounter');
  if (scrubber && state.simulator.frames.length > 0) {
    scrubber.max = state.simulator.frames.length - 1;
    scrubber.value = 0;
  }
  if (counter) {
    counter.textContent = `0 / ${state.simulator.frames.length - 1}`;
  }

  state.simulator.onFrameChange = (frame, index, total) => {
    updateSimulatorUI(frame, index, total);
  };

  // Render initial frame 0
  updateSimulatorUI(state.simulator.getCurrentFrame(), 0, state.simulator.frames.length);
}

function updateSimulatorUI(frame, index, total) {
  if (!frame) return;

  const scrubber = document.getElementById('simScrubber');
  const counter = document.getElementById('simFrameCounter');
  if (scrubber) scrubber.value = index;
  if (counter) counter.textContent = `${index} / ${total - 1}`;

  document.getElementById('simCurrentTime').textContent = frame.time;
  document.getElementById('simEventMessage').textContent = frame.message;

  const cpuBox = document.getElementById('simCpuBox');
  const statusEl = document.getElementById('simCpuStatus');
  const badgeEl = document.getElementById('simActiveProcessBadge');
  const subEl = document.getElementById('simActiveProcessSub');

  if (frame.isIdle) {
    cpuBox.classList.remove('active');
    statusEl.textContent = 'สถานะ: CPU ว่าง (Idle)';
    badgeEl.textContent = '- ว่าง (Idle) -';
    badgeEl.className = 'task-id-badge pid-IDLE';
    subEl.textContent = 'ไม่มีงานที่พร้อมทำในคิว';
  } else {
    cpuBox.classList.add('active');
    statusEl.textContent = `สถานะ: กำลังประมวลผล ${frame.currentTask.id}`;
    badgeEl.textContent = `${frame.currentTask.id} (${frame.currentTask.name})`;
    badgeEl.className = `task-id-badge pid-${frame.currentTask.id}`;
    subEl.textContent = `เหลือเวลาทำงาน: ${frame.currentTask.remainingBt} ชั่วโมง`;
  }

  // Update Ready Queue Chips
  const queueContainer = document.getElementById('simReadyQueueChips');
  const queueCount = document.getElementById('simQueueCount');
  if (queueContainer && queueCount) {
    queueCount.textContent = `${frame.readyQueue.length} งาน`;
    if (frame.readyQueue.length === 0) {
      queueContainer.innerHTML = '<span style="color: var(--text-light); font-size: 0.8rem;">ไม่มีงานในคิว (คิวว่าง)</span>';
    } else {
      queueContainer.innerHTML = frame.readyQueue.map((t, idx) => `
        <div class="queue-chip">
          <span style="font-size:0.7rem; color:var(--text-muted);">#${idx + 1}</span>
          <span class="task-id-badge pid-${t.id}">${t.id}</span>
          <span>${t.name.slice(0, 12)}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">(เหลือ ${t.remainingBt} ชม.)</span>
        </div>
      `).join('');
    }
  }

  // Update Completed Chips
  const compContainer = document.getElementById('simCompletedChips');
  if (compContainer) {
    if (frame.completed.length === 0) {
      compContainer.innerHTML = '<span style="color: var(--text-light); font-size: 0.8rem;">ยังไม่มีงานที่เสร็จ</span>';
    } else {
      compContainer.innerHTML = frame.completed.map(t => `
        <span class="badge badge-success">
          ${t.id}: CT=${t.ct} (TAT=${t.tat}, WT=${t.wt})
        </span>
      `).join('');
    }
  }
}

// -------------------------------------------------------------
// Practice Mode (Manual Calculation Sheets - Pages 6-9)
// -------------------------------------------------------------
function renderPracticeInputs() {
  ['fcfs', 'sjf', 'rr'].forEach(algo => {
    const tbody = document.getElementById(`practice${capitalize(algo)}TableBody`);
    if (!tbody) return;

    tbody.innerHTML = '';
    state.tasks.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="task-id-badge pid-${t.id}">${t.id}</span></td>
        <td><strong>${t.name}</strong></td>
        <td>${t.at}</td>
        <td>${t.bt}</td>
        <td><input type="number" class="form-control manual-input" id="manual_${algo}_${t.id}_ct" style="width: 75px;" placeholder="CT"></td>
        <td><input type="number" class="form-control manual-input" id="manual_${algo}_${t.id}_tat" style="width: 75px;" placeholder="TAT"></td>
        <td><input type="number" class="form-control manual-input" id="manual_${algo}_${t.id}_wt" style="width: 75px;" placeholder="WT"></td>
      `;
      tbody.appendChild(tr);
    });
  });
}

function checkManualPractice(algo) {
  if (!state.results) return;
  const groundTruth = state.results[algo].table;
  const feedbackEl = document.getElementById(`feedback${capitalize(algo)}`);

  let allFilled = true;
  let correctCount = 0;
  let totalFields = groundTruth.length * 3;
  const errors = [];

  let manualTatSum = 0;
  let manualWtSum = 0;

  groundTruth.forEach(t => {
    const ctInput = document.getElementById(`manual_${algo}_${t.id}_ct`);
    const tatInput = document.getElementById(`manual_${algo}_${t.id}_tat`);
    const wtInput = document.getElementById(`manual_${algo}_${t.id}_wt`);

    const userCt = parseInt(ctInput.value, 10);
    const userTat = parseInt(tatInput.value, 10);
    const userWt = parseInt(wtInput.value, 10);

    if (isNaN(userCt) || isNaN(userTat) || isNaN(userWt)) {
      allFilled = false;
    }

    // CT Check
    if (userCt === t.ct) {
      ctInput.className = 'form-control manual-input input-correct';
      correctCount++;
    } else {
      ctInput.className = 'form-control manual-input input-incorrect';
      errors.push(`${t.id} CT: กรอก ${isNaN(userCt) ? '-' : userCt} (เฉลยคือ ${t.ct})`);
    }

    // TAT Check
    if (userTat === t.tat) {
      tatInput.className = 'form-control manual-input input-correct';
      correctCount++;
      manualTatSum += userTat;
    } else {
      tatInput.className = 'form-control manual-input input-incorrect';
      errors.push(`${t.id} TAT: กรอก ${isNaN(userTat) ? '-' : userTat} (เฉลยคือ ${t.tat} จาก CT-AT = ${t.ct}-${t.at})`);
    }

    // WT Check
    if (userWt === t.wt) {
      wtInput.className = 'form-control manual-input input-correct';
      correctCount++;
      manualWtSum += userWt;
    } else {
      wtInput.className = 'form-control manual-input input-incorrect';
      errors.push(`${t.id} WT: กรอก ${isNaN(userWt) ? '-' : userWt} (เฉลยคือ ${t.wt} จาก TAT-BT = ${t.tat}-${t.bt})`);
    }
  });

  // Update summary table on Page 10 section
  const n = groundTruth.length;
  const manualAvgTat = (manualTatSum / n).toFixed(2);
  const manualAvgWt = (manualWtSum / n).toFixed(2);

  document.getElementById(`conc${capitalize(algo)}TatManual`).textContent = allFilled ? manualAvgTat : 'ยังกรอกไม่ครบ';
  document.getElementById(`conc${capitalize(algo)}TatProg`).textContent = state.results[algo].avgTat.toFixed(2);
  document.getElementById(`conc${capitalize(algo)}WtManual`).textContent = allFilled ? manualAvgWt : 'ยังกรอกไม่ครบ';
  document.getElementById(`conc${capitalize(algo)}WtProg`).textContent = state.results[algo].avgWt.toFixed(2);

  if (feedbackEl) {
    if (correctCount === totalFields) {
      feedbackEl.className = 'check-feedback success';
      feedbackEl.innerHTML = `<strong>🎉 ผลการตรวจ: ถูกต้อง 100% ครบทุกช่อง!</strong><br>คำนวณมือตรงกับโปรแกรมเป๊ะ (TAT เฉลี่ย = ${manualAvgTat}, WT เฉลี่ย = ${manualAvgWt})`;
    } else {
      feedbackEl.className = 'check-feedback error';
      feedbackEl.innerHTML = `<strong>⚠️ มีจุดที่ต่างจากโปรแกรม ${totalFields - correctCount} ช่อง:</strong><br>${errors.slice(0, 5).join('<br>')}${errors.length > 5 ? `<br>...และอีก ${errors.length - 5} จุด` : ''}`;
    }
  }
}

// -------------------------------------------------------------
// Printable Worksheet View Generator (Matching Assignment Form)
// -------------------------------------------------------------
function generatePrintableWorksheet() {
  const container = document.getElementById('printSheetContainer');
  if (!container || !state.results) return;

  const s = state.student;
  const res = state.results;

  container.innerHTML = `
    <div style="font-family: 'Prompt', sans-serif; padding: 20px; line-height: 1.5; color: #000;">
      <!-- Title -->
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 15px;">
        <h2 style="font-size: 1.3rem; margin: 0 0 5px 0;">ใบงานมินิโปรเจ็ควิชาระบบปฏิบัติการ</h2>
        <h3 style="font-size: 1.1rem; margin: 0 0 5px 0;">เว็บการจัดตารางงานส่วนบุคคล ด้วย CPU Scheduling</h3>
        <p style="font-size: 0.85rem; margin: 0;">FCFS • SJF • Round Robin (Time Quantum q = ${state.quantum})</p>
      </div>

      <!-- Student Info -->
      <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px; font-size: 0.9rem;">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px;">
          <div><strong>ชื่อและนามสกุล:</strong> ${s.name || '..........................................................'}</div>
          <div><strong>รหัสนักศึกษา:</strong> ${s.id || '...................................'}</div>
          <div><strong>กลุ่มเรียน:</strong> ${s.group || '..........................................................'}</div>
          <div><strong>วันที่ทดลอง:</strong> ${s.date || '...................................'}</div>
          <div><strong>ผู้สอน:</strong> ${s.instructor || '..........................................................'}</div>
          <div><strong>Seed:</strong> ${state.seed}</div>
        </div>
      </div>

      <!-- Section 5: Problem Table & Hypotheses -->
      <div style="margin-bottom: 15px;">
        <h4 style="font-size: 1rem; margin: 0 0 8px 0;">5. ข้อมูลโจทย์สุ่มและสมมติฐาน</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; border: 1px solid #000; margin-bottom: 10px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 5px;">Process</th>
              <th style="border: 1px solid #000; padding: 5px;">งานหรือวิชา</th>
              <th style="border: 1px solid #000; padding: 5px;">Arrival Time (AT)</th>
              <th style="border: 1px solid #000; padding: 5px;">Burst Time (BT)</th>
            </tr>
          </thead>
          <tbody>
            ${state.tasks.map(t => `
              <tr>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${t.id}</td>
                <td style="border: 1px solid #000; padding: 5px;">${t.name}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${t.at}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${t.bt}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="font-size: 0.85rem;">
          <p><strong>สมมติฐานข้อ 1 (WT น้อยสุด):</strong> ${document.getElementById('hypoQ1').value || '...................................................................................................................'}</p>
          <p><strong>สมมติฐานข้อ 2 (รอนานสุด):</strong> ${document.getElementById('hypoQ2').value || '...................................................................................................................'}</p>
          <p><strong>สมมติฐานข้อ 3 (ผลของ q):</strong> ${document.getElementById('hypoQ3').value || '...................................................................................................................'}</p>
        </div>
      </div>

      <!-- Section 6: FCFS -->
      <div style="margin-bottom: 15px; page-break-inside: avoid;">
        <h4 style="font-size: 1rem; margin: 0 0 5px 0;">6. ผลการจัดตาราง FCFS (First-Come, First-Served)</h4>
        <p style="font-size: 0.8rem; margin: 0 0 5px 0;">Gantt Chart:</p>
        <div style="display: flex; height: 32px; border: 1px solid #000; margin-bottom: 6px;">
          ${res.fcfs.gantt.map(g => `
            <div style="flex: ${g.duration}; border-right: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; background: ${g.isIdle ? '#ccc' : '#e0e7ff'};">
              ${g.processId} (${g.start}-${g.end})
            </div>
          `).join('')}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #000;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 4px;">Process</th>
              <th style="border: 1px solid #000; padding: 4px;">AT</th>
              <th style="border: 1px solid #000; padding: 4px;">BT</th>
              <th style="border: 1px solid #000; padding: 4px;">CT</th>
              <th style="border: 1px solid #000; padding: 4px;">TAT</th>
              <th style="border: 1px solid #000; padding: 4px;">WT</th>
            </tr>
          </thead>
          <tbody>
            ${res.fcfs.table.map(t => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.id}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.at}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.bt}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.ct}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.tat}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.wt}</td>
              </tr>
            `).join('')}
            <tr style="font-weight: bold; background: #fafafa;">
              <td colspan="4" style="border: 1px solid #000; padding: 4px; text-align: right;">ค่าเฉลี่ย:</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center;">${res.fcfs.avgTat.toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center;">${res.fcfs.avgWt.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 7: SJF -->
      <div style="margin-bottom: 15px; page-break-inside: avoid;">
        <h4 style="font-size: 1rem; margin: 0 0 5px 0;">7. ผลการจัดตาราง SJF (Shortest Job First - Non-preemptive)</h4>
        <p style="font-size: 0.8rem; margin: 0 0 5px 0;">Gantt Chart:</p>
        <div style="display: flex; height: 32px; border: 1px solid #000; margin-bottom: 6px;">
          ${res.sjf.gantt.map(g => `
            <div style="flex: ${g.duration}; border-right: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; background: ${g.isIdle ? '#ccc' : '#d1fae5'};">
              ${g.processId} (${g.start}-${g.end})
            </div>
          `).join('')}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #000;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 4px;">Process</th>
              <th style="border: 1px solid #000; padding: 4px;">AT</th>
              <th style="border: 1px solid #000; padding: 4px;">BT</th>
              <th style="border: 1px solid #000; padding: 4px;">CT</th>
              <th style="border: 1px solid #000; padding: 4px;">TAT</th>
              <th style="border: 1px solid #000; padding: 4px;">WT</th>
            </tr>
          </thead>
          <tbody>
            ${res.sjf.table.map(t => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.id}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.at}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.bt}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.ct}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.tat}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.wt}</td>
              </tr>
            `).join('')}
            <tr style="font-weight: bold; background: #fafafa;">
              <td colspan="4" style="border: 1px solid #000; padding: 4px; text-align: right;">ค่าเฉลี่ย:</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center;">${res.sjf.avgTat.toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center;">${res.sjf.avgWt.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 8: Round Robin -->
      <div style="margin-bottom: 15px; page-break-inside: avoid;">
        <h4 style="font-size: 1rem; margin: 0 0 5px 0;">8. ผลการจัดตาราง Round Robin (q = ${state.quantum} หน่วย)</h4>
        <p style="font-size: 0.8rem; margin: 0 0 5px 0;">Gantt Chart:</p>
        <div style="display: flex; height: 32px; border: 1px solid #000; margin-bottom: 6px;">
          ${res.rr.gantt.map(g => `
            <div style="flex: ${g.duration}; border-right: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; background: ${g.isIdle ? '#ccc' : '#fef3c7'};">
              ${g.processId} (${g.start}-${g.end})
            </div>
          `).join('')}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #000;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 4px;">Process</th>
              <th style="border: 1px solid #000; padding: 4px;">AT</th>
              <th style="border: 1px solid #000; padding: 4px;">BT</th>
              <th style="border: 1px solid #000; padding: 4px;">CT</th>
              <th style="border: 1px solid #000; padding: 4px;">TAT</th>
              <th style="border: 1px solid #000; padding: 4px;">WT</th>
            </tr>
          </thead>
          <tbody>
            ${res.rr.table.map(t => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.id}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.at}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.bt}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.ct}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.tat}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.wt}</td>
              </tr>
            `).join('')}
            <tr style="font-weight: bold; background: #fafafa;">
              <td colspan="4" style="border: 1px solid #000; padding: 4px; text-align: right;">ค่าเฉลี่ย:</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center;">${res.rr.avgTat.toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center;">${res.rr.avgWt.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 9: Summary & Signatures -->
      <div style="page-break-inside: avoid; margin-top: 15px;">
        <h4 style="font-size: 1rem; margin: 0 0 5px 0;">9. สรุปผลการทดลองเปรียบเทียบ</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; border: 1px solid #000; margin-bottom: 10px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 6px;">อัลกอริทึม</th>
              <th style="border: 1px solid #000; padding: 6px;">Turnaround Time เฉลี่ย</th>
              <th style="border: 1px solid #000; padding: 6px;">Waiting Time เฉลี่ย</th>
              <th style="border: 1px solid #000; padding: 6px;">การประเมิน</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>FCFS</strong></td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${res.fcfs.avgTat.toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${res.fcfs.avgWt.toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 6px;">ทำตามคิวตรงไปตรงมา</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>SJF</strong></td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${res.sjf.avgTat.toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${res.sjf.avgWt.toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 6px;">${res.analysis.bestAlgo === 'SJF' ? '★ เวลารอเฉลี่ยต่ำที่สุด' : 'ลดเวลารอของงานสั้น'}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>Round Robin (q=${state.quantum})</strong></td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${res.rr.avgTat.toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${res.rr.avgWt.toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 6px;">แบ่งเวลาเป็นธรรม ทุกงานได้เริ่มทำ</td>
            </tr>
          </tbody>
        </table>
        
        <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 0.85rem;">
          <div style="text-align: center; width: 45%;">
            ลงชื่อ ..................................................................... ผู้ทดลอง<br>
            ( ${s.name || '.....................................................................'} )
          </div>
          <div style="text-align: center; width: 45%;">
            ลงชื่อ ..................................................................... ผู้ตรวจ/อาจารย์<br>
            ( ..................................................................... )
          </div>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// Presets Loader
// -------------------------------------------------------------
function loadPresetKey(presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) return;

  if (preset.generator) {
    state.seed = preset.seed;
    state.taskCount = preset.count;
    state.quantum = preset.quantum;
    generateAndApplyProblem(state.seed, state.taskCount, state.quantum);
  } else {
    state.seed = preset.seed;
    state.quantum = preset.quantum;
    state.taskCount = preset.tasks.length;
    state.tasks = JSON.parse(JSON.stringify(preset.tasks));
    updateInputsUI();
    runCalculations();
  }

  // Close modal
  document.getElementById('presetsModal').classList.remove('active');
}

// -------------------------------------------------------------
// Event Listeners
// -------------------------------------------------------------
function initEventListeners() {
  // Theme Toggle
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');

      if (targetId === 'tab-results') {
        renderCharts();
      } else if (targetId === 'tab-simulator') {
        if (!state.simulator) initSimulatorEngine();
      }
    });
  });

  // Randomize Button
  document.getElementById('btnRandomize').addEventListener('click', () => {
    const newSeed = 'SEED-' + Math.floor(Math.random() * 90000 + 10000);
    const count = parseInt(document.getElementById('taskCountSelect').value, 10) || 5;
    const q = parseInt(document.getElementById('quantumInput').value, 10) || 2;
    generateAndApplyProblem(newSeed, count, q);
  });

  // Seed buttons
  document.getElementById('btnNewSeed').addEventListener('click', () => {
    const newSeed = 'SEED-' + Math.floor(Math.random() * 90000 + 10000);
    document.getElementById('seedInput').value = newSeed;
    generateAndApplyProblem(newSeed, state.taskCount, state.quantum);
  });

  document.getElementById('btnCopySeed').addEventListener('click', () => {
    navigator.clipboard.writeText(state.seed).then(() => {
      alert(`คัดลอก Seed: "${state.seed}" เรียบร้อยแล้ว`);
    });
  });

  document.getElementById('seedInput').addEventListener('change', (e) => {
    const newSeed = e.target.value.trim() || 'DEFAULT';
    generateAndApplyProblem(newSeed, state.taskCount, state.quantum);
  });

  // Quantum Input
  document.getElementById('quantumInput').addEventListener('change', (e) => {
    const q = parseInt(e.target.value, 10);
    state.quantum = q;
    runCalculations();
  });

  // Task Count Select
  document.getElementById('taskCountSelect').addEventListener('change', (e) => {
    const count = parseInt(e.target.value, 10);
    generateAndApplyProblem(state.seed, count, state.quantum);
  });

  // Add Task Button
  document.getElementById('btnAddTask').addEventListener('click', () => {
    if (state.tasks.length >= 8) {
      alert('จำนวนงานสูงสุดคือ 8 งาน');
      return;
    }
    const newId = `P${state.tasks.length + 1}`;
    const rng = new SeededRandom(state.seed + newId);
    state.tasks.push({
      id: newId,
      name: COURSE_SUBJECTS[rng.nextInt(0, COURSE_SUBJECTS.length - 1)],
      at: rng.nextInt(0, 10),
      bt: rng.nextInt(1, 8)
    });
    state.taskCount = state.tasks.length;
    document.getElementById('taskCountSelect').value = state.taskCount;
    renderTasksTable();
    runCalculations();
  });

  // Student Info Inputs
  ['Name', 'Id', 'Group', 'Instructor'].forEach(field => {
    const el = document.getElementById(`student${field}`);
    if (el) {
      el.addEventListener('input', (e) => {
        state.student[field.toLowerCase()] = e.target.value.trim();
      });
    }
  });

  // Presets Modal
  document.getElementById('btnPresets').addEventListener('click', () => {
    document.getElementById('presetsModal').classList.add('active');
  });

  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('presetsModal').classList.remove('active');
    });
  });

  // Print Worksheet Button
  document.getElementById('btnPrintWorksheet').addEventListener('click', () => {
    generatePrintableWorksheet();
    window.print();
  });

  // Practice check buttons
  document.getElementById('btnCheckFcfs').addEventListener('click', () => checkManualPractice('fcfs'));
  document.getElementById('btnCheckSjf').addEventListener('click', () => checkManualPractice('sjf'));
  document.getElementById('btnCheckRr').addEventListener('click', () => checkManualPractice('rr'));

  // Save Hypothesis Button
  document.getElementById('btnSaveHypo').addEventListener('click', () => {
    state.hypotheses.q1 = document.getElementById('hypoQ1').value;
    state.hypotheses.q2 = document.getElementById('hypoQ2').value;
    state.hypotheses.q3 = document.getElementById('hypoQ3').value;
    alert('บันทึกสมมติฐานเรียบร้อยแล้ว (จะปรากฏในใบงานพิมพ์)');
  });

  // Simulator Controls
  document.getElementById('simBtnPlay').addEventListener('click', () => {
    if (!state.simulator) initSimulatorEngine();
    if (state.simulator.isPlaying) {
      state.simulator.pause();
      document.getElementById('simBtnPlay').innerHTML = '▶ เล่นต่อเนื่อง';
    } else {
      state.simulator.play();
      document.getElementById('simBtnPlay').innerHTML = '⏸ หยุดชั่วคราว';
    }
  });

  document.getElementById('simBtnNext').addEventListener('click', () => {
    if (!state.simulator) initSimulatorEngine();
    state.simulator.stepForward();
  });

  document.getElementById('simBtnPrev').addEventListener('click', () => {
    if (!state.simulator) initSimulatorEngine();
    state.simulator.stepBackward();
  });

  document.getElementById('simBtnReset').addEventListener('click', () => {
    if (!state.simulator) initSimulatorEngine();
    state.simulator.reset();
    document.getElementById('simBtnPlay').innerHTML = '▶ เล่นต่อเนื่อง';
  });

  document.getElementById('simAlgoSelect').addEventListener('change', () => {
    initSimulatorEngine();
  });

  document.getElementById('simSpeedSelect').addEventListener('change', (e) => {
    if (state.simulator) {
      state.simulator.setSpeed(parseInt(e.target.value, 10));
    }
  });

  document.getElementById('simScrubber').addEventListener('input', (e) => {
    if (state.simulator) {
      state.simulator.goToFrame(parseInt(e.target.value, 10));
    }
  });

  // Edge cases buttons
  document.querySelectorAll('.btn-load-testcase').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const caseKey = e.target.dataset.case;
      loadPresetKey(caseKey);
      // Switch to results tab to inspect
      document.querySelector('.tab-btn[data-tab="tab-results"]').click();
    });
  });

  // Invalid inputs test button
  document.getElementById('btnTestInvalidInputs').addEventListener('click', () => {
    // Deliberately set BT=0 and q=0 to trigger validation test
    state.tasks[0].bt = 0;
    state.quantum = 0;
    document.getElementById('quantumInput').value = 0;
    renderTasksTable();
    runCalculations();
  });
}

// Utility helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
