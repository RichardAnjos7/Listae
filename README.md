This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:5175](http://localhost:5175) with your browser to see the result.

## Login com Google (produção)

O erro **400: redirect_uri_mismatch** significa que a URI de callback do app não está cadastrada no Google Cloud.

1. Acesse [Google Cloud Console → Credenciais](https://console.cloud.google.com/apis/credentials).
2. Abra o cliente OAuth **Aplicativo da Web** usado pelo iLista.
3. Em **Origens JavaScript autorizadas**, adicione:
   - `https://ilista.anjostecnologia.com.br`
4. Em **URIs de redirecionamento autorizados**, adicione **exatamente** (sem barra no final):
   - `https://ilista.anjostecnologia.com.br/api/auth/google/callback`
5. Para desenvolvimento local, inclua também:
   - `http://localhost:5175`
   - `http://localhost:5175/api/auth/google/callback`
6. No servidor de produção, defina a variável de ambiente:
   - `APP_URL=https://ilista.anjostecnologia.com.br`
7. Confirme que `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no painel do host são os **mesmos** do cliente OAuth acima.

Salve no Google Cloud e aguarde ~1 minuto antes de testar de novo.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
