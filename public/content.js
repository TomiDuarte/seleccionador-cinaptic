// Contenido y reglas editables. No colocar secretos en este archivo público.
export const config = {
  // Nueva edición del cuestionario: las participaciones anteriores eran solo pruebas.
  eventId: 'noche-universidades-2026-v2',
  title: 'La Noche de las Universidades',
  center: 'CInApTIC',
  contactUrl: '', // https://wa.me/..., formulario o mailto:... cuando se confirme.
  officialUrl: 'https://www.frre.utn.edu.ar/secretaria_de_ciencia_y_tecnologia/investigacion/CInApTIC/',
  publicUrl: '', // URL HTTPS definitiva para compartir. Vacío usa el origen actual.
  reward: 'un caramelo o chupetín',
};

// Fuentes: presentaciones del centro y Kickoff 2026 proporcionadas por el usuario.
// Kickoff, diapositivas 8–10; presentación del centro, diapositivas 14–26.
// Gobierno del Dato pertenece a Ingeniería de Software; DiMIASA a Comunicaciones.
export const lines = [
  { id: 'comunicaciones', name: 'Comunicaciones', label: 'Conectá. Protegé. Explorá.', icon: 'network', color: '#a8e5c0',
    description: 'Investigá redes, protocolos y dispositivos conectados. Explorá cómo llevar el Internet de las Cosas a la salud y al ambiente, cuidando la seguridad de las comunicaciones.',
    tags: ['IoT', 'Redes y protocolos', 'Ciberseguridad'],
    project: 'Proyectos para explorar: controles de ciberseguridad para redes IoT y DiMIASA, que investiga modelos de IoT aplicados a salud y ambiente.',
    challenge: '¿Cómo conectarías sensores para cuidar el ambiente y proteger la información que envían?',
    match: 'Te da curiosidad conectar dispositivos, entender cómo se comunican y proteger sus redes. Podrías explorar IoT, protocolos y ciberseguridad con aplicaciones en salud y ambiente.' },
  { id: 'software', name: 'Ingeniería de Software', label: 'Escuchá. Construí. Mejorá.', icon: 'spark', color: '#d0b5ff',
    description: 'Investigá cómo construir software de calidad: entender necesidades, estimar el trabajo y mejorar las prácticas ágiles. También explorá el gobierno y la calidad de los datos.',
    tags: ['Agilidad y calidad', 'Requisitos', 'Gobierno del dato'],
    project: 'Proyectos para explorar: calidad de requisitos y entregables en proyectos ágiles, y gobierno y calidad de datos en organismos públicos del NEA.',
    challenge: '¿Cómo ayudarías a un equipo a definir qué construir y a trabajar con información confiable?',
    match: 'Te interesa transformar necesidades en soluciones, mejorar la forma de trabajar y cuidar la calidad de la información. Podrías investigar requisitos, estimación ágil y gobierno del dato.' },
  { id: 'inteligentes', name: 'Sistemas Inteligentes', label: 'Entrená. Reconocé. Descubrí.', icon: 'intelligence', color: '#f4ce8f',
    description: 'Explorá inteligencia artificial, procesamiento de datos y modelos predictivos. Investigá cómo reconocer patrones en imágenes y automatizar tareas con sistemas que aprenden.',
    tags: ['Inteligencia artificial', 'Visión artificial', 'Modelos predictivos'],
    project: 'Un proyecto para explorar: caracterización y clasificación de semillas de algodón mediante procesamiento digital de imágenes, software abierto y hardware de bajo costo.',
    challenge: '¿Cómo le enseñarías a una computadora a reconocer distintos tipos de semillas a partir de imágenes?',
    match: 'Te entusiasma encontrar patrones y enseñarles a las computadoras a reconocerlos. Podrías explorar inteligencia artificial y procesamiento de imágenes, por ejemplo para clasificar semillas de algodón.' },
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
    { text: 'En sensores que envían mediciones del ambiente a través de una red.', line: 'comunicaciones' },
    { text: 'En un equipo que descubre qué necesita la gente antes de crear una app.', line: 'software' },
    { text: 'En una computadora que aprende a reconocer semillas en imágenes.', line: 'inteligentes' },
  ] },
  { id: 'barrio', title: 'Tu ciudad busca soluciones con tecnología. ¿A qué equipo te sumarías?', subtitle: 'No hace falta saber hacerlo todavía.', options: [
    { text: 'Al que organiza la información pública y mejora su calidad para tomar decisiones.', line: 'software' },
    { text: 'Al que entrena un modelo para encontrar patrones y hacer predicciones.', line: 'inteligentes' },
    { text: 'Al que conecta sensores para monitorear la salud o el ambiente.', line: 'comunicaciones' },
  ] },
  { id: 'misterio', title: 'Algo no está funcionando. ¿Qué misterio te gustaría resolver?', subtitle: 'Pensá en el desafío que elegirías por gusto.', options: [
    { text: 'Por qué un modelo confunde dos tipos de semillas en una foto.', line: 'inteligentes' },
    { text: 'Por qué un sensor pierde conexión o envía información sin protección.', line: 'comunicaciones' },
    { text: 'Por qué una app no cumple las necesidades que el equipo había definido.', line: 'software' },
  ] },
  { id: 'tarde', title: 'Tenés una tarde para experimentar. ¿Qué plan te tienta?', subtitle: 'La curiosidad cuenta más que la experiencia.', options: [
    { text: 'Conectar un sensor y probar cómo transmitir sus mediciones de forma segura.', line: 'comunicaciones' },
    { text: 'Probar un algoritmo que reconozca formas en imágenes.', line: 'inteligentes' },
    { text: 'Comparar maneras de estimar el trabajo y mejorar las entregas de un equipo.', line: 'software' },
  ] },
  { id: 'impacto', title: '¿Qué cambio te daría más satisfacción?', subtitle: 'Imaginá que el proyecto ya está en marcha.', options: [
    { text: 'Que un organismo público trabaje con datos confiables y procesos de calidad.', line: 'software' },
    { text: 'Que una red de dispositivos cuide la salud o el ambiente de forma segura.', line: 'comunicaciones' },
    { text: 'Que un sistema ayude a clasificar semillas automáticamente usando imágenes.', line: 'inteligentes' },
  ] },
  { id: 'pregunta', title: 'Última: ¿qué pregunta te llevarías a investigar?', subtitle: 'Elegí esa que te daría ganas de seguir conversando.', options: [
    { text: '¿Cómo puede una computadora aprender a reconocer patrones y hacer predicciones?', line: 'inteligentes' },
    { text: '¿Cómo mejoramos los requisitos, las estimaciones y la calidad de un proyecto?', line: 'software' },
    { text: '¿Cómo conectamos dispositivos y protegemos lo que comunican?', line: 'comunicaciones' },
  ] },
];
