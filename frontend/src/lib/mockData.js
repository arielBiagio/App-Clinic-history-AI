// Datos de ejemplo — reemplazar por consultas reales a Supabase cuando esté conectado.

export const pacientesMock = [
  {
    id: '1',
    nombre: 'Marta Gómez',
    evaluaciones: [
      {
        id: 'e1',
        fecha: '2026-08-28',
        fecha_inicio: '2026-08-07',
        edad: 34,
        motivo_consulta: 'Dolor lumbar sin trauma claro, empeora al estar sentado',
        antecedentes: 'Sin antecedentes quirúrgicos relevantes. Trabaja en oficina (sedentarismo)',
        examen_fisico: 'Dolor a la palpación lumbar baja, Lasègue negativo bilateral',
        escala_dolor: 7,
        diagnostico: null,
        plan_terapeutico: 'Fortalecimiento de core y movilidad lumbar, 2x/semana, 4 semanas',
        comentarios_ia: null,
      },
      {
        id: 'e0',
        fecha: '2026-08-14',
        fecha_inicio: '2026-08-07',
        edad: 34,
        motivo_consulta: 'Primera consulta por dolor lumbar',
        antecedentes: null,
        examen_fisico: 'Flexión de tronco limitada por dolor',
        escala_dolor: 8,
        diagnostico: null,
        plan_terapeutico: 'Reposo relativo, evaluación en 2 semanas',
        comentarios_ia: null,
      },
    ],
  },
  {
    id: '2',
    nombre: 'Juan Pérez',
    evaluaciones: [
      {
        id: 'e2',
        fecha: '2026-08-24',
        fecha_inicio: null,
        edad: 51,
        motivo_consulta: 'Dolor de hombro derecho al levantar el brazo',
        antecedentes: 'Hipertensión controlada',
        examen_fisico: 'Arco doloroso positivo, fuerza conservada',
        escala_dolor: 5,
        diagnostico: null,
        plan_terapeutico: 'Movilidad de hombro y fortalecimiento de manguito rotador',
        comentarios_ia: null,
      },
    ],
  },
  {
    id: '3',
    nombre: 'Laura Ríos',
    evaluaciones: [
      {
        id: 'e3',
        fecha: '2026-08-14',
        fecha_inicio: '2026-08-01',
        edad: 28,
        motivo_consulta: 'Esguince de tobillo en entrenamiento',
        antecedentes: null,
        examen_fisico: 'Edema leve, dolor a la palpación en maléolo lateral',
        escala_dolor: 4,
        diagnostico: 'Esguince de tobillo grado I',
        plan_terapeutico: 'Propiocepción y fortalecimiento progresivo',
        comentarios_ia: null,
      },
    ],
  },
]
