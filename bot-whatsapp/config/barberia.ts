// Único archivo a cambiar para cada barbería. El bot contesta con estos datos.
// Relleno con Barbería Dradeb (Cartagena) a partir de sus páginas de Booksy (nov. 2026).
// Revisa precios, horarios y nombres con el dueño antes de usarlo de verdad.

export type Barbero = {
  nombre: string
  // WhatsApp personal del barbero, solo números con prefijo (34600111222).
  // Aquí le llegan sus citas. Vacío = le llegan al encargado del local.
  whatsapp: string
}

export type Servicio = { nombre: string; precio: string; duracion: string }

export type Local = {
  nombre: string // corto y distinto en cada local: "Centro", "Alameda"…
  direccion: string
  horario: string // en texto, tal cual lo diría el barbero
  booksyUrl: string // su página de Booksy (por si el cliente prefiere reservar él mismo)
  // WhatsApp del encargado del local: recibe las citas de "cualquier barbero" y de barberos sin número.
  whatsapp: string
  servicios: Servicio[]
  barberos: Barbero[] // vacío = el cliente solo puede pedir "cualquier barbero"
}

export const barberia = {
  nombre: 'Barbería Dradeb',
  ciudad: 'Cartagena',
  web: 'https://dradeb.es',
  // Teléfono para llamar (se lo damos al cliente si el barbero tarda en contestar).
  telefono: '672 57 85 81',
  // WhatsApp del dueño: recibe lo que no tenga a nadie más asignado.
  whatsappDueno: '34672578581',
  zonaHoraria: 'Europe/Madrid',
  locales: [
    {
      nombre: 'Centro',
      direccion: 'Plaza del Sevillano, 2, Cartagena',
      horario: 'De martes a viernes de 10:00 a 14:00 y de 15:00 a 20:00. Sábados de 10:00 a 16:00.',
      booksyUrl: 'https://booksy.com/es-es/159586_barberia-dradeb-centro_barberia_81017_cartagena',
      whatsapp: '',
      servicios: [
        { nombre: 'Corte clásico con perfilado básico', precio: '9 €', duracion: '15 min' },
        { nombre: 'Degradado / skin fade', precio: '12 €', duracion: '30 min' },
        { nombre: 'Corte + barba completa', precio: '15 €', duracion: '30 min' },
        { nombre: 'Combo tú + 1 amigo', precio: '20 €', duracion: '1 h' },
        { nombre: 'Combo tú + 2 amigos', precio: '32 €', duracion: '1 h 30 min' },
      ],
      barberos: [
        { nombre: 'Juan José Varela', whatsapp: '' },
        { nombre: 'Jared', whatsapp: '' },
      ],
    },
    {
      nombre: 'San Ginés',
      direccion: 'Calle Menorca, 7, Cartagena',
      horario: 'De lunes a jueves de 10:00 a 20:00. Viernes y sábados de 10:00 a 14:00 y de 16:00 a 20:00.',
      booksyUrl: 'https://booksy.com/es-es/62544_barberia-dradeb_barberia_81017_cartagena',
      whatsapp: '',
      servicios: [
        { nombre: 'Corte militar', precio: '10 €', duracion: '15 min' },
        { nombre: 'Corte + barba degradado', precio: '12 €', duracion: '30 min' },
        { nombre: 'Corte + barba + cejas + lavado', precio: '19 €', duracion: 'consultar' },
      ],
      barberos: [
        { nombre: 'Oussama', whatsapp: '' },
        { nombre: 'Jorge Azorín', whatsapp: '' },
      ],
    },
    {
      nombre: 'Alameda',
      direccion: 'Calle Soldado Rosique, 2, Cartagena',
      horario: 'De martes a viernes de 10:00 a 14:00 y de 16:00 a 20:00. Sábados de 10:00 a 16:00.',
      booksyUrl: 'https://booksy.com/es-es/133422_barberia-dradeb-alameda_barberia_81017_cartagena',
      whatsapp: '',
      servicios: [
        { nombre: 'Corte clásico', precio: '9 €', duracion: '15 min' },
        { nombre: 'Degradado / skin fade', precio: '11 €', duracion: '30 min' },
        { nombre: 'Combo tú + 2 amigos', precio: '30 €', duracion: '1 h 30 min' },
      ],
      barberos: [
        { nombre: 'Carlos', whatsapp: '' },
        { nombre: 'Juan Pedro', whatsapp: '' },
      ],
    },
  ] satisfies Local[] as Local[],
  // Minutos sin contestar antes de recordárselo al barbero y de avisar al cliente.
  minutosRecordatorio: 10,
  minutosAvisoCliente: 30,
  // Cualquier otra cosa que el bot deba saber (pago con tarjeta, aparcamiento, etc.).
  otrosDatos:
    'Email: hola@dradebbarber.com. Instagram: @barberiadradeb. ' +
    'Aimán es el fundador: hace servicios especiales, eventos y cortes a domicilio (con artistas y deportistas). ' +
    'Para eso no pidas cita con pedir_cita: di que escriban a este WhatsApp contando qué quieren y el dueño les contesta. ' +
    'Hay dos Juan: Juan José Varela (Centro) y Juan Pedro (Alameda); si dicen solo "Juan", pregunta cuál.',
}

export type Barberia = typeof barberia
