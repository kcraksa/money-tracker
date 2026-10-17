import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return <LoginForm initialError={sp.error ? "Login gagal atau kedaluwarsa. Coba lagi." : ""} />;
}
