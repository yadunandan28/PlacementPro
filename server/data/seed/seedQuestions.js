// ============================================================
//  data/seed/seedQuestions.js
//  Seeds MCQ questions AND links them to modules
// ============================================================
require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../../models/Question");
const { Module } = require("../../models/Cohort");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  await Question.deleteMany({ type: "mcq" });
  console.log("🗑️  Cleared existing MCQ questions");

  // ── OS QUESTIONS ────────────────────────────────────────
  const osQuestions = await Question.insertMany([
    {
      type: "mcq", subject: "OS", topic: "Process Management", difficulty: "easy",
      title: "What is a process?",
      description: "Which of the following best describes a process in an operating system?",
      options: [
        { text: "A program stored on disk", isCorrect: false },
        { text: "A program in execution", isCorrect: true },
        { text: "A file in memory", isCorrect: false },
        { text: "A hardware component", isCorrect: false },
      ],
      explanation: "A process is a program in execution — it includes the program code, current activity (PC, registers), and resources.",
      points: 10, tags: ["process", "os-basics"],
    },
    {
      type: "mcq", subject: "OS", topic: "Process Management", difficulty: "medium",
      title: "Deadlock Conditions",
      description: "Which of the following is NOT a necessary condition for deadlock?",
      options: [
        { text: "Mutual Exclusion", isCorrect: false },
        { text: "Hold and Wait", isCorrect: false },
        { text: "Preemption", isCorrect: true },
        { text: "Circular Wait", isCorrect: false },
      ],
      explanation: "The 4 necessary conditions for deadlock are: Mutual Exclusion, Hold and Wait, NO Preemption, and Circular Wait. Preemption (allowing resource takeover) actually PREVENTS deadlock.",
      points: 10, tags: ["deadlock", "process"],
    },
    {
      type: "mcq", subject: "OS", topic: "Memory Management", difficulty: "medium",
      title: "Virtual Memory",
      description: "What is the main purpose of virtual memory?",
      options: [
        { text: "To increase CPU speed", isCorrect: false },
        { text: "To allow programs larger than physical RAM to run", isCorrect: true },
        { text: "To store permanent data", isCorrect: false },
        { text: "To replace the hard disk", isCorrect: false },
      ],
      explanation: "Virtual memory allows the OS to use disk space as an extension of RAM, enabling programs larger than physical memory to execute.",
      points: 10, tags: ["memory", "virtual-memory"],
    },
    {
      type: "mcq", subject: "OS", topic: "CPU Scheduling", difficulty: "easy",
      title: "Round Robin Scheduling",
      description: "In Round Robin scheduling, what is the key parameter that affects performance?",
      options: [
        { text: "Priority of processes", isCorrect: false },
        { text: "Time quantum (time slice)", isCorrect: true },
        { text: "Memory size", isCorrect: false },
        { text: "Number of CPUs", isCorrect: false },
      ],
      explanation: "Time quantum is the key parameter in Round Robin. Too small → high overhead from context switches. Too large → behaves like FCFS.",
      points: 10, tags: ["scheduling", "round-robin"],
    },
    {
      type: "mcq", subject: "OS", topic: "Memory Management", difficulty: "hard",
      title: "Page Replacement",
      description: "Which page replacement algorithm suffers from Belady's anomaly?",
      options: [
        { text: "LRU (Least Recently Used)", isCorrect: false },
        { text: "Optimal", isCorrect: false },
        { text: "FIFO (First In First Out)", isCorrect: true },
        { text: "LFU (Least Frequently Used)", isCorrect: false },
      ],
      explanation: "Belady's anomaly: in FIFO, increasing the number of frames can sometimes INCREASE page faults. LRU and Optimal do not suffer from this.",
      points: 15, tags: ["paging", "page-replacement"],
    },
    {
      type: "mcq", subject: "OS", topic: "Synchronization", difficulty: "medium",
      title: "Semaphores",
      description: "What does a binary semaphore with value 0 indicate?",
      options: [
        { text: "Resource is available", isCorrect: false },
        { text: "Resource is busy/locked", isCorrect: true },
        { text: "Process has terminated", isCorrect: false },
        { text: "Memory is full", isCorrect: false },
      ],
      explanation: "Binary semaphore: 1 = resource available, 0 = resource locked. A process doing wait() on 0 will block until another process calls signal().",
      points: 10, tags: ["semaphore", "synchronization"],
    },
  ]);
  console.log(`✅ Seeded ${osQuestions.length} OS questions`);

  // ── DBMS QUESTIONS ──────────────────────────────────────
  const dbmsQuestions = await Question.insertMany([
    {
      type: "mcq", subject: "DBMS", topic: "Normalization", difficulty: "medium",
      title: "2NF Violation",
      description: "A relation is in 2NF if it is in 1NF and has no:",
      options: [
        { text: "Transitive dependencies", isCorrect: false },
        { text: "Partial dependencies on a composite primary key", isCorrect: true },
        { text: "Multi-valued attributes", isCorrect: false },
        { text: "Duplicate rows", isCorrect: false },
      ],
      explanation: "2NF eliminates partial dependencies — every non-key attribute must depend on the WHOLE primary key, not just part of it.",
      points: 10, tags: ["normalization", "2nf"],
    },
    {
      type: "mcq", subject: "DBMS", topic: "SQL", difficulty: "easy",
      title: "Primary Key",
      description: "Which constraint ensures that a column has unique and non-null values?",
      options: [
        { text: "FOREIGN KEY", isCorrect: false },
        { text: "UNIQUE", isCorrect: false },
        { text: "PRIMARY KEY", isCorrect: true },
        { text: "CHECK", isCorrect: false },
      ],
      explanation: "PRIMARY KEY = UNIQUE + NOT NULL. It uniquely identifies each row. A table can have only one primary key but multiple UNIQUE constraints.",
      points: 10, tags: ["sql", "constraints"],
    },
    {
      type: "mcq", subject: "DBMS", topic: "Transactions", difficulty: "medium",
      title: "ACID Properties",
      description: "Which ACID property ensures that a transaction either completes fully or not at all?",
      options: [
        { text: "Consistency", isCorrect: false },
        { text: "Isolation", isCorrect: false },
        { text: "Atomicity", isCorrect: true },
        { text: "Durability", isCorrect: false },
      ],
      explanation: "Atomicity = 'all or nothing'. If any part of a transaction fails, the entire transaction is rolled back.",
      points: 10, tags: ["acid", "transactions"],
    },
    {
      type: "mcq", subject: "DBMS", topic: "SQL", difficulty: "easy",
      title: "JOIN Types",
      description: "Which JOIN returns all rows from the left table even if there is no match in the right table?",
      options: [
        { text: "INNER JOIN", isCorrect: false },
        { text: "LEFT JOIN", isCorrect: true },
        { text: "RIGHT JOIN", isCorrect: false },
        { text: "CROSS JOIN", isCorrect: false },
      ],
      explanation: "LEFT JOIN (LEFT OUTER JOIN) returns all rows from the left table. Unmatched right-table columns are NULL.",
      points: 10, tags: ["sql", "joins"],
    },
    {
      type: "mcq", subject: "DBMS", topic: "Indexing", difficulty: "hard",
      title: "B+ Tree Index",
      description: "Why are B+ trees preferred over B trees for database indexes?",
      options: [
        { text: "B+ trees use less memory", isCorrect: false },
        { text: "All data is in leaf nodes, allowing efficient range queries", isCorrect: true },
        { text: "B+ trees are faster for single lookups", isCorrect: false },
        { text: "B+ trees support more data types", isCorrect: false },
      ],
      explanation: "In B+ trees, all actual data pointers are at leaf nodes which are linked together. This makes range queries (BETWEEN, >, <) very efficient with sequential access.",
      points: 15, tags: ["indexing", "b-tree"],
    },
  ]);
  console.log(`✅ Seeded ${dbmsQuestions.length} DBMS questions`);

  // ── CN QUESTIONS ────────────────────────────────────────
  const cnQuestions = await Question.insertMany([
    {
      type: "mcq", subject: "CN", topic: "OSI Model", difficulty: "easy",
      title: "OSI Layer Count",
      description: "How many layers does the OSI model have?",
      options: [
        { text: "4", isCorrect: false },
        { text: "5", isCorrect: false },
        { text: "6", isCorrect: false },
        { text: "7", isCorrect: true },
      ],
      explanation: "OSI has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. Remember: 'Please Do Not Throw Sausage Pizza Away'.",
      points: 10, tags: ["osi", "layers"],
    },
    {
      type: "mcq", subject: "CN", topic: "TCP/IP", difficulty: "medium",
      title: "TCP vs UDP",
      description: "Which protocol would you choose for a live video streaming application that prioritizes speed over reliability?",
      options: [
        { text: "TCP", isCorrect: false },
        { text: "UDP", isCorrect: true },
        { text: "HTTP", isCorrect: false },
        { text: "FTP", isCorrect: false },
      ],
      explanation: "UDP is preferred for real-time streaming because it's faster (no handshake, no retransmission). A few lost packets are acceptable in video; latency is not.",
      points: 10, tags: ["tcp", "udp", "protocols"],
    },
    {
      type: "mcq", subject: "CN", topic: "IP Addressing", difficulty: "medium",
      title: "Subnet Mask",
      description: "What does a subnet mask of 255.255.255.0 (/24) mean?",
      options: [
        { text: "24 hosts are available", isCorrect: false },
        { text: "First 24 bits are network, last 8 bits are host", isCorrect: true },
        { text: "24 subnets are created", isCorrect: false },
        { text: "The network has 24 routers", isCorrect: false },
      ],
      explanation: "/24 = 24 network bits + 8 host bits = 256 addresses (254 usable hosts). The 255.255.255.0 mask means the first 3 octets identify the network.",
      points: 10, tags: ["subnetting", "ip"],
    },
    {
      type: "mcq", subject: "CN", topic: "Application Layer", difficulty: "easy",
      title: "DNS Purpose",
      description: "What is the primary function of DNS?",
      options: [
        { text: "Encrypt web traffic", isCorrect: false },
        { text: "Assign IP addresses dynamically", isCorrect: false },
        { text: "Translate domain names to IP addresses", isCorrect: true },
        { text: "Route packets between networks", isCorrect: false },
      ],
      explanation: "DNS (Domain Name System) translates human-readable domain names like 'google.com' into IP addresses like '142.250.80.46'.",
      points: 10, tags: ["dns", "application-layer"],
    },
    {
      type: "mcq", subject: "CN", topic: "TCP/IP", difficulty: "hard",
      title: "TCP 3-Way Handshake",
      description: "What is the correct sequence of the TCP 3-way handshake?",
      options: [
        { text: "SYN → ACK → SYN-ACK", isCorrect: false },
        { text: "SYN → SYN-ACK → ACK", isCorrect: true },
        { text: "ACK → SYN → SYN-ACK", isCorrect: false },
        { text: "SYN-ACK → SYN → ACK", isCorrect: false },
      ],
      explanation: "TCP 3-way handshake: (1) Client sends SYN, (2) Server replies SYN-ACK, (3) Client sends ACK. After this, the connection is established.",
      points: 15, tags: ["tcp", "handshake"],
    },
  ]);
  console.log(`✅ Seeded ${cnQuestions.length} CN questions`);

  // ── LINK QUESTIONS TO MODULES ───────────────────────────
  // Find modules by title keywords and assign relevant questions
  console.log("\n🔗 Linking questions to modules...");

  const allModules = await Module.find({}).select("title cohort");

  let linkedCount = 0;
  for (const mod of allModules) {
    const title = mod.title.toLowerCase();
    let questionsToLink = [];

    // OS-related modules
    if (title.includes("os") || title.includes("operating") || title.includes("linux") ||
        title.includes("system") || title.includes("kernel") || title.includes("process") ||
        title.includes("memory") || title.includes("scheduling") || title.includes("unix")) {
      questionsToLink = osQuestions.map(q => q._id);
    }
    // DBMS-related modules
    else if (title.includes("database") || title.includes("dbms") || title.includes("sql") ||
             title.includes("nosql") || title.includes("mongodb") || title.includes("data model") ||
             title.includes("schema") || title.includes("query")) {
      questionsToLink = dbmsQuestions.map(q => q._id);
    }
    // CN-related modules
    else if (title.includes("network") || title.includes("tcp") || title.includes("http") ||
             title.includes("api") || title.includes("protocol") || title.includes("web") ||
             title.includes("cloud") || title.includes("devops") || title.includes("docker") ||
             title.includes("kubernetes") || title.includes("microservice")) {
      questionsToLink = cnQuestions.map(q => q._id);
    }
    // Default: mix of all subjects for general modules
    else {
      questionsToLink = [
        ...osQuestions.slice(0, 2).map(q => q._id),
        ...dbmsQuestions.slice(0, 2).map(q => q._id),
        ...cnQuestions.slice(0, 2).map(q => q._id),
      ];
    }

    if (questionsToLink.length > 0) {
      await Module.findByIdAndUpdate(mod._id, { questions: questionsToLink });
      console.log(`   ✅ ${mod.title} → ${questionsToLink.length} questions`);
      linkedCount++;
    }
  }

  // ── CODING PROBLEMS ─────────────────────────────────────
  await Question.deleteMany({ type: "coding" });

  await Question.insertMany([
    {
      type: "coding", subject: "DSA", topic: "Arrays", difficulty: "easy",
      title: "Two Sum",
      description: `Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nReturn the answer in any order.`,
      examples: [
        { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
        { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
      ],
      testCases: [
        { input: "2 7 11 15\n9",  expectedOutput: "0 1",  isHidden: false },
        { input: "3 2 4\n6",      expectedOutput: "1 2",  isHidden: false },
        { input: "3 3\n6",        expectedOutput: "0 1",  isHidden: true  },
        { input: "1 5 3 2\n4",    expectedOutput: "2 3",  isHidden: true  },
      ],
      starterCode: new Map([
        ["python", "nums = list(map(int, input().split()))\ntarget = int(input())\n\ndef two_sum(nums, target):\n    # Your solution here\n    pass\n\nprint(*two_sum(nums, target))"],
        ["javascript", "const lines = require('fs').readFileSync('/dev/stdin','utf8').split('\\n');\nconst nums = lines[0].split(' ').map(Number);\nconst target = Number(lines[1]);\n\nfunction twoSum(nums, target) {\n    // Your solution here\n}\n\nconsole.log(twoSum(nums, target).join(' '));"],
        ["java", "import java.util.*;\npublic class Main {\n    public static int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int[] nums = Arrays.stream(sc.nextLine().split(\" \")).mapToInt(Integer::parseInt).toArray();\n        int target = sc.nextInt();\n        System.out.println(Arrays.toString(twoSum(nums, target)).replaceAll(\"[\\\\[\\\\], ]\", \" \").trim());\n    }\n}"],
      ]),
      points: 10, tags: ["arrays", "hash-map", "two-sum"],
    },
    {
      type: "coding", subject: "DSA", topic: "Strings", difficulty: "easy",
      title: "Valid Palindrome",
      description: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string s, return true if it is a palindrome, or false otherwise.`,
      examples: [
        { input: "A man, a plan, a canal: Panama", output: "true", explanation: "amanaplanacanalpanama is a palindrome" },
        { input: "race a car", output: "false" },
      ],
      testCases: [
        { input: "A man, a plan, a canal: Panama", expectedOutput: "true",  isHidden: false },
        { input: "race a car",                     expectedOutput: "false", isHidden: false },
        { input: " ",                              expectedOutput: "true",  isHidden: true  },
      ],
      starterCode: new Map([
        ["python", "s = input()\n\ndef is_palindrome(s):\n    # Your solution here\n    pass\n\nprint(str(is_palindrome(s)).lower())"],
        ["javascript", "const s = require('fs').readFileSync('/dev/stdin','utf8').trim();\n\nfunction isPalindrome(s) {\n    // Your solution here\n}\n\nconsole.log(isPalindrome(s));"],
      ]),
      points: 10, tags: ["strings", "palindrome", "two-pointer"],
    },
    {
      type: "coding", subject: "DSA", topic: "Dynamic Programming", difficulty: "easy",
      title: "Climbing Stairs",
      description: `You are climbing a staircase. It takes n steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
      examples: [
        { input: "2", output: "2", explanation: "1+1, 2" },
        { input: "3", output: "3", explanation: "1+1+1, 1+2, 2+1" },
      ],
      testCases: [
        { input: "2", expectedOutput: "2",  isHidden: false },
        { input: "3", expectedOutput: "3",  isHidden: false },
        { input: "5", expectedOutput: "8",  isHidden: true  },
        { input: "10", expectedOutput: "89", isHidden: true },
      ],
      starterCode: new Map([
        ["python", "n = int(input())\n\ndef climb_stairs(n):\n    # Your solution here\n    pass\n\nprint(climb_stairs(n))"],
        ["javascript", "const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());\n\nfunction climbStairs(n) {\n    // Your solution here\n}\n\nconsole.log(climbStairs(n));"],
      ]),
      points: 10, tags: ["dp", "fibonacci", "memoization"],
    },
    {
      type: "coding", subject: "DSA", topic: "Binary Search", difficulty: "easy",
      title: "Binary Search",
      description: `Given an array of integers nums sorted in ascending order, and an integer target, write a function to search target in nums.\n\nIf target exists, return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.`,
      examples: [
        { input: "nums = [-1,0,3,5,9,12], target = 9", output: "4" },
        { input: "nums = [-1,0,3,5,9,12], target = 2", output: "-1" },
      ],
      testCases: [
        { input: "-1 0 3 5 9 12\n9",  expectedOutput: "4",  isHidden: false },
        { input: "-1 0 3 5 9 12\n2",  expectedOutput: "-1", isHidden: false },
        { input: "1 3 5 7 9 11\n7",   expectedOutput: "3",  isHidden: true  },
        { input: "1\n1",              expectedOutput: "0",  isHidden: true  },
      ],
      starterCode: new Map([
        ["python", "nums = list(map(int, input().split()))\ntarget = int(input())\n\ndef binary_search(nums, target):\n    # Your solution here\n    pass\n\nprint(binary_search(nums, target))"],
        ["javascript", "const lines = require('fs').readFileSync('/dev/stdin','utf8').split('\\n');\nconst nums = lines[0].split(' ').map(Number);\nconst target = Number(lines[1]);\n\nfunction binarySearch(nums, target) {\n    // Your solution here\n}\n\nconsole.log(binarySearch(nums, target));"],
      ]),
      points: 10, tags: ["binary-search", "arrays"],
    },
    {
      type: "coding", subject: "DSA", topic: "Arrays", difficulty: "medium",
      title: "Maximum Subarray",
      description: `Given an integer array nums, find the subarray with the largest sum, and return its sum.\n\n(Kadane's Algorithm)`,
      examples: [
        { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "[4,-1,2,1] has the largest sum = 6" },
        { input: "nums = [1]", output: "1" },
      ],
      testCases: [
        { input: "-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6",  isHidden: false },
        { input: "1",                       expectedOutput: "1",  isHidden: false },
        { input: "5 4 -1 7 8",             expectedOutput: "23", isHidden: true  },
        { input: "-1 -2 -3",               expectedOutput: "-1", isHidden: true  },
      ],
      starterCode: new Map([
        ["python", "nums = list(map(int, input().split()))\n\ndef max_subarray(nums):\n    # Your solution here (Kadane's Algorithm)\n    pass\n\nprint(max_subarray(nums))"],
        ["javascript", "const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\n\nfunction maxSubArray(nums) {\n    // Your solution here\n}\n\nconsole.log(maxSubArray(nums));"],
      ]),
      points: 15, tags: ["dp", "kadane", "arrays"],
    },
  ]);

  console.log(`✅ Seeded 5 coding problems`);
  console.log(`\n🔗 Linked questions to ${linkedCount} modules`);
  console.log("🎉 All questions seeded successfully!\n");

  await mongoose.disconnect();
}

seed().catch(err => { console.error("❌ Seed failed:", err); process.exit(1); });