import { useRef, useState } from 'react'

// Maneja grabación de audio con MediaRecorder.
// Devuelve el blob final vía onGrabacionLista(blob, duracionSegundos).
export function useGrabadorAudio() {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const intervaloRef = useRef(null)
  const inicioRef = useRef(null)

  async function iniciarGrabacion() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    chunksRef.current = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorder.start()
    mediaRecorderRef.current = mediaRecorder
    inicioRef.current = Date.now()
    setSegundos(0)
    setGrabando(true)

    intervaloRef.current = setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicioRef.current) / 1000))
    }, 500)
  }

  function detenerGrabacion() {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder) return resolve(null)

      mediaRecorder.onstop = () => {
        clearInterval(intervaloRef.current)
        const duracionFinal = Math.floor((Date.now() - inicioRef.current) / 1000)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        mediaRecorder.stream.getTracks().forEach((track) => track.stop())
        setGrabando(false)
        resolve({ blob, duracionSegundos: duracionFinal })
      }

      mediaRecorder.stop()
    })
  }

  return { grabando, segundos, iniciarGrabacion, detenerGrabacion }
}

export function formatearDuracion(segundosTotales) {
  const min = Math.floor(segundosTotales / 60)
  const seg = segundosTotales % 60
  return `${min}:${seg.toString().padStart(2, '0')}`
}
