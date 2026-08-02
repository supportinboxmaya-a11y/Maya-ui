import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <rect width="32" height="32" rx="8" fill="#000000" />
      <path
        d="M16 6.5c-2.6 0-4.7 2.1-4.7 4.7v1.3c0 .8-.4 1.5-1 2-1.3 1-2.1 2.6-2.1 4.2 0 2.6 2.1 4.7 4.7 4.7h.6c.5 2.9 3 5 6 5 3.3 0 6-2.7 6-6v-7.9c0-3.9-3.2-7-7.1-7Z"
        fill="#0affb0"
      />
      <circle cx="21" cy="12.5" r="1.6" fill="#000000" />
      <circle cx="16" cy="12.5" r="1.6" fill="#000000" />
    </svg>
  );
}
