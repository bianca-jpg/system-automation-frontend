import Image from "next/image";
import type { ReactNode } from "react";
import { APP_BRAND } from "@/shared/config/app-brand";
import { AuthParticleField } from "@/shared/ui";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--auth-surface)]">
      <div className="flex min-h-screen flex-col justify-center md:flex-row">
        <div className="relative isolate hidden items-center justify-center overflow-hidden bg-[color:var(--auth-showcase)] md:flex md:w-1/2">
          <AuthParticleField />

          <div className="relative z-10 flex flex-col items-center justify-center p-8">
            <Image
              src="/assets/OR automation_INC_WHITE.png"
              alt={APP_BRAND.companyName}
              width={1182}
              height={133}
              sizes="300px"
              priority
              className="h-auto w-[300px] max-w-full shrink-0 select-none"
            />

            <div
              className="mt-5 flex items-center gap-4"
              aria-label={APP_BRAND.productName}
            >
              <span
                aria-hidden="true"
                className="h-px w-8 bg-[color:var(--inverse)] opacity-25"
              />
              <span className="text-[0.7rem] font-medium uppercase tracking-[0.42em] text-[color:var(--inverse)] opacity-70">
                {APP_BRAND.productName}
              </span>
              <span
                aria-hidden="true"
                className="h-px w-8 bg-[color:var(--inverse)] opacity-25"
              />
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center bg-[color:var(--auth-surface)] p-2 md:w-1/2">
          {children}
        </div>
      </div>
    </div>
  );
}
