const quotes = [
  "You're a wizard of focus!",
  "Small steps lead to big destinations.",
  "Your future self is thanking you right now.",
  "Rome wasn't built in a day, but they were laying bricks every hour.",
  "Focus is the key to unlocking your potential.",
  "Keep pushing, you are doing amazing things.",
  "Rest well, work hard.",
  "Discipline is choosing what you want most over what you want now.",
  "You are unstoppable!",
  "Great things take time. Keep going."
];

export const getRandomQuote = (): string => {
  return quotes[Math.floor(Math.random() * quotes.length)];
};