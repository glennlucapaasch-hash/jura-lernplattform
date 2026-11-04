"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cx } from "@/components/ui";

/** Renders Markdown; [Q1]-style citations become clickable chips when a resolver is given. */
export function Markdown({ text, className, onCite }: { text: string; className?: string; onCite?: (ref: string) => void }) {
  const withCites = onCite ? text.replace(/\[(Q\d+)\]/g, "[$1](#cite-$1)") : text;
  return (
    <div className={cx("prose-jura", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("#cite-") && onCite) {
              const ref = href.slice(6);
              return (
                <button type="button" onClick={() => onCite(ref)} className="mx-0.5 rounded-md bg-brand-50 px-1.5 py-0 align-baseline text-[0.8em] font-medium text-brand-700 hover:bg-brand-100">
                  {children}
                </button>
              );
            }
            return <a href={href} target="_blank" rel="noreferrer" className="text-brand-600 underline">{children}</a>;
          },
        }}
      >
        {withCites}
      </ReactMarkdown>
    </div>
  );
}
