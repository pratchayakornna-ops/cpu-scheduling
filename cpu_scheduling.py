# -*- coding: utf-8 -*-
"""
ระบบจำลองการจัดตารางเวลา CPU (CPU Scheduling Simulator)
มินิโปรเจ็ควิชาระบบปฏิบัติการ (Operating Systems)
อัลกอริทึม: FCFS, SJF (Non-preemptive), Round Robin
"""

import random
import tkinter as tk
from tkinter import ttk, messagebox

# ==========================================
# 1. คลาสจำลองข้อมูลของแต่ละงาน (Process)
# ==========================================
class Process:
    def __init__(self, pid, at, bt):
        self.id = str(pid).strip()
        self.at = int(at)
        self.bt = int(bt)
        self.ct = 0
        self.tat = 0
        self.wt = 0

# ==========================================
# 2. ฟังก์ชันคำนวณอัลกอริทึม (Algorithms)
# ==========================================

# --- อัลกอริทึมที่ 1: FCFS (มาก่อนทำก่อน) ---
def calculate_fcfs(processes):
    fcfs_list = [Process(p.id, p.at, p.bt) for p in processes]
    fcfs_list.sort(key=lambda p: (p.at, p.id))
    current_time = 0
    total_tat, total_wt = 0, 0
    gantt = []

    print("\n=================== 1. ผลลัพธ์ FCFS ===================")
    print("ID\tAT\tBT\tCT\tTAT\tWT")

    for p in fcfs_list:
        if current_time < p.at:
            gantt.append({"id": "IDLE", "start": current_time, "end": p.at})
            current_time = p.at  # CPU ว่าง (Idle)
            
        start_t = current_time
        current_time += p.bt
        p.ct = current_time
        p.tat = p.ct - p.at
        p.wt = p.tat - p.bt

        total_tat += p.tat
        total_wt += p.wt
        gantt.append({"id": p.id, "start": start_t, "end": current_time})

        print(f"{p.id}\t{p.at}\t{p.bt}\t{p.ct}\t{p.tat}\t{p.wt}")

    avg_tat = total_tat / len(fcfs_list) if fcfs_list else 0
    avg_wt = total_wt / len(fcfs_list) if fcfs_list else 0
    print(f"ค่าเฉลี่ย TAT = {avg_tat:.2f}")
    print(f"ค่าเฉลี่ย WT = {avg_wt:.2f}")

    def sort_key(x):
        num = "".join(filter(str.isdigit, x.id))
        return (int(num) if num else x.id)

    sorted_res = sorted(fcfs_list, key=sort_key)
    return sorted_res, avg_tat, avg_wt, gantt

# --- อัลกอริทึมที่ 2: SJF Non-preemptive (งานสั้นสุดทำก่อน) ---
def calculate_sjf(processes):
    unvisited = [Process(p.id, p.at, p.bt) for p in processes]
    unvisited.sort(key=lambda p: (p.at, p.id))
    completed = []
    current_time = 0
    gantt = []

    while unvisited:
        # เลือกเฉพาะงานที่มาถึงแล้ว (AT <= current_time)
        ready = [p for p in unvisited if p.at <= current_time]

        if not ready:
            # ถ้าระหว่างนั้นไม่มีงาน ให้ข้ามเวลาไปหางานถัดไป (Idle)
            idle_end = unvisited[0].at
            if current_time < idle_end:
                gantt.append({"id": "IDLE", "start": current_time, "end": idle_end})
            current_time = idle_end
            ready = [p for p in unvisited if p.at <= current_time]

        # เลือกงานที่ BT น้อยที่สุด (ถ้า BT เท่ากัน เลือก AT ก่อน แล้วตามด้วย ID)
        selected = min(ready, key=lambda p: (p.bt, p.at, p.id))
        unvisited.remove(selected)

        start_t = current_time
        current_time += selected.bt
        
        p_res = Process(selected.id, selected.at, selected.bt)
        p_res.ct = current_time
        p_res.tat = p_res.ct - p_res.at
        p_res.wt = p_res.tat - p_res.bt
        completed.append(p_res)
        gantt.append({"id": selected.id, "start": start_t, "end": current_time})

    total_tat = sum(p.tat for p in completed)
    total_wt = sum(p.wt for p in completed)

    print("\n=================== 2. ผลลัพธ์ SJF ===================")
    print("ID\tAT\tBT\tCT\tTAT\tWT")
    
    def sort_key(x):
        num = "".join(filter(str.isdigit, x.id))
        return (int(num) if num else x.id)

    sorted_res = sorted(completed, key=sort_key)
    for p in sorted_res:
        print(f"{p.id}\t{p.at}\t{p.bt}\t{p.ct}\t{p.tat}\t{p.wt}")

    avg_tat = total_tat / len(completed) if completed else 0
    avg_wt = total_wt / len(completed) if completed else 0
    print(f"ค่าเฉลี่ย TAT = {avg_tat:.2f}")
    print(f"ค่าเฉลี่ย WT = {avg_wt:.2f}")
    return sorted_res, avg_tat, avg_wt, gantt

# --- อัลกอริทึมที่ 3: Round Robin (RR) ---
def calculate_rr(processes, q=2):
    proc_list = [Process(p.id, p.at, p.bt) for p in processes]
    proc_list.sort(key=lambda p: (p.at, p.id))
    rem_bt = {p.id: p.bt for p in proc_list}
    proc_map = {p.id: p for p in proc_list}

    current_time = 0
    ready_queue = []
    visited = set()
    completed = []
    gantt = []

    def add_new_arrivals(t):
        new_procs = [p for p in proc_list if p.at <= t and p.id not in visited]
        new_procs.sort(key=lambda p: (p.at, p.id))
        for p in new_procs:
            ready_queue.append(p.id)
            visited.add(p.id)

    add_new_arrivals(current_time)

    while ready_queue or len(completed) < len(proc_list):
        if not ready_queue:
            unvisited_procs = [p for p in proc_list if p.id not in visited]
            if unvisited_procs:
                next_at = min(p.at for p in unvisited_procs)
                if current_time < next_at:
                    gantt.append({"id": "IDLE", "start": current_time, "end": next_at})
                current_time = max(current_time, next_at)
                add_new_arrivals(current_time)

        if not ready_queue:
            break

        curr_id = ready_queue.pop(0)
        curr_p = proc_map[curr_id]

        exec_time = min(q, rem_bt[curr_id])
        start_t = current_time
        current_time += exec_time
        rem_bt[curr_id] -= exec_time
        gantt.append({"id": curr_id, "start": start_t, "end": current_time})

        # กติกาใบงาน: งานใหม่ที่มาถึง ณ เวลาที่จบ Time Quantum พอดี
        # ต้องเข้าคิวก่อนนำงานเดิมที่ยังไม่เสร็จกลับเข้าคิว
        add_new_arrivals(current_time)

        if rem_bt[curr_id] > 0:
            ready_queue.append(curr_id)
        else:
            p_res = Process(curr_p.id, curr_p.at, curr_p.bt)
            p_res.ct = current_time
            p_res.tat = p_res.ct - p_res.at
            p_res.wt = p_res.tat - p_res.bt
            completed.append(p_res)

    total_tat = sum(p.tat for p in completed)
    total_wt = sum(p.wt for p in completed)

    print(f"\n=================== 3. ผลลัพธ์ Round Robin (q = {q}) ===================")
    print("ID\tAT\tBT\tCT\tTAT\tWT")
    
    def sort_key(x):
        num = "".join(filter(str.isdigit, x.id))
        return (int(num) if num else x.id)

    sorted_res = sorted(completed, key=sort_key)
    for p in sorted_res:
        print(f"{p.id}\t{p.at}\t{p.bt}\t{p.ct}\t{p.tat}\t{p.wt}")

    avg_tat = total_tat / len(completed) if completed else 0
    avg_wt = total_wt / len(completed) if completed else 0
    print(f"ค่าเฉลี่ย TAT = {avg_tat:.2f}")
    print(f"ค่าเฉลี่ย WT = {avg_wt:.2f}")
    return sorted_res, avg_tat, avg_wt, gantt

# ==========================================
# 3. หน้าต่างกราฟิก GUI (Tkinter)
# ==========================================
class CPUSchedulingGUI:
    COLOR_MAP = {
        "P1": "#2563eb",  # Blue
        "P2": "#059669",  # Emerald
        "P3": "#d97706",  # Amber
        "P4": "#7c3aed",  # Purple
        "P5": "#db2777",  # Pink
        "P6": "#0891b2",  # Cyan
        "P7": "#ea580c",  # Orange
        "P8": "#4f46e5",  # Indigo
        "IDLE": "#94a3b8" # Slate Grey
    }

    def __init__(self, root):
        self.root = root
        self.root.title("ระบบจำลองการจัดตารางเวลา CPU (CPU Scheduling Simulator)")
        self.root.geometry("1060x820")
        self.root.minsize(960, 680)
        self.root.configure(bg="#f8fafc")

        # รายการข้อมูล Process ในระบบ
        self.processes = []
        self.has_calculated = False

        self._apply_styles()
        self._build_header()
        self._build_input_panel()
        self._build_action_bar()
        self._build_results_area()

        # สร้างโจทย์เริ่มต้น 5 งาน (ยังไม่คำนวณ)
        self.randomize_processes(count=5)

    def _apply_styles(self):
        self.style = ttk.Style()
        self.style.theme_use("clam")
        
        # ปรับแต่ง Font และสี
        self.style.configure(".", font=("Segoe UI", 10))
        self.style.configure("Treeview.Heading", font=("Segoe UI", 10, "bold"), background="#e2e8f0", foreground="#1e293b")
        self.style.configure("Treeview", rowheight=26, font=("Segoe UI", 10))
        self.style.map("Treeview", background=[("selected", "#3b82f6")], foreground=[("selected", "white")])
        self.style.configure("TNotebook.Tab", font=("Segoe UI", 10, "bold"), padding=[12, 6])

    def _build_header(self):
        header_frame = tk.Frame(self.root, bg="#0f172a", padx=20, pady=14)
        header_frame.pack(fill=tk.X)

        title_lbl = tk.Label(
            header_frame,
            text="🖥️ ระบบจำลองการจัดตารางเวลาซีพียู (CPU Scheduling Simulator)",
            font=("Segoe UI", 16, "bold"),
            fg="#f8fafc",
            bg="#0f172a"
        )
        title_lbl.pack(anchor="w")

        subtitle_lbl = tk.Label(
            header_frame,
            text="ใบงานมินิโปรเจ็ควิชาระบบปฏิบัติการ (Operating Systems) • FCFS | SJF | Round Robin",
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg="#0f172a"
        )
        subtitle_lbl.pack(anchor="w", pady=(2, 0))

    def _build_input_panel(self):
        panel_outer = tk.Frame(self.root, bg="#f8fafc", padx=16, pady=10)
        panel_outer.pack(fill=tk.X)

        panel = tk.LabelFrame(
            panel_outer,
            text=" 📋 ข้อมูลโจทย์ (Processes Input Table) ",
            font=("Segoe UI", 11, "bold"),
            fg="#1e293b",
            bg="#ffffff",
            padx=14,
            pady=10,
            relief=tk.GROOVE,
            bd=1
        )
        panel.pack(fill=tk.X)

        # แบ่งเป็น 2 ฝั่ง: ซ้าย (ตารางแสดงโจทย์) | ขวา (เครื่องมือควบคุม & เพิ่ม/แก้ไข)
        left_box = tk.Frame(panel, bg="#ffffff")
        left_box.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 16))

        # ตารางโจทย์ (Treeview)
        cols = ("id", "at", "bt")
        self.tree_input = ttk.Treeview(left_box, columns=cols, show="headings", height=5, selectmode="browse")
        self.tree_input.heading("id", text="Process ID")
        self.tree_input.heading("at", text="Arrival Time (AT)")
        self.tree_input.heading("bt", text="Burst Time (BT)")
        self.tree_input.column("id", width=120, anchor="center")
        self.tree_input.column("at", width=140, anchor="center")
        self.tree_input.column("bt", width=140, anchor="center")

        tree_scroll = ttk.Scrollbar(left_box, orient=tk.VERTICAL, command=self.tree_input.yview)
        self.tree_input.configure(yscrollcommand=tree_scroll.set)

        self.tree_input.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        tree_scroll.pack(side=tk.RIGHT, fill=tk.Y)

        self.tree_input.bind("<<TreeviewSelect>>", self._on_input_select)
        self.tree_input.bind("<Double-1>", self._on_double_click_edit)

        # ฝั่งขวา: Controls & Toolset
        right_box = tk.Frame(panel, bg="#ffffff")
        right_box.pack(side=tk.RIGHT, fill=tk.Y)

        # แถว Quantum
        q_frame = tk.Frame(right_box, bg="#ffffff")
        q_frame.pack(fill=tk.X, pady=(0, 8))
        tk.Label(q_frame, text="Time Quantum (q):", font=("Segoe UI", 10, "bold"), bg="#ffffff", fg="#334155").pack(side=tk.LEFT)
        self.spin_q = tk.Spinbox(q_frame, from_=1, to=20, width=5, font=("Segoe UI", 10, "bold"), justify="center")
        self.spin_q.delete(0, tk.END)
        self.spin_q.insert(0, "2")
        self.spin_q.pack(side=tk.LEFT, padx=8)

        # ช่องกรอก / แก้ไข Process
        edit_frame = tk.LabelFrame(right_box, text=" จัดการ Process ", font=("Segoe UI", 9, "bold"), bg="#f8fafc", fg="#475569", padx=8, pady=6)
        edit_frame.pack(fill=tk.X, pady=(0, 8))

        row1 = tk.Frame(edit_frame, bg="#f8fafc")
        row1.pack(fill=tk.X, pady=2)
        tk.Label(row1, text="ID:", width=4, anchor="w", bg="#f8fafc").pack(side=tk.LEFT)
        self.entry_pid = tk.Entry(row1, width=7, font=("Segoe UI", 9))
        self.entry_pid.pack(side=tk.LEFT, padx=4)

        tk.Label(row1, text="AT:", width=3, anchor="w", bg="#f8fafc").pack(side=tk.LEFT)
        self.entry_at = tk.Entry(row1, width=6, font=("Segoe UI", 9))
        self.entry_at.pack(side=tk.LEFT, padx=4)

        tk.Label(row1, text="BT:", width=3, anchor="w", bg="#f8fafc").pack(side=tk.LEFT)
        self.entry_bt = tk.Entry(row1, width=6, font=("Segoe UI", 9))
        self.entry_bt.pack(side=tk.LEFT, padx=4)

        row2 = tk.Frame(edit_frame, bg="#f8fafc")
        row2.pack(fill=tk.X, pady=(4, 0))
        btn_save = tk.Button(row2, text="💾 บันทึก/เพิ่มงาน", font=("Segoe UI", 9), bg="#e2e8f0", fg="#0f172a", command=self._add_or_update_proc, relief=tk.RAISED, padx=6)
        btn_save.pack(side=tk.LEFT, padx=2)
        btn_del = tk.Button(row2, text="🗑️ ลบงาน", font=("Segoe UI", 9), bg="#fee2e2", fg="#991b1b", command=self._delete_proc, relief=tk.RAISED, padx=6)
        btn_del.pack(side=tk.LEFT, padx=2)

        # ปุ่มสุ่มโจทย์
        btn_box = tk.Frame(right_box, bg="#ffffff")
        btn_box.pack(fill=tk.X)
        btn_rand = tk.Button(
            btn_box,
            text="🎲 สุ่มโจทย์ใหม่ 5 งาน (ตามกติกา)",
            font=("Segoe UI", 9, "bold"),
            bg="#3b82f6",
            fg="white",
            activebackground="#2563eb",
            activeforeground="white",
            relief=tk.FLAT,
            padx=10,
            pady=4,
            cursor="hand2",
            command=lambda: self.randomize_processes(count=5)
        )
        btn_rand.pack(fill=tk.X, pady=2)

    def _build_action_bar(self):
        """ แถบปุ่มหลักสำหรับการเริ่มคำนวณตามความต้องการของผู้ใช้ """
        action_bar = tk.Frame(self.root, bg="#f8fafc", padx=16, pady=4)
        action_bar.pack(fill=tk.X)

        bar_inner = tk.Frame(action_bar, bg="#e2e8f0", padx=10, pady=8, relief=tk.SOLID, bd=1)
        bar_inner.pack(fill=tk.X)

        # ปุ่มเด่น: เริ่มคำนวณ
        self.btn_calculate = tk.Button(
            bar_inner,
            text="🚀 เริ่มคำนวณผลลัพธ์ (Start Calculation)",
            font=("Segoe UI", 12, "bold"),
            bg="#16a34a",
            fg="white",
            activebackground="#15803d",
            activeforeground="white",
            relief=tk.RAISED,
            bd=2,
            padx=20,
            pady=6,
            cursor="hand2",
            command=self.run_calculation
        )
        self.btn_calculate.pack(side=tk.LEFT, padx=(0, 10))

        # ปุ่มรีเซ็ต / ซ่อนผลลัพธ์
        self.btn_clear = tk.Button(
            bar_inner,
            text="🔄 ซ่อน/ล้างผลลัพธ์ (Clear View)",
            font=("Segoe UI", 10),
            bg="#ffffff",
            fg="#64748b",
            activebackground="#f1f5f9",
            relief=tk.GROOVE,
            bd=1,
            padx=12,
            pady=6,
            cursor="hand2",
            command=self.clear_results
        )
        self.btn_clear.pack(side=tk.LEFT)

        # ป้ายสถานะ
        self.lbl_status = tk.Label(
            bar_inner,
            text="⏳ สถานะ: ระบบยังไม่คำนวณ (กดปุ่ม 'เริ่มคำนวณ' เพื่อดูผลลัพธ์)",
            font=("Segoe UI", 10, "italic"),
            bg="#e2e8f0",
            fg="#475569"
        )
        self.lbl_status.pack(side=tk.RIGHT, padx=10)

    def _build_results_area(self):
        """ พื้นที่ผลลัพธ์: เริ่มต้นจะแสดง Placeholder จนกว่าจะกดปุ่มเริ่มคำนวณ """
        self.result_container = tk.Frame(self.root, bg="#f8fafc", padx=16, pady=8)
        self.result_container.pack(fill=tk.BOTH, expand=True)

        # 1. กล่องข้อความเมื่อยังไม่คำนวณ (Placeholder Frame)
        self.placeholder_frame = tk.Frame(self.result_container, bg="#ffffff", relief=tk.GROOVE, bd=1)
        self.placeholder_frame.pack(fill=tk.BOTH, expand=True)

        inner_p = tk.Frame(self.placeholder_frame, bg="#ffffff")
        inner_p.place(relx=0.5, rely=0.5, anchor=tk.CENTER)

        tk.Label(inner_p, text="📊", font=("Segoe UI", 48), bg="#ffffff").pack(pady=(0, 10))
        tk.Label(inner_p, text="ยังไม่มีการแสดงผลการคำนวณ", font=("Segoe UI", 16, "bold"), fg="#1e293b", bg="#ffffff").pack()
        tk.Label(
            inner_p,
            text="ระบบถูกตั้งค่าให้รอคำสั่งจากคุณ\nกรุณาตรวจสอบโจทย์ด้านบน จากนั้นกดปุ่ม \"🚀 เริ่มคำนวณผลลัพธ์\"\nระบบจะทำการประมวลผลทั้ง 3 อัลกอริทึม พร้อมวาด Gantt Chart และสรุปผลให้ทันที",
            font=("Segoe UI", 11),
            fg="#64748b",
            bg="#ffffff",
            justify=tk.CENTER
        ).pack(pady=12)

        # 2. สมุดแท็บผลลัพธ์ (Notebook Frame)
        self.notebook_frame = tk.Frame(self.result_container, bg="#f8fafc")
        self.notebook = ttk.Notebook(self.notebook_frame)
        self.notebook.pack(fill=tk.BOTH, expand=True)

        # สร้างแท็บทั้ง 4
        self.tab_fcfs = ttk.Frame(self.notebook)
        self.tab_sjf = ttk.Frame(self.notebook)
        self.tab_rr = ttk.Frame(self.notebook)
        self.tab_compare = ttk.Frame(self.notebook)

        self.notebook.add(self.tab_fcfs, text=" ⚡ 1. FCFS ")
        self.notebook.add(self.tab_sjf, text=" ⏱️ 2. SJF (Non-preemptive) ")
        self.notebook.add(self.tab_rr, text=" 🔄 3. Round Robin (RR) ")
        self.notebook.add(self.tab_compare, text=" 📊 4. ตารางเปรียบเทียบ ")

        # เตรียม Layout แต่ละแท็บ
        self._init_algo_tab(self.tab_fcfs, "fcfs")
        self._init_algo_tab(self.tab_sjf, "sjf")
        self._init_algo_tab(self.tab_rr, "rr")
        self._init_compare_tab(self.tab_compare)

    def _init_algo_tab(self, parent, key):
        # แถบ Gantt Chart ด้านบน
        gantt_box = tk.LabelFrame(parent, text=" Gantt Chart (ไทม์ไลน์การทำงาน) ", font=("Segoe UI", 10, "bold"), bg="#ffffff", padx=8, pady=6)
        gantt_box.pack(fill=tk.X, padx=10, pady=(8, 4))

        canvas_frame = tk.Frame(gantt_box, bg="#ffffff")
        canvas_frame.pack(fill=tk.X)

        canvas = tk.Canvas(canvas_frame, height=90, bg="#f8fafc", highlightthickness=1, highlightbackground="#cbd5e1")
        scroll_x = ttk.Scrollbar(canvas_frame, orient=tk.HORIZONTAL, command=canvas.xview)
        canvas.configure(xscrollcommand=scroll_x.set)

        canvas.pack(fill=tk.X, side=tk.TOP)
        scroll_x.pack(fill=tk.X, side=tk.BOTTOM)

        # แถบตารางผลลัพธ์ตรงกลาง
        table_box = tk.LabelFrame(parent, text=" ตารางผลลัพธ์การคำนวณ ", font=("Segoe UI", 10, "bold"), bg="#ffffff", padx=8, pady=6)
        table_box.pack(fill=tk.BOTH, expand=True, padx=10, pady=4)

        cols = ("id", "at", "bt", "ct", "tat", "wt")
        tree = ttk.Treeview(table_box, columns=cols, show="headings", height=5)
        tree.heading("id", text="Process ID")
        tree.heading("at", text="Arrival Time (AT)")
        tree.heading("bt", text="Burst Time (BT)")
        tree.heading("ct", text="Completion Time (CT)")
        tree.heading("tat", text="Turnaround Time (TAT)")
        tree.heading("wt", text="Waiting Time (WT)")

        for c in cols:
            tree.column(c, anchor="center")

        t_scroll = ttk.Scrollbar(table_box, orient=tk.VERTICAL, command=tree.yview)
        tree.configure(yscrollcommand=t_scroll.set)
        tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        t_scroll.pack(side=tk.RIGHT, fill=tk.Y)

        # การ์ดสรุปค่าเฉลี่ยด้านล่าง
        card_box = tk.Frame(parent, bg="#f1f5f9", padx=10, pady=6)
        card_box.pack(fill=tk.X, padx=10, pady=(2, 8))

        lbl_avg_tat = tk.Label(card_box, text="ค่าเฉลี่ย TAT: -", font=("Segoe UI", 11, "bold"), fg="#1e40af", bg="#f1f5f9")
        lbl_avg_tat.pack(side=tk.LEFT, padx=12)

        lbl_avg_wt = tk.Label(card_box, text="ค่าเฉลี่ย WT: -", font=("Segoe UI", 11, "bold"), fg="#047857", bg="#f1f5f9")
        lbl_avg_wt.pack(side=tk.LEFT, padx=12)

        lbl_formula = tk.Label(card_box, text="สูตร: TAT = CT - AT  |  WT = TAT - BT", font=("Segoe UI", 9, "italic"), fg="#64748b", bg="#f1f5f9")
        lbl_formula.pack(side=tk.RIGHT, padx=12)

        # บันทึก references
        setattr(self, f"{key}_canvas", canvas)
        setattr(self, f"{key}_tree", tree)
        setattr(self, f"{key}_lbl_tat", lbl_avg_tat)
        setattr(self, f"{key}_lbl_wt", lbl_avg_wt)

    def _init_compare_tab(self, parent):
        box = tk.LabelFrame(parent, text=" ตารางเปรียบเทียบประสิทธิภาพทั้ง 3 อัลกอริทึม ", font=("Segoe UI", 11, "bold"), bg="#ffffff", padx=14, pady=12)
        box.pack(fill=tk.BOTH, expand=True, padx=12, pady=10)

        cols = ("algo", "avg_tat", "avg_wt", "note")
        self.compare_tree = ttk.Treeview(box, columns=cols, show="headings", height=4)
        self.compare_tree.heading("algo", text="อัลกอริทึม")
        self.compare_tree.heading("avg_tat", text="Average Turnaround Time (TAT)")
        self.compare_tree.heading("avg_wt", text="Average Waiting Time (WT)")
        self.compare_tree.heading("note", text="การวิเคราะห์ผลลัพธ์")

        self.compare_tree.column("algo", width=180, anchor="w")
        self.compare_tree.column("avg_tat", width=180, anchor="center")
        self.compare_tree.column("avg_wt", width=180, anchor="center")
        self.compare_tree.column("note", width=300, anchor="w")
        self.compare_tree.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        self.lbl_best_algo = tk.Label(
            box,
            text="",
            font=("Segoe UI", 12, "bold"),
            fg="#059669",
            bg="#ecfdf5",
            relief=tk.GROOVE,
            padx=14,
            pady=10
        )
        self.lbl_best_algo.pack(fill=tk.X)

    # ==========================================
    # ฟังก์ชันจัดการข้อมูลโจทย์
    # ==========================================
    def randomize_processes(self, count=5):
        self.processes = []
        # กติกาใบงาน: กำหนดให้ P1 มี AT = 0 เสมอ
        self.processes.append(Process("P1", 0, random.randint(1, 8)))
        for i in range(2, count + 1):
            self.processes.append(Process(f"P{i}", random.randint(0, 10), random.randint(1, 8)))

        self._refresh_input_table()
        # เมื่อสุ่มโจทย์ใหม่ ให้ซ่อนผลลัพธ์เพื่อรอการกดเริ่มคำนวณ
        self.clear_results()

    def _refresh_input_table(self):
        for item in self.tree_input.get_children():
            self.tree_input.delete(item)
        for p in self.processes:
            self.tree_input.insert("", tk.END, values=(p.id, p.at, p.bt))

    def _on_input_select(self, event):
        sel = self.tree_input.selection()
        if sel:
            vals = self.tree_input.item(sel[0], "values")
            self.entry_pid.delete(0, tk.END)
            self.entry_pid.insert(0, vals[0])
            self.entry_at.delete(0, tk.END)
            self.entry_at.insert(0, vals[1])
            self.entry_bt.delete(0, tk.END)
            self.entry_bt.insert(0, vals[2])

    def _on_double_click_edit(self, event):
        self._on_input_select(event)

    def _add_or_update_proc(self):
        pid = self.entry_pid.get().strip()
        at_str = self.entry_at.get().strip()
        bt_str = self.entry_bt.get().strip()

        if not pid or not at_str or not bt_str:
            messagebox.showwarning("ข้อมูลไม่ครบ", "กรุณาระบุ Process ID, AT และ BT ให้ครบถ้วน")
            return
        try:
            at = int(at_str)
            bt = int(bt_str)
            if at < 0 or bt <= 0:
                raise ValueError()
        except ValueError:
            messagebox.showerror("ข้อมูลไม่ถูกต้อง", "Arrival Time (AT) ต้อง >= 0 และ Burst Time (BT) ต้อง > 0")
            return

        # ตรวจสอบว่ามีอยู่แล้วหรือไม่
        found = False
        for p in self.processes:
            if p.id.lower() == pid.lower():
                p.at = at
                p.bt = bt
                found = True
                break

        if not found:
            self.processes.append(Process(pid, at, bt))

        def sort_key(x):
            num = "".join(filter(str.isdigit, x.id))
            return (int(num) if num else x.id)

        self.processes.sort(key=sort_key)
        self._refresh_input_table()
        self.clear_results()

    def _delete_proc(self):
        sel = self.tree_input.selection()
        if not sel:
            messagebox.showinfo("แจ้งเตือน", "กรุณาคลิกเลือก Process ที่ต้องการลบจากตาราง")
            return
        vals = self.tree_input.item(sel[0], "values")
        pid = vals[0]
        self.processes = [p for p in self.processes if p.id != pid]
        self._refresh_input_table()
        self.clear_results()

    # ==========================================
    # ฟังก์ชันเริ่มคำนวณและแสดงผล (Core Action)
    # ==========================================
    def run_calculation(self):
        """ ฟังก์ชันที่ทำงานเมื่อผู้ใช้กดปุ่ม 'เริ่มคำนวณผลลัพธ์' """
        if not self.processes:
            messagebox.showerror("ไม่มีข้อมูล", "กรุณาระบุข้อมูลงาน (Processes) อย่างน้อย 1 งานก่อนเริ่มคำนวณ")
            return

        try:
            q = int(self.spin_q.get())
            if q < 1:
                raise ValueError()
        except ValueError:
            messagebox.showerror("ค่าไม่ถูกต้อง", "กรุณาระบุ Time Quantum (q) เป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป")
            return

        # 1. รันการคำนวณทั้ง 3 อัลกอริทึม
        fcfs_res, fcfs_tat, fcfs_wt, fcfs_gantt = calculate_fcfs(self.processes)
        sjf_res, sjf_tat, sjf_wt, sjf_gantt = calculate_sjf(self.processes)
        rr_res, rr_tat, rr_wt, rr_gantt = calculate_rr(self.processes, q=q)

        # 2. ปรับเปลี่ยนหน้าจอ: ซ่อน Placeholder แล้วแสดง Notebook Tabs ผลลัพธ์
        self.placeholder_frame.pack_forget()
        self.notebook_frame.pack(fill=tk.BOTH, expand=True)
        self.has_calculated = True

        # ปรับสถานะข้อความ
        self.lbl_status.config(
            text=f"✅ คำนวณสำเร็จ! (ประมวลผล {len(self.processes)} งาน, Time Quantum = {q})",
            fg="#15803d"
        )

        # 3. เติมข้อมูลลงในแท็บ FCFS
        self._populate_algo_tab("fcfs", fcfs_res, fcfs_tat, fcfs_wt, fcfs_gantt)

        # 4. เติมข้อมูลลงในแท็บ SJF
        self._populate_algo_tab("sjf", sjf_res, sjf_tat, sjf_wt, sjf_gantt)

        # 5. เติมข้อมูลลงในแท็บ RR
        self.notebook.tab(self.tab_rr, text=f" 🔄 3. Round Robin (q={q}) ")
        self._populate_algo_tab("rr", rr_res, rr_tat, rr_wt, rr_gantt)

        # 6. เติมข้อมูลลงในแท็บเปรียบเทียบ
        self._populate_compare_tab(fcfs_tat, fcfs_wt, sjf_tat, sjf_wt, rr_tat, rr_wt, q)

        # สลับไปที่แท็บแรก
        self.notebook.select(self.tab_fcfs)

    def clear_results(self):
        """ ซ่อนผลการคำนวณ และกลับไปแสดงหน้าจอยังไม่คำนวณ """
        self.notebook_frame.pack_forget()
        self.placeholder_frame.pack(fill=tk.BOTH, expand=True)
        self.has_calculated = False
        self.lbl_status.config(
            text="⏳ สถานะ: ระบบยังไม่คำนวณ (กดปุ่ม 'เริ่มคำนวณ' เพื่อดูผลลัพธ์)",
            fg="#475569"
        )

    def _populate_algo_tab(self, key, results, avg_tat, avg_wt, gantt):
        # เติมตาราง
        tree = getattr(self, f"{key}_tree")
        for item in tree.get_children():
            tree.delete(item)
        for p in results:
            tree.insert("", tk.END, values=(p.id, p.at, p.bt, p.ct, p.tat, p.wt))

        # สรุปค่าเฉลี่ย
        getattr(self, f"{key}_lbl_tat").config(text=f"ค่าเฉลี่ย TAT: {avg_tat:.2f}")
        getattr(self, f"{key}_lbl_wt").config(text=f"ค่าเฉลี่ย WT: {avg_wt:.2f}")

        # วาด Gantt Chart
        canvas = getattr(self, f"{key}_canvas")
        self._draw_gantt(canvas, gantt)

    def _draw_gantt(self, canvas, gantt):
        canvas.delete("all")
        if not gantt:
            return

        total_time = gantt[-1]["end"]
        # ปรับ Scale พิกเซลตามระยะเวลาทั้งหมด
        scale = max(38, min(70, 750 // max(total_time, 1)))
        start_x = 20
        y_top = 15
        height = 42

        canvas.create_text(start_x, y_top + height + 16, text="0", font=("Segoe UI", 9, "bold"), fill="#475569")

        for block in gantt:
            pid = block["id"]
            duration = block["end"] - block["start"]
            block_width = duration * scale
            x1 = start_x + (block["start"] * scale)
            x2 = x1 + block_width
            y1 = y_top
            y2 = y1 + height

            color = self.COLOR_MAP.get(pid, "#6366f1")
            text_color = "white" if pid != "IDLE" else "#1e293b"

            # วาดสี่เหลี่ยมบล็อก
            canvas.create_rectangle(x1, y1, x2, y2, fill=color, outline="#ffffff", width=2)
            # ข้อความชื่อ Process
            canvas.create_text((x1 + x2) / 2, (y1 + y2) / 2, text=pid, font=("Segoe UI", 10, "bold"), fill=text_color)
            # ตัวเลขเวลาสิ้นสุดใต้บล็อก
            canvas.create_text(x2, y2 + 16, text=str(block["end"]), font=("Segoe UI", 9, "bold"), fill="#475569")

        total_width = start_x + (total_time * scale) + 40
        canvas.config(scrollregion=(0, 0, total_width, 100))

    def _populate_compare_tab(self, fcfs_tat, fcfs_wt, sjf_tat, sjf_wt, rr_tat, rr_wt, q):
        for item in self.compare_tree.get_children():
            self.compare_tree.delete(item)

        items = [
            ("FCFS", fcfs_tat, fcfs_wt, "เรียบง่าย ทำตามลำดับมาถึง (อาจเกิด Convoy Effect)"),
            ("SJF (Non-preemptive)", sjf_tat, sjf_wt, "ให้คิวงานสั้นที่สุดทำก่อน ลดเวลารอคอยเฉลี่ยได้ดี"),
            (f"Round Robin (q={q})", rr_tat, rr_wt, f"หมุนเวียนแบ่งปัน CPU เท่าเทียมกันครั้งละ {q} หน่วย")
        ]

        # หาอัลกอริทึมที่มี WT ต่ำสุด
        min_wt = min(fcfs_wt, sjf_wt, rr_wt)

        for name, tat, wt, note in items:
            tag = "best" if wt == min_wt else "normal"
            self.compare_tree.insert("", tk.END, values=(name, f"{tat:.2f}", f"{wt:.2f}", note), tags=(tag,))

        self.compare_tree.tag_configure("best", background="#dcfce7", font=("Segoe UI", 10, "bold"))

        best_names = []
        if fcfs_wt == min_wt: best_names.append("FCFS")
        if sjf_wt == min_wt: best_names.append("SJF")
        if rr_wt == min_wt: best_names.append("Round Robin")

        self.lbl_best_algo.config(
            text=f"🏆 อัลกอริทึมที่มีประสิทธิภาพสูงสุดสำหรับชุดข้อมูลนี้ (Average WT ต่ำสุด = {min_wt:.2f}): {', '.join(best_names)}"
        )


# ==========================================
# 4. ฟังก์ชันหลักสำหรับรันโปรแกรม
# ==========================================
def main():
    root = tk.Tk()
    app = CPUSchedulingGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
