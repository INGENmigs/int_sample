# React + Vite

## Firebase Hosting

This app is configured for Firebase Hosting Classic as a Vite single-page app.
Hosting serves the production build from `dist` and rewrites application routes
back to `index.html`.

Before building, make sure `.env` contains the Vite Firebase variables shown in
`.env.example`.

Run these commands yourself when you are ready:

```powershell
npm.cmd run build
npx -y firebase-tools@latest deploy --only hosting
```

The active Firebase project is configured in `.firebaserc` as `int-sample`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
