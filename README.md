# Pregúntale a mi CV

Chatbot que responde preguntas sobre la experiencia, proyectos y tecnologías de Eduardo Hernández Oyarzún, usando su CV como única fuente. Pensado para integrarse en su [portfolio](https://optickal095.github.io/portfolio/).

Construido solo con herramientas gratuitas.

## Stack

- **NestJS 12** (TypeScript, ESM)
- **LangChain** con **Groq** (`openai/gpt-oss-120b`, plan gratuito)
- **RAG** con embeddings locales: **Transformers.js** + `multilingual-e5-small`
- Validación con `class-validator`
- Tests con Vitest

## Cómo funciona

```
Al iniciar
  knowledge/*.md → un fragmento por sección (##) → embeddings locales → vector store en memoria

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

- **Embeddings locales** (Transformers.js): Groq no ofrece embeddings y así no hace falta otra API key. El modelo `multilingual-e5-small` (~130 MB, se descarga la primera vez) entiende preguntas en español e inglés sobre textos en español.
- **Vector store en memoria**: son 17 fragmentos; una base de datos vectorial solo agregaría costo. La clase extiende `VectorStore` de LangChain, así que `similaritySearch` y `asRetriever` funcionan igual.
- **Fragmentos por sección**: el CV ya está organizado por temas, así que cada `##` es una unidad con sentido propio.

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
npm run test:e2e  # end-to-end (usan modelos falsos: no gastan cuota ni descargan nada)
```

## Hoja de ruta

- [x] Fase 1: base de conocimiento y endpoint `/chat`
- [x] Fase 2: RAG (fragmentos, embeddings y búsqueda por similitud)
- [ ] Fase 3: respuestas en streaming y chat en Angular dentro del portfolio
- [ ] Fase 4: límite de mensajes por IP y despliegue en Render
- [ ] Fase 5: preguntas sugeridas y fuentes de cada respuesta
