# pregunta-a-mi-cv

API NestJS del chatbot "Pregúntale a mi CV" (RAG sobre el CV de Eduardo). Desplegada en Render; la consume el portfolio Angular (`Optickal095/portfolio`).

## Arquitectura (obligatoria)

Clean Architecture con puertos y adaptadores; ver la sección "Arquitectura" del README.

- `src/domain/`: TypeScript puro. Nada de NestJS, LangChain, `fetch` ni `fs`.
- `src/application/`: casos de uso (clases planas, sin decoradores) y puertos en `ports/` (interfaz + `Symbol` de inyección).
- `src/infrastructure/`: un adaptador por puerto. Las librerías externas (LangChain, Groq, Gemini, eld, `fs`) solo se importan aquí. Los adaptadores traducen errores de proveedores a errores de dominio.
- `src/presentation/http/`: controladores, DTOs (`toQuestion()`), filtro de errores, SSE. Sin reglas de negocio.
- `src/chat.module.ts`: única raíz de composición; los casos de uso se crean con `useFactory`.

Al agregar algo: define o reutiliza un puerto en `application/ports`, implementa el adaptador en `infrastructure`, regístralo en `chat.module.ts` y prueba el caso de uso con un doble de `test/fakes/`.

## Comportamiento que no se debe romper

- El formato de la API es un contrato con el portfolio: `POST /chat` → `{ answer, sources: [{es, en}] }`; `POST /chat/stream` → eventos SSE `token`, `sources`, `done` (o `error`). Si falla antes del primer fragmento, responde un error HTTP normal (429/503).
- Responde solo en español o inglés (orden explícita según `eld` y `locale` como respaldo).
- Las fuentes son las que el modelo cita con `[fuentes: …]`; la marca nunca llega al visitante.
- Sin `GEMINI_API_KEY`, o si la búsqueda falla, se usa el CV completo.
- Límite por IP con `CF-Connecting-IP` (Render está detrás de Cloudflare; `X-Forwarded-For` se puede falsificar).

## Comandos

```bash
npm run start:dev
npm test            # unitarios
npm run test:e2e    # e2e con modelo guionado y embeddings falsos (sin red)
npm run lint
npm run build
```

Solo herramientas gratuitas: Groq (chat), Gemini (embeddings), Render (hosting).
