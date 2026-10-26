import { revealInvisible } from "@/lib/auditor/labels";

export function EvidenceText({ text }: { text: string }) {
  return (
    <code className="whitespace-pre-wrap break-words">
      {revealInvisible(text).map((part, index) =>
        part.invisible ? (
          <mark
            key={index}
            className="rounded bg-amber-400/30 px-0.5 text-amber-900 dark:text-amber-200"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </code>
  );
}
