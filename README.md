# Pregúntale a mi CV

Chatbot que responde preguntas sobre la experiencia, proyectos y tecnologías de Eduardo Hernández Oyarzún, usando su CV como única fuente. Pensado para integrarse en su [portfolio](https://optickal095.github.io/portfolio/).

Construido solo con herramientas gratuitas.

## Stack

- **NestJS 12** (TypeScript, ESM)
- **LangChain** con **Groq** (`openai/gpt-oss-120b`, plan gratuito)
- Validación con `class-validator`
- Tests con Vitest

## Cómo funciona

```
POST /chat
  → valida el mensaje (máx. 500 caracteres, historial de máx. 10 turnos)
  → arma el prompt: reglas + documentos de knowledge/ + historial + pregunta
  → LangChain → Groq
  → { "answer": "..." }
```

La base de conocimiento está en `knowledge/` como archivos Markdown (perfil, experiencia, proyectos, tecnologías, formación). Para actualizar lo que sabe el bot, basta con editar esos archivos.

El prompt obliga al modelo a responder solo con esa información y a decir cuando no sabe algo, en vez de inventar.

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servidor. El portfolio lo llama al cargar para despertar el servidor. |
| `POST` | `/chat` | Body: `{ "message": string, "history"?: { "role": "user" \| "assistant", "content": string }[] }` |

## Desarrollo

```bash
npm install
cp .env.example .env   # agrega tu GROQ_API_KEY (gratis en console.groq.com/keys)
npm run start:dev      # http://localhost:3000
```

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué hizo Eduardo en Canai?"}'
```

### Tests

```bash
npm test          # unitarios
npm run test:e2e  # end-to-end (usan un modelo falso, no gastan cuota)
```

## Hoja de ruta

- [x] Fase 1: base de conocimiento y endpoint `/chat`
- [ ] Fase 2: RAG (fragmentos, embeddings y búsqueda por similitud)
- [ ] Fase 3: respuestas en streaming y chat en Angular dentro del portfolio
- [ ] Fase 4: límite de mensajes por IP y despliegue en Render
- [ ] Fase 5: preguntas sugeridas y fuentes de cada respuesta
