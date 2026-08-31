import fs from 'node:fs'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

// Transcribe un archivo de audio local con Whisper vía OpenRouter.
export async function transcribirAudio(rutaArchivo) {
  const buffer = fs.readFileSync(rutaArchivo)
  const form = new FormData()
  form.append('file', new Blob([buffer]), 'audio.webm')
  form.append('model', 'openai/whisper-1')

  const respuesta = await fetch(`${OPENROUTER_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: form,
  })

  if (!respuesta.ok) {
    const detalle = await respuesta.text()
    throw new Error(`Error transcribiendo audio: ${respuesta.status} ${detalle}`)
  }

  const data = await respuesta.json()
  return data.text
}

// Corrige errores de ortografía / reconocimiento de voz en la transcripción
// cruda, SIN reinterpretar ni agregar contenido clínico. Es un paso previo
// a la extracción estructurada, para que el LLM de extracción no herede
// errores de Whisper (palabras mal reconocidas, falta de puntuación, etc.).
export async function limpiarTranscripcion(textoCrudo) {
  const respuesta = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `Sos un corrector de transcripciones de audio en contexto clínico.

Tu única tarea es corregir errores de ortografía, de reconocimiento de voz (palabras mal transcriptas por el sistema de speech-to-text) y de puntuación/segmentación de oraciones.

Reglas estrictas:
- NO agregues información que no esté en el texto.
- NO quites información clínica presente, aunque parezca redundante.
- NO reinterpretes ni resumas: es una corrección de superficie, no una reescritura de contenido.
- Si una palabra es ambigua o no se entiende qué quiso decir el hablante, dejala como está en vez de adivinar.
- Devolvé ÚNICAMENTE el texto corregido, sin comentarios, sin comillas, sin explicaciones.`,
        },
        { role: 'user', content: textoCrudo },
      ],
    }),
  })

  if (!respuesta.ok) {
    const detalle = await respuesta.text()
    throw new Error(`Error limpiando transcripción: ${respuesta.status} ${detalle}`)
  }

  const data = await respuesta.json()
  return data.choices[0].message.content.trim()
}

// Llama al LLM con el prompt + JSON Schema para obtener la evaluación estructurada.
export async function estructurarEvaluacion({ systemPrompt, contenido, schema }) {
  const respuesta = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contenido },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: schema,
      },
    }),
  })

  if (!respuesta.ok) {
    const detalle = await respuesta.text()
    throw new Error(`Error del LLM: ${respuesta.status} ${detalle}`)
  }

  const data = await respuesta.json()
  const contenidoJson = data.choices[0].message.content
  return JSON.parse(contenidoJson)
}
