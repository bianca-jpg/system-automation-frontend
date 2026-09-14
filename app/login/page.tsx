import { Suspense } from "react";
import { LoginPage } from "@/features/auth";
import { PageLoader } from "@/shared/ui/primitives/page-loader";

export default function LoginRoutePage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPage />
    </Suspense>
  );
}

function LoginFallback() {
  return <PageLoader message="Carregando…" />;
}
