import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <LoginForm googleAuthEnabled={isGoogleAuthConfigured()} />
    </div>
  );
}
