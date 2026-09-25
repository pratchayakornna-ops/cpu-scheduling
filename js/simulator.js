/**
 * Step-by-Step Simulator Engine
 * Generates discrete simulation frames for interactive playback of CPU scheduling
 */

class SimulationEngine {
  constructor(tasks, algorithm, quantum = 2) {
    this.tasks = tasks.map(t => ({
      id: t.id,
      name: t.name,
      at: Number(t.at),
      bt: Number(t.bt)
    }));
    this.algorithm = algorithm;
    this.quantum = Number(quantum);
    this.frames = [];
    this.currentFrameIndex = 0;
    this.isPlaying = false;
    this.timer = null;
    this.speed = 1000; // ms per frame
    this.onFrameChange = null;

    this.buildFrames();
  }

  buildFrames() {
    this.frames = [];
    if (this.algorithm === 'FCFS') {
      this.buildFcfsFrames();
    } else if (this.algorithm === 'SJF') {
      this.buildSjfFrames();
    } else if (this.algorithm === 'RR') {
      this.buildRrFrames();
    }
  }

  buildFcfsFrames() {
    const tasks = this.tasks.map(t => ({ ...t, remainingBt: t.bt, ct: 0, tat: 0, wt: 0 }));
    let time = 0;
    const maxTime = Math.max(...tasks.map(t => t.at)) + tasks.reduce((s, t) => s + t.bt, 0) + 10;
    const completed = [];
    let currentTask = null;
    let taskStartTime = 0;
    const readyQueue = [];

    // Simulate tick by tick (1 time unit per frame)
    while (completed.length < tasks.length && time <= maxTime) {
      // Check arrivals at current time
      const newlyArrived = tasks.filter(t => t.at === time && !completed.includes(t) && t !== currentTask && !readyQueue.includes(t));
      newlyArrived.sort((a, b) => {
        if (a.at !== b.at) return a.at - b.at;
        return parsePid(a.id) - parsePid(b.id);
      });
      newlyArrived.forEach(t => readyQueue.push(t));

      // If current task finished
      if (currentTask && currentTask.remainingBt === 0) {
        currentTask.ct = time;
        currentTask.tat = currentTask.ct - currentTask.at;
        currentTask.wt = currentTask.tat - currentTask.bt;
        completed.push(currentTask);
        currentTask = null;
      }

      // If CPU is idle, pick next task from readyQueue
      if (!currentTask && readyQueue.length > 0) {
        // In FCFS, readyQueue is already in order of arrival
        currentTask = readyQueue.shift();
        taskStartTime = time;
      }

      // Record snapshot frame at this tick
      this.frames.push({
        time,
        algorithm: 'FCFS',
        currentTask: currentTask ? { id: currentTask.id, name: currentTask.name, remainingBt: currentTask.remainingBt } : null,
        isIdle: !currentTask,
        readyQueue: readyQueue.map(t => ({ id: t.id, name: t.name, at: t.at, bt: t.bt, remainingBt: t.remainingBt })),
        completed: completed.map(t => ({ id: t.id, name: t.name, ct: t.ct, tat: t.tat, wt: t.wt })),
        message: currentTask 
          ? `เวลา ${time}: กำลังทำ ${currentTask.id} (${currentTask.name}) [เหลือ ${currentTask.remainingBt} ชม.]`
          : (completed.length === tasks.length ? `เวลา ${time}: ทำงานทั้งหมดเสร็จสมบูรณ์` : `เวลา ${time}: CPU ว่าง (Idle) รอตารางงานถัดไป`)
      });

      if (completed.length === tasks.length) break;

      // Work for 1 unit of time
      if (currentTask) {
        currentTask.remainingBt--;
      }
      time++;
    }
  }

  buildSjfFrames() {
    const tasks = this.tasks.map(t => ({ ...t, remainingBt: t.bt, ct: 0, tat: 0, wt: 0 }));
    let time = 0;
    const maxTime = Math.max(...tasks.map(t => t.at)) + tasks.reduce((s, t) => s + t.bt, 0) + 10;
    const completed = [];
    let currentTask = null;
    const readyQueue = [];

    while (completed.length < tasks.length && time <= maxTime) {
      // Check arrivals
      const newlyArrived = tasks.filter(t => t.at === time && !completed.includes(t) && t !== currentTask && !readyQueue.includes(t));
      newlyArrived.forEach(t => readyQueue.push(t));

      // If current task finished
      if (currentTask && currentTask.remainingBt === 0) {
        currentTask.ct = time;
        currentTask.tat = currentTask.ct - currentTask.at;
        currentTask.wt = currentTask.tat - currentTask.bt;
        completed.push(currentTask);
        currentTask = null;
      }

      // If CPU is idle, select shortest job from readyQueue (Non-preemptive)
      if (!currentTask && readyQueue.length > 0) {
        readyQueue.sort((a, b) => {
          if (a.bt !== b.bt) return a.bt - b.bt;
          if (a.at !== b.at) return a.at - b.at;
          return parsePid(a.id) - parsePid(b.id);
        });
        currentTask = readyQueue.shift();
      }

      this.frames.push({
        time,
        algorithm: 'SJF',
        currentTask: currentTask ? { id: currentTask.id, name: currentTask.name, remainingBt: currentTask.remainingBt } : null,
        isIdle: !currentTask,
        readyQueue: readyQueue.map(t => ({ id: t.id, name: t.name, at: t.at, bt: t.bt, remainingBt: t.remainingBt })),
        completed: completed.map(t => ({ id: t.id, name: t.name, ct: t.ct, tat: t.tat, wt: t.wt })),
        message: currentTask
          ? `เวลา ${time}: กำลังทำ ${currentTask.id} (${currentTask.name}) [งานสั้นที่สุด BT=${currentTask.bt}, เหลือ ${currentTask.remainingBt} ชม.]`
          : (completed.length === tasks.length ? `เวลา ${time}: ทำงานทั้งหมดเสร็จสมบูรณ์` : `เวลา ${time}: CPU ว่าง (Idle) ไม่มีงานพร้อมในคิว`)
      });

      if (completed.length === tasks.length) break;

      if (currentTask) {
        currentTask.remainingBt--;
      }
      time++;
    }
  }

  buildRrFrames() {
    const tasks = this.tasks.map(t => ({ ...t, remainingBt: t.bt, ct: 0, tat: 0, wt: 0 }));
    let time = 0;
    const maxTime = Math.max(...tasks.map(t => t.at)) + tasks.reduce((s, t) => s + t.bt, 0) + 20;
    const completed = [];
    const queue = [];
    const arrivedSet = new Set();
    const q = this.quantum;

    let currentTask = null;
    let quantumSpent = 0;

    // Initial arrivals at time 0
    const atZero = tasks.filter(t => t.at <= 0);
    atZero.sort((a, b) => {
      if (a.at !== b.at) return a.at - b.at;
      return parsePid(a.id) - parsePid(b.id);
    });
    atZero.forEach(t => {
      queue.push(t);
      arrivedSet.add(t.id);
    });

    while (completed.length < tasks.length && time <= maxTime) {
      // Check if quantum expired or task finished
      let needSwitch = false;
      if (currentTask) {
        if (currentTask.remainingBt === 0) {
          // Completed!
          currentTask.ct = time;
          currentTask.tat = currentTask.ct - currentTask.at;
          currentTask.wt = currentTask.tat - currentTask.bt;
          completed.push(currentTask);
          currentTask = null;
          quantumSpent = 0;
          needSwitch = true;
        } else if (quantumSpent >= q) {
          // Quantum exhausted!
          // Note: New arrivals at this exact boundary must enter BEFORE currentTask is re-queued!
          needSwitch = true;
        }
      }

      // Check new arrivals at current time
      const newlyArrived = tasks.filter(t => !arrivedSet.has(t.id) && t.at <= time);
      newlyArrived.sort((a, b) => {
        if (a.at !== b.at) return a.at - b.at;
        return parsePid(a.id) - parsePid(b.id);
      });
      newlyArrived.forEach(t => {
        queue.push(t);
        arrivedSet.add(t.id);
      });

      // If quantum expired and task still has remaining BT, re-queue now AFTER new arrivals
      if (needSwitch && currentTask && currentTask.remainingBt > 0) {
        queue.push(currentTask);
        currentTask = null;
        quantumSpent = 0;
      }

      // If CPU idle and queue has tasks, pick next
      if (!currentTask && queue.length > 0) {
        currentTask = queue.shift();
        quantumSpent = 0;
      }

      this.frames.push({
        time,
        algorithm: 'RR',
        quantum: q,
        quantumSpent,
        currentTask: currentTask ? { id: currentTask.id, name: currentTask.name, remainingBt: currentTask.remainingBt } : null,
        isIdle: !currentTask,
        readyQueue: queue.map(t => ({ id: t.id, name: t.name, at: t.at, bt: t.bt, remainingBt: t.remainingBt })),
        completed: completed.map(t => ({ id: t.id, name: t.name, ct: t.ct, tat: t.tat, wt: t.wt })),
        message: currentTask
          ? `เวลา ${time}: กำลังทำ ${currentTask.id} (${currentTask.name}) [รอบนี้ทำไป ${quantumSpent}/${q} ชม., เหลือ ${currentTask.remainingBt} ชม.]`
          : (completed.length === tasks.length ? `เวลา ${time}: ทำงานทั้งหมดเสร็จสมบูรณ์` : `เวลา ${time}: CPU ว่าง (Idle) รอตารางงานถัดไป`)
      });

      if (completed.length === tasks.length) break;

      if (currentTask) {
        currentTask.remainingBt--;
        quantumSpent++;
      }
      time++;
    }
  }

  getCurrentFrame() {
    return this.frames[this.currentFrameIndex] || null;
  }

  stepForward() {
    if (this.currentFrameIndex < this.frames.length - 1) {
      this.currentFrameIndex++;
      if (this.onFrameChange) this.onFrameChange(this.getCurrentFrame(), this.currentFrameIndex, this.frames.length);
      return true;
    }
    this.pause();
    return false;
  }

  stepBackward() {
    if (this.currentFrameIndex > 0) {
      this.currentFrameIndex--;
      if (this.onFrameChange) this.onFrameChange(this.getCurrentFrame(), this.currentFrameIndex, this.frames.length);
      return true;
    }
    return false;
  }

  goToFrame(index) {
    this.currentFrameIndex = Math.max(0, Math.min(this.frames.length - 1, index));
    if (this.onFrameChange) this.onFrameChange(this.getCurrentFrame(), this.currentFrameIndex, this.frames.length);
  }

  reset() {
    this.pause();
    this.currentFrameIndex = 0;
    if (this.onFrameChange) this.onFrameChange(this.getCurrentFrame(), 0, this.frames.length);
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    if (this.currentFrameIndex >= this.frames.length - 1) {
      this.currentFrameIndex = 0;
    }
    this.timer = setInterval(() => {
      const hasNext = this.stepForward();
      if (!hasNext) {
        this.pause();
      }
    }, this.speed);
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setSpeed(ms) {
    this.speed = ms;
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }
}
