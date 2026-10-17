import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Tujuan link di email: mendukung template token_hash (lintas browser) maupun ?code= (PKCE).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let ok = false;
  if (tokenHash) {
    // Pengguna baru bisa menerima token bertipe "signup", yang lama "email"/"magiclink".
    const types = [...new Set<EmailOtpType>([...(type ? [type] : []), "email", "signup", "magiclink"])];
    for (const t of types) {
      if (!(await supabase.auth.verifyOtp({ type: t, token_hash: tokenHash })).error) {
        ok = true;
        break;
      }
    }
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }
  return NextResponse.redirect(new URL(ok ? "/" : "/login?error=link", origin));
}
