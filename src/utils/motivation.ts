export const quotes = [
  "Future You Will Thank You.",
  "Discipline Beats Motivation.",
  "One More Hour.",
  "Stay Locked In.",
  "Small Progress Is Still Progress.",
  "Protect the mission. The rest can wait.",
  "You started this for a reason."
];

export const randomQuote = () => quotes[Math.floor(Math.random() * quotes.length)];

export const randomFrom = (items: string[]) => items[Math.floor(Math.random() * items.length)];
