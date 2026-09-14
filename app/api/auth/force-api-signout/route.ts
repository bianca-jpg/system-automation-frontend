import { signOut } from "@/auth";
import { isTrustedSignOutOrigin } from "@/lib/auth/signout-origin";
import { NextRequest, NextResponse } from "next/server";

function methodNotAllowed() {
  return NextResponse.json(
    { error: { message: "Use POST para encerrar a sessão." } },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export function GET() {
  return methodNotAllowed();
}

export async function POST(request: NextRequest) {
  if (
    !isTrustedSignOutOrigin({
      originHeader: request.headers.get("origin"),
      refererHeader: request.headers.get("referer"),
      requestOrigin: request.nextUrl.origin,
    })
  ) {
    return NextResponse.json({ error: { message: "Origem inválida." } }, { status: 403 });
  }

  await signOut({ redirect: false });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
