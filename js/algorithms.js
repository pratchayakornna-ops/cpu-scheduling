/**
 * CPU Scheduling Algorithms
 * FCFS, SJF (Non-preemptive), and Round Robin (RR)
 * Follows exact specifications from the OS mini-project document.
 */

function parsePid(id) {
  const match = id.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Validates task inputs and time quantum
 */
function validateInputs(tasks, quantum) {
  const errors = [];
  if (!Array.isArray(tasks) || tasks.length === 0) {
    errors.push('ต้องมีรายการงานอย่างน้อย 1 งาน');
    return { valid: false, errors };
  }

  if (tasks.length < 2) {
    errors.push('ควรมีงานอย่างน้อย 2 งานเพื่อเปรียบเทียบการจัดตาราง');
  }

  let hasZeroAt = false;
  const ids = new Set();

  tasks.forEach((t, idx) => {
    if (!t.id) errors.push(`งานลำดับที่ ${idx + 1} ไม่มีรหัส Process`);
    if (ids.has(t.id)) errors.push(`รหัส Process ${t.id} ซ้ำกัน`);
    ids.add(t.id);

    if (t.at === undefined || t.at === null || isNaN(Number(t.at)) || Number(t.at) < 0) {
      errors.push(`งาน ${t.id}: Arrival Time (AT) ต้องเป็นตัวเลข ≥ 0`);
    } else if (Number(t.at) === 0) {
      hasZeroAt = true;
    }

    if (t.bt === undefined || t.bt === null || isNaN(Number(t.bt)) || Number(t.bt) <= 0) {
      errors.push(`งาน ${t.id}: Burst Time (BT) ต้องเป็นจำนวนเต็ม > 0 (พบค่า ${t.bt})`);
    }
  });

  if (!hasZeroAt) {
    errors.push('ตามข้อกำหนด: ต้องมีอย่างน้อย 1 งานที่มี Arrival Time (AT) = 0');
  }

  const qNum = Number(quantum);
  if (isNaN(qNum) || !Number.isInteger(qNum) || qNum < 1 || qNum > 4) {
    errors.push(`ค่า Time Quantum (q) ต้องเป็นจำนวนเต็มระหว่าง 1 ถึง 4 (พบค่า ${quantum})`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 1. First-Come, First-Served (FCFS)
 * - Sorted by AT asc, then Process ID asc
 * - Non-preemptive
 * - Idle if CPU is waiting for next arrival
 */
function scheduleFCFS(rawTasks) {
  // Deep clone tasks
  const tasks = rawTasks.map(t => ({
    id: t.id,
    name: t.name,
    at: Number(t.at),
    bt: Number(t.bt),
    ct: 0,
    tat: 0,
    wt: 0
  }));

  const gantt = [];
  const completed = [];
  let currentTime = 0;
  const uncompleted = [...tasks];

  while (uncompleted.length > 0) {
    // Ready tasks: arrived at or before currentTime
    const ready = uncompleted.filter(t => t.at <= currentTime);

    if (ready.length === 0) {
      // Find earliest arrival time among uncompleted
      const nextArrival = Math.min(...uncompleted.map(t => t.at));
      gantt.push({
        processId: 'IDLE',
        name: 'CPU ว่าง (Idle)',
        start: currentTime,
        end: nextArrival,
        duration: nextArrival - currentTime,
        isIdle: true
      });
      currentTime = nextArrival;
      continue;
    }

    // Sort ready tasks: AT asc, then PID asc
    ready.sort((a, b) => {
      if (a.at !== b.at) return a.at - b.at;
      return parsePid(a.id) - parsePid(b.id);
    });

    const currentTask = ready[0];
    const startTime = currentTime;
    const endTime = startTime + currentTask.bt;

    currentTask.ct = endTime;
    currentTask.tat = currentTask.ct - currentTask.at;
    currentTask.wt = currentTask.tat - currentTask.bt;

    gantt.push({
      processId: currentTask.id,
      name: currentTask.name,
      start: startTime,
      end: endTime,
      duration: currentTask.bt,
      isIdle: false
    });

    currentTime = endTime;
    completed.push(currentTask);
    const index = uncompleted.indexOf(currentTask);
    uncompleted.splice(index, 1);
  }

  // Sort completed by Process ID for consistent display in tables
  const table = [...completed].sort((a, b) => parsePid(a.id) - parsePid(b.id));

  const totalTat = table.reduce((sum, t) => sum + t.tat, 0);
  const totalWt = table.reduce((sum, t) => sum + t.wt, 0);
  const avgTat = Number((totalTat / table.length).toFixed(2));
  const avgWt = Number((totalWt / table.length).toFixed(2));

  return {
    algorithm: 'FCFS',
    name: 'First-Come, First-Served',
    thName: 'ท างานที่มาถึงก่อน (FCFS)',
    gantt,
    table,
    totalTat,
    totalWt,
    avgTat,
    avgWt,
    totalTime: currentTime
  };
}

/**
 * 2. Shortest Job First (SJF) - Non-preemptive
 * - Select shortest BT among ready tasks (AT <= current time)
 * - Tie-break: earlier AT, then Process ID asc
 * - Runs until completion
 */
function scheduleSJF(rawTasks) {
  const tasks = rawTasks.map(t => ({
    id: t.id,
    name: t.name,
    at: Number(t.at),
    bt: Number(t.bt),
    ct: 0,
    tat: 0,
    wt: 0
  }));

  const gantt = [];
  const completed = [];
  let currentTime = 0;
  const uncompleted = [...tasks];

  while (uncompleted.length > 0) {
    const ready = uncompleted.filter(t => t.at <= currentTime);

    if (ready.length === 0) {
      const nextArrival = Math.min(...uncompleted.map(t => t.at));
      gantt.push({
        processId: 'IDLE',
        name: 'CPU ว่าง (Idle)',
        start: currentTime,
        end: nextArrival,
        duration: nextArrival - currentTime,
        isIdle: true
      });
      currentTime = nextArrival;
      continue;
    }

    // Sort ready tasks: BT asc, then AT asc, then PID asc
    ready.sort((a, b) => {
      if (a.bt !== b.bt) return a.bt - b.bt;
      if (a.at !== b.at) return a.at - b.at;
      return parsePid(a.id) - parsePid(b.id);
    });

    const currentTask = ready[0];
    const startTime = currentTime;
    const endTime = startTime + currentTask.bt;

    currentTask.ct = endTime;
    currentTask.tat = currentTask.ct - currentTask.at;
    currentTask.wt = currentTask.tat - currentTask.bt;

    gantt.push({
      processId: currentTask.id,
      name: currentTask.name,
      start: startTime,
      end: endTime,
      duration: currentTask.bt,
      isIdle: false
    });

    currentTime = endTime;
    completed.push(currentTask);
    const index = uncompleted.indexOf(currentTask);
    uncompleted.splice(index, 1);
  }

  const table = [...completed].sort((a, b) => parsePid(a.id) - parsePid(b.id));

  const totalTat = table.reduce((sum, t) => sum + t.tat, 0);
  const totalWt = table.reduce((sum, t) => sum + t.wt, 0);
  const avgTat = Number((totalTat / table.length).toFixed(2));
  const avgWt = Number((totalWt / table.length).toFixed(2));

  return {
    algorithm: 'SJF',
    name: 'Shortest Job First (Non-preemptive)',
    thName: 'เลือกงานสั้นที่สุดเมื่อว่าง (SJF)',
    gantt,
    table,
    totalTat,
    totalWt,
    avgTat,
    avgWt,
    totalTime: currentTime
  };
}

/**
 * 3. Round Robin (RR)
 * Rules from assignment (Page 3 & Page 5):
 * - Quantum q (1..4)
 * - FIFO queue
 * - Newly arrived processes at or during the quantum interval (t_start < AT <= t_end)
 *   MUST enter the queue BEFORE the preempted process is re-queued!
 * - Multiple new arrivals sorted by AT asc, then PID asc.
 * - If process completes (remaining BT = 0), not re-queued.
 */
function scheduleRR(rawTasks, quantum) {
  const q = Number(quantum);
  const tasks = rawTasks.map(t => ({
    id: t.id,
    name: t.name,
    at: Number(t.at),
    bt: Number(t.bt),
    remainingBt: Number(t.bt),
    ct: 0,
    tat: 0,
    wt: 0
  }));

  const gantt = [];
  const roundRobinLog = [];
  const completedMap = new Map();
  const queue = [];
  const arrivedSet = new Set();
  let currentTime = 0;

  // Add initial arrivals at t = 0
  const initialArrivals = tasks.filter(t => t.at <= 0);
  initialArrivals.sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at;
    return parsePid(a.id) - parsePid(b.id);
  });
  initialArrivals.forEach(t => {
    queue.push(t);
    arrivedSet.add(t.id);
  });

  const totalTasks = tasks.length;

  while (completedMap.size < totalTasks) {
    if (queue.length === 0) {
      // Find next unarrived task
      const unarrived = tasks.filter(t => !arrivedSet.has(t.id));
      if (unarrived.length === 0) break;

      const nextArrival = Math.min(...unarrived.map(t => t.at));
      gantt.push({
        processId: 'IDLE',
        name: 'CPU ว่าง (Idle)',
        start: currentTime,
        end: nextArrival,
        duration: nextArrival - currentTime,
        isIdle: true
      });
      currentTime = nextArrival;

      // Add all tasks arriving at this time
      const newArrivals = tasks.filter(t => !arrivedSet.has(t.id) && t.at <= currentTime);
      newArrivals.sort((a, b) => {
        if (a.at !== b.at) return a.at - b.at;
        return parsePid(a.id) - parsePid(b.id);
      });
      newArrivals.forEach(t => {
        queue.push(t);
        arrivedSet.add(t.id);
      });
      continue;
    }

    const currentTask = queue.shift();
    const startTime = currentTime;
    const runDuration = Math.min(currentTask.remainingBt, q);
    const endTime = startTime + runDuration;

    currentTask.remainingBt -= runDuration;

    gantt.push({
      processId: currentTask.id,
      name: currentTask.name,
      start: startTime,
      end: endTime,
      duration: runDuration,
      remainingAfter: currentTask.remainingBt,
      isIdle: false
    });

    roundRobinLog.push({
      interval: `${startTime}–${endTime}`,
      processId: currentTask.id,
      name: currentTask.name,
      remaining: currentTask.remainingBt
    });

    // Check new arrivals in interval (startTime < AT <= endTime)
    const newArrivals = tasks.filter(t => !arrivedSet.has(t.id) && t.at > startTime && t.at <= endTime);
    newArrivals.sort((a, b) => {
      if (a.at !== b.at) return a.at - b.at;
      return parsePid(a.id) - parsePid(b.id);
    });

    // Enqueue newly arrived tasks first!
    newArrivals.forEach(t => {
      queue.push(t);
      arrivedSet.add(t.id);
    });

    // If current task still has work left, re-enqueue to back
    if (currentTask.remainingBt > 0) {
      queue.push(currentTask);
    } else {
      // Completed!
      currentTask.ct = endTime;
      currentTask.tat = currentTask.ct - currentTask.at;
      currentTask.wt = currentTask.tat - currentTask.bt;
      completedMap.set(currentTask.id, currentTask);
    }

    currentTime = endTime;
  }

  // Construct table in Process ID order
  const table = tasks.map(t => {
    const res = completedMap.get(t.id);
    return {
      id: res.id,
      name: res.name,
      at: res.at,
      bt: res.bt,
      ct: res.ct,
      tat: res.tat,
      wt: res.wt
    };
  }).sort((a, b) => parsePid(a.id) - parsePid(b.id));

  const totalTat = table.reduce((sum, t) => sum + t.tat, 0);
  const totalWt = table.reduce((sum, t) => sum + t.wt, 0);
  const avgTat = Number((totalTat / table.length).toFixed(2));
  const avgWt = Number((totalWt / table.length).toFixed(2));

  return {
    algorithm: 'RR',
    name: `Round Robin (q = ${q})`,
    thName: `Round Robin (q = ${q} หน่วย)`,
    quantum: q,
    gantt,
    roundRobinLog,
    table,
    totalTat,
    totalWt,
    avgTat,
    avgWt,
    totalTime: currentTime
  };
}

/**
 * Runs all three algorithms on the exact same dataset
 */
function runAllAlgorithms(tasks, quantum) {
  const validation = validateInputs(tasks, quantum);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const fcfs = scheduleFCFS(tasks);
  const sjf = scheduleSJF(tasks);
  const rr = scheduleRR(tasks, quantum);

  // Analysis
  const wtValues = { FCFS: fcfs.avgWt, SJF: sjf.avgWt, RR: rr.avgWt };
  let bestAlgo = 'SJF';
  let minWt = sjf.avgWt;
  if (fcfs.avgWt < minWt) {
    minWt = fcfs.avgWt;
    bestAlgo = 'FCFS';
  }
  if (rr.avgWt < minWt) {
    minWt = rr.avgWt;
    bestAlgo = 'RR';
  }

  return {
    success: true,
    fcfs,
    sjf,
    rr,
    analysis: {
      bestAlgo,
      minWt,
      wtComparison: [
        { name: 'FCFS', wt: fcfs.avgWt, tat: fcfs.avgTat },
        { name: 'SJF', wt: sjf.avgWt, tat: sjf.avgTat },
        { name: `RR (q=${quantum})`, wt: rr.avgWt, tat: rr.avgTat }
      ]
    }
  };
}
