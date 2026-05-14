function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>");
}

function isMarkdownTableRow(line) {
  const trimmedLine = line.trim();
  return trimmedLine.startsWith("|") && trimmedLine.endsWith("|");
}

function isMarkdownTableSeparator(line) {
  if (!isMarkdownTableRow(line)) {
    return false;
  }

  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function getMarkdownTableCells(line) {
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => formatInlineMarkdown(cell.trim()));
}

function getMarkdownTableAlignments(separatorRow) {
  return separatorRow
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => {
      const value = cell.trim();
      const startsWithColon = value.startsWith(":");
      const endsWithColon = value.endsWith(":");

      if (startsWithColon && endsWithColon) {
        return "center";
      }

      if (endsWithColon) {
        return "right";
      }

      if (startsWithColon) {
        return "left";
      }

      return "";
    });
}

function tableCellToHtml(tagName, cell, alignment) {
  const styleAttribute = alignment ? ` style="text-align: ${alignment}"` : "";

  return `<${tagName}${styleAttribute}>${cell}</${tagName}>`;
}

function tableRowsToHtml(tableRows) {
  const [headerRow, separatorRow, ...bodyRows] = tableRows;
  const headerCells = getMarkdownTableCells(headerRow);
  const alignments = getMarkdownTableAlignments(separatorRow);
  const bodyHtml = bodyRows
    .filter(isMarkdownTableRow)
    .map((row) => {
      const cells = getMarkdownTableCells(row);

      return `<tr>${cells
        .map((cell, cellIndex) =>
          tableCellToHtml("td", cell, alignments[cellIndex]),
        )
        .join("")}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${headerCells
    .map((cell, cellIndex) => tableCellToHtml("th", cell, alignments[cellIndex]))
    .join("")}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

export function textToEditorHtml(text) {
  const blocks = [];
  const lines = text.trim().split(/\r?\n/);
  let listItems = [];
  let listType = "";
  let lineIndex = 0;

  function flushList() {
    if (listItems.length === 0) {
      return;
    }

    blocks.push(
      `<${listType}>${listItems.map((item) => `<li>${item}</li>`).join("")}</${listType}>`,
    );
    listItems = [];
    listType = "";
  }

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushList();
      lineIndex += 1;
      continue;
    }

    if (
      isMarkdownTableRow(trimmedLine) &&
      isMarkdownTableSeparator(lines[lineIndex + 1] ?? "")
    ) {
      const tableRows = [trimmedLine, lines[lineIndex + 1].trim()];
      let tableLineIndex = lineIndex + 2;

      while (isMarkdownTableRow(lines[tableLineIndex] ?? "")) {
        tableRows.push(lines[tableLineIndex].trim());
        tableLineIndex += 1;
      }

      flushList();
      blocks.push(tableRowsToHtml(tableRows));
      lineIndex = tableLineIndex;
      continue;
    }

    if (/^-{3,}$/.test(trimmedLine)) {
      flushList();
      blocks.push("<hr>");
      lineIndex += 1;
      continue;
    }

    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push(
        `<h${headingMatch[1].length}>${formatInlineMarkdown(headingMatch[2])}</h${headingMatch[1].length}>`,
      );
      lineIndex += 1;
      continue;
    }

    const bulletMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(formatInlineMarkdown(bulletMatch[1]));
      lineIndex += 1;
      continue;
    }

    const numberedMatch = trimmedLine.match(/^\d+[.)]\s+(.+)$/);
    if (numberedMatch) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(formatInlineMarkdown(numberedMatch[1]));
      lineIndex += 1;
      continue;
    }

    flushList();
    blocks.push(`<p>${formatInlineMarkdown(trimmedLine)}</p>`);
    lineIndex += 1;
  }

  flushList();

  return blocks.join("");
}
