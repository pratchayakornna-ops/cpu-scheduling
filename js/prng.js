/**
 * Seedable PRNG (Mulberry32) and Problem Generator
 * Mini-project: CPU Scheduling Personal Task Manager
 */

class SeededRandom {
  constructor(seed) {
    this.seed = this.hashSeed(seed);
  }

  hashSeed(seed) {
    if (typeof seed === 'number') {
      return seed >>> 0;
    }
    const str = String(seed);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  // Returns float in [0, 1)
  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns integer in [min, max] inclusive
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Choose random item from array
  choice(arr) {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  // Shuffle array using Fisher-Yates
  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

const COURSE_SUBJECTS = [
  'แบบฝึกหัด OS',
  'รายงาน Database',
  'สรุป English',
  'แบบฝึกหัด Math',
  'โครงงาน AI',
  'การบ้าน Data Structures',
  'แล็บ Computer Network',
  'โปรเจกต์ Web Dev',
  'สรุปสัมมนา IT',
  'แบบฝึกหัด Physics',
  'แล็บ Cybersecurity',
  'การบ้าน Algorithm'
];

/**
 * Generates tasks according to assignment criteria:
 * 1. 5-6 tasks (customizable 4-6)
 * 2. AT in 0-10, at least one task has AT = 0, duplicates allowed
 * 3. BT in 1-8 (BT > 0)
 * 4. Distinct Process IDs (P1 to Pn)
 */
function generateProblem(seed, count = 5, quantum = 2) {
  const rng = new SeededRandom(seed);
  const shuffledSubjects = rng.shuffle(COURSE_SUBJECTS);

  const tasks = [];
  for (let i = 1; i <= count; i++) {
    tasks.push({
      id: `P${i}`,
      name: shuffledSubjects[(i - 1) % shuffledSubjects.length],
      at: rng.nextInt(0, 10),
      bt: rng.nextInt(1, 8)
    });
  }

  // Guarantee at least one task has AT = 0
  const hasZero = tasks.some(t => t.at === 0);
  if (!hasZero) {
    const zeroIndex = rng.nextInt(0, tasks.length - 1);
    tasks[zeroIndex].at = 0;
  }

  // Sort initially by ID (P1..Pn)
  tasks.sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));

  return {
    seed: String(seed),
    count: tasks.length,
    quantum: Math.max(1, Math.min(4, Math.floor(quantum))),
    tasks
  };
}

// Preset test scenarios as specified in the assignment sheets
const PRESETS = {
  // Page 4-5 Example from assignment
  slideExample: {
    name: 'ตัวอย่างจากเอกสารใบงาน (หน้า 4-5)',
    description: 'โจทย์คงที่ 4 งาน สำหรับฝึกวิธีคิดและตรวจความถูกต้องกับเอกสาร',
    seed: 'DOC-PAGE-4',
    quantum: 2,
    tasks: [
      { id: 'P1', name: 'แบบฝึกหัด OS', at: 0, bt: 5 },
      { id: 'P2', name: 'รายงาน Database', at: 1, bt: 3 },
      { id: 'P3', name: 'สรุป English', at: 2, bt: 1 },
      { id: 'P4', name: 'แบบฝึกหัด Math', at: 4, bt: 2 }
    ]
  },
  // Test Case: Idle Gaps (Page 10)
  idleGap: {
    name: 'กรณีทดสอบ: มีช่วง Idle (CPU ว่าง)',
    description: 'งานแรก AT=0 BT=1 งานถัดไป AT=5 ทำให้เกิดช่องว่าง Idle ช่วง 1-5',
    seed: 'TEST-IDLE',
    quantum: 2,
    tasks: [
      { id: 'P1', name: 'แบบฝึกหัด OS', at: 0, bt: 1 },
      { id: 'P2', name: 'รายงาน Database', at: 5, bt: 3 },
      { id: 'P3', name: 'สรุป English', at: 6, bt: 2 },
      { id: 'P4', name: 'แบบฝึกหัด Math', at: 9, bt: 2 }
    ]
  },
  // Test Case: Simultaneous Arrivals & Equal BT (Page 10)
  ties: {
    name: 'กรณีทดสอบ: งานมาพร้อมกัน และ BT เท่ากัน',
    description: 'ทดสอบกติกา Tie-breaking: เรียงตาม AT แล้วตามเลขรหัส P1 < P2 < P3',
    seed: 'TEST-TIES',
    quantum: 2,
    tasks: [
      { id: 'P1', name: 'แบบฝึกหัด OS', at: 0, bt: 3 },
      { id: 'P2', name: 'รายงาน Database', at: 0, bt: 3 },
      { id: 'P3', name: 'สรุป English', at: 2, bt: 2 },
      { id: 'P4', name: 'แบบฝึกหัด Math', at: 2, bt: 2 },
      { id: 'P5', name: 'โครงงาน AI', at: 4, bt: 1 }
    ]
  },
  // Test Case: Arrival exactly at Quantum expiry & BT not divisible by q (Page 10)
  quantumBoundary: {
    name: 'กรณีทดสอบ: งานใหม่เข้าตรงเวลาครบ q และ BT หารไม่ลงตัว',
    description: 'ทดสอบกฎการเข้าคิวก่อนงานเดิมที่ยังไม่เสร็จใน Round Robin',
    seed: 'TEST-RR-BOUNDARY',
    quantum: 2,
    tasks: [
      { id: 'P1', name: 'แบบฝึกหัด OS', at: 0, bt: 5 },
      { id: 'P2', name: 'รายงาน Database', at: 2, bt: 3 },
      { id: 'P3', name: 'สรุป English', at: 4, bt: 1 },
      { id: 'P4', name: 'แบบฝึกหัด Math', at: 6, bt: 4 }
    ]
  },
  // Standard 5 tasks random
  standard5: {
    name: 'โจทย์สุ่มมาตรฐาน (5 งาน)',
    description: 'สุ่มโจทย์ 5 งานตามเกณฑ์ AT 0-10, BT 1-8',
    seed: 'OS-LAB-5',
    quantum: 2,
    generator: true,
    count: 5
  },
  // Standard 6 tasks random
  standard6: {
    name: 'โจทย์สุ่มมาตรฐาน (6 งาน)',
    description: 'สุ่มโจทย์ 6 งานตามเกณฑ์ AT 0-10, BT 1-8',
    seed: 'OS-LAB-6',
    quantum: 3,
    generator: true,
    count: 6
  }
};
