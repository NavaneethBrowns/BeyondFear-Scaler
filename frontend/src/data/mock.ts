export type SessionStatus = "active" | "completed";

export type Session = {
  id: string;
  title: string;
  status: SessionStatus;
  intensityStart: number;
  intensityNow: number;
  updatedAt: string;
  incognito?: boolean;
  messageCount: number;
};

export type Message = {
  id: string;
  role: "user" | "guide";
  body: string;
  at: string;
};

export type ActionItem = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
};

export const sessions: Session[] = [
  {
    id: "s-1",
    title: "Asking for a raise",
    status: "active",
    intensityStart: 8,
    intensityNow: 5,
    updatedAt: "Today",
    messageCount: 12,
  },
  {
    id: "s-2",
    title: "Leaving my current job",
    status: "completed",
    intensityStart: 9,
    intensityNow: 4,
    updatedAt: "3 days ago",
    messageCount: 18,
  },
  {
    id: "s-3",
    title: "Speaking at the team review",
    status: "completed",
    intensityStart: 7,
    intensityNow: 3,
    updatedAt: "Last week",
    messageCount: 9,
  },
  {
    id: "s-4",
    title: "Telling my parents about the move",
    status: "active",
    intensityStart: 8,
    intensityNow: 6,
    updatedAt: "2 weeks ago",
    incognito: true,
    messageCount: 7,
  },
];

export const messages: Message[] = [
  {
    id: "m-1",
    role: "guide",
    body: "Let's start plainly. What is the fear, in one sentence, without softening it?",
    at: "10:02",
  },
  {
    id: "m-2",
    role: "user",
    body: "I'm afraid that if I ask for a raise, my manager will think I'm ungrateful and it'll change how she sees me.",
    at: "10:04",
  },
  {
    id: "m-3",
    role: "guide",
    body: "That's clear, thank you. Notice there are two things stacked here: the ask itself, and the story about what the ask says about you. Which one is actually keeping you from sending the message?",
    at: "10:04",
  },
  {
    id: "m-4",
    role: "user",
    body: "The second one. I keep imagining her face when she reads it.",
    at: "10:07",
  },
  {
    id: "m-5",
    role: "guide",
    body: "So the conflict is between wanting to be valued fairly and wanting to be seen as easy to work with. Both matter to you — that's why this is stuck rather than simple. You don't need to resolve the whole thing today.",
    at: "10:08",
  },
];

export const actionItems: ActionItem[] = [
  {
    id: "a-1",
    label: "Write the first two sentences only",
    detail: "Don't send anything. Just draft the opening in your notes app tonight.",
    done: false,
  },
  {
    id: "a-2",
    label: "Note three concrete contributions from this quarter",
    detail: "Facts, not framing. This is for you, not for her.",
    done: true,
  },
  {
    id: "a-3",
    label: "Pick a day next week for the conversation",
    detail: "A date, not 'soon'. You can move it once if you need to.",
    done: false,
  },
];

export const intensityTrend = [
  { session: "S1", intensity: 8 },
  { session: "S2", intensity: 7 },
  { session: "S3", intensity: 7 },
  { session: "S4", intensity: 6 },
  { session: "S5", intensity: 4 },
  { session: "S6", intensity: 5 },
  { session: "S7", intensity: 3 },
];

export const plans = [
  {
    id: "monthly",
    name: "Monthly",
    price: "₹199",
    cadence: "per month",
    note: "Try it properly, cancel any time.",
    features: ["Unlimited sessions", "Rename and delete sessions", "Incognito chat", "Full progress history"],
    featured: false,
  },
  {
    id: "quarterly",
    name: "Quarterly",
    price: "₹499",
    cadence: "every 3 months",
    note: "Enough time to see a pattern change.",
    features: [
      "Everything in Monthly",
      "Momentum and streak tracking",
      "Action follow-ups",
      "Priority support",
    ],
    featured: true,
  },
  {
    id: "annual",
    name: "Annual",
    price: "₹799",
    cadence: "per year",
    note: "Best value if you're in this for the long run.",
    features: ["Everything in Quarterly", "Full session archive", "Yearly reflection summary", "Lowest price per month"],
    featured: false,
  },
];
