// ============================================================
//  data/seed/seedAll.js  — Run everything in one shot
//  Usage: node data/seed/seedAll.js
// ============================================================
"use strict";
require("dotenv").config();
const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  // ── Load models AFTER connection ─────────────────────────
  const User      = require("../../models/User");
  const Analytics = require("../../models/Analytics");
  const { Cohort } = require("../../models/Cohort");
  const Question  = require("../../models/Question");

  // ── Verify models loaded correctly ───────────────────────
  if (typeof Analytics.countDocuments !== "function") {
    console.error("❌ Analytics model failed to load. Check models/Analytics.js");
    process.exit(1);
  }
  console.log("✅ All models loaded correctly\n");

  // ── DIAGNOSTICS ───────────────────────────────────────────
  console.log("📊 CURRENT DB STATE:");
  console.log("   Users:     ", await User.countDocuments());
  console.log("   Students:  ", await User.countDocuments({ role: "student" }));
  console.log("   Analytics: ", await Analytics.countDocuments());
  console.log("   Cohorts:   ", await Cohort.countDocuments());
  console.log("   Questions: ", await Question.countDocuments());
  console.log("");

  // ── STEP 1: Ensure staff accounts exist ──────────────────
  console.log("👤 Creating staff accounts...");
  const staffData = [
    { name: "Dr. Bharathi Priya", email: "staff@kct.ac.in",   password: "Staff@123",   role: "staff" },
    { name: "Super Admin",        email: "admin@kct.ac.in",   password: "Admin@123",   role: "admin" },
    { name: "Arun Kumar",         email: "student@kct.ac.in", password: "Student@123", role: "student",
      department: "Computer Science & Engineering", rollNumber: "22CS001", cgpa: 8.5 },
  ];
  for (const s of staffData) {
    const exists = await User.findOne({ email: s.email });
    if (!exists) {
      await User.create(s);
      console.log(`   ✅ Created: ${s.email}`);
    } else {
      console.log(`   ⏭  Exists:  ${s.email}`);
    }
  }

  // ── STEP 2: Seed 30 demo students ────────────────────────
  const cohorts = await Cohort.find({ isActive: true }).lean();
  if (cohorts.length === 0) {
    console.log("\n⚠️  No cohorts found — run seedCohorts.js first, then re-run this script.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`\n👥 Seeding demo students across ${cohorts.length} cohorts...`);
  const NAMES = [
    "Priya Sharma","Rahul Verma","Sneha Patel","Karthik Rajan","Divya Menon",
    "Arjun Singh","Meera Nair","Vikram Reddy","Ananya Iyer","Suresh Babu",
    "Lakshmi Devi","Rohan Gupta","Pooja Krishnan","Nikhil Tiwari","Shalini Rao",
    "Deepak Pillai","Kavitha Mohan","Harish Naik","Revathi Subramaniam","Ajay Chandran",
    "Nisha Varma","Santhosh Kumar","Parvathy Nair","Vignesh Murugan","Aarti Balan",
    "Sriram Venkat","Geetha Raman","Praveen Das","Amala George","Roshan Thomas",
  ];
  const DEPTS = ["Computer Science & Engineering","Information Technology","Electronics & Communication","Electrical Engineering","Mechanical Engineering"];

  let studentsCreated = 0;
  for (let i = 0; i < NAMES.length; i++) {
    const name   = NAMES[i];
    const roll   = `22CS${String(i + 1).padStart(3, "0")}`;
    const email  = `${name.split(" ")[0].toLowerCase()}.${roll.toLowerCase()}@kct.ac.in`;
    const cohort = cohorts[i % cohorts.length];
    const cgpa   = parseFloat((6.5 + Math.random() * 3).toFixed(1));

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name, email, password: "Student@123", role: "student",
        department: DEPTS[i % DEPTS.length],
        rollNumber: roll, cgpa, cohort: cohort._id,
      });
      studentsCreated++;
    }

    // Create or update analytics with real scores
    const dsaScore  = Math.floor(20 + Math.random() * 75);
    const osScore   = Math.floor(15 + Math.random() * 80);
    const dbmsScore = Math.floor(20 + Math.random() * 75);
    const cnScore   = Math.floor(10 + Math.random() * 80);
    const scores    = [dsaScore, osScore, dbmsScore, cnScore];
    const overall   = Math.round(scores.reduce((a, b) => a + b) / scores.length);

    await Analytics.findOneAndUpdate(
      { user: user._id },
      {
        user: user._id, cohort: cohort._id,
        dsaScore, osScore, dbmsScore, cnScore, overallScore: overall,
        dsaAttempts: Math.ceil(Math.random() * 5),
        osAttempts:  Math.ceil(Math.random() * 4),
        dbmsAttempts:Math.ceil(Math.random() * 4),
        cnAttempts:  Math.ceil(Math.random() * 3),
        codePassed:  Math.floor(Math.random() * 5),
        easyPassed:  Math.floor(Math.random() * 3),
        mediumPassed:Math.floor(Math.random() * 2),
        hardPassed:  0,
        totalCodeSubmissions: Math.ceil(Math.random() * 8),
      },
      { upsert: true, new: true }
    );
  }
  console.log(`   ✅ ${studentsCreated} new students created, analytics updated for all 30\n`);

  // ── STEP 3: Seed MCQ questions ────────────────────────────
  console.log("📝 Seeding MCQ questions...");
  await Question.deleteMany({ type: "mcq" });

  const mcqData = [
    // OS (10)
    { subject:"OS", topic:"Process Management", difficulty:"easy", title:"What is a process?",
      description:"Which best describes a process in an OS?",
      options:[{text:"A program on disk",isCorrect:false},{text:"A program in execution",isCorrect:true},{text:"A file in memory",isCorrect:false},{text:"Hardware",isCorrect:false}],
      explanation:"A process is a program in execution including its code, data, and resources.", points:10 },
    { subject:"OS", topic:"Process Management", difficulty:"medium", title:"Deadlock Conditions",
      description:"Which is NOT a necessary condition for deadlock?",
      options:[{text:"Mutual Exclusion",isCorrect:false},{text:"Hold and Wait",isCorrect:false},{text:"Preemption",isCorrect:true},{text:"Circular Wait",isCorrect:false}],
      explanation:"Preemption PREVENTS deadlock. The 4 conditions are Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.", points:10 },
    { subject:"OS", topic:"CPU Scheduling", difficulty:"easy", title:"Round Robin Parameter",
      description:"Key parameter in Round Robin scheduling?",
      options:[{text:"Process priority",isCorrect:false},{text:"Time quantum",isCorrect:true},{text:"Memory size",isCorrect:false},{text:"CPU count",isCorrect:false}],
      explanation:"Time quantum determines how long each process runs before being preempted.", points:10 },
    { subject:"OS", topic:"Memory Management", difficulty:"medium", title:"Virtual Memory",
      description:"Main purpose of virtual memory?",
      options:[{text:"Speed up CPU",isCorrect:false},{text:"Allow programs larger than RAM to run",isCorrect:true},{text:"Permanent storage",isCorrect:false},{text:"Replace HDD",isCorrect:false}],
      explanation:"Virtual memory uses disk as an extension of RAM.", points:10 },
    { subject:"OS", topic:"Memory Management", difficulty:"hard", title:"Belady's Anomaly",
      description:"Which algorithm suffers from Belady's Anomaly?",
      options:[{text:"LRU",isCorrect:false},{text:"Optimal",isCorrect:false},{text:"FIFO",isCorrect:true},{text:"LFU",isCorrect:false}],
      explanation:"FIFO can show more page faults with more frames — Belady's Anomaly.", points:15 },
    { subject:"OS", topic:"Synchronization", difficulty:"medium", title:"Semaphore Value 0",
      description:"Binary semaphore with value 0 means?",
      options:[{text:"Resource available",isCorrect:false},{text:"Resource locked",isCorrect:true},{text:"Process ended",isCorrect:false},{text:"Memory full",isCorrect:false}],
      explanation:"0 = locked, 1 = available in binary semaphore.", points:10 },
    { subject:"OS", topic:"Process Management", difficulty:"easy", title:"Process States",
      description:"Which is NOT a valid process state?",
      options:[{text:"Ready",isCorrect:false},{text:"Running",isCorrect:false},{text:"Compiling",isCorrect:true},{text:"Blocked",isCorrect:false}],
      explanation:"Process states: New, Ready, Running, Blocked, Terminated. No 'Compiling' state.", points:10 },
    { subject:"OS", topic:"CPU Scheduling", difficulty:"medium", title:"Minimum Avg Wait Time",
      description:"Which algorithm gives minimum average waiting time?",
      options:[{text:"FCFS",isCorrect:false},{text:"SJF Preemptive (SRTF)",isCorrect:true},{text:"Round Robin",isCorrect:false},{text:"Priority",isCorrect:false}],
      explanation:"Preemptive SJF (SRTF) is optimal for minimum average waiting time.", points:10 },
    { subject:"OS", topic:"Synchronization", difficulty:"hard", title:"Dining Philosophers",
      description:"Dining Philosophers problem illustrates:",
      options:[{text:"CPU scheduling",isCorrect:false},{text:"Memory allocation",isCorrect:false},{text:"Deadlock and resource sharing",isCorrect:true},{text:"File management",isCorrect:false}],
      explanation:"Classic problem demonstrating deadlock and resource contention.", points:15 },
    { subject:"OS", topic:"Memory Management", difficulty:"hard", title:"TLB Purpose",
      description:"Purpose of Translation Lookaside Buffer?",
      options:[{text:"Store user programs",isCorrect:false},{text:"Cache page table entries for fast address translation",isCorrect:true},{text:"Replace RAM",isCorrect:false},{text:"Handle interrupts",isCorrect:false}],
      explanation:"TLB caches recent page table lookups to speed up virtual-to-physical address translation.", points:15 },

    // DBMS (10)
    { subject:"DBMS", topic:"Normalization", difficulty:"medium", title:"Second Normal Form",
      description:"2NF eliminates:",
      options:[{text:"Transitive dependencies",isCorrect:false},{text:"Partial dependencies on composite PK",isCorrect:true},{text:"Multi-valued attributes",isCorrect:false},{text:"Duplicate rows",isCorrect:false}],
      explanation:"2NF: every non-key attribute must depend on the WHOLE primary key.", points:10 },
    { subject:"DBMS", topic:"SQL", difficulty:"easy", title:"PRIMARY KEY",
      description:"Which ensures unique AND non-null values?",
      options:[{text:"FOREIGN KEY",isCorrect:false},{text:"UNIQUE",isCorrect:false},{text:"PRIMARY KEY",isCorrect:true},{text:"CHECK",isCorrect:false}],
      explanation:"PRIMARY KEY = UNIQUE + NOT NULL. One per table.", points:10 },
    { subject:"DBMS", topic:"Transactions", difficulty:"medium", title:"ACID Atomicity",
      description:"Which ACID property ensures all-or-nothing?",
      options:[{text:"Consistency",isCorrect:false},{text:"Isolation",isCorrect:false},{text:"Atomicity",isCorrect:true},{text:"Durability",isCorrect:false}],
      explanation:"Atomicity: if any part fails, entire transaction rolls back.", points:10 },
    { subject:"DBMS", topic:"SQL", difficulty:"easy", title:"LEFT JOIN",
      description:"LEFT JOIN returns:",
      options:[{text:"Only matching rows",isCorrect:false},{text:"All left rows + matching right rows",isCorrect:true},{text:"All right rows",isCorrect:false},{text:"All rows from both",isCorrect:false}],
      explanation:"LEFT JOIN returns all left-table rows; unmatched right columns are NULL.", points:10 },
    { subject:"DBMS", topic:"Indexing", difficulty:"hard", title:"B+ Tree vs B Tree",
      description:"Why B+ trees preferred for DB indexes?",
      options:[{text:"Less memory",isCorrect:false},{text:"All data at linked leaf nodes — efficient range queries",isCorrect:true},{text:"Faster point lookups",isCorrect:false},{text:"More data types",isCorrect:false}],
      explanation:"B+ tree leaf nodes are linked, enabling fast range scans.", points:15 },
    { subject:"DBMS", topic:"SQL", difficulty:"medium", title:"WHERE vs HAVING",
      description:"Difference between WHERE and HAVING?",
      options:[{text:"WHERE filters after grouping",isCorrect:false},{text:"HAVING filters after GROUP BY; WHERE filters rows before",isCorrect:true},{text:"They're interchangeable",isCorrect:false},{text:"WHERE works with aggregates",isCorrect:false}],
      explanation:"WHERE filters rows before grouping. HAVING filters groups after GROUP BY.", points:10 },
    { subject:"DBMS", topic:"Transactions", difficulty:"hard", title:"Isolation Level",
      description:"Prevents dirty reads but allows non-repeatable reads?",
      options:[{text:"Read Uncommitted",isCorrect:false},{text:"Read Committed",isCorrect:true},{text:"Repeatable Read",isCorrect:false},{text:"Serializable",isCorrect:false}],
      explanation:"Read Committed prevents dirty reads but not non-repeatable reads.", points:15 },
    { subject:"DBMS", topic:"SQL", difficulty:"easy", title:"DELETE vs TRUNCATE",
      description:"Key difference?",
      options:[{text:"DELETE removes structure",isCorrect:false},{text:"TRUNCATE is DDL and cannot be rolled back; DELETE is DML",isCorrect:true},{text:"They're identical",isCorrect:false},{text:"DELETE is faster",isCorrect:false}],
      explanation:"TRUNCATE: DDL, no rollback, resets identity. DELETE: DML, can rollback, fires triggers.", points:10 },
    { subject:"DBMS", topic:"Normalization", difficulty:"easy", title:"1NF",
      description:"First Normal Form requires:",
      options:[{text:"No partial dependencies",isCorrect:false},{text:"All columns contain atomic values",isCorrect:true},{text:"No transitive dependencies",isCorrect:false},{text:"Single-column PK",isCorrect:false}],
      explanation:"1NF: each column must hold indivisible atomic values, no repeating groups.", points:10 },
    { subject:"DBMS", topic:"Indexing", difficulty:"medium", title:"Clustered Index",
      description:"Clustered vs non-clustered index?",
      options:[{text:"Clustered is faster always",isCorrect:false},{text:"Clustered physically reorders data; only one per table",isCorrect:true},{text:"Non-clustered stores data rows",isCorrect:false},{text:"Many clustered indexes allowed",isCorrect:false}],
      explanation:"One clustered index per table (physically sorts data). Multiple non-clustered allowed.", points:10 },

    // CN (10)
    { subject:"CN", topic:"OSI Model", difficulty:"easy", title:"OSI Layers",
      description:"How many layers in OSI model?",
      options:[{text:"4",isCorrect:false},{text:"5",isCorrect:false},{text:"6",isCorrect:false},{text:"7",isCorrect:true}],
      explanation:"7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.", points:10 },
    { subject:"CN", topic:"TCP/IP", difficulty:"medium", title:"UDP for Streaming",
      description:"Best protocol for live video?",
      options:[{text:"TCP",isCorrect:false},{text:"UDP",isCorrect:true},{text:"HTTP",isCorrect:false},{text:"FTP",isCorrect:false}],
      explanation:"UDP: no retransmission, lower latency — ideal for real-time streaming.", points:10 },
    { subject:"CN", topic:"IP Addressing", difficulty:"medium", title:"Subnet /24",
      description:"/24 subnet mask means?",
      options:[{text:"24 hosts",isCorrect:false},{text:"24 network bits, 8 host bits",isCorrect:true},{text:"24 subnets",isCorrect:false},{text:"24 routers",isCorrect:false}],
      explanation:"/24 = 256 addresses (254 usable hosts).", points:10 },
    { subject:"CN", topic:"Application Layer", difficulty:"easy", title:"DNS",
      description:"Primary function of DNS?",
      options:[{text:"Encrypt traffic",isCorrect:false},{text:"Assign IPs dynamically",isCorrect:false},{text:"Translate domain names to IPs",isCorrect:true},{text:"Route packets",isCorrect:false}],
      explanation:"DNS resolves human-readable names (google.com) to IP addresses.", points:10 },
    { subject:"CN", topic:"TCP/IP", difficulty:"hard", title:"TCP Handshake",
      description:"Correct TCP 3-way handshake?",
      options:[{text:"SYN→ACK→SYN-ACK",isCorrect:false},{text:"SYN→SYN-ACK→ACK",isCorrect:true},{text:"ACK→SYN→SYN-ACK",isCorrect:false},{text:"SYN-ACK→SYN→ACK",isCorrect:false}],
      explanation:"Client SYN → Server SYN-ACK → Client ACK. Connection established.", points:15 },
    { subject:"CN", topic:"OSI Model", difficulty:"medium", title:"Transport Layer",
      description:"TCP/UDP operate at which OSI layer?",
      options:[{text:"Network (3)",isCorrect:false},{text:"Transport (4)",isCorrect:true},{text:"Session (5)",isCorrect:false},{text:"Application (7)",isCorrect:false}],
      explanation:"Layer 4 (Transport) provides end-to-end communication via TCP/UDP.", points:10 },
    { subject:"CN", topic:"IP Addressing", difficulty:"hard", title:"IPv6 Size",
      description:"How many bits in an IPv6 address?",
      options:[{text:"32",isCorrect:false},{text:"64",isCorrect:false},{text:"128",isCorrect:true},{text:"256",isCorrect:false}],
      explanation:"IPv4 = 32 bits. IPv6 = 128 bits (340 undecillion addresses).", points:15 },
    { subject:"CN", topic:"Application Layer", difficulty:"easy", title:"HTTP vs HTTPS",
      description:"Main difference?",
      options:[{text:"HTTPS is faster",isCorrect:false},{text:"HTTPS encrypts with TLS/SSL",isCorrect:true},{text:"HTTP uses port 443",isCorrect:false},{text:"HTTPS is older",isCorrect:false}],
      explanation:"HTTPS = HTTP + TLS encryption. Uses port 443. HTTP uses port 80.", points:10 },
    { subject:"CN", topic:"TCP/IP", difficulty:"medium", title:"TCP Flow Control",
      description:"TCP flow control mechanism?",
      options:[{text:"Checksum only",isCorrect:false},{text:"Sliding Window",isCorrect:true},{text:"TTL",isCorrect:false},{text:"Sequence numbers only",isCorrect:false}],
      explanation:"Sliding Window: receiver tells sender how much data it can accept.", points:10 },
    { subject:"CN", topic:"IP Addressing", difficulty:"medium", title:"Private IP Range",
      description:"Which is a private IP range?",
      options:[{text:"8.8.8.0/24",isCorrect:false},{text:"192.168.0.0/16",isCorrect:true},{text:"172.217.0.0/16",isCorrect:false},{text:"100.0.0.0/8",isCorrect:false}],
      explanation:"Private ranges (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.", points:10 },
  ].map(q => ({ ...q, type: "mcq", isActive: true }));

  const inserted = await Question.insertMany(mcqData);
  console.log(`   ✅ ${inserted.length} MCQ questions inserted (OS: 10, DBMS: 10, CN: 10)\n`);

  // ── STEP 4: Final state ───────────────────────────────────
  console.log("📊 FINAL DB STATE:");
  console.log("   Students:  ", await User.countDocuments({ role: "student" }));
  console.log("   Analytics: ", await Analytics.countDocuments());
  console.log("   Questions: ", await Question.countDocuments({ type: "mcq" }));

  // Show score range
  const scores = await Analytics.find({ overallScore: { $gt: 0 } }).select("overallScore").lean();
  if (scores.length) {
    const vals = scores.map(s => s.overallScore);
    console.log(`   Score range: ${Math.min(...vals)}% – ${Math.max(...vals)}%`);
  }

  console.log("\n🎉 Done! Refresh the staff dashboard.\n");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});