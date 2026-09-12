// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModalNuevoPaciente from './ModalNuevoPaciente'

afterEach(cleanup)

test('el fondo del modal queda fuera de la página animada y se limpia al cerrar', async () => {
  const confirm = vi.fn()
  const previousOverflow = document.body.style.overflow
  const { unmount } = render(
    <div className="page-transition">
      <ModalNuevoPaciente onConfirmar={confirm} onCancelar={vi.fn()} />
    </div>,
  )
  const dialog = screen.getByRole('dialog', { name: 'Nuevo paciente' })
  expect(dialog.parentElement).toBe(document.body)
  expect(dialog.closest('.page-transition')).toBeNull()
  expect(document.body.style.overflow).toBe('hidden')
  const user = userEvent.setup()
  await user.type(screen.getByPlaceholderText('Nombre del paciente'), 'Prueba')
  await user.click(screen.getByRole('button', { name: 'Empezar' }))
  expect(confirm).toHaveBeenCalledWith('Prueba')
  unmount()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.querySelector('.modal-overlay')).toBeNull()
  expect(document.body.style.overflow).toBe(previousOverflow)
})
