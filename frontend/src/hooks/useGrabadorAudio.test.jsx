// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useGrabadorAudio, formatearDuracion } from './useGrabadorAudio'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

test('grabar y detener produce audio y libera el micrófono', async () => {
  const stop = vi.fn()
  const stream = { getTracks: () => [{ stop }] }
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } })
  vi.stubGlobal('MediaRecorder', class {
    constructor(value) { this.stream = value }
    start() {}
    stop() { this.ondataavailable({ data: new Blob(['audio de prueba']) }); this.onstop() }
  })
  const { result } = renderHook(() => useGrabadorAudio())
  await act(() => result.current.iniciarGrabacion())
  expect(result.current.grabando).toBe(true)
  let audio
  await act(async () => { audio = await result.current.detenerGrabacion() })
  expect(audio.blob.type).toBe('audio/webm')
  expect(audio.blob.size).toBeGreaterThan(0)
  expect(result.current.grabando).toBe(false)
  expect(stop).toHaveBeenCalledOnce()
})

test('formato de duración', () => { expect(formatearDuracion(65)).toBe('1:05') })
