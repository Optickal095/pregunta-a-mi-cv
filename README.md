# Pregúntale a mi CV

Chatbot que responde preguntas sobre la experiencia, proyectos y tecnologías de Eduardo Hernández Oyarzún, usando su CV como única fuente. Pensado para integrarse en su [portfolio](https://optickal095.github.io/portfolio/).

Construido solo con herramientas gratuitas.

## Stack

- **NestJS 12** (TypeScript, ESM)
- **LangChain** con **Groq** (`openai/gpt-oss-120b`, plan gratuito)
- **RAG** con embeddings de **Gemini** (`gemini-embedding-2`, plan gratuito) y un vector store en memoria
- Límite por IP con `@nestjs/throttler` (5 preguntas por minuto, 30 por hora), usando la IP que entrega Cloudflare
- Validación con `class-validator`
- Desplegado en **Render** (plan gratuito): https://pregunta-a-mi-cv.onrender.com
- Tests con Vitest

## Cómo funciona

```
Al iniciar
  knowledge/*.md → un fragmento por sección (##) → embeddings (Gemini) → vector store en memoria

POST /chat
  → valida el mensaje (máx. 500 caracteres, historial de máx. 10 turnos)
  → busca los 4 fragmentos más parecidos a la pregunta (+ la pregunta anterior, para los seguimientos)
  → arma el prompt: reglas + esos fragmentos + historial + pregunta
  → LangChain → Groq
  → { "answer": "...", "sources": ["experiencia › Software Engineer en Canai ...", ...] }
```

La base de conocimiento está en `knowledge/` como archivos Markdown (perfil, experiencia, proyectos, tecnologías, formación). Para actualizar lo que sabe el bot, basta con editar esos archivos y reiniciar.

El prompt obliga al modelo a responder solo con esa información y a decir cuando no sabe algo, en vez de inventar.

### Por qué RAG en un CV

Enviar el CV completo en cada pregunta costaba unos 2.100 tokens. El plan gratuito de Groq permite 8.000 tokens por minuto, así que solo entraban 3 o 4 preguntas por minuto. Con RAG cada pregunta usa entre 750 y 1.000 tokens, más del doble de capacidad, y la base de conocimiento puede crecer sin agrandar el prompt.

Decisiones:

- **Embeddings por API (Gemini)**: Groq no ofrece embeddings. Primero los generé localmente con Transformers.js (`multilingual-e5-small`), pero el modelo ocupa ~460 MB de RAM y no cabe en los 512 MB del plan gratuito de Render. `gemini-embedding-2` es gratuito, multilingüe (preguntas en inglés encuentran el CV en español) y deja el servidor liviano.
- **Sin embeddings, el CV completo**: si falta `GEMINI_API_KEY` o la API falla, cada pregunta recibe el CV entero. Las respuestas siguen siendo correctas; solo gastan más tokens.
- **Vector store en memoria**: son 17 fragmentos; una base de datos vectorial solo agregaría costo. La clase extiende `VectorStore` de LangChain, así que `similaritySearch` y `asRetriever` funcionan igual.
- **Fragmentos por sección**: el CV ya está organizado por temas, así que cada `##` es una unidad con sentido propio.

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servidor. El portfolio lo llama al cargar para despertar el servidor. |
| `POST` | `/chat` | Body: `{ "message": string, "history"?: { "role": "user" \| "assistant", "content": string }[] }` |
| `POST` | `/chat/stream` | Mismo body. Responde con Server-Sent Events: `{"type":"sources",...}`, luego `{"type":"token","text":"..."}` por cada fragmento y al final `{"type":"done"}`. |

El streaming usa POST (la pregunta y el historial van en el body), así que el navegador lo lee con `fetch` en vez de `EventSource`. La API espera el primer fragmento del modelo antes de responder, de modo que los errores previos (sin API key, límite de Groq) siguen llegando como errores HTTP normales (503, 429).

## Desarrollo

```bash
npm install
cp .env.example .env   # agrega GROQ_API_KEY (console.groq.com/keys) y GEMINI_API_KEY (aistudio.google.com/apikey)
npm run start:dev      # http://localhost:3000
```

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué hizo Eduardo en Canai?"}'
```

### Despliegue (Render)

`render.yaml` define el servicio (Blueprint): Node 24, plan gratuito, `GET /health` como health check. Al crearlo, Render pide los valores de `GROQ_API_KEY` y `GEMINI_API_KEY`. Cada push a `main` se despliega solo.

**Límite por IP detrás de Render**: el proxy de Render agrega IPs a `X-Forwarded-For` sin limpiar lo que manda el visitante, así que ese encabezado se puede falsificar y sus últimas entradas cambian entre peticiones. El límite usa `CF-Connecting-IP`, que Cloudflare sobrescribe en cada petición (y rechaza con 403 si alguien intenta enviarlo).

El plan gratuito duerme el servidor tras 15 minutos sin uso y despertarlo tarda entre 30 y 60 segundos; el portfolio llama a `/health` al cargar para adelantarse.

### Tests

```bash
npm test          # unitarios
npm run test:e2e  # end-to-end (usan modelos falsos: no gastan cuota ni descargan nada)
```

## Hoja de ruta

- [x] Fase 1: base de conocimiento y endpoint `/chat`
- [x] Fase 2: RAG (fragmentos, embeddings y búsqueda por similitud)
- [x] Fase 3: respuestas en streaming y chat en Angular dentro del portfolio ([código del chat](https://github.com/Optickal095/portfolio/tree/main/src/app/chat))
- [x] Fase 4: límite de mensajes por IP y despliegue en Render
- [ ] Fase 5: preguntas sugeridas y fuentes de cada respuesta
