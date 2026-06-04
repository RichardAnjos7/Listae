import { joinListByCodeAction } from "@/lib/actions/lists";
import { getSessionUserId } from "@/lib/auth/session";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ code: string }> };

export default async function JoinListPage({ params }: PageProps) {
  const { code } = await params;
  const userId = await getSessionUserId();

  if (userId) {
    try {
      const listId = await joinListByCodeAction(code);
      redirect(`/lists/${listId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível entrar na lista.";
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-sm text-center space-y-4">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Convite para lista</h1>
            <p className="text-sm text-amber-700 dark:text-amber-300">{msg}</p>
            <Link href="/lists" className="inline-block text-xs text-emerald-600">
              Ver minhas listas
            </Link>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Convite para lista</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Código: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">{code}</code>
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/lists/join/${code}`)}`}
          className="inline-block w-full rounded-xl bg-emerald-600 text-white font-medium py-2.5 text-sm"
        >
          Entrar para colaborar
        </Link>
        <Link href="/" className="block text-xs text-slate-500">
          Ir para o app
        </Link>
      </div>
    </div>
  );
}
