export interface LearnCard {
  id: string;
  title: string;
  emoji: string;
  summary: string;
  content: string;
}

export const LEARN_CARDS: LearnCard[] = [
  {
    id: "urge-surfing",
    title: "Urge Surfing",
    emoji: "🌊",
    summary: "Ride the wave without acting on it",
    content:
      "Urges are like ocean waves — they rise, peak, and fall. Urge surfing means observing the craving without trying to fight or give in. Notice where you feel it in your body, rate its intensity, and breathe through it. Most urges pass within 15-30 minutes if you don't feed them.",
  },
  {
    id: "halt-check",
    title: "H.A.L.T. Check",
    emoji: "✋",
    summary: "Am I Hungry, Angry, Lonely, or Tired?",
    content:
      "H.A.L.T. is a self-check acronym used in recovery communities. When a craving hits, ask yourself: Am I Hungry? Angry? Lonely? Tired? Addressing these basic needs can significantly reduce the intensity of urges. Often what feels like a craving is actually an unmet physical or emotional need.",
  },
  {
    id: "grounding-5-4-3-2-1",
    title: "5-4-3-2-1 Grounding",
    emoji: "🌿",
    summary: "Anchor yourself in the present moment",
    content:
      "When overwhelmed, use your senses to ground: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This technique interrupts the fight-or-flight response and brings your attention back to the present, away from the craving.",
  },
  {
    id: "play-the-tape-forward",
    title: "Play the Tape Forward",
    emoji: "📼",
    summary: "Imagine what happens after giving in",
    content:
      "Instead of romanticizing the substance, mentally fast-forward past the initial moment. What happens an hour later? Tomorrow morning? This week? Playing the full tape — including the guilt, consequences, and setbacks — helps your brain weigh the real cost against the momentary relief.",
  },
  {
    id: "support-network",
    title: "Reach Out",
    emoji: "📞",
    summary: "Connection is a key protective factor",
    content:
      "Isolation fuels addiction; connection disrupts it. Having even one person you can call during a tough moment reduces relapse risk significantly. This doesn't require a deep conversation — even a brief 'I'm having a hard time' text can break the cycle of internal escalation.",
  },
];
