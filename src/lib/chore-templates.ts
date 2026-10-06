export interface ChoreStepTemplate {
  text: string;
  minutes: number;
}

export interface ChoreTemplate {
  name: string;
  icon: string;
  steps: ChoreStepTemplate[];
}

export const CHORE_TEMPLATES: ChoreTemplate[] = [
  {
    name: "ניקוי מטבח",
    icon: "🍽️",
    steps: [
      { text: "לפנות כלים מהכיור", minutes: 5 },
      { text: "לשטוף כלים", minutes: 10 },
      { text: "לנגב את השיש", minutes: 3 },
      { text: "להוציא זבל אם מלא", minutes: 2 },
    ],
  },
  {
    name: "כביסה",
    icon: "🧺",
    steps: [
      { text: "למיין בגדים לפי צבע", minutes: 3 },
      { text: "לשים כביסה במכונה ולהפעיל", minutes: 5 },
      { text: "לתלות או להכניס למייבש כשהמכונה מסיימת", minutes: 5 },
      { text: "לקפל ולסדר בארון", minutes: 10 },
    ],
  },
  {
    name: "החלפת מצעים",
    icon: "🛏️",
    steps: [
      { text: "להוריד את המצעים הישנים", minutes: 3 },
      { text: "לשים מצעים נקיים", minutes: 5 },
      { text: "לשים את המצעים הישנים בכביסה", minutes: 2 },
    ],
  },
  {
    name: "סידור חדר",
    icon: "🧹",
    steps: [
      { text: "להחזיר בגדים למקום", minutes: 5 },
      { text: "לסדר את השולחן", minutes: 5 },
      { text: "לנקות את הרצפה", minutes: 5 },
    ],
  },
  {
    name: "הוצאת זבל",
    icon: "🗑️",
    steps: [
      { text: "לקשור את שקית הזבל", minutes: 1 },
      { text: "להוציא לפח הבניין", minutes: 3 },
      { text: "לשים שקית חדשה", minutes: 1 },
    ],
  },
];
