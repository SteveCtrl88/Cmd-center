/**
 * Demo data for PREVIEW_MODE. Mirrors the PRD schemas closely enough that
 * dropping in real Lightfield + project responses later is a near-swap.
 */

export type Stage =
  | "Prospecting"
  | "Qualified"
  | "Proposal Sent"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

export type DemoDeal = {
  dealId: string;
  customerName: string;
  pipelineStage: Stage;
  assignedTo: string;
  lastActivity: string; // ISO
  aiSummary: string;
  followUps: { task: string; assignee: string; dueDate: string }[];
};

export const DEMO_DEALS: DemoDeal[] = [
  {
    dealId: "lf_001",
    customerName: "Northwind Robotics",
    pipelineStage: "Negotiation",
    assignedTo: "Steve",
    lastActivity: "2026-04-22",
    aiSummary:
      "Pricing for the 24-unit deployment is approved on their side; legal is reviewing the MSA carve-outs. Most important next step: send the redlined MSA back with the indemnity language they requested.",
    followUps: [
      { task: "Send redlined MSA", assignee: "Steve", dueDate: "2026-04-28" },
      { task: "Schedule procurement call", assignee: "Steve", dueDate: "2026-05-02" },
    ],
  },
  {
    dealId: "lf_002",
    customerName: "Helios Manufacturing",
    pipelineStage: "Proposal Sent",
    assignedTo: "Steve",
    lastActivity: "2026-04-21",
    aiSummary:
      "Sent a 12-month pilot proposal scoped to one production line. Champion is sold but needs CFO buy-in on the per-unit pricing model.",
    followUps: [
      { task: "Follow up on proposal", assignee: "Steve", dueDate: "2026-04-29" },
    ],
  },
  {
    dealId: "lf_003",
    customerName: "Atlas Logistics",
    pipelineStage: "Qualified",
    assignedTo: "Steve",
    lastActivity: "2026-04-19",
    aiSummary:
      "Discovery call confirmed budget and a 90-day decision window. They're comparing three vendors; we lead on integration depth but trail on price.",
    followUps: [
      { task: "Send case study deck", assignee: "Steve", dueDate: "2026-04-27" },
      { task: "Tech deep-dive with their ops lead", assignee: "Steve", dueDate: "2026-05-05" },
    ],
  },
  {
    dealId: "lf_004",
    customerName: "Vertex Aerospace",
    pipelineStage: "Prospecting",
    assignedTo: "Steve",
    lastActivity: "2026-04-15",
    aiSummary:
      "Cold intro from a mutual connection. Initial email exchange is positive but no scheduled meeting yet.",
    followUps: [
      { task: "Book intro call", assignee: "Steve", dueDate: "2026-04-30" },
    ],
  },
  {
    dealId: "lf_005",
    customerName: "Cresco Foods",
    pipelineStage: "Closed Won",
    assignedTo: "Steve",
    lastActivity: "2026-04-10",
    aiSummary:
      "Contract signed for the Phase 1 rollout at three facilities. Implementation kickoff scheduled for May 6.",
    followUps: [
      { task: "Onboarding kickoff", assignee: "Steve", dueDate: "2026-05-06" },
    ],
  },
  {
    dealId: "lf_006",
    customerName: "Beacon Health",
    pipelineStage: "Closed Lost",
    assignedTo: "Steve",
    lastActivity: "2026-04-02",
    aiSummary:
      "Lost to incumbent vendor. Cited switching cost and integration risk; revisit in Q4 when their current contract ends.",
    followUps: [],
  },
];

export type DemoProject = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  color: string; // tailwind class hue
  noteCount: number;
  driveCount: number;
  updatedAt: string;
};

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: "p_robotics",
    name: "Robotics R&D",
    description: "Hardware platform research, vendor comparisons, and prototype notes.",
    tags: ["hardware", "r&d", "active"],
    color: "bg-blue-500",
    noteCount: 12,
    driveCount: 4,
    updatedAt: "2026-04-25",
  },
  {
    id: "p_market",
    name: "Market Mapping",
    description: "Competitive landscape and TAM analysis for industrial automation.",
    tags: ["research", "strategy"],
    color: "bg-emerald-500",
    noteCount: 8,
    driveCount: 6,
    updatedAt: "2026-04-23",
  },
  {
    id: "p_q3plan",
    name: "Q3 GTM Plan",
    description: "Go-to-market motion for the Q3 release. Pricing, ICP, channels.",
    tags: ["gtm", "planning"],
    color: "bg-purple-500",
    noteCount: 5,
    driveCount: 2,
    updatedAt: "2026-04-21",
  },
  {
    id: "p_hiring",
    name: "Hiring — Forward Deployed",
    description: "Job spec drafts, candidate notes, interview rubric.",
    tags: ["hiring", "ops"],
    color: "bg-amber-500",
    noteCount: 6,
    driveCount: 3,
    updatedAt: "2026-04-20",
  },
  {
    id: "p_field",
    name: "Field Trial Notes",
    description: "Customer site visit notes, photos, and Drive folders.",
    tags: ["field", "active"],
    color: "bg-rose-500",
    noteCount: 14,
    driveCount: 9,
    updatedAt: "2026-04-18",
  },
  {
    id: "p_invest",
    name: "Investor Updates",
    description: "Monthly investor letters and supporting metrics.",
    tags: ["fundraising"],
    color: "bg-indigo-500",
    noteCount: 4,
    driveCount: 1,
    updatedAt: "2026-04-12",
  },
];

export const STAGE_BADGE: Record<Stage, string> = {
  Prospecting: "bg-stage-prospecting/15 text-stage-prospecting border border-stage-prospecting/30",
  Qualified: "bg-stage-qualified/15 text-stage-qualified border border-stage-qualified/30",
  "Proposal Sent": "bg-stage-proposal/15 text-stage-proposal border border-stage-proposal/30",
  Negotiation: "bg-stage-negotiation/15 text-stage-negotiation border border-stage-negotiation/30",
  "Closed Won": "bg-stage-won/15 text-stage-won border border-stage-won/30",
  "Closed Lost": "bg-stage-lost/15 text-stage-lost border border-stage-lost/30",
};
