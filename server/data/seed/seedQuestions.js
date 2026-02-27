require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../../models/Question");
const { Module } = require("../../models/Cohort");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  await Question.deleteMany({ type: "mcq" });
  console.log("🗑️  Cleared MCQ questions");

  // ── OS QUESTIONS (15) ─────────────────────────────────────
  const osQ = await Question.insertMany([
    {
      type:"mcq", subject:"OS", topic:"Process Management", difficulty:"easy",
      title:"What is a process?",
      description:"Which best describes a process in an OS?",
      options:[{text:"A program stored on disk",isCorrect:false},{text:"A program in execution",isCorrect:true},{text:"A file in memory",isCorrect:false},{text:"A hardware component",isCorrect:false}],
      explanation:"A process is a program in execution — includes code, current activity (PC, registers), and resources.",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"Process Management", difficulty:"medium",
      title:"Deadlock Necessary Conditions",
      description:"Which is NOT a necessary condition for deadlock?",
      options:[{text:"Mutual Exclusion",isCorrect:false},{text:"Hold and Wait",isCorrect:false},{text:"Preemption",isCorrect:true},{text:"Circular Wait",isCorrect:false}],
      explanation:"The 4 necessary conditions are Mutual Exclusion, Hold and Wait, NO Preemption, Circular Wait. Preemption prevents deadlock.",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"Memory Management", difficulty:"medium",
      title:"Virtual Memory Purpose",
      description:"What is the main purpose of virtual memory?",
      options:[{text:"Increase CPU speed",isCorrect:false},{text:"Allow programs larger than physical RAM to run",isCorrect:true},{text:"Store permanent data",isCorrect:false},{text:"Replace the hard disk",isCorrect:false}],
      explanation:"Virtual memory uses disk space as an extension of RAM, enabling programs larger than physical memory to execute.",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"CPU Scheduling", difficulty:"easy",
      title:"Round Robin Time Quantum",
      description:"In Round Robin scheduling, what is the key parameter?",
      options:[{text:"Priority of processes",isCorrect:false},{text:"Time quantum",isCorrect:true},{text:"Memory size",isCorrect:false},{text:"Number of CPUs",isCorrect:false}],
      explanation:"Time quantum is key in Round Robin. Too small = high overhead. Too large = behaves like FCFS.",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"Memory Management", difficulty:"hard",
      title:"Belady's Anomaly",
      description:"Which page replacement algorithm suffers from Belady's anomaly?",
      options:[{text:"LRU",isCorrect:false},{text:"Optimal",isCorrect:false},{text:"FIFO",isCorrect:true},{text:"LFU",isCorrect:false}],
      explanation:"In FIFO, increasing frames can INCREASE page faults (Belady's anomaly). LRU and Optimal don't have this.",
      points:15,
    },
    {
      type:"mcq", subject:"OS", topic:"Synchronization", difficulty:"medium",
      title:"Binary Semaphore Value 0",
      description:"What does a binary semaphore with value 0 indicate?",
      options:[{text:"Resource available",isCorrect:false},{text:"Resource locked",isCorrect:true},{text:"Process terminated",isCorrect:false},{text:"Memory full",isCorrect:false}],
      explanation:"Binary semaphore: 1 = available, 0 = locked. wait() on 0 blocks the process.",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"Process Management", difficulty:"easy",
      title:"Process States",
      description:"Which is NOT a valid process state?",
      options:[{text:"Ready",isCorrect:false},{text:"Running",isCorrect:false},{text:"Compiling",isCorrect:true},{text:"Blocked",isCorrect:false}],
      explanation:"Process states are: New, Ready, Running, Blocked/Waiting, Terminated. 'Compiling' is not a process state.",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"CPU Scheduling", difficulty:"medium",
      title:"Shortest Job First",
      description:"Which scheduling algorithm gives minimum average waiting time?",
      options:[{text:"FCFS",isCorrect:false},{text:"SJF (preemptive)",isCorrect:true},{text:"Round Robin",isCorrect:false},{text:"Priority",isCorrect:false}],
      explanation:"Preemptive SJF (SRTF) gives minimum average waiting time among all algorithms. It's optimal but requires knowing burst time in advance.",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"Memory Management", difficulty:"medium",
      title:"Paging vs Segmentation",
      description:"What is the main advantage of paging over segmentation?",
      options:[{text:"Paging allows variable partition sizes",isCorrect:false},{text:"Paging eliminates external fragmentation",isCorrect:true},{text:"Paging is faster",isCorrect:false},{text:"Paging uses less memory",isCorrect:false}],
      explanation:"Paging eliminates external fragmentation by using fixed-size frames. Segmentation can cause external fragmentation due to variable sizes.",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"Synchronization", difficulty:"hard",
      title:"Dining Philosophers Problem",
      description:"The Dining Philosophers problem primarily illustrates:",
      options:[{text:"CPU scheduling",isCorrect:false},{text:"Memory allocation",isCorrect:false},{text:"Deadlock and resource sharing",isCorrect:true},{text:"File management",isCorrect:false}],
      explanation:"The Dining Philosophers problem illustrates deadlock and resource sharing challenges — philosophers competing for shared forks (resources).",
      points:15,
    },
    {
      type:"mcq", subject:"OS", topic:"File Systems", difficulty:"easy",
      title:"File System Purpose",
      description:"What does a file system primarily manage?",
      options:[{text:"CPU allocation",isCorrect:false},{text:"Storage organization and access",isCorrect:true},{text:"Network connections",isCorrect:false},{text:"Process scheduling",isCorrect:false}],
      explanation:"A file system manages how data is stored, organized, and accessed on storage devices (naming, directories, permissions, allocation).",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"Memory Management", difficulty:"hard",
      title:"TLB in Virtual Memory",
      description:"What is the purpose of the Translation Lookaside Buffer (TLB)?",
      options:[{text:"Store user programs",isCorrect:false},{text:"Cache page table entries for fast address translation",isCorrect:true},{text:"Replace RAM",isCorrect:false},{text:"Handle interrupts",isCorrect:false}],
      explanation:"TLB is a hardware cache that stores recent page table entries. Speeds up virtual-to-physical address translation by avoiding main memory lookup.",
      points:15,
    },
    {
      type:"mcq", subject:"OS", topic:"Process Management", difficulty:"medium",
      title:"Context Switching",
      description:"Context switching refers to:",
      options:[{text:"Switching between user and kernel mode",isCorrect:false},{text:"Saving and restoring CPU state when switching processes",isCorrect:true},{text:"Moving processes between memory and disk",isCorrect:false},{text:"Changing process priority",isCorrect:false}],
      explanation:"Context switching saves the CPU state (registers, PC) of the current process and restores the state of the next process to run.",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"CPU Scheduling", difficulty:"easy",
      title:"FCFS Disadvantage",
      description:"The main disadvantage of FCFS scheduling is:",
      options:[{text:"Complex implementation",isCorrect:false},{text:"Convoy effect — short jobs wait behind long ones",isCorrect:true},{text:"Starvation of high priority processes",isCorrect:false},{text:"High overhead",isCorrect:false}],
      explanation:"FCFS causes the convoy effect — short processes are stuck waiting behind long processes, increasing average waiting time.",
      points:10,
    },
    {
      type:"mcq", subject:"OS", topic:"Synchronization", difficulty:"medium",
      title:"Mutex vs Semaphore",
      description:"The key difference between a mutex and a semaphore is:",
      options:[{text:"Mutex allows multiple threads, semaphore allows one",isCorrect:false},{text:"Mutex is owned by a thread; semaphore has no ownership",isCorrect:true},{text:"They are identical",isCorrect:false},{text:"Semaphore is faster",isCorrect:false}],
      explanation:"Mutex has ownership — only the thread that locked it can unlock it. Semaphore has no ownership, any thread can signal it.",
      points:10,
    },
  ]);
  console.log(`✅ ${osQ.length} OS questions`);

  // ── DBMS QUESTIONS (15) ───────────────────────────────────
  const dbQ = await Question.insertMany([
    {
      type:"mcq", subject:"DBMS", topic:"Normalization", difficulty:"medium",
      title:"2NF Definition",
      description:"A relation is in 2NF if it is in 1NF and has no:",
      options:[{text:"Transitive dependencies",isCorrect:false},{text:"Partial dependencies on composite primary key",isCorrect:true},{text:"Multi-valued attributes",isCorrect:false},{text:"Duplicate rows",isCorrect:false}],
      explanation:"2NF eliminates partial dependencies — every non-key attribute must depend on the WHOLE primary key.",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"SQL", difficulty:"easy",
      title:"PRIMARY KEY Constraint",
      description:"Which constraint ensures unique and non-null values?",
      options:[{text:"FOREIGN KEY",isCorrect:false},{text:"UNIQUE",isCorrect:false},{text:"PRIMARY KEY",isCorrect:true},{text:"CHECK",isCorrect:false}],
      explanation:"PRIMARY KEY = UNIQUE + NOT NULL. A table can have only one primary key.",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"Transactions", difficulty:"medium",
      title:"ACID - Atomicity",
      description:"Which ACID property ensures all-or-nothing execution?",
      options:[{text:"Consistency",isCorrect:false},{text:"Isolation",isCorrect:false},{text:"Atomicity",isCorrect:true},{text:"Durability",isCorrect:false}],
      explanation:"Atomicity = all-or-nothing. If any part fails, the entire transaction rolls back.",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"SQL", difficulty:"easy",
      title:"LEFT JOIN Behavior",
      description:"Which JOIN returns all rows from the left table even without a match?",
      options:[{text:"INNER JOIN",isCorrect:false},{text:"LEFT JOIN",isCorrect:true},{text:"RIGHT JOIN",isCorrect:false},{text:"CROSS JOIN",isCorrect:false}],
      explanation:"LEFT JOIN returns all left-table rows. Unmatched right-table columns are NULL.",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"Indexing", difficulty:"hard",
      title:"B+ Tree Advantage",
      description:"Why are B+ trees preferred over B trees for database indexes?",
      options:[{text:"Use less memory",isCorrect:false},{text:"All data at leaf nodes, enabling efficient range queries",isCorrect:true},{text:"Faster single lookups",isCorrect:false},{text:"Support more data types",isCorrect:false}],
      explanation:"In B+ trees, all data pointers are at linked leaf nodes, making range queries (BETWEEN, >, <) very efficient.",
      points:15,
    },
    {
      type:"mcq", subject:"DBMS", topic:"Normalization", difficulty:"hard",
      title:"3NF vs BCNF",
      description:"What is the difference between 3NF and BCNF?",
      options:[{text:"3NF allows transitive dependencies",isCorrect:false},{text:"BCNF is stricter — every determinant must be a superkey",isCorrect:true},{text:"They are identical",isCorrect:false},{text:"3NF handles multi-valued dependencies",isCorrect:false}],
      explanation:"BCNF is stricter than 3NF. In BCNF, for every dependency X→Y, X must be a superkey. 3NF allows exceptions for prime attributes.",
      points:15,
    },
    {
      type:"mcq", subject:"DBMS", topic:"SQL", difficulty:"medium",
      title:"GROUP BY with HAVING",
      description:"What is the difference between WHERE and HAVING?",
      options:[{text:"WHERE filters rows after grouping; HAVING filters before",isCorrect:false},{text:"HAVING filters rows after grouping; WHERE filters before",isCorrect:true},{text:"They are interchangeable",isCorrect:false},{text:"WHERE works with aggregate functions",isCorrect:false}],
      explanation:"WHERE filters rows BEFORE grouping. HAVING filters groups AFTER GROUP BY. HAVING is used with aggregate functions like COUNT, SUM.",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"Transactions", difficulty:"hard",
      title:"Isolation Levels",
      description:"Which isolation level prevents dirty reads but allows non-repeatable reads?",
      options:[{text:"Read Uncommitted",isCorrect:false},{text:"Read Committed",isCorrect:true},{text:"Repeatable Read",isCorrect:false},{text:"Serializable",isCorrect:false}],
      explanation:"Read Committed prevents dirty reads (reading uncommitted data) but allows non-repeatable reads (same query returns different results in same transaction).",
      points:15,
    },
    {
      type:"mcq", subject:"DBMS", topic:"SQL", difficulty:"easy",
      title:"SQL DELETE vs TRUNCATE",
      description:"What is the key difference between DELETE and TRUNCATE?",
      options:[{text:"DELETE removes table structure; TRUNCATE doesn't",isCorrect:false},{text:"TRUNCATE is DDL and cannot be rolled back; DELETE is DML",isCorrect:true},{text:"They are identical",isCorrect:false},{text:"DELETE is faster than TRUNCATE",isCorrect:false}],
      explanation:"TRUNCATE is a DDL command — removes all rows, resets identity, cannot be rolled back in most DBs. DELETE is DML — can be rolled back, fires triggers.",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"ER Diagrams", difficulty:"easy",
      title:"ER Model - Weak Entity",
      description:"A weak entity in ER modeling is one that:",
      options:[{text:"Has no attributes",isCorrect:false},{text:"Cannot be uniquely identified without its owner entity",isCorrect:true},{text:"Has no relationships",isCorrect:false},{text:"Has only one attribute",isCorrect:false}],
      explanation:"A weak entity cannot be uniquely identified by its own attributes alone — it depends on an owner (strong) entity's primary key.",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"Indexing", difficulty:"medium",
      title:"Clustered vs Non-Clustered Index",
      description:"What is the key difference between clustered and non-clustered indexes?",
      options:[{text:"Clustered index is faster for all queries",isCorrect:false},{text:"Clustered index physically sorts data; non-clustered uses a separate structure",isCorrect:true},{text:"Non-clustered index stores data",isCorrect:false},{text:"There can be many clustered indexes",isCorrect:false}],
      explanation:"A table can have only ONE clustered index (it physically reorders data). Multiple non-clustered indexes are possible (they're separate B+ tree structures).",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"Normalization", difficulty:"easy",
      title:"1NF Requirement",
      description:"First Normal Form (1NF) requires that:",
      options:[{text:"No partial dependencies exist",isCorrect:false},{text:"All attributes contain atomic (indivisible) values",isCorrect:true},{text:"No transitive dependencies exist",isCorrect:false},{text:"Primary key is single attribute",isCorrect:false}],
      explanation:"1NF requires atomicity — each column must contain atomic values, no repeating groups or multi-valued attributes.",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"SQL", difficulty:"medium",
      title:"INNER JOIN Result",
      description:"INNER JOIN returns:",
      options:[{text:"All rows from both tables",isCorrect:false},{text:"Only matching rows from both tables",isCorrect:true},{text:"All rows from left table",isCorrect:false},{text:"All rows from right table",isCorrect:false}],
      explanation:"INNER JOIN returns only the rows where the join condition is TRUE in both tables. Non-matching rows are excluded.",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"Transactions", difficulty:"medium",
      title:"Deadlock in DBMS",
      description:"Deadlock in databases typically occurs when:",
      options:[{text:"A query takes too long",isCorrect:false},{text:"Two transactions wait for each other to release locks",isCorrect:true},{text:"The database runs out of memory",isCorrect:false},{text:"A table has too many indexes",isCorrect:false}],
      explanation:"Database deadlock: Transaction A holds lock on row X and waits for row Y; Transaction B holds Y and waits for X — circular wait.",
      points:10,
    },
    {
      type:"mcq", subject:"DBMS", topic:"SQL", difficulty:"hard",
      title:"Subquery vs JOIN Performance",
      description:"In most relational databases, which is generally more efficient?",
      options:[{text:"Correlated subquery",isCorrect:false},{text:"JOIN (when properly indexed)",isCorrect:true},{text:"They are always equal",isCorrect:false},{text:"Nested subquery",isCorrect:false}],
      explanation:"JOINs are generally more efficient than correlated subqueries because the query optimizer can better optimize them. Correlated subqueries execute once per row.",
      points:15,
    },
  ]);
  console.log(`✅ ${dbQ.length} DBMS questions`);

  // ── CN QUESTIONS (15) ─────────────────────────────────────
  const cnQ = await Question.insertMany([
    {
      type:"mcq", subject:"CN", topic:"OSI Model", difficulty:"easy",
      title:"OSI Layer Count",
      description:"How many layers does the OSI model have?",
      options:[{text:"4",isCorrect:false},{text:"5",isCorrect:false},{text:"6",isCorrect:false},{text:"7",isCorrect:true}],
      explanation:"OSI has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. Remember: 'Please Do Not Throw Sausage Pizza Away'.",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"TCP/IP", difficulty:"medium",
      title:"UDP for Live Streaming",
      description:"Which protocol is best for live video streaming that prioritizes speed?",
      options:[{text:"TCP",isCorrect:false},{text:"UDP",isCorrect:true},{text:"HTTP",isCorrect:false},{text:"FTP",isCorrect:false}],
      explanation:"UDP preferred for real-time streaming — faster, no retransmission. A few lost packets are acceptable; latency is not.",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"IP Addressing", difficulty:"medium",
      title:"Subnet Mask /24",
      description:"What does a subnet mask of /24 (255.255.255.0) mean?",
      options:[{text:"24 hosts available",isCorrect:false},{text:"First 24 bits are network, last 8 are host",isCorrect:true},{text:"24 subnets created",isCorrect:false},{text:"Network has 24 routers",isCorrect:false}],
      explanation:"/24 = 24 network bits + 8 host bits = 256 addresses (254 usable hosts).",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"Application Layer", difficulty:"easy",
      title:"DNS Function",
      description:"What is the primary function of DNS?",
      options:[{text:"Encrypt web traffic",isCorrect:false},{text:"Assign IP addresses dynamically",isCorrect:false},{text:"Translate domain names to IP addresses",isCorrect:true},{text:"Route packets between networks",isCorrect:false}],
      explanation:"DNS translates human-readable domain names (google.com) into IP addresses (142.250.80.46).",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"TCP/IP", difficulty:"hard",
      title:"TCP 3-Way Handshake",
      description:"What is the correct TCP 3-way handshake sequence?",
      options:[{text:"SYN → ACK → SYN-ACK",isCorrect:false},{text:"SYN → SYN-ACK → ACK",isCorrect:true},{text:"ACK → SYN → SYN-ACK",isCorrect:false},{text:"SYN-ACK → SYN → ACK",isCorrect:false}],
      explanation:"TCP handshake: (1) Client SYN, (2) Server SYN-ACK, (3) Client ACK. Connection established.",
      points:15,
    },
    {
      type:"mcq", subject:"CN", topic:"OSI Model", difficulty:"medium",
      title:"Transport Layer Protocol",
      description:"Which layer does TCP/UDP operate at in the OSI model?",
      options:[{text:"Network Layer (Layer 3)",isCorrect:false},{text:"Transport Layer (Layer 4)",isCorrect:true},{text:"Session Layer (Layer 5)",isCorrect:false},{text:"Application Layer (Layer 7)",isCorrect:false}],
      explanation:"TCP and UDP operate at Layer 4 (Transport Layer). This layer provides end-to-end communication, error recovery, and flow control.",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"IP Addressing", difficulty:"hard",
      title:"IPv4 vs IPv6",
      description:"How many bits are in an IPv6 address?",
      options:[{text:"32 bits",isCorrect:false},{text:"64 bits",isCorrect:false},{text:"128 bits",isCorrect:true},{text:"256 bits",isCorrect:false}],
      explanation:"IPv4 = 32 bits (4.3 billion addresses). IPv6 = 128 bits (340 undecillion addresses). IPv6 was created to address IPv4 exhaustion.",
      points:15,
    },
    {
      type:"mcq", subject:"CN", topic:"Application Layer", difficulty:"easy",
      title:"HTTP vs HTTPS",
      description:"What is the main difference between HTTP and HTTPS?",
      options:[{text:"HTTPS is faster",isCorrect:false},{text:"HTTPS encrypts data using TLS/SSL",isCorrect:true},{text:"HTTP uses port 443",isCorrect:false},{text:"HTTPS is an older protocol",isCorrect:false}],
      explanation:"HTTPS uses TLS (Transport Layer Security) to encrypt communication. HTTP sends data in plaintext. HTTPS uses port 443, HTTP uses port 80.",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"TCP/IP", difficulty:"medium",
      title:"TCP Flow Control",
      description:"What mechanism does TCP use for flow control?",
      options:[{text:"Checksum",isCorrect:false},{text:"Sliding Window",isCorrect:true},{text:"TTL",isCorrect:false},{text:"Sequence Numbers only",isCorrect:false}],
      explanation:"TCP uses the Sliding Window protocol for flow control — the receiver advertises a window size telling the sender how much data it can receive without overwhelming it.",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"IP Addressing", difficulty:"medium",
      title:"Private IP Address Range",
      description:"Which of the following is a private IP address range?",
      options:[{text:"8.8.8.0/24",isCorrect:false},{text:"192.168.0.0/16",isCorrect:true},{text:"172.217.0.0/16",isCorrect:false},{text:"100.0.0.0/8",isCorrect:false}],
      explanation:"Private ranges (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. These are not routable on the public internet.",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"OSI Model", difficulty:"medium",
      title:"MAC Address Layer",
      description:"At which OSI layer does MAC addressing operate?",
      options:[{text:"Physical Layer (Layer 1)",isCorrect:false},{text:"Data Link Layer (Layer 2)",isCorrect:true},{text:"Network Layer (Layer 3)",isCorrect:false},{text:"Transport Layer (Layer 4)",isCorrect:false}],
      explanation:"MAC addresses operate at Layer 2 (Data Link Layer). Switches use MAC addresses to forward frames within a local network.",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"Application Layer", difficulty:"medium",
      title:"DHCP Purpose",
      description:"What does DHCP do?",
      options:[{text:"Translates domain names to IPs",isCorrect:false},{text:"Automatically assigns IP addresses to devices",isCorrect:true},{text:"Encrypts network traffic",isCorrect:false},{text:"Routes packets between networks",isCorrect:false}],
      explanation:"DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses, subnet masks, gateways, and DNS servers to devices on a network.",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"TCP/IP", difficulty:"hard",
      title:"TCP vs UDP Reliability",
      description:"Which statement about TCP reliability is correct?",
      options:[{text:"TCP uses checksums only for reliability",isCorrect:false},{text:"TCP uses acknowledgments, retransmission, and sequence numbers",isCorrect:true},{text:"TCP is unreliable but fast",isCorrect:false},{text:"TCP relies on the application layer for reliability",isCorrect:false}],
      explanation:"TCP reliability comes from: sequence numbers (ordering), ACKs (confirmation), retransmission (lost packets), and checksums (error detection).",
      points:15,
    },
    {
      type:"mcq", subject:"CN", topic:"IP Addressing", difficulty:"easy",
      title:"Default Gateway",
      description:"What is the role of a default gateway?",
      options:[{text:"Assigns IP addresses",isCorrect:false},{text:"Connects the local network to external networks/internet",isCorrect:true},{text:"Provides DNS resolution",isCorrect:false},{text:"Filters malicious traffic",isCorrect:false}],
      explanation:"The default gateway is the router that connects your local network to other networks/internet. Traffic destined for outside the subnet goes through it.",
      points:10,
    },
    {
      type:"mcq", subject:"CN", topic:"OSI Model", difficulty:"hard",
      title:"ARP Protocol",
      description:"What does ARP (Address Resolution Protocol) do?",
      options:[{text:"Resolves domain names to IP addresses",isCorrect:false},{text:"Resolves IP addresses to MAC addresses",isCorrect:true},{text:"Assigns IP addresses dynamically",isCorrect:false},{text:"Encrypts network packets",isCorrect:false}],
      explanation:"ARP maps an IP address to a MAC address on a local network. When a device wants to communicate, it broadcasts an ARP request to find the MAC address for a known IP.",
      points:15,
    },
  ]);
  console.log(`✅ ${cnQ.length} CN questions`);

  // ── LINK ALL QUESTIONS TO ALL MODULES ─────────────────────
  console.log("\n🔗 Linking questions to modules...");
  const allModules = await Module.find({}).select("title").lean();
  const allMCQIds  = [...osQ, ...dbQ, ...cnQ].map(q => q._id);

  for (const mod of allModules) {
    const title = mod.title.toLowerCase();
    let ids = allMCQIds;
    if (["linux","operating","process","memory","scheduling","kernel","unix","system admin"].some(k => title.includes(k)))
      ids = osQ.map(q => q._id);
    else if (["database","dbms","sql","mongodb","etl","spark","airflow","data engineer"].some(k => title.includes(k)))
      ids = dbQ.map(q => q._id);
    else if (["network","tcp","http","cloud","devops","docker","kubernetes","aws","security","crypto","owasp"].some(k => title.includes(k)))
      ids = cnQ.map(q => q._id);

    await Module.findByIdAndUpdate(mod._id, { questions: ids });
    console.log(`   ✅ "${mod.title}" → ${ids.length} questions`);
  }

  // ── CODING PROBLEMS ────────────────────────────────────────
  await Question.deleteMany({ type: "coding" });
  await Question.insertMany([
    {
      type:"coding", subject:"DSA", topic:"Arrays", difficulty:"easy",
      title:"Two Sum",
      description:"Given an array of integers nums and a target, return indices of the two numbers that add up to target.",
      examples:[{input:"nums=[2,7,11,15], target=9",output:"0 1"},{input:"nums=[3,2,4], target=6",output:"1 2"}],
      testCases:[
        {input:"2 7 11 15\n9",expectedOutput:"0 1",isHidden:false},
        {input:"3 2 4\n6",expectedOutput:"1 2",isHidden:false},
        {input:"3 3\n6",expectedOutput:"0 1",isHidden:true},
        {input:"1 5 3 2\n4",expectedOutput:"2 3",isHidden:true},
      ],
      starterCode:new Map([
        ["python","nums = list(map(int, input().split()))\ntarget = int(input())\n\ndef two_sum(nums, target):\n    # Your solution here\n    pass\n\nprint(*two_sum(nums, target))"],
        ["javascript","const lines = require('fs').readFileSync('/dev/stdin','utf8').split('\\n');\nconst nums = lines[0].split(' ').map(Number);\nconst target = Number(lines[1]);\n\nfunction twoSum(nums, target) {\n    // Your solution\n}\nconsole.log(twoSum(nums, target).join(' '));"],
      ]),
      points:10, tags:["arrays","hash-map"],
    },
    {
      type:"coding", subject:"DSA", topic:"Strings", difficulty:"easy",
      title:"Valid Palindrome",
      description:"After removing non-alphanumeric chars and lowercasing, check if string reads the same forward and backward.",
      examples:[{input:"A man, a plan, a canal: Panama",output:"true"},{input:"race a car",output:"false"}],
      testCases:[
        {input:"A man, a plan, a canal: Panama",expectedOutput:"true",isHidden:false},
        {input:"race a car",expectedOutput:"false",isHidden:false},
        {input:" ",expectedOutput:"true",isHidden:true},
      ],
      starterCode:new Map([
        ["python","s = input()\n\ndef is_palindrome(s):\n    # Your solution\n    pass\n\nprint(str(is_palindrome(s)).lower())"],
        ["javascript","const s = require('fs').readFileSync('/dev/stdin','utf8').trim();\n\nfunction isPalindrome(s) {\n    // Your solution\n}\nconsole.log(isPalindrome(s));"],
      ]),
      points:10, tags:["strings","two-pointer"],
    },
    {
      type:"coding", subject:"DSA", topic:"Dynamic Programming", difficulty:"easy",
      title:"Climbing Stairs",
      description:"You can climb 1 or 2 steps at a time. How many distinct ways to reach n steps?",
      examples:[{input:"2",output:"2"},{input:"3",output:"3"}],
      testCases:[
        {input:"2",expectedOutput:"2",isHidden:false},
        {input:"3",expectedOutput:"3",isHidden:false},
        {input:"5",expectedOutput:"8",isHidden:true},
        {input:"10",expectedOutput:"89",isHidden:true},
      ],
      starterCode:new Map([
        ["python","n = int(input())\n\ndef climb_stairs(n):\n    # Your solution\n    pass\n\nprint(climb_stairs(n))"],
        ["javascript","const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());\n\nfunction climbStairs(n) {\n    // Your solution\n}\nconsole.log(climbStairs(n));"],
      ]),
      points:10, tags:["dp","fibonacci"],
    },
    {
      type:"coding", subject:"DSA", topic:"Binary Search", difficulty:"easy",
      title:"Binary Search",
      description:"Search for target in sorted array. Return index or -1. Must use O(log n) algorithm.",
      examples:[{input:"nums=[-1,0,3,5,9,12], target=9",output:"4"},{input:"nums=[-1,0,3,5,9,12], target=2",output:"-1"}],
      testCases:[
        {input:"-1 0 3 5 9 12\n9",expectedOutput:"4",isHidden:false},
        {input:"-1 0 3 5 9 12\n2",expectedOutput:"-1",isHidden:false},
        {input:"1 3 5 7 9 11\n7",expectedOutput:"3",isHidden:true},
        {input:"1\n1",expectedOutput:"0",isHidden:true},
      ],
      starterCode:new Map([
        ["python","nums = list(map(int, input().split()))\ntarget = int(input())\n\ndef binary_search(nums, target):\n    # Your solution\n    pass\n\nprint(binary_search(nums, target))"],
        ["javascript","const lines = require('fs').readFileSync('/dev/stdin','utf8').split('\\n');\nconst nums = lines[0].split(' ').map(Number);\nconst target = Number(lines[1]);\n\nfunction binarySearch(nums, target) {\n    // Your solution\n}\nconsole.log(binarySearch(nums, target));"],
      ]),
      points:10, tags:["binary-search"],
    },
    {
      type:"coding", subject:"DSA", topic:"Arrays", difficulty:"medium",
      title:"Maximum Subarray",
      description:"Find the subarray with the largest sum and return its sum. (Kadane's Algorithm)",
      examples:[{input:"nums=[-2,1,-3,4,-1,2,1,-5,4]",output:"6"},{input:"nums=[1]",output:"1"}],
      testCases:[
        {input:"-2 1 -3 4 -1 2 1 -5 4",expectedOutput:"6",isHidden:false},
        {input:"1",expectedOutput:"1",isHidden:false},
        {input:"5 4 -1 7 8",expectedOutput:"23",isHidden:true},
        {input:"-1 -2 -3",expectedOutput:"-1",isHidden:true},
      ],
      starterCode:new Map([
        ["python","nums = list(map(int, input().split()))\n\ndef max_subarray(nums):\n    # Kadane's Algorithm\n    pass\n\nprint(max_subarray(nums))"],
        ["javascript","const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\n\nfunction maxSubArray(nums) {\n    // Your solution\n}\nconsole.log(maxSubArray(nums));"],
      ]),
      points:15, tags:["dp","kadane"],
    },
  ]);

  console.log("\n✅ 5 coding problems seeded");
  console.log("🎉 All questions seeded!\n");
  await mongoose.disconnect();
}

seed().catch(err => { console.error("❌", err.message); process.exit(1); });