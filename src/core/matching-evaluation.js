const DECISIONS = new Set(["matched", "review", "not_found"]);

export function calculateMatchingMetrics(cases) {
  if (!Array.isArray(cases)) throw new TypeError("評估案例必須是陣列。");
  const counts = {
    total: cases.length,
    truthPositive: 0,
    automaticMatches: 0,
    truePositive: 0,
    falsePositive: 0,
    falseNegative: 0,
    trueNegative: 0,
    abstained: 0
  };
  for (const item of cases) {
    validateCase(item);
    const hasTruth = item.truthId !== null;
    const automatic = item.decision === "matched";
    const correct = automatic && hasTruth && item.selectedId === item.truthId;
    if (hasTruth) counts.truthPositive += 1;
    if (automatic) counts.automaticMatches += 1;
    else counts.abstained += 1;
    if (correct) counts.truePositive += 1;
    if (automatic && !correct) counts.falsePositive += 1;
    if (hasTruth && !correct) counts.falseNegative += 1;
    if (!hasTruth && !automatic) counts.trueNegative += 1;
  }
  return {
    counts,
    precision: ratio(counts.truePositive, counts.truePositive + counts.falsePositive),
    recall: ratio(counts.truePositive, counts.truePositive + counts.falseNegative),
    coverage: ratio(counts.automaticMatches, counts.total),
    abstentionRate: ratio(counts.abstained, counts.total)
  };
}

function validateCase(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("評估案例格式無效。");
  const keys = Object.keys(value);
  if (keys.length !== 3 || !["truthId", "decision", "selectedId"].every((key) => keys.includes(key))) {
    throw new TypeError("評估案例欄位無效。");
  }
  if (value.truthId !== null && (typeof value.truthId !== "string" || !value.truthId)) throw new TypeError("truthId 無效。");
  if (!DECISIONS.has(value.decision)) throw new TypeError("decision 無效。");
  if (value.decision === "matched") {
    if (typeof value.selectedId !== "string" || !value.selectedId) throw new TypeError("matched 必須有 selectedId。");
  } else if (value.selectedId !== null) {
    throw new TypeError("非 matched 結果的 selectedId 必須為 null。");
  }
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}
