import { cn } from "@/lib/utils";

export interface SkillIconProps {
  className?: string;
}

export function SkillIcon({ className }: SkillIconProps) {
  return (
    <div
      className={cn("auditor-skill-icon", className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4.5 2.5h7l4 4v11h-11z" />
        <path d="M11.5 2.5v4h4z" className="auditor-skill-icon__fold" />
        <path d="M7 9.5h6" />
        <path d="M7 12.5h6" />
        <path d="M7 15h4" />
      </svg>
    </div>
  );
}
