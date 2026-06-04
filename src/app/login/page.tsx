import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { getCanonicalOAuthRedirectUri } from "@/lib/auth/request-origin";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const googleAuthEnabled = isGoogleAuthConfigured();
  const oauthRedirectUri = googleAuthEnabled ? getCanonicalOAuthRedirectUri() : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <LoginForm
        googleAuthEnabled={googleAuthEnabled}
        oauthRedirectUri={oauthRedirectUri}
      />
    </div>
  );
}
