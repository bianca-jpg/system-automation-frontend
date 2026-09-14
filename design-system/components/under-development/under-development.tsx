import { Star } from "lucide-react";
import Image from "next/image";

export function UnderDevelopment() {
  return (
    <div
      data-slot="under-development"
      className="flex items-center justify-center p-4"
    >
      <div className="max-w-2xl mx-auto text-center">
        <div className="relative mb-8">
          <div
            data-slot="under-development-logo"
            className="w-24 h-24 mx-auto bg-info/10 rounded-full flex items-center justify-center mb-4"
          >
            <Image
              src="/assets/favicon.png"
              alt="Logo"
              width={36}
              height={36}
              className="inline-block ml-1"
            />
          </div>
          <div
            data-slot="under-development-star"
            className="absolute -top-2 -right-2 w-8 h-8 bg-warning rounded-full flex items-center justify-center animate-bounce"
          >
            <Star className="w-4 h-4 text-warning-foreground" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-foreground mb-4">
          Em Desenvolvimento
        </h1>

        <p className="text-sm text-muted-foreground mt-8">
          Voltaremos com novidades em breve!{" "}
        </p>
      </div>
    </div>
  );
}
