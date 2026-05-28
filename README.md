# Gigante Agil

App pessoal para treino, check-ins, evolucao e recompensas, com login Google e sincronizacao ao vivo via Firestore.

## Rodar local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

O build gera a pasta `dist`.

## Firebase

Este app usa Firebase Auth com Google, Cloud Firestore e Firebase Hosting. Nao usa backend proprio, Cloud Functions nem `.env`.

1. Instale/rode a CLI:

```bash
npx firebase-tools login
```

Projeto configurado neste repo: `appsaude-8b720`.

2. Se quiser criar outro projeto Firebase em vez de usar o existente, crie pelo console ou pela CLI:

```bash
npx firebase-tools projects:create gigante-agil-20260527 --display-name "Gigante Agil"
```

3. Associe o projeto existente:

```bash
npx firebase-tools use appsaude-8b720
```

4. Gere build e publique Hosting + Firestore:

```bash
npm run build
npx firebase-tools deploy --only firestore,hosting
```

Atalhos equivalentes:

```bash
npm run firebase:login
npm run firebase:use
npm run deploy
```

## Backup

Os dados principais ficam no Firestore por conta Google, em `users/{uid}`. O backup JSON continua existindo para exportar/importar o estado completo da sua conta.

Celular e PC sincronizam ao vivo quando entram com a mesma conta Google.
