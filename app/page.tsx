import { redirect } from "next/navigation";
import { routes } from "@/shared/config/routes";

// Fallback: o `proxy.ts` já trata "/" antes desta página renderizar.
export default function HomePage() {
  redirect(routes.login);
}
