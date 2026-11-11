/*
 * 999999999 — DETRÁS DE LA MÁQUINA
 * Esqueleto del universo musical interactivo (entrega de avances)
 * Isabella Escobar — Pensamiento Algorítmico
 *
 * ESCENAS:
 *  0: separador  → pantalla corta de transición entre escenas
 *  1: La consola → inicio, 9 pads (5 llevan a escenas, 4 solo suenan)
 *  2: El tocadiscos → arrastrar un vinilo al plato
 *  3: La mezcla → arrastrar criaturas (los 5 stems de 9x9) a los carriles, sincronizados
 *  4: La gira → laberinto: 9 pases, fans y cronómetro
 *  5: The real rave → la fiesta underground: bodega oscura, aliens, bolas disco y láseres
 *  6: The festival → la fiesta grande (Ultra): noche según la hora real + avión con datos
 *
 * Desde cualquier escena (2 a 6) el botón "9" de arriba a la izquierda
 * lleva de vuelta a la consola.
 *
 * MÚSICA (p5.sound para p5 2):
 *  - Las canciones se cargan con  await loadSound()  en setup.
 *  - Cada canción se conecta al FFT y a la Amplitude con  cancion.connect(...)
 *  - analizarMusica() corre en cada cuadro y calcula:
 *      pulso   → los golpes del bajo (de 0 a 1)  → todo lo que salta y late
 *      agudos  → la energía de los agudos (de 0 a 1) → los láseres
 *      nivel   → el volumen general (Amplitude) → el anillo del tocadiscos
 *  - El volumen se cambia con  cancion.amp(valor)
 *  - Los navegadores no dejan sonar nada sin un clic: por eso hay una
 *    pantalla de entrada que activa el audio con userStartAudio().
 */

// ============================================================
//  CONFIGURACIÓN GENERAL
// ============================================================

const ANCHO = 1000;
const ALTO = 650;
const BPM = 130; // velocidad de La mezcla: todos los stems se ajustan a esta

let escena = 1;            // escena que se está mostrando
let escenaDestino = 1;     // escena a la que vamos después del separador
let inicioSeparador = 0;   // momento (en milisegundos) en que empezó el separador
const DURACION_SEPARADOR = 1200;

const nombresEscenas = ["", "La consola", "El tocadiscos", "La mezcla", "La gira", "The real rave", "The festival"];

// Paleta del moodboard (se crean en setup porque color() necesita p5 listo)
let rojo, verde, negro, blanco;

// ---- SONIDO ----
const RUTA_SONIDOS = "assets/sonidos/";
let cancionInicio;      // X0004000X (la consola)
let kickBajo;           // golpe de los 4 pads decorativos
let alarma;             // Alarm 303 (la gira)
let cancionRave;        // Acid World (the real rave)
let partesUltra = [];   // las 3 partes del set de Ultra (the festival)
// (las 5 canciones de los vinilos se guardan dentro de cada vinilo: vinilo.cancion)

let amplitud;           // mide el volumen general
let fft;                // separa el sonido en frecuencias (bajos, medios, agudos)
let audioActivado = false; // se vuelve true con el primer clic
let musicaCargada = false; // se vuelve true cuando terminan de cargar todos los audios

// resultados del análisis (se actualizan en cada cuadro)
let pulso = 0;
let agudos = 0;
let nivel = 0;
let promedioBajos = -100; // promedio lento de los bajos, para detectar los golpes

// Sensibilidad: si algo salta muy poco, baja este número; si salta demasiado, súbelo
const SENSIBILIDAD_BAJOS = 6;

// ---- FUENTES ----
// Se cargan desde Google Fonts con un <link> en index.html.
// Títulos: stencil industrial (como las letras pintadas en cajas y bodegas).
// Textos: monoespaciada, como las pantallas de las máquinas.
const FUENTE_TITULOS = "Saira Stencil One";
const FUENTE_TEXTO = "Space Mono";

let inicioEscena = 0; // cuándo entramos a la escena actual (para el efecto de máquina de escribir)

// ---- VOLUMEN GENERAL DE LA PÁGINA ----
let salidaGeneral;          // todos los sonidos pasan por aquí antes de llegar a los parlantes
let volumenGeneral = 0.8;   // de 0 a 1
let silenciado = false;
let arrastrandoVolumen = false;
let amplitudVoz;            // mide solo la voz, para mover la boca del alien


// ============================================================
//  SETUP Y DRAW
// ============================================================

async function setup() {
  createCanvas(ANCHO, ALTO);

  rojo = color(224, 0, 0);
  verde = color(60, 255, 42);
  negro = color(10, 10, 10);
  blanco = color(245, 245, 245);

  crearPads();       // escena 1
  crearVinilos();    // escena 2
  crearMezcla();     // escena 3
  reiniciarGira();   // escena 4
  crearRave();       // escena 5
  crearSet();        // escena 6

  // herramientas de análisis
  amplitud = new p5.Amplitude(0.6); // 0.6 = suaviza un poco el valor
  fft = new p5.FFT(1024);           // 1024 bandas: así se separan bien los bajos
  amplitudVoz = new p5.Amplitude(0.5);

  // salida general: un "control de volumen" por el que pasan todos los sonidos.
  // Como el FFT escucha ANTES de esta salida, aunque silencies la página
  // las cosas se siguen moviendo con la música.
  salidaGeneral = getAudioContext().createGain();
  salidaGeneral.connect(getAudioContext().destination);
  aplicarVolumenGeneral();

  // esperar a que las fuentes estén listas (si no cargan, se usan las normales)
  try {
    await document.fonts.load('40px "' + FUENTE_TITULOS + '"');
    await document.fonts.load('14px "' + FUENTE_TEXTO + '"');
    await document.fonts.load('bold 14px "' + FUENTE_TEXTO + '"');
  } catch (error) {
    console.log("No cargaron las fuentes; se usan las del sistema");
  }
  textFont(FUENTE_TEXTO); // fuente de todos los textos (los títulos la cambian)

  await cargarMusica();
}

// Carga todos los audios, uno por uno, mostrando el progreso en pantalla
async function cargarMusica() {
  let total = 7 + vinilos.length + criaturas.length; // audios de las escenas + vinilos + stems
  let cargados = 0;

  cancionInicio = await cargarSonido("X0004000X.MP3", ++cargados, total);
  kickBajo      = await cargarSonido("kickbajo.MP3", ++cargados, total);
  alarma        = await cargarSonido("alarm303.MP3", ++cargados, total);
  cancionRave   = await cargarSonido("acidworld.MP3", ++cargados, total);
  partesUltra[0] = await cargarSonido("ultra_parte1.MP3", ++cargados, total);
  partesUltra[1] = await cargarSonido("ultra_parte2.MP3", ++cargados, total);
  partesUltra[2] = await cargarSonido("ultra_parte3.MP3", ++cargados, total);

  for (let v of vinilos) {
    v.cancion = await cargarSonido(v.archivoAudio, ++cargados, total);
  }

  for (let cr of criaturas) {
    cr.sonido = await cargarSonido(cr.archivo, ++cargados, total, RUTA_STEMS);
    if (cr.tipo == "voz") {
      cr.sonido.connect(amplitudVoz); // la boca del alien escucha solo la voz
    }
  }

  // todas las canciones se repiten en loop (menos el golpe de los pads)
  let enLoop = [cancionInicio, alarma, cancionRave, partesUltra[0], partesUltra[1], partesUltra[2]];
  for (let v of vinilos) {
    enLoop.push(v.cancion);
  }
  for (let cr of criaturas) {
    enLoop.push(cr.sonido);
  }
  for (let s of enLoop) {
    s.loop();
  }
  musicaCargada = true;
}

// Carga un audio y lo conecta al FFT y a la Amplitude para poder analizarlo.
// carpeta: si no se dice otra, busca en assets/sonidos
async function cargarSonido(archivo, numero, total, carpeta = RUTA_SONIDOS) {
  // pantalla de carga: si se queda pegada en un archivo, ese nombre está mal escrito
  background(negro);
  noStroke();
  fill(verde);
  textAlign(CENTER, CENTER);
  textFont(FUENTE_TITULOS);
  textSize(56);
  text("999999999", ANCHO / 2, ALTO / 2 - 40);
  textFont(FUENTE_TEXTO);
  fill(blanco);
  textSize(14);
  text("Cargando música " + numero + " / " + total + "   (" + archivo + ")", ANCHO / 2, ALTO / 2 + 20);
  // barrita de progreso
  noFill();
  stroke(verde);
  strokeWeight(1);
  rect(ANCHO / 2 - 150, ALTO / 2 + 45, 300, 8, 4);
  noStroke();
  fill(verde);
  rect(ANCHO / 2 - 150, ALTO / 2 + 45, 300 * numero / total, 8, 4);

  let sonido = await loadSound(carpeta + archivo);
  sonido.connect(fft);
  sonido.connect(amplitud);
  // en vez de ir directo a los parlantes, pasa por la salida general (el volumen de la página)
  try {
    sonido.output.disconnect(getAudioContext().destination);
  } catch (error) {
    // si ya estaba desconectado, no pasa nada
  }
  sonido.output.connect(salidaGeneral);
  return sonido;
}

function draw() {
  // antes del primer clic: pantalla de entrada
  if (!audioActivado) {
    dibujarPantallaEntrada();
    return;
  }

  analizarMusica(); // una vez por cuadro: calcula pulso, agudos y nivel

  // revisar qué escena está activa y pintarla (igual que el ejemplo de la profe)
  switch (escena) {
    case 0:
      dibujarSeparador();
      break;
    case 1:
      dibujarEscena1();
      break;
    case 2:
      dibujarEscena2();
      break;
    case 3:
      dibujarEscena3();
      break;
    case 4:
      dibujarEscena4();
      break;
    case 5:
      dibujarEscena5();
      break;
    case 6:
      dibujarEscena6();
      break;
  }

  // el botón para volver aparece en todas las escenas menos en la consola y el separador
  if (escena >= 2) {
    dibujarBotonVolver();
  }

  // el control de volumen aparece siempre
  dibujarControlVolumen();
}


// ============================================================
//  HERRAMIENTAS QUE USAN TODAS LAS ESCENAS
// ============================================================

// Cambiar de escena pasando primero por el separador
function irAEscena(numero) {
  escenaDestino = numero;
  escena = 0;
  inicioSeparador = millis();
  detenerMusica(); // se calla la música de la escena que estamos dejando
}

// ---------- PANTALLA DE ENTRADA ----------
function dibujarPantallaEntrada() {
  background(negro);
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(FUENTE_TITULOS);
  fill(verde);
  textSize(96);
  text("999999999", ANCHO / 2, ALTO / 2 - 60);
  textFont(FUENTE_TEXTO);
  fill(blanco);
  textSize(18);
  text("DETRÁS DE LA MÁQUINA", ANCHO / 2, ALTO / 2 + 10);
  // el texto titila para invitar a hacer clic
  fill(255, 150 + sin(millis() * 0.005) * 100);
  textSize(16);
  text("Haz clic para entrar al universo  ·  sube el volumen", ANCHO / 2, ALTO / 2 + 70);
}

// ---------- MÚSICA DE CADA ESCENA ----------

// Empieza la música de la escena a la que acabamos de entrar
function iniciarMusicaEscena(numero) {
  if (numero == 1) {
    cancionInicio.amp(0.5); // de fondo, a volumen más bajo
    cancionInicio.play();
  } else if (numero == 2) {
    // si había un vinilo en el plato, vuelve a sonar
    if (viniloSonando >= 0) {
      reproducirVinilo(viniloSonando);
    }
  } else if (numero == 3) {
    iniciarStems(); // los 5 stems arrancan juntos (los que no están en un carril, en silencio)
  } else if (numero == 4) {
    alarma.rate(1);
    alarma.play();
  } else if (numero == 5) {
    cancionRave.play();
  } else if (numero == 6) {
    partesUltra[parteElegida].play();
  }
}

// Detiene todo lo que esté sonando
function detenerMusica() {
  let todos = [cancionInicio, kickBajo, alarma, cancionRave, partesUltra[0], partesUltra[1], partesUltra[2]];
  for (let v of vinilos) {
    todos.push(v.cancion);
  }
  for (let cr of criaturas) {
    todos.push(cr.sonido);
  }
  for (let s of todos) {
    if (s && s.isPlaying()) {
      s.stop();
    }
  }
}

// ---------- ANÁLISIS DE LA MÚSICA ----------

// Promedio (en decibeles) de las bandas del FFT entre "desde" y "hasta".
// fft.analyze() da un valor por banda; lo pasamos a decibeles con 20 * log10
// porque así se parece más a como oímos (va más o menos de -100 a 0).
function energia(espectro, desde, hasta) {
  let suma = 0;
  for (let i = desde; i <= hasta; i++) {
    suma += 20 * Math.log10(max(espectro[i], 0.0000001));
  }
  return suma / (hasta - desde + 1);
}

function analizarMusica() {
  let espectro = fft.analyze(); // 1024 bandas, cada una de unos 23 Hz

  // BAJOS (bandas 2 a 6 ≈ 45 a 140 Hz: el bombo y el bajo)
  let bajos = energia(espectro, 2, 6);
  // Comparamos el bajo de AHORA con su promedio de los últimos instantes:
  // cuando golpea el bombo, sube por encima del promedio → pulso alto.
  promedioBajos = lerp(promedioBajos, bajos, 0.05);
  let golpe = constrain(map(bajos - promedioBajos, 0, SENSIBILIDAD_BAJOS, 0, 1), 0, 1);
  if (bajos < -90) {
    golpe = 0; // silencio
  }
  // sube de golpe y baja suave (como el pulso simulado que teníamos antes)
  pulso = max(golpe, pulso * 0.85);

  // AGUDOS (bandas 170 a 500 ≈ 4.000 a 11.700 Hz: hi-hats, platillos, brillos)
  let energiaAgudos = energia(espectro, 170, 500);
  agudos = lerp(agudos, constrain(map(energiaAgudos, -90, -45, 0, 1), 0, 1), 0.2);

  // VOLUMEN GENERAL con la Amplitude
  nivel = constrain(map(amplitud.getLevel(), 0, 0.3, 0, 1), 0, 1);
}

// Las escenas piden el pulso y los agudos con estas funciones
function pulsoMusica() {
  return pulso;
}

function agudosMusica() {
  return agudos;
}

// ---------- TÍTULOS E INSTRUCCIONES ----------
// Título: letra stencil con sombra negra y una copia verde que se separa
//         con cada golpe del bajo (efecto "glitch"), entre dos rayas verdes.
// Instrucción: dentro de una cápsula negra, aparece letra por letra como
//         si una máquina la estuviera escribiendo, con un cursor que titila.
function dibujarTituloEscena(titulo, instruccion) {
  let cx = ANCHO / 2;
  let golpe = pulsoMusica();

  // --- título ---
  textFont(FUENTE_TITULOS);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  textSize(42);
  noStroke();
  fill(negro);
  text(titulo, cx + 3, 33);                  // sombra
  fill(60, 255, 42, 200);
  text(titulo, cx - 2 - golpe * 6, 30);      // copia verde que se separa con el bajo
  fill(blanco);
  text(titulo, cx, 30);                      // título

  // rayas a los lados del título (se alargan con el bajo)
  let mitad = textWidth(titulo) / 2;
  let largo = 50 + golpe * 25;
  stroke(verde);
  strokeWeight(3);
  line(cx - mitad - 20, 30, cx - mitad - 20 - largo, 30);
  line(cx + mitad + 20, 30, cx + mitad + 20 + largo, 30);
  noStroke();
  fill(verde);
  circle(cx - mitad - 20 - largo, 30, 7);
  circle(cx + mitad + 20 + largo, 30, 7);

  // --- instrucción --- (si viene vacía, no se dibuja la cápsula)
  if (instruccion != "") {
    dibujarInstruccion(instruccion, cx, 70);
  }
}

// Cápsula con texto que se escribe solo, letra por letra
function dibujarInstruccion(instruccion, cx, cy) {
  textFont(FUENTE_TEXTO);
  textStyle(NORMAL);
  textSize(12);
  // si la frase es muy larga, se achica para que quepa
  let anchoTexto = textWidth(instruccion);
  if (anchoTexto > 880) {
    textSize(12 * 880 / anchoTexto);
    anchoTexto = textWidth(instruccion);
  }
  let anchoCapsula = anchoTexto + 44;
  let izquierda = cx - anchoCapsula / 2;

  // cápsula (del tamaño de la frase completa, para que no cambie mientras se escribe)
  fill(0, 0, 0, 175);
  stroke(60, 255, 42, 160);
  strokeWeight(1);
  rect(izquierda, cy - 12, anchoCapsula, 24, 12);
  noStroke();
  fill(verde);
  triangle(izquierda + 12, cy - 4, izquierda + 12, cy + 4, izquierda + 18, cy); // flechita "▶"

  // efecto de máquina de escribir: 45 letras por segundo desde que entramos a la escena
  let letras = floor((millis() - inicioEscena) / 22);
  let visible = instruccion.substring(0, letras);
  fill(blanco);
  textAlign(LEFT, CENTER);
  text(visible, izquierda + 26, cy);

  // cursor que titila al final
  if (frameCount % 40 < 20) {
    fill(verde);
    rect(izquierda + 27 + textWidth(visible), cy - 6, 7, 12);
  }
  textAlign(CENTER, CENTER);
}

// ---------- CONTROL DE VOLUMEN DE LA PÁGINA ----------
// Pequeño, arriba a la derecha (en La gira, abajo a la derecha para no
// chocar con el tiempo). Clic en el parlante = silenciar; la barrita = volumen.
const ANCHO_VOLUMEN = 140;
const ALTO_VOLUMEN = 26;

function posicionVolumen() {
  if (escena == 4) {
    return { x: ANCHO - ANCHO_VOLUMEN - 15, y: ALTO - ALTO_VOLUMEN - 6 };
  }
  return { x: ANCHO - ANCHO_VOLUMEN - 15, y: 12 };
}

function dibujarControlVolumen() {
  let p = posicionVolumen();
  let callado = silenciado || volumenGeneral == 0;

  // fondo de la cápsula
  fill(0, 0, 0, 150);
  stroke(255, 255, 255, 50);
  strokeWeight(1);
  rect(p.x, p.y, ANCHO_VOLUMEN, ALTO_VOLUMEN, 13);

  // parlante
  let px = p.x + 12;
  let py = p.y + ALTO_VOLUMEN / 2;
  noStroke();
  fill(blanco);
  rect(px, py - 3, 5, 6);
  triangle(px + 4, py - 3, px + 11, py - 8, px + 11, py + 8);
  triangle(px + 4, py + 3, px + 11, py - 8, px + 11, py + 8);
  if (callado) {
    // una X roja cuando está en silencio
    stroke(rojo);
    strokeWeight(2);
    line(px + 14, py - 4, px + 20, py + 4);
    line(px + 20, py - 4, px + 14, py + 4);
  } else {
    // ondas de sonido (más ondas = más volumen)
    noFill();
    stroke(blanco);
    strokeWeight(1.5);
    arc(px + 11, py, 8, 8, -QUARTER_PI, QUARTER_PI);
    if (volumenGeneral > 0.5) {
      arc(px + 11, py, 15, 15, -QUARTER_PI, QUARTER_PI);
    }
  }

  // barrita de volumen
  let x0 = p.x + 40;
  let x1 = p.x + ANCHO_VOLUMEN - 14;
  let xPerilla = lerp(x0, x1, volumenGeneral);
  strokeWeight(3);
  stroke(80);
  line(x0, py, x1, py);
  stroke(callado ? color(120) : verde);
  line(x0, py, xPerilla, py);
  noStroke();
  fill(callado ? color(160) : verde);
  circle(xPerilla, py, 11);
}

// ¿el mouse está sobre el control de volumen?
function clicEnVolumen() {
  let p = posicionVolumen();
  return mouseX > p.x && mouseX < p.x + ANCHO_VOLUMEN &&
         mouseY > p.y && mouseY < p.y + ALTO_VOLUMEN;
}

function presionarVolumen() {
  let p = posicionVolumen();
  if (mouseX < p.x + 34) {
    silenciado = !silenciado;       // clic en el parlante: silencio sí / no
  } else {
    silenciado = false;             // clic en la barrita: cambia el volumen
    arrastrandoVolumen = true;
    moverVolumen();
  }
  aplicarVolumenGeneral();
}

function moverVolumen() {
  let p = posicionVolumen();
  volumenGeneral = constrain(map(mouseX, p.x + 40, p.x + ANCHO_VOLUMEN - 14, 0, 1), 0, 1);
  aplicarVolumenGeneral();
}

// Le pone el volumen a la salida general (con un fundido cortito para que no truene)
function aplicarVolumenGeneral() {
  let valor = silenciado ? 0 : volumenGeneral;
  salidaGeneral.gain.setTargetAtTime(valor, getAudioContext().currentTime, 0.05);
}

// Botón "9" para volver a la consola
function dibujarBotonVolver() {
  let encima = clicEnVolver();
  stroke(verde);
  strokeWeight(2);
  fill(encima ? verde : negro);
  circle(45, 45, 50);
  noStroke();
  fill(encima ? negro : verde);
  textAlign(CENTER, CENTER);
  textFont(FUENTE_TITULOS);
  textSize(30);
  text("9", 45, 46);
  textFont(FUENTE_TEXTO);
}

function clicEnVolver() {
  return dist(mouseX, mouseY, 45, 45) < 25;
}


// ============================================================
//  ESCENA 0 — SEPARADOR (transición entre escenas)
// ============================================================

const filaDeNueves = "9".repeat(70); // un texto con 70 nueves seguidos

function dibujarSeparador() {
  // progreso va de 0 a 1 durante el separador
  let progreso = (millis() - inicioSeparador) / DURACION_SEPARADOR;

  background(negro);
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(FUENTE_TITULOS);

  // filas de 9 que se deslizan: las pares a la derecha, las impares a la izquierda
  textSize(36);
  for (let fila = 0; fila < 13; fila++) {
    let direccion = fila % 2 == 0 ? 1 : -1;
    let desplazamiento = progreso * 300 * direccion;
    fill(fila % 2 == 0 ? rojo : color(90, 0, 0));
    text(filaDeNueves, ANCHO / 2 + desplazamiento, 20 + fila * 50);
  }

  // un 9 verde gigante que crece
  fill(verde);
  textSize(map(progreso, 0, 1, 80, 280));
  text("9", ANCHO / 2, ALTO / 2 - 30);

  // nombre de la escena a la que vamos
  fill(negro);
  rect(ANCHO / 2 - 200, ALTO / 2 + 150, 400, 60, 10);
  fill(blanco);
  textSize(30);
  text(nombresEscenas[escenaDestino].toUpperCase(), ANCHO / 2, ALTO / 2 + 180);
  textFont(FUENTE_TEXTO);

  // cuando termina, entramos a la escena
  if (progreso >= 1) {
    escena = escenaDestino;
    if (escena == 4) {
      reiniciarGira(); // el cronómetro del laberinto empieza al entrar
    }
    inicioEscena = millis(); // para que la instrucción se escriba desde cero
    iniciarMusicaEscena(escena); // empieza la música de la nueva escena
  }
}


// ============================================================
//  ESCENA 1 — LA CONSOLA (inicio)
//  9 pads en cuadrícula 3x3. Los 5 de la X llevan a escenas.
// ============================================================

let pads = [];

function crearPads() {
  // los pads con destino 0 son decorativos (solo suenan)
  // "\n" parte el texto en dos líneas para que quepa en el pad
  let nombres = ["Tocadiscos", "9", "La mezcla", "9", "La gira", "9", "The real\nrave", "9", "The\nfestival"];
  let destinos = [2, 0, 3, 0, 4, 0, 5, 0, 6];

  let tam = 110;
  let espacio = 15;
  let anchoConsola = 3 * tam + 2 * espacio;
  let xInicio = ANCHO / 2 - anchoConsola / 2;
  let yInicio = 220;

  for (let i = 0; i < 9; i++) {
    let columna = i % 3;
    let fila = floor(i / 3);
    pads.push({
      x: xInicio + columna * (tam + espacio),
      y: yInicio + fila * (tam + espacio),
      tam: tam,
      nombre: nombres[i],
      destino: destinos[i],
      brillo: 0 // 0 = apagado, 255 = encendido
    });
  }
}

function dibujarEscena1() {
  background(rojo);
  let pulso = pulsoMusica();

  // alambre de púas en las zonas vacías (va detrás de los DJs y la consola)
  dibujarAlambresConsola();

  // siluetas de los dos DJs a los lados (mueven la cabeza con el ritmo)
  dibujarDJ(160, 470, "CARLO", pulso);
  dibujarDJ(840, 470, "GIOVANNI", pulso);

  // título: 999999999 en stencil, con una copia verde que se separa con el bajo
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(FUENTE_TITULOS);
  textStyle(NORMAL);
  textSize(84);
  fill(60, 255, 42, 210);
  text("999999999", ANCHO / 2 - 3 - pulso * 8, 66);
  fill(negro);
  text("999999999", ANCHO / 2, 66);

  // subtítulo entre dos rayas
  textFont(FUENTE_TEXTO);
  textStyle(BOLD);
  textSize(14);
  text("DETRÁS DE LA MÁQUINA", ANCHO / 2, 122);
  textStyle(NORMAL);
  let mitad = textWidth("DETRÁS DE LA MÁQUINA") / 2;
  stroke(negro);
  strokeWeight(2);
  line(ANCHO / 2 - mitad - 15, 122, ANCHO / 2 - mitad - 70, 122);
  line(ANCHO / 2 + mitad + 15, 122, ANCHO / 2 + mitad + 70, 122);
  noStroke();

  // instrucción que se escribe sola
  dibujarInstruccion("Haz clic en un pad con borde verde para entrar a una escena", ANCHO / 2, 162);

  // cuerpo de la consola
  let primero = pads[0];
  let ultimo = pads[8];
  fill(negro);
  rect(primero.x - 25, primero.y - 25,
       ultimo.x + ultimo.tam - primero.x + 50,
       ultimo.y + ultimo.tam - primero.y + 50, 18);

  // pads
  for (let pad of pads) {
    let encima = mouseX > pad.x && mouseX < pad.x + pad.tam &&
                 mouseY > pad.y && mouseY < pad.y + pad.tam;
    if (encima) {
      pad.brillo = max(pad.brillo, 90);   // se ilumina un poco al pasar el mouse
    }
    pad.brillo = max(0, pad.brillo - 10); // se va apagando solo

    let base = pad.destino > 0 ? color(40) : color(25);
    fill(lerpColor(base, verde, pad.brillo / 255));
    if (pad.destino > 0) {
      stroke(verde);
      strokeWeight(2);
    } else {
      noStroke();
    }
    rect(pad.x, pad.y, pad.tam, pad.tam, 10);

    noStroke();
    if (pad.destino > 0) {
      fill(pad.brillo > 120 ? negro : verde);
      textSize(16);
      textStyle(BOLD);
    } else {
      fill(pad.brillo > 120 ? negro : color(90));
      textSize(28);
      textStyle(NORMAL);
    }
    text(pad.nombre, pad.x + pad.tam / 2, pad.y + pad.tam / 2);
  }
  textStyle(NORMAL);
  // la música de fondo (X0004000X) se inicia en iniciarMusicaEscena(1)
}

// Silueta de un DJ. Cada uno tiene su cabeza propia:
//  CARLO: de espaldas, cabeza rapada con dibujos en el pelo
//  GIOVANNI: casco con antenas y espirales que giran en el visor
function dibujarDJ(x, y, nombre, pulso) {
  let cabeceo = pulso * 8;
  push();
  translate(x, y);
  noStroke();
  fill(negro);
  rect(-55, -130, 110, 170, 30);        // cuerpo
  rect(-50, 30, 40, 120, 10);           // pierna izquierda
  rect(10, 30, 40, 120, 10);            // pierna derecha

  if (nombre == "CARLO") {
    dibujarCabezaCarlo(cabeceo);
  } else {
    dibujarCabezaGiovanni(cabeceo);
  }

  noStroke();
  fill(negro);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(18);
  text(nombre, 0, -282); // más arriba para que no choque con las antenas
  textStyle(NORMAL);
  pop();
}

// Dónde va cada alambre en la consola: esquinas de arriba, los dos lados y abajo
function dibujarAlambresConsola() {
  dibujarAlambre(0, 105, 295, 12);          // esquina de arriba a la izquierda
  dibujarAlambre(ANCHO, 105, 705, 12);      // esquina de arriba a la derecha
  dibujarAlambre(-10, 150, 255, 150);       // horizontal arriba a la izquierda
  dibujarAlambre(745, 150, ANCHO + 10, 150);// horizontal arriba a la derecha
  dibujarAlambre(42, 175, 42, 618);         // lado izquierdo
  dibujarAlambre(958, 175, 958, 618);       // lado derecho
  dibujarAlambre(-10, 634, ANCHO + 10, 634);// abajo, de lado a lado
}

// Un alambre de púas entre dos puntos:
// dos hilos que se enroscan entre sí + nudos con púas cada cierto espacio.
// Con cada golpe del bajo el alambre vibra un poquito.
function dibujarAlambre(x1, y1, x2, y2) {
  let largo = dist(x1, y1, x2, y2);
  let angulo = atan2(y2 - y1, x2 - x1);
  let vibracion = pulsoMusica() * 1.5;

  push();
  translate(x1, y1);
  rotate(angulo); // así siempre dibujamos el alambre "acostado" de 0 a largo
  noFill();

  // sombra roja oscura para darle profundidad
  stroke(120, 0, 0);
  strokeWeight(2);
  dibujarHilos(largo, 3, vibracion);

  // los dos hilos enroscados
  stroke(20);
  strokeWeight(1.8);
  dibujarHilos(largo, 0, vibracion);

  // nudos con púas cada 42 píxeles
  for (let d = 21; d < largo; d += 42) {
    let temblor = sin(d * 0.3 + millis() * 0.03) * vibracion;
    push();
    translate(d, temblor);
    stroke(20);
    strokeWeight(1.8);
    line(-6, -7, 6, 7);   // púa en X
    line(-6, 7, 6, -7);
    line(0, -8, 0, 8);    // púa vertical
    noStroke();
    fill(20);
    ellipse(0, 0, 8, 6);  // nudo
    fill(255, 255, 255, 60);
    ellipse(-1, -1, 3, 2); // brillo del metal
    pop();
  }
  pop();
}

// Dos hilos con forma de onda, uno al revés del otro, para que parezcan enroscados
function dibujarHilos(largo, desplazamiento, vibracion) {
  for (let hilo = 0; hilo < 2; hilo++) {
    let fase = hilo * PI;
    beginShape();
    for (let d = 0; d <= largo; d += 4) {
      let y = sin(d * 0.22 + fase) * 2.5 + sin(d * 0.3 + millis() * 0.03) * vibracion;
      vertex(d, y + desplazamiento);
    }
    endShape();
  }
}

// CARLO de espaldas: cabeza verde brillante con una araña negra
// rasurada en el pelo (inspirada en la foto de su corte)
function dibujarCabezaCarlo(cabeceo) {
  let cy = -175 + cabeceo;  // centro de la cabeza

  noStroke();
  fill(negro);
  ellipse(-45, cy + 5, 12, 22); // oreja izquierda
  ellipse(45, cy + 5, 12, 22);  // oreja derecha
  fill(verde);
  circle(0, cy, 90);            // cabeza

  // cuerpo de la araña
  fill(negro);
  ellipse(0, cy - 12, 12, 14); // cabeza de la araña
  ellipse(0, cy + 8, 16, 26);  // abdomen

  // patas: 4 a cada lado, curvas (s = -1 lado izquierdo, s = 1 lado derecho)
  noFill();
  stroke(negro);
  strokeWeight(4);
  for (let s = -1; s <= 1; s += 2) {
    bezier(s * 5, cy - 16, s * 12, cy - 36, s * 28, cy - 36, s * 34, cy - 22);
    bezier(s * 6, cy - 12, s * 22, cy - 20, s * 34, cy - 10, s * 38, cy + 2);
    bezier(s * 6, cy - 8, s * 20, cy + 2, s * 28, cy + 10, s * 26, cy + 22);
    bezier(s * 5, cy - 4, s * 14, cy + 14, s * 16, cy + 24, s * 12, cy + 32);
    // colmillos
    strokeWeight(2);
    line(s * 3, cy - 18, s * 6, cy - 25);
    strokeWeight(4);
  }
  noStroke();
}

// GIOVANNI: casco con antenas y dos espirales que giran en el visor
function dibujarCabezaGiovanni(cabeceo) {
  let cy = -175 + cabeceo;
  // antenas (se mueven con el ritmo)
  stroke(negro);
  strokeWeight(4);
  line(-18, cy - 38, -30, cy - 75 - cabeceo);
  line(18, cy - 38, 30, cy - 75 - cabeceo);
  noStroke();
  fill(verde);
  circle(-30, cy - 75 - cabeceo, 12);
  circle(30, cy - 75 - cabeceo, 12);

  // casco
  fill(negro);
  circle(0, cy, 90);

  // visor verde
  fill(verde);
  rect(-36, cy - 22, 72, 30, 8);

  // espirales que giran (una hacia cada lado)
  dibujarEspiral(-17, cy - 7, 1);
  dibujarEspiral(17, cy - 7, -1);
}

// Una espiral: la distancia al centro crece mientras va dando vueltas
function dibujarEspiral(x, y, sentido) {
  let giro = millis() * 0.006 * sentido;
  noFill();
  stroke(negro);
  strokeWeight(2);
  beginShape();
  for (let t = 0; t < TWO_PI * 2.5; t += 0.3) {
    let r = t * 0.85;
    vertex(x + cos(t * sentido + giro) * r, y + sin(t * sentido + giro) * r);
  }
  endShape();
}

function presionarEscena1() {
  for (let pad of pads) {
    if (mouseX > pad.x && mouseX < pad.x + pad.tam &&
        mouseY > pad.y && mouseY < pad.y + pad.tam) {
      pad.brillo = 255;
      if (pad.destino == 0) {
        kickBajo.play(); // los pads decorativos suenan con el kick
      }
      if (pad.destino > 0) {
        irAEscena(pad.destino);
      }
    }
  }
}


// ============================================================
//  ESCENA 2 — EL TOCADISCOS
//  Se arrastra un vinilo al plato: gira, baja la aguja y "suena".
// ============================================================

let vinilos = [];
let plato = { x: 590, y: 340, radio: 150 };
let viniloSonando = -1;     // índice del vinilo que está en el plato (-1 = ninguno)
let viniloArrastrado = -1;  // índice del vinilo que se está arrastrando (-1 = ninguno)
let anguloVinilo = 0;
let anguloBrazo = 0;
let volumen = 0.7;
let perilla = { x: 900, y: 520, radio: 38 };
let girandoPerilla = false;

function crearVinilos() {
  // completar los años que faltan cuando estén confirmados
  // archivo: nombre EXACTO de la portada en assets/imagenes (las mayúsculas importan)
  // audio: nombre EXACTO de la canción en assets/sonidos (también importan .MP3 / .mp3)
  let canciones = [
    { titulo: "300000003", anio: "2018", archivo: "300000003.png", audio: "300000003.MP3" },
    { titulo: "Rave 4 Love", anio: "2020", archivo: "Rave4love.png", audio: "rave4love.MP3" },
    { titulo: "Acid Blood", anio: "2025", archivo: "AcidBlood.png", audio: "acidblood.MP3" },
    { titulo: "I Got Acid", anio: "", archivo: "IGotAcid.png", audio: "igotacid.mp3" },
    { titulo: "IN MY HOUSE", anio: "", archivo: "InMyHouse.png", audio: "inmyhouse.mp3" }
  ];
  let tonos = [verde, blanco, rojo, verde, blanco]; // color de respaldo si la portada no carga

  for (let i = 0; i < canciones.length; i++) {
    let yCasa = 135 + i * 110;
    let vinilo = {
      titulo: canciones[i].titulo,
      anio: canciones[i].anio,
      tono: tonos[i],
      portada: null, // aquí queda la portada recortada en círculo cuando cargue
      archivoAudio: canciones[i].audio,
      cancion: null, // aquí queda la canción cuando se cargue en setup
      x: 130,
      y: yCasa,
      xCasa: 130,   // posición a la que vuelve cuando se suelta
      yCasa: yCasa,
      radio: 48
    };
    vinilos.push(vinilo);

    // cargar la portada; cuando termine de cargar, se recorta en círculo
    loadImage("assets/imagenes/" + canciones[i].archivo, function (img) {
      vinilo.portada = recortarEnCirculo(img);
    });
  }
  // las canciones se cargan después, en cargarMusica()
}

// Pone a sonar la canción de un vinilo (y calla la que estuviera sonando)
function reproducirVinilo(indice) {
  for (let v of vinilos) {
    if (v.cancion.isPlaying()) {
      v.cancion.stop();
    }
  }
  let cancion = vinilos[indice].cancion;
  cancion.amp(max(volumen, 0.001)); // el mínimo es 0.001 porque amp(0) puede dar problemas
  cancion.play();
}

function dibujarEscena2() {
  let sonando = viniloSonando >= 0;
  let bajos = sonando ? pulsoMusica() : 0; // golpes del bajo (FFT)

  // el fondo se oscurece con cada golpe de bajo
  background(lerpColor(rojo, color(70, 0, 0), bajos));

  dibujarTituloEscena("EL TOCADISCOS", "Arrastra un vinilo hasta el tocadiscos para escucharlo");

  // base del tocadiscos
  noStroke();
  fill(negro);
  rect(plato.x - 220, plato.y - 200, 440, 400, 20);

  // anillo verde que crece con la amplitud (volumen general de la canción)
  if (sonando) {
    noFill();
    stroke(verde);
    strokeWeight(3);
    circle(plato.x, plato.y, plato.radio * 2 + 30 + nivel * 60);
  }

  // plato
  noStroke();
  fill(35);
  circle(plato.x, plato.y, plato.radio * 2 + 16);

  // vinilo girando en el plato
  if (sonando) {
    anguloVinilo += 0.04;
    dibujarVinilo(vinilos[viniloSonando], plato.x, plato.y, plato.radio, anguloVinilo);
  }

  // brazo con la aguja: baja cuando hay un vinilo sonando
  let objetivo = sonando ? 0.42 : 0;
  anguloBrazo = lerp(anguloBrazo, objetivo, 0.08); // se mueve suave hacia el objetivo
  push();
  translate(plato.x + 180, plato.y - 160);
  rotate(anguloBrazo);
  noStroke();
  fill(80);
  circle(0, 0, 34);
  stroke(200);
  strokeWeight(7);
  line(0, 0, 0, 210);
  noStroke();
  fill(blanco);
  rect(-9, 200, 18, 30, 4);
  pop();

  // vinilos en su columna (menos el que suena y el que se arrastra)
  for (let i = 0; i < vinilos.length; i++) {
    let v = vinilos[i];
    if (i == viniloSonando || i == viniloArrastrado) {
      continue;
    }
    dibujarVinilo(v, v.x, v.y, v.radio, 0);
    noStroke();
    fill(blanco);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(13);
    text(v.titulo, v.x + 58, v.y - 7);
    textStyle(NORMAL);
    text(v.anio, v.x + 58, v.y + 10);
  }

  // el vinilo arrastrado se dibuja al final para que quede encima de todo
  if (viniloArrastrado >= 0) {
    let v = vinilos[viniloArrastrado];
    dibujarVinilo(v, v.x, v.y, v.radio, 0);
  }

  dibujarPerilla();

  // qué está sonando: en dos líneas, justo debajo del tocadiscos
  // (así no se cruza con el texto de la perilla de volumen)
  if (sonando) {
    noStroke();
    fill(blanco);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(15);
    text("SONANDO: " + vinilos[viniloSonando].titulo, plato.x, 563);
    textStyle(NORMAL);
    textSize(12);
    text("(haz clic en el disco para quitarlo)", plato.x, 584);
  }
}

// Recorta una imagen cuadrada en forma de círculo usando una máscara:
// donde la máscara está pintada, la imagen se ve; donde no, queda transparente.
function recortarEnCirculo(img) {
  let tam = 400;
  img.resize(tam, tam);                  // todas las portadas del mismo tamaño
  let mascara = createGraphics(tam, tam);
  mascara.noStroke();
  mascara.fill(255);
  mascara.circle(tam / 2, tam / 2, tam);
  img.mask(mascara.get());
  mascara.remove();                      // ya no se necesita
  return img;
}

function dibujarVinilo(v, x, y, radio, angulo) {
  push();
  translate(x, y);
  rotate(angulo);
  noStroke();
  fill(15);
  circle(0, 0, radio * 2);           // disco
  noFill();
  stroke(45);
  strokeWeight(1);
  circle(0, 0, radio * 1.7);         // surcos
  circle(0, 0, radio * 1.4);
  circle(0, 0, radio * 1.1);
  stroke(255, 70);
  strokeWeight(2);
  line(0, -radio * 0.95, 0, -radio * 0.6); // brillo que deja ver que gira
  noStroke();
  if (v.portada != null) {
    // etiqueta con la portada real del álbum (gira con el disco)
    imageMode(CENTER);
    image(v.portada, 0, 0, radio, radio);
    imageMode(CORNER);
  } else {
    // mientras carga (o si no se encuentra la imagen): etiqueta de color
    fill(v.tono);
    circle(0, 0, radio);
    fill(negro);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(radio * 0.09);
    text(v.titulo, 0, -radio * 0.16);
    textStyle(NORMAL);
    text(v.anio, 0, radio * 0.18);
  }
  fill(negro);
  circle(0, 0, radio * 0.06);        // huequito del centro
  pop();
}

function dibujarPerilla() {
  push();
  translate(perilla.x, perilla.y);
  noStroke();
  fill(negro);
  circle(0, 0, perilla.radio * 2 + 10);
  fill(50);
  circle(0, 0, perilla.radio * 2);
  rotate(map(volumen, 0, 1, -PI * 0.75, PI * 0.75)); // la rayita gira según el volumen
  stroke(verde);
  strokeWeight(4);
  line(0, 0, 0, -perilla.radio + 6);
  pop();

  noStroke();
  fill(blanco);
  textAlign(CENTER, CENTER);
  textSize(13);
  text("VOLUMEN " + round(volumen * 100) + "%", perilla.x, perilla.y + perilla.radio + 22);
  text("arrastra arriba / abajo", perilla.x, perilla.y + perilla.radio + 40);
}

function presionarEscena2() {
  // 1. ¿clic en la perilla?
  if (dist(mouseX, mouseY, perilla.x, perilla.y) < perilla.radio) {
    girandoPerilla = true;
    return;
  }
  // 2. ¿clic en el disco que suena? → se quita
  if (viniloSonando >= 0 && dist(mouseX, mouseY, plato.x, plato.y) < plato.radio) {
    vinilos[viniloSonando].cancion.stop();
    viniloSonando = -1;
    return;
  }
  // 3. ¿clic en un vinilo de la columna? → empieza a arrastrarse
  for (let i = 0; i < vinilos.length; i++) {
    let v = vinilos[i];
    if (i != viniloSonando && dist(mouseX, mouseY, v.x, v.y) < v.radio) {
      viniloArrastrado = i;
      return;
    }
  }
}

function arrastrarEscena2() {
  if (girandoPerilla) {
    // subir el mouse sube el volumen, bajarlo lo baja
    volumen = constrain(volumen - (mouseY - pmouseY) * 0.005, 0, 1);
    if (viniloSonando >= 0) {
      vinilos[viniloSonando].cancion.amp(max(volumen, 0.001)); // 0.001 = casi en silencio
    }
  }
  if (viniloArrastrado >= 0) {
    vinilos[viniloArrastrado].x = mouseX;
    vinilos[viniloArrastrado].y = mouseY;
  }
}

function soltarEscena2() {
  girandoPerilla = false;
  if (viniloArrastrado >= 0) {
    let v = vinilos[viniloArrastrado];
    // si se soltó encima del plato, ese vinilo empieza a sonar
    if (dist(v.x, v.y, plato.x, plato.y) < plato.radio) {
      viniloSonando = viniloArrastrado;
      anguloVinilo = 0;
      reproducirVinilo(viniloSonando); // calla la anterior y suena la nueva
    }
    // el vinilo vuelve a su lugar en la columna (el que suena se dibuja en el plato)
    v.x = v.xCasa;
    v.y = v.yCasa;
    viniloArrastrado = -1;
  }
}


// ============================================================
//  ESCENA 3 — LA MEZCLA
//  Cada criatura es un sonido (stem) que mandó 9x9.
//
//  CÓMO SE SINCRONIZAN (como en Ableton, pero más simple):
//   1. Misma velocidad: todos se ajustan a 130 BPM con rate().
//      Por ejemplo el acid va a 138 BPM → rate(130 / 138).
//   2. Mismo inicio: al entrar a la escena los 5 empiezan a sonar
//      JUNTOS pero en silencio. Poner una criatura en un carril solo
//      le sube el volumen; sacarla lo vuelve a bajar. Como siempre
//      sonaron a la par, nunca quedan a destiempo.
// ============================================================

const RUTA_STEMS = "assets/stems/";
let carriles = [];
let criaturas = [];
let criaturaArrastrada = -1;
let inicioStems = 0; // momento en que empezaron los stems (para el secuenciador)

function crearMezcla() {
  for (let i = 0; i < 5; i++) {
    carriles.push({ x: 360, y: 145 + i * 92, ancho: 580, alto: 80, ocupadoPor: -1 });
  }

  // patron: 16 pasos; 1 = se ilumina en ese paso, 0 = apagado (es solo visual)
  // archivo: nombre EXACTO del stem en assets/stems   ·   bpm: velocidad original del loop
  let datos = [
    { tipo: "kick",  nombre: "Kick",         archivo: "kick.wav",   bpm: 130, patron: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] },
    { tipo: "acido", nombre: "Acid (303)",   archivo: "acid.wav",   bpm: 138, patron: [1,1,0,1, 0,1,1,0, 1,0,1,1, 0,1,0,1] },
    { tipo: "hihat", nombre: "Hi-hats",      archivo: "hithat.wav", bpm: 130, patron: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0] },
    { tipo: "perc",  nombre: "Percusión",    archivo: "perc.wav",   bpm: 130, patron: [0,0,1,1, 0,1,0,0, 0,0,1,0, 0,1,0,1] },
    { tipo: "voz",   nombre: "Voz",          archivo: "vocal.wav",  bpm: 135, patron: [0,0,0,0, 1,1,1,0, 0,0,0,0, 1,1,0,0] }
  ];

  for (let i = 0; i < datos.length; i++) {
    let yCasa = carriles[i].y + carriles[i].alto / 2;
    criaturas.push({
      tipo: datos[i].tipo,
      nombre: datos[i].nombre,
      archivo: datos[i].archivo,
      bpm: datos[i].bpm,
      patron: datos[i].patron,
      sonido: null, // aquí queda el stem cuando se cargue en setup
      x: 170,
      y: yCasa,
      xCasa: 170,
      yCasa: yCasa,
      carril: -1 // -1 = no está en ningún carril
    });
  }
  // los stems se cargan después, en cargarMusica()
}

// Empieza los 5 stems al mismo tiempo. Cada uno suena fuerte solo si
// su criatura está en un carril; si no, suena "en silencio".
function iniciarStems() {
  for (let cr of criaturas) {
    cr.sonido.rate(BPM / cr.bpm); // ajusta su velocidad a 130 BPM
    cr.sonido.amp(cr.carril >= 0 ? 1 : 0.001);
  }
  for (let cr of criaturas) {
    cr.sonido.play();
  }
  inicioStems = millis();
}

// Sube o baja el volumen de un stem (con un pequeño fundido de 0.1 s)
function volumenStem(cr, encendido) {
  cr.sonido.amp(encendido ? 1 : 0.001);
}

// Dónde está una criatura: arrastrándose, en su carril o en su casa
function posicionCriatura(i) {
  let cr = criaturas[i];
  if (i == criaturaArrastrada) {
    return { x: cr.x, y: cr.y };
  } else if (cr.carril >= 0) {
    let c = carriles[cr.carril];
    return { x: c.x + 60, y: c.y + c.alto / 2 };
  } else {
    return { x: cr.xCasa, y: cr.yCasa };
  }
}

function dibujarEscena3() {
  background(rojo);
  dibujarTituloEscena("LA MEZCLA", "Arrastra cada criatura a un carril para sumarla a tu track");

  // en qué paso (de 16) va el loop, contando desde que empezaron los stems
  let duracionPaso = 60000 / BPM / 4;
  let pasoActual = floor((millis() - inicioStems) / duracionPaso) % 16;
  let capas = 0;

  // zona de las criaturas y mesa de producción
  noStroke();
  fill(0, 0, 0, 60);
  rect(60, 130, 240, 480, 16);
  fill(negro);
  rect(330, 130, 630, 480, 16);

  // carriles
  for (let i = 0; i < carriles.length; i++) {
    let c = carriles[i];
    fill(30);
    rect(c.x, c.y, c.ancho, c.alto, 10);
    fill(90);
    textAlign(LEFT, TOP);
    textSize(11);
    text("CARRIL " + (i + 1), c.x + 10, c.y + 8);

    // si hay una criatura, se dibuja su patrón como secuenciador
    if (c.ocupadoPor >= 0) {
      capas++;
      let patron = criaturas[c.ocupadoPor].patron;
      let anchoPaso = (c.ancho - 140) / 16;
      for (let p = 0; p < 16; p++) {
        let px = c.x + 125 + p * anchoPaso;
        if (patron[p] == 1) {
          fill(p == pasoActual ? verde : color(30, 120, 20));
        } else {
          fill(p == pasoActual ? color(90) : color(45));
        }
        rect(px, c.y + 25, anchoPaso - 4, c.alto - 50, 4);
      }
    }
  }

  // criaturas (la arrastrada se dibuja al final, encima de todo)
  for (let i = 0; i < criaturas.length; i++) {
    if (i != criaturaArrastrada) {
      dibujarCriaturaCompleta(i, pasoActual);
    }
  }
  if (criaturaArrastrada >= 0) {
    dibujarCriaturaCompleta(criaturaArrastrada, pasoActual);
  }

  noStroke();
  fill(blanco);
  textAlign(CENTER, CENTER);
  textSize(14);
  text("Así hacen sus sets en vivo: capa por capa   ·   Capas sonando: " + capas + " / " + criaturas.length, ANCHO / 2, 630);
}

function dibujarCriaturaCompleta(i, pasoActual) {
  let cr = criaturas[i];
  let pos = posicionCriatura(i);
  let sonando = cr.carril >= 0;
  let golpe = sonando && cr.patron[pasoActual] == 1 ? 1 : 0;
  dibujarCriatura(cr, pos.x, pos.y, sonando, golpe);

  noStroke();
  fill(blanco);
  textAlign(CENTER, CENTER);
  textSize(12);
  text(cr.nombre, pos.x, pos.y + 38);
}

// Cada tipo de sonido tiene su propia forma y su propio movimiento
function dibujarCriatura(cr, x, y, sonando, golpe) {
  push();
  translate(x, y);

  if (cr.tipo == "kick") {
    // KICK: una bola negra que salta con cada golpe
    let salto = golpe * 12;
    fill(negro);
    stroke(verde);
    strokeWeight(3);
    circle(0, -salto, 56 + golpe * 8);
    noStroke();
    fill(verde);
    circle(-10, -salto - 6, 10);
    circle(10, -salto - 6, 10);

  } else if (cr.tipo == "acido") {
    // LÍNEA ÁCIDA: una serpiente verde que se retuerce
    noStroke();
    let amplitudOnda = sonando ? 10 : 3;
    for (let k = 6; k >= 0; k--) {
      let cx = -36 + k * 12;
      let cy = sin(millis() * 0.01 + k * 0.9) * amplitudOnda;
      fill(verde);
      circle(cx, cy, 20 - k * 1.5);
    }
    let cabezaY = sin(millis() * 0.01) * amplitudOnda;
    fill(negro);
    circle(-39, cabezaY - 3, 5);

  } else if (cr.tipo == "hihat") {
    // HI-HATS: una bolita con chispas que giran y se abren en cada golpe
    noStroke();
    fill(blanco);
    circle(0, 0, 26);
    fill(negro);
    circle(-5, -3, 5);
    circle(5, -3, 5);
    let separacion = 22 + golpe * 14;
    fill(verde);
    for (let k = 0; k < 6; k++) {
      let a = k * TWO_PI / 6 + millis() * 0.002;
      circle(cos(a) * separacion, sin(a) * separacion, 7);
    }

  } else if (cr.tipo == "perc") {
    // PERCUSIÓN: una cajita con una onda en la boca
    noStroke();
    fill(verde);
    rect(-28, -22, 56, 44, 8);
    fill(negro);
    circle(-10, -6, 8);
    circle(10, -6, 8);
    noFill();
    stroke(negro);
    strokeWeight(2);
    let velocidad = sonando ? 0.012 : 0.003;
    beginShape();
    for (let px = -22; px <= 22; px += 2) {
      vertex(px, 10 + sin(px * 0.3 + millis() * velocidad) * 4);
    }
    endShape();

  } else if (cr.tipo == "voz") {
    // VOZ: un alien verde que canta. La boca se abre con el volumen REAL
    // de la voz (amplitudVoz solo escucha este stem): cuando la voz suena
    // fuerte, la boca se abre más; cuando calla, se cierra.
    let nivelVoz = constrain(map(amplitudVoz.getLevel(), 0, 0.2, 0, 1), 0, 1);
    let abierta = sonando ? 3 + nivelVoz * 16 : 3;

    // antenas
    stroke(verde);
    strokeWeight(3);
    line(-7, -20, -13, -34);
    line(7, -20, 13, -34);
    noStroke();
    fill(verde);
    circle(-13, -34, 7);
    circle(13, -34, 7);

    // cabeza
    fill(verde);
    ellipse(0, 0, 44, 46);

    // ojos grandes de alien
    fill(negro);
    ellipse(-9, -6, 13, 17);
    ellipse(9, -6, 13, 17);

    // boca que canta
    fill(negro);
    ellipse(0, 12, 14, abierta);

    // micrófono
    stroke(150);
    strokeWeight(4);
    line(18, 22, 26, 6);                   // mango
    noStroke();
    fill(80);
    circle(27, 3, 12);                     // cabeza del micrófono
  }

  pop();
}

function presionarEscena3() {
  for (let i = 0; i < criaturas.length; i++) {
    let pos = posicionCriatura(i);
    if (dist(mouseX, mouseY, pos.x, pos.y) < 35) {
      let cr = criaturas[i];
      criaturaArrastrada = i;
      // si estaba en un carril, sale de él y deja de sonar
      if (cr.carril >= 0) {
        carriles[cr.carril].ocupadoPor = -1;
        cr.carril = -1;
        volumenStem(cr, false); // se baja el volumen (sigue corriendo en silencio)
      }
      cr.x = mouseX;
      cr.y = mouseY;
      return;
    }
  }
}

function arrastrarEscena3() {
  if (criaturaArrastrada >= 0) {
    criaturas[criaturaArrastrada].x = mouseX;
    criaturas[criaturaArrastrada].y = mouseY;
  }
}

function soltarEscena3() {
  if (criaturaArrastrada < 0) {
    return;
  }
  let cr = criaturas[criaturaArrastrada];
  for (let j = 0; j < carriles.length; j++) {
    let c = carriles[j];
    let dentro = mouseX > c.x && mouseX < c.x + c.ancho && mouseY > c.y && mouseY < c.y + c.alto;
    if (dentro && c.ocupadoPor == -1) {
      c.ocupadoPor = criaturaArrastrada;
      cr.carril = j;
      volumenStem(cr, true); // se sube el volumen: entra en el compás
    }
  }
  criaturaArrastrada = -1; // si no cayó en un carril libre, vuelve a su casa
}


// ============================================================
//  ESCENA 4 — LA GIRA (laberinto)
//  Flechas para moverse. Recoger los 9 pases y llegar a la cabina
//  antes de que se acabe el tiempo. Los fans quitan 5 segundos.
// ============================================================

const TAM_CELDA = 40;
const MAPA_X = 80;   // dónde empieza el laberinto en el canvas
const MAPA_Y = 95;
const TIEMPO_LIMITE = 40000; // 40 segundos

// # = pared   . = camino   S = salida del DJ   P = pase   F = fan   C = cabina
const mapa = [
  "#####################",
  "#S..#.....P.....#..P#",
  "#.#.#.###.###.#.#.#.#",
  "#.#...#.....#.#...#.#",
  "#.###.#.#P#.#.###.#.#",
  "#..P....#.#.....F...#",
  "###.###.#.#.#####.###",
  "#...#...#.....#.P...#",
  "#.#.#.#####.#.#.###.#",
  "#.#P..F.....#...#...#",
  "#.#####.###.###.#.#.#",
  "#P.......P..#....P#C#",
  "#####################"
];

// ciudades y festivales escritos en los pasillos
const ciudades = [
  { texto: "LONDRES", fila: 3, col: 9 },
  { texto: "BRASIL", fila: 5, col: 13 },
  { texto: "ULTRA", fila: 7, col: 11 },
  { texto: "EDC", fila: 9, col: 9 },
  { texto: "AWAKENINGS", fila: 11, col: 5 }
];

let jugador, pases, fans, cabina;
let inicioGira = 0;
let penalizacion = 0;            // milisegundos perdidos por los fans
let tiempoRestante = TIEMPO_LIMITE;
let estadoGira = "esperando";    // "esperando" (pantalla de inicio), "jugando", "ganaste" o "perdiste"
let protegidoHasta = 0;          // después de un choque, un ratico sin chocar otra vez

function reiniciarGira() {
  pases = [];
  fans = [];
  // recorrer el mapa para encontrar dónde está cada cosa
  for (let f = 0; f < mapa.length; f++) {
    for (let c = 0; c < mapa[f].length; c++) {
      let celda = mapa[f][c];
      if (celda == "S") jugador = { fila: f, col: c };
      if (celda == "P") pases.push({ fila: f, col: c, tomado: false });
      if (celda == "F") fans.push({ fila: f, col: c, filaInicio: f, colInicio: c });
      if (celda == "C") cabina = { fila: f, col: c };
    }
  }
  inicioGira = millis();
  penalizacion = 0;
  tiempoRestante = TIEMPO_LIMITE;
  estadoGira = "esperando"; // primero sale la pantalla de "Haz click para empezar"
  protegidoHasta = 0;
}

// Empieza el juego: desde aquí corre el cronómetro
function empezarGira() {
  inicioGira = millis();
  estadoGira = "jugando";
}

// Clic en La gira: si está en la pantalla de inicio, empieza el juego
function presionarEscena4() {
  if (estadoGira == "esperando") {
    empezarGira();
  }
}

function esPared(fila, col) {
  return mapa[fila][col] == "#";
}

// centro de una celda en el canvas
function centroX(col) {
  return MAPA_X + col * TAM_CELDA + TAM_CELDA / 2;
}
function centroY(fila) {
  return MAPA_Y + fila * TAM_CELDA + TAM_CELDA / 2;
}

function contarPases() {
  let total = 0;
  for (let p of pases) {
    if (p.tomado) total++;
  }
  return total;
}

function dibujarEscena4() {
  if (estadoGira == "jugando") {
    tiempoRestante = TIEMPO_LIMITE - (millis() - inicioGira) - penalizacion;
    if (tiempoRestante <= 0) {
      tiempoRestante = 0;
      estadoGira = "perdiste";
    }
    moverFans();
    revisarFans();
  }

  // mientras menos tiempo queda, más rojo se pone todo
  let urgencia = 1 - tiempoRestante / TIEMPO_LIMITE;
  background(lerpColor(negro, color(110, 0, 0), urgencia));

  // "Alarm 303" se acelera mientras se acaba el tiempo (de velocidad 1 a 1.4)
  if (estadoGira == "jugando") {
    alarma.rate(map(urgencia, 0, 1, 1, 1.4));
  } else if (estadoGira != "esperando" && alarma.isPlaying()) {
    alarma.stop(); // cuando el juego termina, la alarma se calla
  }

  // durante el juego solo va el título (las instrucciones salen en la pantalla de inicio)
  dibujarTituloEscena("LA GIRA", "");

  // paredes
  noStroke();
  fill(rojo);
  for (let f = 0; f < mapa.length; f++) {
    for (let c = 0; c < mapa[f].length; c++) {
      if (esPared(f, c)) {
        rect(MAPA_X + c * TAM_CELDA, MAPA_Y + f * TAM_CELDA, TAM_CELDA, TAM_CELDA);
      }
    }
  }

  // ciudades en los pasillos
  fill(60, 255, 42, 90);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(11);
  for (let ciudad of ciudades) {
    text(ciudad.texto, centroX(ciudad.col), centroY(ciudad.fila));
  }

  // cabina
  fill(verde);
  rect(MAPA_X + cabina.col * TAM_CELDA + 3, MAPA_Y + cabina.fila * TAM_CELDA + 3, TAM_CELDA - 6, TAM_CELDA - 6, 6);
  fill(negro);
  textSize(14);
  text("DJ", centroX(cabina.col), centroY(cabina.fila));

  // pases
  for (let p of pases) {
    if (!p.tomado) {
      let x = centroX(p.col);
      let y = centroY(p.fila);
      fill(verde);
      rect(x - 8, y - 11, 16, 22, 3);
      fill(negro);
      textSize(12);
      text("9", x, y + 1);
    }
  }

  // fans: personitas con camiseta rosada grabando con el celular (el flash parpadea)
  for (let fan of fans) {
    let x = centroX(fan.col);
    let y = centroY(fan.fila);
    noStroke();
    fill(255, 80, 170);
    rect(x - 9, y - 2, 18, 16, 4);       // cuerpo / camiseta
    fill(230, 180, 140);
    circle(x - 1, y - 9, 15);            // cabeza
    fill(negro);
    circle(x - 4, y - 10, 3);            // ojos
    circle(x + 2, y - 10, 3);
    stroke(255, 80, 170);
    strokeWeight(3);
    line(x + 7, y + 1, x + 12, y - 10);  // brazo levantado
    noStroke();
    fill(170);
    rect(x + 9, y - 21, 8, 12, 2);       // celular
    if (frameCount % 20 < 10) {
      fill(255);
      circle(x + 13, y - 18, 5);         // flash
    }
  }

  // jugador: DJ con audífonos (parpadea si acaba de chocar con un fan)
  let parpadeando = millis() < protegidoHasta && frameCount % 10 < 5;
  if (!parpadeando) {
    let jx = centroX(jugador.col);
    let jy = centroY(jugador.fila);
    fill(verde);
    circle(jx, jy, 26);
    noFill();
    stroke(170);                       // diadema gris
    strokeWeight(4);
    arc(jx, jy, 30, 30, PI, TWO_PI);
    stroke(blanco);                    // borde blanco para que resalten
    strokeWeight(1.5);
    fill(rojo);
    rect(jx - 18, jy - 5, 8, 13, 3);   // audífono izquierdo
    rect(jx + 10, jy - 5, 8, 13, 3);   // audífono derecho
    noStroke();
  }

  // cronómetro y contador de pases (aparecen cuando empieza el juego)
  if (estadoGira != "esperando") {
    noStroke();
    fill(blanco);
    textAlign(RIGHT, CENTER);
    textSize(18);
    text("TIEMPO: " + ceil(tiempoRestante / 1000), ANCHO - 40, 25);
    text("PASES: " + contarPases() + " / 9", ANCHO - 40, 50);
  }

  // pantalla de inicio: grande "Haz click para empezar" y las instrucciones abajo
  if (estadoGira == "esperando") {
    noStroke();
    fill(0, 0, 0, 215);
    rect(MAPA_X, MAPA_Y, mapa[0].length * TAM_CELDA, mapa.length * TAM_CELDA);

    // texto grande que late suave para invitar a hacer clic
    textAlign(CENTER, CENTER);
    textFont(FUENTE_TITULOS);
    textSize(54 + sin(millis() * 0.004) * 2);
    fill(negro);
    text("HAZ CLICK PARA EMPEZAR A JUGAR", ANCHO / 2 + 3, ALTO / 2 - 17);
    fill(verde);
    text("HAZ CLICK PARA EMPEZAR A JUGAR", ANCHO / 2, ALTO / 2 - 20);
    textFont(FUENTE_TEXTO);

    // instrucciones en la cápsula que se escribe sola
    dibujarInstruccion("Muévete con las flechas: recoge los 9 pases y llega a la cabina del DJ antes de que se acabe el tiempo", ANCHO / 2, ALTO / 2 + 45);
  }

  // pantalla de final
  if (estadoGira == "ganaste" || estadoGira == "perdiste") {
    fill(0, 0, 0, 200);
    rect(MAPA_X, MAPA_Y, mapa[0].length * TAM_CELDA, mapa.length * TAM_CELDA);
    textAlign(CENTER, CENTER);
    textSize(40);
    if (estadoGira == "ganaste") {
      fill(verde);
      text("¡LLEGASTE A LA CABINA!", ANCHO / 2, ALTO / 2 - 20);
    } else {
      fill(rojo);
      text("SE ACABÓ EL TIEMPO", ANCHO / 2, ALTO / 2 - 20);
    }
    fill(blanco);
    textStyle(NORMAL);
    textSize(18);
    text("Presiona R para jugar otra vez", ANCHO / 2, ALTO / 2 + 30);
  }
  textStyle(NORMAL);
}

// Cada 16 cuadros los fans dan un paso (antes 20: ahora son un poco más rápidos).
// El 70 % de las veces se acercan al jugador (antes 50 %); el resto caminan al azar.
function moverFans() {
  if (frameCount % 16 != 0) {
    return;
  }
  for (let fan of fans) {
    let opciones = [];
    if (!esPared(fan.fila - 1, fan.col)) opciones.push({ fila: fan.fila - 1, col: fan.col });
    if (!esPared(fan.fila + 1, fan.col)) opciones.push({ fila: fan.fila + 1, col: fan.col });
    if (!esPared(fan.fila, fan.col - 1)) opciones.push({ fila: fan.fila, col: fan.col - 1 });
    if (!esPared(fan.fila, fan.col + 1)) opciones.push({ fila: fan.fila, col: fan.col + 1 });

    let elegida;
    if (random() < 0.7) {
      // perseguir: escoger la opción más cercana al jugador
      elegida = opciones[0];
      for (let op of opciones) {
        if (dist(op.col, op.fila, jugador.col, jugador.fila) <
            dist(elegida.col, elegida.fila, jugador.col, jugador.fila)) {
          elegida = op;
        }
      }
    } else {
      elegida = random(opciones);
    }
    fan.fila = elegida.fila;
    fan.col = elegida.col;
  }
}

function revisarFans() {
  if (millis() < protegidoHasta) {
    return;
  }
  for (let fan of fans) {
    if (fan.fila == jugador.fila && fan.col == jugador.col) {
      penalizacion += 5000;                // pierde 5 segundos
      protegidoHasta = millis() + 1500;    // 1,5 segundos sin poder chocar otra vez
      fan.fila = fan.filaInicio;           // el fan vuelve a su lugar
      fan.col = fan.colInicio;
      // (pendiente) efecto de sonido de choque
    }
  }
}

function revisarPases() {
  for (let p of pases) {
    if (!p.tomado && p.fila == jugador.fila && p.col == jugador.col) {
      p.tomado = true;
      // (pendiente) efecto de sonido al recoger un pase
    }
  }
}

function revisarCabina() {
  if (jugador.fila == cabina.fila && jugador.col == cabina.col && contarPases() == pases.length) {
    estadoGira = "ganaste";
  }
}

function teclaEscena4() {
  if (key == "r" || key == "R") {
    reiniciarGira();
    empezarGira(); // con R se juega de una vez, sin pasar por la pantalla de inicio
    alarma.rate(1);
    if (!alarma.isPlaying()) {
      alarma.play(); // vuelve a sonar desde el principio
    }
    return;
  }
  if (estadoGira != "jugando") {
    return;
  }

  let nuevaFila = jugador.fila;
  let nuevaCol = jugador.col;
  // 38 = arriba, 40 = abajo, 37 = izquierda, 39 = derecha
  if (keyCode == 38) nuevaFila--;
  else if (keyCode == 40) nuevaFila++;
  else if (keyCode == 37) nuevaCol--;
  else if (keyCode == 39) nuevaCol++;
  else return;

  if (!esPared(nuevaFila, nuevaCol)) {
    jugador.fila = nuevaFila;
    jugador.col = nuevaCol;
    revisarPases();
    revisarCabina();
  }
}


// ============================================================
//  ESCENA 5 — THE REAL RAVE (la fiesta underground)
//  Como Carlo describe sus fiestas: una bodega oscura, concreto,
//  humo, poca luz, todo en negros y grises. Solo los aliens tienen color.
//  Clic en el espacio: aparece un alien. Clic en una bola disco:
//  cambia de tono. Todo baila con el pulso.
// ============================================================

let aliens = [];
let bolasDisco = [];
let estrellas = [];
let coloresRave = [];

function crearRave() {
  // colores muy brillantes para las bolas disco: rojo, verde y azul
  coloresRave = [color(255, 25, 25), color(40, 255, 60), color(30, 110, 255)];

  for (let i = 0; i < 90; i++) {
    estrellas.push({ x: random(ANCHO), y: random(ALTO * 0.75), tam: random(1, 3), fase: random(TWO_PI) });
  }

  bolasDisco.push({ x: 250, y: 170, radio: 45, color: coloresRave[0], angulo: 0 }); // roja
  bolasDisco.push({ x: 500, y: 140, radio: 55, color: coloresRave[1], angulo: 0 }); // verde
  bolasDisco.push({ x: 750, y: 170, radio: 45, color: coloresRave[2], angulo: 0 }); // azul

  for (let i = 0; i < 5; i++) {
    agregarAlien(random(100, 900), random(470, 560));
  }
}

function agregarAlien(x, y) {
  aliens.push({
    x: x,
    y: y,
    color: random([verde, color(255, 60, 200), color(0, 220, 255), color(255, 220, 0)]),
    fase: random(TWO_PI),   // para que no bailen todos igual
    tam: random(0.8, 1.2)
  });
  if (aliens.length > 100) {
    aliens.shift(); // máximo 100 aliens: se va el más viejo
  }
}

function dibujarEscena5() {
  let pulso = pulsoMusica();      // golpes del bajo (FFT)
  let agudos = agudosMusica();   // energía de los agudos (FFT)

  background(8);

  // partículas de humo / polvo gris que titilan
  noStroke();
  for (let e of estrellas) {
    let brillo = 70 + sin(millis() * 0.003 + e.fase) * 50;
    fill(180, brillo);
    circle(e.x, e.y, e.tam);
  }

  // láseres de colores (rojo, verde, azul): se abren más con los agudos
  strokeWeight(2);
  for (let i = 0; i < 6; i++) {
    let angulo = -HALF_PI + sin(millis() * 0.0015 + i * 1.1) * (0.4 + agudos * 0.6);
    let origenX = i < 3 ? 80 : ANCHO - 80;
    if (i % 3 == 0) {
      stroke(255, 25, 25, 160);
    } else if (i % 3 == 1) {
      stroke(40, 255, 60, 160);
    } else {
      stroke(30, 110, 255, 170);
    }
    line(origenX, 560, origenX + cos(angulo) * 900, 560 + sin(angulo) * 900);
  }

  // piso de concreto
  noStroke();
  fill(30);
  rect(0, 560, ANCHO, 90);
  stroke(255, 255, 255, 25);
  strokeWeight(1);
  for (let x = 0; x <= ANCHO; x += 50) {
    line(x, 560, ANCHO / 2 + (x - ANCHO / 2) * 1.6, ALTO);
  }
  line(0, 600, ANCHO, 600);

  // bolas disco: giran más rápido con cada golpe
  for (let b of bolasDisco) {
    b.angulo += 0.01 + pulso * 0.06;
    stroke(150);
    strokeWeight(2);
    line(b.x, 0, b.x, b.y - b.radio);
    noStroke();
    fill(b.color);
    circle(b.x, b.y, b.radio * 2);

    // cuadritos de espejo: líneas horizontales + óvalos que "giran"
    noFill();
    stroke(0, 0, 0, 80);
    strokeWeight(1);
    for (let k = -2; k <= 2; k++) {
      let yy = b.y + k * b.radio / 3;
      let medio = sqrt(pow(b.radio, 2) - pow(k * b.radio / 3, 2));
      line(b.x - medio, yy, b.x + medio, yy);
    }
    for (let k = 0; k < 3; k++) {
      ellipse(b.x, b.y, b.radio * 2 * abs(cos(b.angulo + k * PI / 3)), b.radio * 2);
    }

    // destello en cada golpe
    noStroke();
    fill(255, 255, 255, 150 * pulso);
    circle(b.x - b.radio * 0.4, b.y - b.radio * 0.4, 10 + pulso * 10);
  }

  // aliens bailando
  for (let a of aliens) {
    dibujarAlien(a, pulso);
  }

  dibujarTituloEscena("THE REAL RAVE", "Haz click donde te quieras hacer y disfruta del rave  ·  click en una bola disco para cambiarle el color");

  noStroke();
  fill(160);
  textAlign(CENTER, CENTER);
  textSize(14);
  text("Aliens en la fiesta: " + aliens.length, ANCHO / 2, 625);
  // la música (Acid World) se inicia en iniciarMusicaEscena(5)
}

function dibujarAlien(a, pulso) {
  let salto = pulso * 18 * a.tam;
  let brazos = sin(millis() * 0.008 + a.fase) * 0.6;

  push();
  translate(a.x, a.y - salto);
  scale(a.tam);

  // antenas
  stroke(a.color);
  strokeWeight(3);
  line(-8, -42, -14, -58);
  line(8, -42, 14, -58);
  noStroke();
  fill(a.color);
  circle(-14, -58, 8);
  circle(14, -58, 8);

  // brazos que se mueven
  stroke(a.color);
  strokeWeight(5);
  line(-14, -5, -30, -20 + brazos * 20);
  line(14, -5, 30, -20 - brazos * 20);

  // cuerpo y cabeza
  noStroke();
  fill(a.color);
  ellipse(0, 0, 30, 40);
  ellipse(0, -30, 40, 34);

  // ojos
  fill(negro);
  ellipse(-8, -30, 12, 16);
  ellipse(8, -30, 12, 16);
  pop();
}

function presionarEscena5() {
  // ¿clic en una bola disco? → cambia de color
  for (let b of bolasDisco) {
    if (dist(mouseX, mouseY, b.x, b.y) < b.radio) {
      let nuevo = random(coloresRave);
      while (nuevo == b.color) {
        nuevo = random(coloresRave); // que siempre sea un color distinto
      }
      b.color = nuevo;
      return;
    }
  }
  // si no, aparece un alien donde se hizo clic
  agregarAlien(mouseX, mouseY);
}


// ============================================================
//  ESCENA 6 — THE FESTIVAL (la fiesta grande, tipo Ultra)
//  El cielo sigue la hora real del usuario. Un avión pasa con un
//  dato del dúo que cambia cada minuto. Se escoge una parte del
//  set de Ultra Miami.
// ============================================================

const datosDuo = [
  "Vienen de Venecia, Italia",
  "Empezaron en julio de 2016",
  "\"300000003\" (2018): su gran hit",
  "Su sello: NineTimesNine",
  "Sets en vivo solo con máquinas",
  "Carlo Braidotti y Giovanni Calvani"
];
const partesSet = ["Parte 1", "Parte 2", "Parte 3"];
let parteElegida = 0;
let publico = [];

function crearSet() {
  for (let i = 0; i < 26; i++) {
    publico.push({
      x: 20 + i * 38 + random(-8, 8),
      alto: random(60, 85),
      fase: random(1) // cada persona salta un poco distinto
    });
  }
  // las 3 partes del set se cargan en cargarMusica()
}

// Color del cielo según la hora (como en "Amor sin tiempo")
function colorDelCielo(h) {
  let noche = color(10, 10, 25);
  let amanecer = color(255, 150, 60);
  let dia = rojo;
  let atardecer = color(150, 30, 60);

  if (h < 5) return noche;
  else if (h < 7) return lerpColor(noche, amanecer, map(h, 5, 7, 0, 1));
  else if (h < 9) return lerpColor(amanecer, dia, map(h, 7, 9, 0, 1));
  else if (h < 17) return dia;
  else if (h < 19) return lerpColor(dia, atardecer, map(h, 17, 19, 0, 1));
  else if (h < 21) return lerpColor(atardecer, noche, map(h, 19, 21, 0, 1));
  else return noche;
}

function dibujarEscena6() {
  let pulso = pulsoMusica(); // golpes del bajo (FFT)
  let h = hour() + minute() / 60;

  background(colorDelCielo(h));
  dibujarSolYLuna(h);
  dibujarAvion();

  // los dos DJs detrás de la cabina
  noStroke();
  fill(negro);
  rect(430, 290, 40, 60, 8);
  rect(530, 290, 40, 60, 8);
  circle(450, 275 + pulso * 4, 34);
  circle(550, 275 + pulso * 4, 34);
  fill(verde);
  rect(440, 270 + pulso * 4, 20, 6, 2);
  rect(540, 270 + pulso * 4, 20, 6, 2);

  // cabina / escenario
  fill(negro);
  rect(300, 330, 400, 170, 8);
  fill(verde);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(34);
  text("999999999", ANCHO / 2, 415);
  textStyle(NORMAL);

  // parlantes que laten
  fill(negro);
  rect(200, 300, 80, 200, 6);
  rect(720, 300, 80, 200, 6);
  fill(40);
  circle(240, 360, 50 + pulso * 8);
  circle(240, 440, 60 + pulso * 8);
  circle(760, 360, 50 + pulso * 8);
  circle(760, 440, 60 + pulso * 8);

  // piso
  fill(90, 0, 0);
  rect(0, 500, ANCHO, 150);

  // público saltando con los bajos
  let base = 650;
  for (let i = 0; i < publico.length; i++) {
    let p = publico[i];
    let salto = pulso * (10 + p.fase * 15);
    let arriba = base - p.alto - salto;
    noStroke();
    fill(0);
    rect(p.x - 12, arriba, 24, p.alto, 8);
    circle(p.x, arriba - 14, 26);
    if (i % 3 == 0) {
      // algunos con los brazos arriba
      stroke(0);
      strokeWeight(5);
      line(p.x - 10, arriba + 5, p.x - 20, arriba - 35);
      line(p.x + 10, arriba + 5, p.x + 20, arriba - 35);
    }
  }

  dibujarTituloEscena("THE FESTIVAL","Escoge una parte del set de 9x9 en Ultra Miami  ·  el cielo cambia con tu hora real");

  // hora actual
  noStroke();
  fill(blanco);
  textAlign(CENTER, CENTER);
  textSize(13);
  text("Tu hora: " + hour() + ":" + nf(minute(), 2), ANCHO / 2, 95);

  // botones de las 3 partes del set
  textSize(12);
  text("ULTRA MIAMI", 915, 92);
  for (let i = 0; i < partesSet.length; i++) {
    let bx = 860;
    let by = 110 + i * 48;
    let elegido = i == parteElegida;
    stroke(verde);
    strokeWeight(2);
    fill(elegido ? verde : negro);
    rect(bx, by, 110, 36, 8);
    noStroke();
    fill(elegido ? negro : verde);
    textStyle(BOLD);
    textSize(14);
    text(partesSet[i], bx + 55, by + 18);
    textStyle(NORMAL);
  }
}

function dibujarSolYLuna(h) {
  noStroke();
  if (h >= 6 && h < 18) {
    // sol: sale a las 6 por la izquierda y se esconde a las 18 por la derecha
    let x = map(h, 6, 18, 100, ANCHO - 100);
    let y = 330 - sin(map(h, 6, 18, 0, PI)) * 200;
    fill(255, 210, 60);
    circle(x, y, 80);
  } else {
    // luna: de 18 a 6 (sumamos 24 a las horas de madrugada)
    let hn = h < 6 ? h + 24 : h;
    let x = map(hn, 18, 30, 100, ANCHO - 100);
    let y = 330 - sin(map(hn, 18, 30, 0, PI)) * 200;
    fill(230);
    circle(x, y, 60);
    fill(colorDelCielo(h));
    circle(x + 15, y - 8, 50); // tapamos un pedazo para hacer la luna creciente
  }
}

function dibujarAvion() {
  let recorrido = ANCHO + 700;
  let x = (millis() * 0.08) % recorrido - 200; // cruza de izquierda a derecha y vuelve a empezar
  let y = 150;
  let dato = datosDuo[minute() % datosDuo.length]; // cada minuto cambia el dato
  let anchoPancarta = 330;

  // cuerda y pancarta (van detrás del avión)
  stroke(blanco);
  strokeWeight(1);
  line(x - 60, y, x - 90, y);
  noStroke();
  fill(blanco);
  rect(x - 90 - anchoPancarta, y - 18, anchoPancarta, 36, 4);
  fill(rojo);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(15);
  text(dato, x - 90 - anchoPancarta / 2, y);
  textStyle(NORMAL);

  // avión
  fill(negro);
  ellipse(x, y, 120, 26);                       // fuselaje
  triangle(x - 60, y, x - 50, y - 28, x - 35, y); // cola
  triangle(x - 10, y, x + 25, y, x - 20, y + 32); // ala
  fill(blanco);
  for (let k = 0; k < 4; k++) {
    circle(x + 5 + k * 12, y - 3, 5);            // ventanitas
  }
}

function presionarEscena6() {
  for (let i = 0; i < partesSet.length; i++) {
    let bx = 860;
    let by = 110 + i * 48;
    if (mouseX > bx && mouseX < bx + 110 && mouseY > by && mouseY < by + 36) {
      if (i != parteElegida) {
        partesUltra[parteElegida].stop(); // se calla la parte anterior
        parteElegida = i;
        partesUltra[parteElegida].play(); // suena la nueva
      }
    }
  }
}


// ============================================================
//  MOUSE Y TECLADO
//  Revisan en qué escena estamos y le pasan el evento a esa escena
// ============================================================

function mousePressed() {
  // mientras carga la música, los clics no hacen nada
  if (!musicaCargada) {
    return;
  }

  // primer clic: se activa el audio y empieza la música de la consola
  if (!audioActivado) {
    userStartAudio();
    audioActivado = true;
    inicioEscena = millis(); // la instrucción de la consola empieza a escribirse
    iniciarMusicaEscena(1);
    return;
  }

  // control de volumen (funciona en todas las escenas)
  if (clicEnVolumen()) {
    presionarVolumen();
    return;
  }

  if (escena == 0) {
    return; // durante el separador no pasa nada
  }

  // botón "9" para volver a la consola
  if (escena >= 2 && clicEnVolver()) {
    irAEscena(1);
    return;
  }

  if (escena == 1) {
    presionarEscena1();
  } else if (escena == 2) {
    presionarEscena2();
  } else if (escena == 3) {
    presionarEscena3();
  } else if (escena == 4) {
    presionarEscena4();
  } else if (escena == 5) {
    presionarEscena5();
  } else if (escena == 6) {
    presionarEscena6();
  }
}

function mouseDragged() {
  if (arrastrandoVolumen) {
    moverVolumen();
    return;
  }
  if (escena == 2) {
    arrastrarEscena2();
  } else if (escena == 3) {
    arrastrarEscena3();
  }
}

function mouseReleased() {
  if (arrastrandoVolumen) {
    arrastrandoVolumen = false;
    return;
  }
  if (escena == 2) {
    soltarEscena2();
  } else if (escena == 3) {
    soltarEscena3();
  }
}

function keyPressed() {
  if (escena == 4) {
    teclaEscena4();
    // evita que la página se mueva con las flechas mientras se juega
    if (keyCode >= 37 && keyCode <= 40) {
      return false;
    }
  }
}