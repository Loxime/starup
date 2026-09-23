export function parseNumericValue(
  input: string
): number {
  const normalized = input
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .replace(",", ".");

  const match = normalized.match(
    /-?\d+(?:\.\d+)?/
  );

  if (!match) {
    throw new Error(
      `No numeric value found in "${input}"`
    );
  }

  const value = Number(match[0]);

  if (!Number.isFinite(value)) {
    throw new Error(
      `Invalid numeric value "${match[0]}"`
    );
  }

  return value;
}

export function readJsonPath(
  data: unknown,
  path: string
): unknown {
  const parts = path
    .split(".")
    .filter(Boolean);

  let current: unknown = data;

  for (const part of parts) {
    if (
      typeof current !== "object" ||
      current === null ||
      !(part in current)
    ) {
      throw new Error(
        `JSON path "${path}" not found`
      );
    }

    current = (
      current as Record<string, unknown>
    )[part];
  }

  return current;
}
