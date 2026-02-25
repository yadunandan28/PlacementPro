// ============================================================
//  data/seed/seedCohorts.js  —  Seed Cohorts + Modules
//
//  Run this file once to populate your DB with the 5 cohorts
//  and their modules.
//
//  Command: cd server && node data/seed/seedCohorts.js
// ============================================================

require("dotenv").config();
const mongoose   = require("mongoose");
const { Cohort, Module } = require("../../models/Cohort");

const cohortsData = [
  {
    name:        "AI / Machine Learning",
    slug:        "ai-ml",
    description: "Master Python for ML, core algorithms, deep learning, and model deployment.",
    icon:        "🤖",
    color:       "#3b82f6",
    tags:        ["Python", "TensorFlow", "Scikit-learn", "MLOps"],
    modules: [
      {
        title:       "Python for Machine Learning",
        description: "NumPy, Pandas, Matplotlib — the core Python libraries for data science.",
        order:        1,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Python NumPy Tutorial – freeCodeCamp", url: "https://www.youtube.com/watch?v=QUT1VHiLmmI", duration: "1:00:07" },
          { type: "notes",   title: "NumPy Official Docs",                  url: "https://numpy.org/doc/stable/user/absolute_beginners.html" },
          { type: "article", title: "Pandas Getting Started",               url: "https://pandas.pydata.org/docs/getting_started/index.html" },
        ],
      },
      {
        title:       "Linear Algebra & Statistics",
        description: "Vectors, matrices, probability — the math behind ML algorithms.",
        order:        2,
        minPassScore: 65,
        resources: [
          { type: "video",   title: "Linear Algebra for ML – 3Blue1Brown", url: "https://www.youtube.com/watch?v=fNk_zzaMoSs", duration: "0:15:00" },
          { type: "article", title: "Khan Academy – Statistics",            url: "https://www.khanacademy.org/math/statistics-probability" },
        ],
      },
      {
        title:       "Machine Learning Algorithms",
        description: "Regression, classification, clustering, and model evaluation.",
        order:        3,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Andrew Ng ML Course (Free Audit)", url: "https://www.coursera.org/learn/machine-learning", duration: "10 weeks" },
          { type: "article", title: "Scikit-learn User Guide",          url: "https://scikit-learn.org/stable/user_guide.html" },
        ],
      },
      {
        title:       "Deep Learning Basics",
        description: "Neural networks, CNNs, RNNs using TensorFlow/Keras.",
        order:        4,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Deep Learning in 6 hours – freeCodeCamp", url: "https://www.youtube.com/watch?v=6M5VXKLf4D4", duration: "6:00:00" },
          { type: "notes",   title: "TensorFlow Official Tutorials",           url: "https://www.tensorflow.org/tutorials" },
        ],
      },
      {
        title:       "Model Deployment",
        description: "Deploy ML models with Flask/FastAPI, Docker, and cloud platforms.",
        order:        5,
        minPassScore: 65,
        resources: [
          { type: "video",   title: "Deploy ML Model with Flask",    url: "https://www.youtube.com/watch?v=UbCWoMf80PY", duration: "0:30:00" },
          { type: "project", title: "Capstone: Deploy a classifier", description: "Build and deploy an image classifier API using FastAPI and Docker", url: "#" },
        ],
      },
    ],
  },
  {
    name:        "Cloud & DevOps",
    slug:        "cloud-devops",
    description: "Linux, Docker, Kubernetes, CI/CD pipelines, and AWS fundamentals.",
    icon:        "☁️",
    color:       "#06b6d4",
    tags:        ["Docker", "Kubernetes", "AWS", "Linux", "CI/CD"],
    modules: [
      {
        title:       "Linux Fundamentals",
        description: "File system, shell commands, permissions, process management.",
        order:        1,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Linux Command Line Tutorial – freeCodeCamp", url: "https://www.youtube.com/watch?v=ZtqBQ68cfJc", duration: "5:00:00" },
          { type: "article", title: "Linux Journey (Interactive)",                url: "https://linuxjourney.com" },
        ],
      },
      {
        title:       "Git & GitHub",
        description: "Version control, branching strategies, pull requests, and collaboration.",
        order:        2,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Git & GitHub Crash Course – Traversy",  url: "https://www.youtube.com/watch?v=SWYqp7iY_Tc", duration: "0:32:00" },
          { type: "article", title: "Git Official Docs",                     url: "https://git-scm.com/doc" },
          { type: "project", title: "Mini Project: Create a GitHub Portfolio", description: "Host your projects on GitHub with proper READMEs", url: "#" },
        ],
      },
      {
        title:       "Docker",
        description: "Containers, Dockerfiles, Docker Compose, image management.",
        order:        3,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Docker in 1 Hour – TechWorld with Nana", url: "https://www.youtube.com/watch?v=3c-iBn73dDE", duration: "1:03:00" },
          { type: "notes",   title: "Docker Official Get Started",             url: "https://docs.docker.com/get-started/" },
        ],
      },
      {
        title:       "Kubernetes",
        description: "Pods, Deployments, Services, Ingress, ConfigMaps, Helm.",
        order:        4,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Kubernetes Tutorial – TechWorld with Nana", url: "https://www.youtube.com/watch?v=X48VuDVv0do", duration: "4:00:00" },
          { type: "article", title: "Kubernetes Official Docs",                  url: "https://kubernetes.io/docs/tutorials/" },
        ],
      },
      {
        title:       "CI/CD Pipelines",
        description: "GitHub Actions, Jenkins basics, automated testing and deployment.",
        order:        5,
        minPassScore: 65,
        resources: [
          { type: "video",   title: "GitHub Actions Tutorial",                url: "https://www.youtube.com/watch?v=R8_veQiYBjI", duration: "0:43:00" },
          { type: "project", title: "Mini Project: CI/CD for a Node.js API",  description: "Build a GitHub Actions pipeline that tests and deploys automatically", url: "#" },
        ],
      },
      {
        title:       "AWS Fundamentals",
        description: "EC2, S3, RDS, IAM, VPC — core AWS services for developers.",
        order:        6,
        minPassScore: 65,
        resources: [
          { type: "video",   title: "AWS Full Course – freeCodeCamp",  url: "https://www.youtube.com/watch?v=3hLmDS179YE", duration: "5:27:00" },
          { type: "article", title: "AWS Free Tier Console",            url: "https://aws.amazon.com/free/" },
        ],
      },
    ],
  },
  {
    name:        "Web Development",
    slug:        "web-dev",
    description: "Full stack web with HTML/CSS, React, Node.js, MongoDB, auth, and deployment.",
    icon:        "🌐",
    color:       "#22c55e",
    tags:        ["React", "Node.js", "MongoDB", "Express", "REST API"],
    modules: [
      {
        title:  "HTML, CSS & JavaScript",
        description: "Web fundamentals — structure, style, DOM manipulation.",
        order:        1,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "HTML & CSS Crash Course – Traversy",  url: "https://www.youtube.com/watch?v=UB1O30fR-EE", duration: "1:25:00" },
          { type: "article", title: "MDN Web Docs – Learn Web Development", url: "https://developer.mozilla.org/en-US/docs/Learn" },
        ],
      },
      {
        title:       "React.js",
        description: "Components, props, state, hooks, React Router, Context API.",
        order:        2,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "React Course – freeCodeCamp",     url: "https://www.youtube.com/watch?v=bMknfKXIFA8", duration: "11:00:00" },
          { type: "article", title: "React Official Docs",              url: "https://react.dev/learn" },
        ],
      },
      {
        title:       "Node.js & Express",
        description: "REST APIs, middleware, routing, error handling.",
        order:        3,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Node.js Crash Course – Traversy",  url: "https://www.youtube.com/watch?v=fBNz5xF-Kx4", duration: "1:30:00" },
          { type: "article", title: "Express.js Docs",                  url: "https://expressjs.com/en/guide/routing.html" },
        ],
      },
      {
        title:       "MongoDB & Database Integration",
        description: "Mongoose, CRUD operations, schema design, aggregation.",
        order:        4,
        minPassScore: 65,
        resources: [
          { type: "video",   title: "MongoDB Crash Course – Web Dev Simplified", url: "https://www.youtube.com/watch?v=ofme2o29ngU", duration: "0:30:00" },
          { type: "article", title: "Mongoose Official Docs",                    url: "https://mongoosejs.com/docs/guide.html" },
        ],
      },
      {
        title:       "Authentication & Deployment",
        description: "JWT auth, bcrypt, environment variables, Vercel/Render deployment.",
        order:        5,
        minPassScore: 65,
        resources: [
          { type: "video",   title: "JWT Authentication Node.js",   url: "https://www.youtube.com/watch?v=mbsmsi7l3r4", duration: "0:45:00" },
          { type: "project", title: "Capstone: Full Stack MERN App", description: "Build a complete CRUD app with login, deployed live", url: "#" },
        ],
      },
    ],
  },
  {
    name:        "Data Engineering",
    slug:        "data-engineering",
    description: "SQL, ETL pipelines, Apache Spark, Kafka, Airflow, and data warehousing.",
    icon:        "📊",
    color:       "#f59e0b",
    tags:        ["SQL", "Spark", "Kafka", "Airflow", "ETL"],
    modules: [
      {
        title:       "SQL Mastery",
        description: "Complex queries, joins, subqueries, window functions, query optimization.",
        order:        1,
        minPassScore: 75,
        resources: [
          { type: "video",   title: "SQL Full Course – freeCodeCamp",   url: "https://www.youtube.com/watch?v=HXV3zeQKqGY", duration: "4:20:00" },
          { type: "article", title: "SQLZoo Interactive Tutorial",       url: "https://sqlzoo.net" },
        ],
      },
      {
        title:       "Python for Data Engineering",
        description: "Pandas, file I/O, data transformation, working with APIs.",
        order:        2,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Pandas Full Tutorial",       url: "https://www.youtube.com/watch?v=vmEHCJofslg", duration: "1:00:00" },
          { type: "article", title: "Pandas Official User Guide", url: "https://pandas.pydata.org/docs/user_guide/index.html" },
        ],
      },
      {
        title:       "Apache Spark",
        description: "Distributed data processing, DataFrames, Spark SQL, RDDs.",
        order:        3,
        minPassScore: 65,
        resources: [
          { type: "video",   title: "Apache Spark Tutorial – freeCodeCamp", url: "https://www.youtube.com/watch?v=_C8kWso4ne4", duration: "4:30:00" },
          { type: "article", title: "Spark Official Docs",                  url: "https://spark.apache.org/docs/latest/quick-start.html" },
        ],
      },
      {
        title:       "ETL Pipelines & Airflow",
        description: "Build and schedule data pipelines with Apache Airflow.",
        order:        4,
        minPassScore: 65,
        resources: [
          { type: "video",   title: "Apache Airflow Tutorial",                url: "https://www.youtube.com/watch?v=K9AnJ9_ZAXE", duration: "1:30:00" },
          { type: "project", title: "Build a Sales Data Pipeline",            description: "Create an Airflow DAG that extracts CSV data, transforms it, and loads to Postgres", url: "#" },
        ],
      },
    ],
  },
  {
    name:        "Cybersecurity",
    slug:        "cybersecurity",
    description: "Network security, ethical hacking, OWASP, cryptography, and SOC operations.",
    icon:        "🔒",
    color:       "#ef4444",
    tags:        ["OWASP", "Penetration Testing", "Cryptography", "SOC"],
    modules: [
      {
        title:       "Networking Fundamentals",
        description: "OSI model, TCP/IP, DNS, HTTP/HTTPS, firewalls, VPNs.",
        order:        1,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Computer Networking Course – freeCodeCamp", url: "https://www.youtube.com/watch?v=qiQR5rTSshw", duration: "9:25:00" },
          { type: "article", title: "Professor Messer Network+ Notes",           url: "https://www.professormesser.com/network-plus/n10-008/n10-008-video/n10-008-training-course/" },
        ],
      },
      {
        title:       "Linux for Security",
        description: "Kali Linux, shell scripting, file permissions, log analysis.",
        order:        2,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "Kali Linux Tutorial – NetworkChuck",   url: "https://www.youtube.com/watch?v=lZAoFs75_cs", duration: "0:45:00" },
          { type: "article", title: "OverTheWire: Bandit (Linux wargame)",  url: "https://overthewire.org/wargames/bandit/" },
        ],
      },
      {
        title:       "Web Application Security (OWASP)",
        description: "SQL Injection, XSS, CSRF, broken auth, IDOR — OWASP Top 10.",
        order:        3,
        minPassScore: 70,
        resources: [
          { type: "video",   title: "OWASP Top 10 Explained",             url: "https://www.youtube.com/watch?v=ravAlt8MqZk", duration: "1:00:00" },
          { type: "article", title: "OWASP Testing Guide (Free PDF)",     url: "https://owasp.org/www-project-web-security-testing-guide/" },
          { type: "article", title: "WebGoat – Deliberately vulnerable app", url: "https://github.com/WebGoat/WebGoat" },
        ],
      },
      {
        title:       "Cryptography Basics",
        description: "Symmetric/asymmetric encryption, hashing, TLS/SSL, PKI.",
        order:        4,
        minPassScore: 65,
        resources: [
          { type: "video",   title: "Cryptography Course – freeCodeCamp", url: "https://www.youtube.com/watch?v=AQDCe585Lnc", duration: "11:00:00" },
        ],
      },
      {
        title:       "Ethical Hacking & CTF",
        description: "Penetration testing methodology, tools like Nmap, Burp Suite, Metasploit.",
        order:        5,
        minPassScore: 65,
        resources: [
          { type: "video",   title: "Ethical Hacking Course – freeCodeCamp", url: "https://www.youtube.com/watch?v=3Kq1MIfTWCE", duration: "15:00:00" },
          { type: "article", title: "TryHackMe – Learn by doing (Free rooms)", url: "https://tryhackme.com" },
          { type: "project", title: "CTF Challenge",                           description: "Complete 3 beginner TryHackMe rooms and document your findings", url: "#" },
        ],
      },
    ],
  },
];

async function seedCohorts() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Clear existing cohorts and modules
  await Cohort.deleteMany({});
  await Module.deleteMany({});
  console.log("🗑️  Cleared existing cohorts and modules");

  for (const cohortData of cohortsData) {
    const { modules: modulesData, ...cohortInfo } = cohortData;

    // Create the cohort
    const cohort = await Cohort.create(cohortInfo);
    console.log(`✅ Created cohort: ${cohort.name}`);

    // Create each module and link to cohort
    const moduleIds = [];
    for (const modData of modulesData) {
      const module = await Module.create({ cohort: cohort._id, ...modData });
      moduleIds.push(module._id);
    }

    // Update cohort with module IDs
    await Cohort.findByIdAndUpdate(cohort._id, { modules: moduleIds });
    console.log(`   └── ${moduleIds.length} modules created`);
  }

  console.log("\n🎉 Cohort seeding complete!");
  process.exit(0);
}

seedCohorts().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
