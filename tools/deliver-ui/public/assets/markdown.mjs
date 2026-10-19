export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineFormat(escaped) {
  return escaped
    .replace(
      /https?:\/\/[^\s<>)]+/g,
      (url) => `<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function isListItem(line) {
  return /^[-*]\s+/.test(line);
}

function isHeading(line) {
  return /^###\s+/.test(line);
}

function listItemText(line) {
  return line.replace(/^[-*]\s+/, "").trim();
}

/** Viñetas `-` / `*` en orden. Líneas que no son viñeta se ignoran. */
export function listItems(text) {
  if (text == null) return [];
  return String(text)
    .split(/\r?\n/)
    .filter(isListItem)
    .map(listItemText)
    .filter(Boolean);
}

/**
 * Subconjunto Markdown para el laboratorio: ###, listas -, **negrita**, `código`, URLs.
 * El resto es texto escapado. No interpreta HTML.
 * @param {string | null | undefined} text
 */
export function renderMarkdown(text) {
  if (text == null) return "";
  const lines = String(text).split(/\r?\n/);
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (isHeading(line)) {
      html.push(`<h4>${inlineFormat(escapeHtml(line.replace(/^###\s+/, "")))}</h4>`);
      i += 1;
      continue;
    }

    if (isListItem(line)) {
      const items = [];
      while (i < lines.length && isListItem(lines[i])) {
        items.push(
          `<li>${inlineFormat(escapeHtml(lines[i].replace(/^[-*]\s+/, "")))}</li>`
        );
        i += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isHeading(lines[i]) &&
      !isListItem(lines[i])
    ) {
      para.push(inlineFormat(escapeHtml(lines[i])));
      i += 1;
    }
    html.push(`<p>${para.join("<br>")}</p>`);
  }

  return html.join("");
}
