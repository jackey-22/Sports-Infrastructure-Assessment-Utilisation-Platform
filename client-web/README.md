# KhelGujarat web client

The web portal uses React 18, Vite, Tailwind CSS and React Router.

## Development

```bash
npm install
npm run dev
```

Vite serves the application at `http://localhost:3000` and applies changes
through hot module replacement.

The API defaults to `http://localhost:9999`. Override it when needed:

```env
VITE_API_BASE_URL=https://api.example.com
```

## Production

```bash
npm run build
npm run preview
```

The production output is written to `dist/`.
