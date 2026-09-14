import Image from "next/image";

import { cn } from "../../../lib/utils";

export function LogoWithTitle({ className }: { className?: string }) {
  return (
    <div
      data-slot="logo-with-title"
      className={cn("flex flex-col items-center text-center", className)}
    >
      <Image
        src="/assets/OR automation_INC_BLACK.png"
        alt="Logo"
        width={1182}
        height={133}
        quality={100}
        unoptimized={true}
        className="block h-auto w-[160px] max-w-none shrink-0 select-none object-contain dark:hidden"
        sizes="160px"
        priority
        loading="eager"
      />

      <Image
        src="/assets/OR automation_INC_WHITE.png"
        alt="Logo"
        width={1182}
        height={133}
        quality={100}
        unoptimized={true}
        className="hidden h-auto w-[160px] max-w-none shrink-0 select-none object-contain dark:block"
        sizes="160px"
        priority
        loading="eager"
      />
    </div>
  );
}
