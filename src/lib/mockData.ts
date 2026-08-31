import { CandidateProfilePreset, GitHubTelemetry, FullEvaluationReport } from './types';

export const CANDIDATE_PRESETS: CandidateProfilePreset[] = [
  {
    id: 'alex-rivera',
    name: 'Alex Rivera',
    roleTitle: 'Junior Frontend Engineer',
    experienceLevel: 'Junior',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    githubUsername: 'alexrivera-dev',
    summary: 'Enthusiastic React & TypeScript developer with solid GitHub project activity. Strong modern web skills but needs metric quantification on resume bullets.',
    rawResumeText: `ALEX RIVERA
Email: alex.rivera.dev@gmail.com | Phone: (555) 234-5678 | GitHub: github.com/alexrivera-dev | LinkedIn: linkedin.com/in/alexrivera-dev

SUMMARY
Passionate Frontend Developer with 2 years of experience building web applications using React, TypeScript, Next.js, and Tailwind CSS. Demonstrated commit consistency on GitHub with multiple full-stack side projects.

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, HTML5, CSS3, Python
Frameworks & Libraries: React.js, Next.js, Redux Toolkit, Tailwind CSS, Jest, React Testing Library
Tools & Backend: Node.js, Express, REST APIs, Git, Vercel, Docker, PostgreSQL

EXPERIENCE
Frontend Developer | WebCraft Studios | San Francisco, CA | 2023 - Present
• Worked on building component library in React and Tailwind CSS for client dashboard.
• Helped with frontend performance improvements and reduced page load times.
• Implemented responsive UI designs according to Figma wireframes.
• Responsible for writing unit tests using Jest and React Testing Library to ensure high code quality.
• Collaborated with backend developers to integrate RESTful API endpoints for user authentication.

Software Engineering Intern | TechFlow Inc | Remote | 2022 - 2023
• Assisted in migrating legacy JavaScript codebase to TypeScript across 15+ components.
• Created reusable modal and form validation components used across product pages.
• Participated in weekly agile standups, code reviews, and sprint planning meetings.

PROJECTS
DevPulse UI Library (GitHub: github.com/alexrivera-dev/devpulse-ui)
• Built accessible headless UI component system using React, TypeScript, and Radix UI.
• Added Storybook documentation and automated chromatic visual regression testing.

E-Commerce SaaS Dashboard (GitHub: github.com/alexrivera-dev/ecommerce-saas)
• Developed full-stack dashboard with Next.js App Router, Tailwind CSS, and Stripe checkout API integration.

EDUCATION
B.S. in Computer Science | San Jose State University | 2022`
  },
  {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    roleTitle: 'Senior Full-Stack & Systems Architect',
    experienceLevel: 'Senior',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    githubUsername: 'sarahchen-arch',
    summary: 'Seasoned systems architect specializing in Go, distributed microservices, Kubernetes, and Next.js. Exceptional STAR-format impact metrics and high GitHub commit velocity.',
    rawResumeText: `SARAH CHEN
Email: sarah.chen.tech@domain.io | Phone: (415) 890-1234 | GitHub: github.com/sarahchen-arch | LinkedIn: linkedin.com/in/sarahchen-architect

SUMMARY
Senior Systems Architect & Full-Stack Engineer with 8+ years of experience engineering high-throughput distributed backend systems in Go/Python and reactive web frontends in Next.js/TypeScript. Proven track record scaling microservice infrastructure to handle 10M+ daily active requests with 99.99% uptime.

TECHNICAL SKILLS
Backend & Systems: Go (Golang), Python, Node.js, gRPC, Redis, Kafka, PostgreSQL, Distributed Systems
Frontend: React, Next.js, TypeScript, WebSockets, Tailwind CSS, GraphQL
Cloud & DevOps: AWS (EKS, Lambda, S3, RDS), Kubernetes, Docker, Terraform, CI/CD Actions, Prometheus

EXPERIENCE
Lead Systems Engineer | CloudScale Networks | San Francisco, CA | 2021 - Present
• Architected event-driven microservices infrastructure in Go and Kafka, increasing message throughput by 340% while reducing infrastructure costs by $180k/year.
• Engineered distributed Redis caching layer servicing 45k QPS, dropping p99 API response latencies from 320ms to 18ms.
• Spearheaded migration of legacy monolith to Kubernetes microservices across 12 product teams, achieving 99.99% system reliability during peak cyber week traffic.
• Designed real-time telemetry pipeline parsing 500M daily log records using Go worker pools and ClickHouse.

Senior Software Engineer | Apex Data Systems | Seattle, WA | 2018 - 2021
• Developed high-performance GraphQL API gateway in Rust and Node.js servicing 1.2M daily active users.
• Reduced database query bottlenecks by 65% through index optimization and PostgreSQL query plan restructuring.
• Mentored 8 junior and mid-level engineers, establishing automated GitHub Actions CI pipelines with 92% code coverage enforcement.

PROJECTS
Go-Stream: Distributed Event Pipeline Engine (GitHub: github.com/sarahchen-arch/go-stream)
• Open-source high-throughput stream processing framework built in Go with 1.4k GitHub stars and 200+ forks.

K8s-Cost-Guard CLI (GitHub: github.com/sarahchen-arch/k8s-cost-guard)
• Kubernetes controller that monitors pod resource allocation and automatically reclaims unused CPU/memory, saving over $40k/month in cloud spend across 50+ clusters.

EDUCATION
M.S. in Computer Science (Distributed Systems) | University of Washington | 2018
B.S. in Computer Engineering | UC Berkeley | 2016`
  },
  {
    id: 'marcus-vance',
    name: 'Marcus Vance',
    roleTitle: 'Mid-Level Python / Data Engineer',
    experienceLevel: 'Mid-Level',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    githubUsername: 'marcusvance-data',
    summary: 'Capable Python & FastAPI developer focused on data pipelines and ML service deployment. Solid repository code hygiene but uses passive resume action verbs.',
    rawResumeText: `MARCUS VANCE
Email: marcus.vance@dataengineers.org | Phone: (312) 555-9012 | GitHub: github.com/marcusvance-data | LinkedIn: linkedin.com/in/marcusvance

SUMMARY
Data Engineer with 4 years of experience specializing in Python ETL pipelines, FastAPI microservices, Spark, and PostgreSQL analytics. Skilled at wrapping ML models in production REST endpoints.

TECHNICAL SKILLS
Languages: Python, SQL, Bash, R, Scala
Frameworks & Libraries: FastAPI, PySpark, Pandas, NumPy, Scikit-learn, SQLAlchemy, Airflow
Databases & Tools: PostgreSQL, MongoDB, Snowflake, Docker, Git, AWS S3, MLflow

EXPERIENCE
Data Engineer | Analytics Insight Corp | Chicago, IL | 2022 - Present
• Responsible for building Python ETL data pipelines using PySpark and Apache Airflow to ingest data from 10+ sources.
• Worked on FastAPI service that serves machine learning recommendation models to 200,000 active monthly app users.
• Assisted with database schema migration from MySQL to PostgreSQL for better analytical query performance.
• Helped maintain Airflow DAGs and ensured nightly pipeline execution without failures.
• Wrote SQL scripts to generate weekly executive reporting dashboards.

Associate Software Engineer | DataCorp Solutions | Chicago, IL | 2020 - 2022
• Responsible for writing automated data validation scripts in Python to catch missing data entries.
• Assisted in configuring Docker containers for local development and testing environments.
• Worked on optimizing SQL queries for customer analytics report generation.

PROJECTS
FastAPI-ML-Serve (GitHub: github.com/marcusvance-data/fastapi-ml-serve)
• Production-ready template for deploying PyTorch and Scikit-learn models with async FastAPI and Redis caching.

Airflow-S3-Pipeline (GitHub: github.com/marcusvance-data/airflow-s3-pipeline)
• Modular Airflow DAG framework for automated data extraction, transformation, and Parquet file generation on S3.

EDUCATION
B.S. in Data Science & Statistics | University of Illinois Urbana-Champaign | 2020`
  }
];

export const MOCK_GITHUB_TELEMETRY: Record<string, GitHubTelemetry> = {
  'alexrivera-dev': {
    username: 'alexrivera-dev',
    name: 'Alex Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Frontend developer passionate about React, TypeScript, and modern design systems.',
    publicReposCount: 14,
    totalStars: 48,
    totalForks: 12,
    accountAgeYears: 2.5,
    languages: [
      { name: 'TypeScript', percentage: 58, color: '#3178c6' },
      { name: 'JavaScript', percentage: 24, color: '#f1e05a' },
      { name: 'CSS / Tailwind', percentage: 12, color: '#38bdf8' },
      { name: 'HTML', percentage: 6, color: '#e34c26' },
    ],
    topRepositories: [
      {
        name: 'devpulse-ui',
        description: 'Headless, accessible UI components in React and TypeScript',
        url: 'https://github.com/alexrivera-dev/devpulse-ui',
        language: 'TypeScript',
        stars: 32,
        forks: 8,
        updatedAt: '2026-08-20',
        hasReadme: true,
        hasCiWorkflow: true,
        hasTests: true,
        hasLicense: true,
        commitCount30Days: 18,
        prMergeRatio: 90,
        codeQualityScore: 88,
      },
      {
        name: 'ecommerce-saas',
        description: 'Next.js App Router ecommerce dashboard with Stripe & Tailwind',
        url: 'https://github.com/alexrivera-dev/ecommerce-saas',
        language: 'TypeScript',
        stars: 16,
        forks: 4,
        updatedAt: '2026-08-12',
        hasReadme: true,
        hasCiWorkflow: false,
        hasTests: true,
        hasLicense: true,
        commitCount30Days: 11,
        prMergeRatio: 85,
        codeQualityScore: 82,
      }
    ],
    activeCommitStreakDays: 14,
    recentCommitVelocity: 24,
    overallHygieneScore: 84,
    isFallbackData: true,
  },
  'sarahchen-arch': {
    username: 'sarahchen-arch',
    name: 'Sarah Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    bio: 'Distributed Systems & Go Architect. Open-source maintainer.',
    publicReposCount: 38,
    totalStars: 1650,
    totalForks: 240,
    accountAgeYears: 7,
    languages: [
      { name: 'Go', percentage: 64, color: '#00add8' },
      { name: 'TypeScript', percentage: 20, color: '#3178c6' },
      { name: 'Python', percentage: 10, color: '#3572A5' },
      { name: 'Rust', percentage: 6, color: '#dea584' },
    ],
    topRepositories: [
      {
        name: 'go-stream',
        description: 'High-throughput distributed event stream engine in Go',
        url: 'https://github.com/sarahchen-arch/go-stream',
        language: 'Go',
        stars: 1420,
        forks: 195,
        updatedAt: '2026-08-25',
        hasReadme: true,
        hasCiWorkflow: true,
        hasTests: true,
        hasLicense: true,
        commitCount30Days: 42,
        prMergeRatio: 98,
        codeQualityScore: 96,
      },
      {
        name: 'k8s-cost-guard',
        description: 'Automated Kubernetes pod cost analyzer & auto-scaling controller',
        url: 'https://github.com/sarahchen-arch/k8s-cost-guard',
        language: 'Go',
        stars: 230,
        forks: 45,
        updatedAt: '2026-08-18',
        hasReadme: true,
        hasCiWorkflow: true,
        hasTests: true,
        hasLicense: true,
        commitCount30Days: 28,
        prMergeRatio: 95,
        codeQualityScore: 94,
      }
    ],
    activeCommitStreakDays: 32,
    recentCommitVelocity: 68,
    overallHygieneScore: 96,
    isFallbackData: true,
  },
  'marcusvance-data': {
    username: 'marcusvance-data',
    name: 'Marcus Vance',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: 'Data Engineer focused on Python, FastAPI, Spark, and SQL pipelines.',
    publicReposCount: 19,
    totalStars: 85,
    totalForks: 22,
    accountAgeYears: 4,
    languages: [
      { name: 'Python', percentage: 72, color: '#3572A5' },
      { name: 'SQL / HCL', percentage: 18, color: '#e38c00' },
      { name: 'Dockerfile', percentage: 10, color: '#384d54' },
    ],
    topRepositories: [
      {
        name: 'fastapi-ml-serve',
        description: 'Production template for serving ML models with FastAPI & Redis',
        url: 'https://github.com/marcusvance-data/fastapi-ml-serve',
        language: 'Python',
        stars: 55,
        forks: 14,
        updatedAt: '2026-08-22',
        hasReadme: true,
        hasCiWorkflow: true,
        hasTests: true,
        hasLicense: true,
        commitCount30Days: 16,
        prMergeRatio: 88,
        codeQualityScore: 86,
      },
      {
        name: 'airflow-s3-pipeline',
        description: 'Modular Airflow DAG framework for S3 Parquet extraction',
        url: 'https://github.com/marcusvance-data/airflow-s3-pipeline',
        language: 'Python',
        stars: 30,
        forks: 8,
        updatedAt: '2026-08-10',
        hasReadme: true,
        hasCiWorkflow: false,
        hasTests: true,
        hasLicense: true,
        commitCount30Days: 12,
        prMergeRatio: 82,
        codeQualityScore: 80,
      }
    ],
    activeCommitStreakDays: 9,
    recentCommitVelocity: 28,
    overallHygieneScore: 82,
    isFallbackData: true,
  }
};
