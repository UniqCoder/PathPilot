"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type PageMotionShellProps = {
  children: ReactNode;
};

export default function PageMotionShell({ children }: PageMotionShellProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-motion-shell">
      {children}
    </div>
  );
}
