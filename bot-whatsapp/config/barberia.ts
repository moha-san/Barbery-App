// Único archivo a cambiar para cada barbería. El bot contesta con estos datos.
// Ejemplo relleno con JK The Barber: revisa el horario antes de usarlo de verdad.

export type Barbero = {
  nombre: string
  // WhatsApp personal del barbero, solo números con prefijo (34600111222).
  // Aquí le llegan las peticiones de cita. Vacío = le llegan al dueño.
  whatsapp: string
}

export const barberia = {
  nombre: 'JK The Barber',
  direccion: 'C. Tres de Abril, Molina de Segura (Murcia)',
  // Enlace de la página de Booksy de la barbería (por si el cliente prefiere reservar él mismo).
  booksyUrl: '',
  // Teléfono para llamar (se lo damos al cliente si el barbero tarda en contestar).
  telefono: '',
  // WhatsApp del dueño: recibe las peticiones de los barberos sin número y los avisos de cancelación.
  whatsappDueno: '',
  zonaHoraria: 'Europe/Madrid',
  // Horario en texto, tal cual lo diría el barbero.
  horario: 'De lunes a viernes de 10:00 a 14:00 y de 16:30 a 20:30. Sábados de 9:00 a 14:00. Domingos cerrado.',
  servicios: [
    { nombre: 'Corte premium', precio: '15 €', duracion: '30 min' },
    { nombre: 'Corte y barba', precio: '20 €', duracion: '45 min' },
    { nombre: 'Corte niño (menores de 5)', precio: '13 €', duracion: '30 min' },
    { nombre: 'Barba', precio: '7-8 €', duracion: '15 min' },
  ],
  barberos: [
    { nombre: 'Josiko', whatsapp: '' },
    { nombre: 'Adrián', whatsapp: '' },
  ] satisfies Barbero[],
  // Minutos sin contestar antes de recordárselo al barbero y de avisar al cliente.
  minutosRecordatorio: 10,
  minutosAvisoCliente: 30,
  // Cualquier otra cosa que el bot deba saber (pago con tarjeta, aparcamiento, etc.).
  otrosDatos: 'Se puede pagar en efectivo o con tarjeta.',
}

export type Barberia = typeof barberia
