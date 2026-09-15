/** Width, in viewBox units, of `text` set in the value font at `fontSize`. */
export type Measure = (text: string, fontSize: number) => number;

export interface FittedLine {
  text: string;
  fontSize: number;
}

const ellipsis = '…';
const shrinkStep = 0.5;

/** Shrinks a single-line value to fit `maxWidth`, down to `minFontSize`, then truncates with "…". */
export function fitLine(
  text: string,
  maxWidth: number,
  fontSize: number,
  measure: Measure,
  minFontSize = 8,
): FittedLine {
  let size = fontSize;
  while (measure(text, size) > maxWidth && size - shrinkStep >= minFontSize) {
    size -= shrinkStep;
  }
  return { text: truncate(text, maxWidth, size, measure), fontSize: size };
}

/**
 * Word-wraps `text` to `maxWidth` at a fixed font size. Explicit newlines start a new line. When the
 * text needs more than `maxLines`, the last line ends in "…".
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines: number,
  measure: Measure,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || measure(candidate, fontSize) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  const taken = lines
    .slice(0, maxLines)
    .map((line) => truncate(line, maxWidth, fontSize, measure));
  const last = taken.length - 1;
  if (lines.length > maxLines && !taken[last]?.endsWith(ellipsis)) {
    taken[last] = truncate(`${taken[last]}${ellipsis}`, maxWidth, fontSize, measure, true);
  }
  return taken;
}

function truncate(
  text: string,
  maxWidth: number,
  fontSize: number,
  measure: Measure,
  alreadyEllipsized = false,
): string {
  if (!alreadyEllipsized && measure(text, fontSize) <= maxWidth) return text;
  let kept = alreadyEllipsized ? text.slice(0, -ellipsis.length) : text;
  while (kept.length > 0 && measure(`${kept.trimEnd()}${ellipsis}`, fontSize) > maxWidth) {
    kept = kept.slice(0, -1);
  }
  return `${kept.trimEnd()}${ellipsis}`;
}
