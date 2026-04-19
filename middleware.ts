import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase-server";

const isProtectedPath = (pathname: string) => {
  if (pathname === "/intake" || pathname.startsWith("/report") || pathname.startsWith("/dashboard")) {
    return true;
  }

  if (pathname === "/battle" || pathname.startsWith("/battle/")) {
    return true;
  }

  return false;
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(request, response);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  if (isProtectedPath(pathname) && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/auth" && session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/intake";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
