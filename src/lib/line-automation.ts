function bangkokDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export async function runLineAutomation(
  action: string,
  date = bangkokDate(),
  _options: { force?: boolean } = {},
): Promise<Record<string, unknown>> {
  return {
    ok: true,
    action: action || "disabled",
    date,
    skipped: true,
    reason: "Scheduled LINE reminder cards are disabled",
  };
}
