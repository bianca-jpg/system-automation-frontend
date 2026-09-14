import type { ReactNode } from "react";
import { AuthShell } from "@/widgets/auth-shell";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
