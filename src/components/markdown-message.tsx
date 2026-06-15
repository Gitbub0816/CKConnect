import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-800"
            key={index}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
}

function collectList(
  lines: string[],
  start: number,
  pattern: RegExp,
  ordered: boolean,
) {
  const items: string[] = [];
  let index = start;
  while (index < lines.length) {
    const match = lines[index].match(pattern);
    if (!match) break;
    items.push(match[1].trim());
    index += 1;
  }
  const List = ordered ? "ol" : "ul";
  return {
    index,
    node: (
      <List
        className={`space-y-1 ${ordered ? "list-decimal" : "list-disc"} pl-5`}
        key={`list-${start}`}
      >
        {items.map((item, itemIndex) => (
          <li key={`${item}-${itemIndex}`}>{renderInline(item)}</li>
        ))}
      </List>
    ),
  };
}

export function MarkdownMessage({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h4 className="font-semibold text-slate-950" key={`h-${index}`}>
          {renderInline(line.slice(4))}
        </h4>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const collected = collectList(lines, index, /^\s*[-*]\s+(.+)$/, false);
      blocks.push(collected.node);
      index = collected.index;
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const collected = collectList(lines, index, /^\s*\d+[.)]\s+(.+)$/, true);
      blocks.push(collected.node);
      index = collected.index;
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^\d+[.)]\s+/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith("### ")
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`p-${index}`} className="leading-6">
        {renderInline(paragraph.join(" "))}
      </p>,
    );
  }

  return <div className="space-y-3">{blocks}</div>;
}
