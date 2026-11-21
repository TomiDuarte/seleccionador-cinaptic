// Contenido y reglas editables. No colocar secretos en este archivo público.
export const config = {
  eventId: 'noche-universidades-2026',
  title: 'La Noche de las Universidades',
  center: 'CInApTIC',
  contactUrl: '', // https://wa.me/..., formulario o mailto:... cuando se confirme.
  officialUrl: 'https://www.frre.utn.edu.ar/secretaria_de_ciencia_y_tecnologia/investigacion/CInApTIC/',
  publicUrl: '', // URL HTTPS definitiva para compartir. Vacío usa el origen actual.
  reward: 'un caramelo o chupetín',
};

export const lines = [
  { id: 'redes', name: 'Redes', label: 'Conectá. Protegé. Explorá.', icon: 'network', color: '#a8e5c0',
    description: 'Explorá cómo se conectan los dispositivos y cómo proteger la información que viaja entre ellos.',
    tags: ['Conectividad', 'Ciberseguridad', 'IoT'],
    project: 'Una puerta de entrada: ciberseguridad para entornos empresariales.',
    challenge: '¿Cómo detectarías un dispositivo extraño conectado a una red?',
    match: 'Te interesa entender cómo funcionan las conexiones, experimentar con dispositivos y cuidar los sistemas.' },
  { id: 'agilidad', name: 'Agilidad', label: 'Imaginá. Colaborá. Mejorá.', icon: 'spark', color: '#d0b5ff',
    description: 'Investigá cómo los equipos colaboran, aprenden y construyen mejores soluciones de software.',
    tags: ['Equipos', 'Software', 'Aprendizaje'],
    project: 'Una puerta de entrada: calidad en proyectos ágiles de software.',
    challenge: '¿Cómo ayudarías a un equipo a transformar una idea en algo útil?',
    match: 'Te motiva escuchar a las personas, organizar ideas y mejorar las soluciones a través de pequeños experimentos.' },
  { id: 'datos', name: 'Base de Datos', label: 'Preguntá. Descubrí. Transformá.', icon: 'database', color: '#f4ce8f',
    description: 'Explorá cómo organizar y cuidar los datos para convertirlos en información útil.',
    tags: ['Calidad de datos', 'Análisis', 'Impacto social'],
    project: 'Una puerta de entrada: gobierno y calidad de datos en organismos públicos del NEA.',
    challenge: '¿Qué podrías descubrir en los datos de tu ciudad?',
    match: 'Te gusta encontrar patrones, hacer buenas preguntas y usar evidencia para comprender un problema.' },
];

export const careers = [
  ['sistemas', 'Ingeniería en Sistemas de Información'],
  ['quimica', 'Ingeniería Química'],
  ['electromecanica', 'Ingeniería Electromecánica'],
  ['mecatronica', 'Ingeniería en Mecatrónica'],
  ['rural', 'Licenciatura en Administración Rural'],
  ['educativa', 'Licenciatura en Tecnología Educativa'],
  ['programacion', 'Tecnicatura en Programación'],
  ['otra', 'Otra carrera'],
  ['secundaria', 'Estoy en la secundaria'],
  ['explorando', 'Todavía estoy explorando'],
];

// Escenarios originales para divulgación. No son un test vocacional validado.
// Las opciones rotan para evitar que una posición favorezca siempre una línea.
export const questions = [
  { id: 'feria', title: 'Llegás a una feria de tecnología. ¿Dónde te quedás?', subtitle: 'Elegí lo que te dé más curiosidad.', options: [
    { text: 'En una demo donde sensores conectados hacen cosas en tiempo real.', line: 'redes' },
    { text: 'En un equipo que convierte ideas del público en una app.', line: 'agilidad' },
    { text: 'En una pantalla que revela historias escondidas en los datos.', line: 'datos' },
  ] },
  { id: 'barrio', title: 'Tu barrio quiere mejorar un problema. ¿Por dónde empezás?', subtitle: 'No hace falta saber hacerlo todavía.', options: [
    { text: 'Conversando con las personas y probando una primera solución.', line: 'agilidad' },
    { text: 'Reuniendo información para entender qué está pasando.', line: 'datos' },
    { text: 'Explorando dispositivos que ayuden a monitorear la situación.', line: 'redes' },
  ] },
  { id: 'misterio', title: 'Algo no está funcionando. ¿Qué misterio te gustaría resolver?', subtitle: 'Pensá en el desafío que elegirías por gusto.', options: [
    { text: 'Por qué dos informes muestran números diferentes.', line: 'datos' },
    { text: 'Por qué una conexión se corta o deja de ser segura.', line: 'redes' },
    { text: 'Por qué una app no resuelve lo que sus usuarios necesitan.', line: 'agilidad' },
  ] },
  { id: 'tarde', title: 'Tenés una tarde para experimentar. ¿Qué plan te tienta?', subtitle: 'La curiosidad cuenta más que la experiencia.', options: [
    { text: 'Conectar un sensor y ver qué puede medir.', line: 'redes' },
    { text: 'Buscar patrones en un conjunto de datos abiertos.', line: 'datos' },
    { text: 'Crear un prototipo con otras personas y pedir opiniones.', line: 'agilidad' },
  ] },
  { id: 'impacto', title: '¿Qué cambio te daría más satisfacción?', subtitle: 'Imaginá que el proyecto ya está en marcha.', options: [
    { text: 'Que un equipo trabaje mejor y cree algo que la gente use.', line: 'agilidad' },
    { text: 'Que la información y los dispositivos estén mejor protegidos.', line: 'redes' },
    { text: 'Que una decisión importante se apoye en datos confiables.', line: 'datos' },
  ] },
  { id: 'pregunta', title: 'Última: ¿qué pregunta te llevarías a investigar?', subtitle: 'Elegí esa que te daría ganas de seguir conversando.', options: [
    { text: '¿Qué nos dicen los datos que todavía no estamos viendo?', line: 'datos' },
    { text: '¿Cómo podemos aprender y construir mejor en equipo?', line: 'agilidad' },
    { text: '¿Cómo conectamos el mundo de forma más segura?', line: 'redes' },
  ] },
];
