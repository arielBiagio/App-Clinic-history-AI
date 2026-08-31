// JSON Schema para structured outputs. Cada campo acepta null: la IA
// NO debe rellenar con información que no esté explícita en las notas.
export const schemaEvaluacion = {
  name: 'evaluacion_kinesiologica',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      fecha_inicio: {
        type: ['string', 'null'],
        description:
          "Fecha de inicio del cuadro/síntoma, formato ISO (YYYY-MM-DD), calculada a partir de referencias relativas ('hace 3 semanas') usando la fecha actual provista. Null si no hay info suficiente.",
      },
      edad: {
        type: ['integer', 'null'],
        description: 'Edad del paciente en años, solo si fue mencionada explícitamente.',
      },
      motivo_consulta: {
        type: ['string', 'null'],
        description: 'Motivo por el cual el paciente consulta, en sus propias palabras/síntomas referidos.',
      },
      antecedentes: {
        type: ['string', 'null'],
        description: 'Antecedentes médicos, quirúrgicos o relevantes mencionados.',
      },
      examen_fisico: {
        type: ['string', 'null'],
        description: 'Hallazgos objetivos observados por el profesional: rango de movimiento, fuerza, tests especiales, etc.',
      },
      escala_dolor: {
        type: ['integer', 'null'],
        minimum: 0,
        maximum: 10,
        description: 'Escala de dolor referida por el paciente (EVA/NRS), de 0 a 10. Null si no fue mencionada como número.',
      },
      diagnostico: {
        type: ['string', 'null'],
        description: 'Diagnóstico o hipótesis diagnóstica mencionada.',
      },
      plan_terapeutico: {
        type: ['string', 'null'],
        description: 'Plan de tratamiento propuesto.',
      },
      comentarios_ia: {
        type: ['string', 'null'],
        description: 'Observaciones adicionales que la IA considere relevantes resaltar, SIN inventar datos clínicos nuevos.',
      },
    },
    required: [
      'fecha_inicio',
      'edad',
      'motivo_consulta',
      'antecedentes',
      'examen_fisico',
      'escala_dolor',
      'diagnostico',
      'plan_terapeutico',
      'comentarios_ia',
    ],
    additionalProperties: false,
  },
}
