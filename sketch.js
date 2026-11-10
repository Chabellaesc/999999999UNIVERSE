/*
 * 999999999 — DETRÁS DE LA MÁQUINA
 * Esqueleto del universo musical interactivo (entrega de avances)
 * Isabella Escobar — Pensamiento Algorítmico
 *
 * ESCENAS:
 *  0: separador  → pantalla corta de transición entre escenas
 *  1: La consola → inicio, 9 pads (5 llevan a escenas, 4 solo suenan)
 *  2: El tocadiscos → arrastrar un vinilo al plato
 *  3: La mezcla → arrastrar criaturas (stems) a los carriles
 *  4: La gira → laberinto: 9 pases, fans y cronómetro
 *  5: The real rave → la fiesta underground: bodega oscura, aliens, bolas disco y láseres
 *  6: The festival → la fiesta grande (Ultra): noche según la hora real + avión con datos
 *
 * Desde cualquier escena (2 a 6) el botón "9" de arriba a la izquierda
 * lleva de vuelta a la consola.
 *
 * Por ahora todo se dibuja con figuras de p5.js (todavía sin imágenes).
 * La música aún no está: usamos un "pulso simulado" a 140 BPM para que
 * todo se mueva como si sonara. Donde dice  // SONIDO:  es donde después
 * va el código de p5.sound (loadSound, Amplitude, FFT, volumen).
 */

// ============================================================
//  CONFIGURACIÓN GENERAL
// ============================================================

const ANCHO = 1000;
const ALTO = 650;
const BPM = 140; // velocidad aproximada del hard techno

let escena = 1;            // escena que se está mostrando
let escenaDestino = 1;     // escena a la que vamos después del separador
let inicioSeparador = 0;   // momento (en milisegundos) en que empezó el separador
const DURACION_SEPARADOR = 1200;

const nombresEscenas = ["", "La consola", "El tocadiscos", "La mezcla", "La gira", "The real rave", "The festival"];

// Paleta del moodboard (se crean en setup porque color() necesita p5 listo)
let rojo, verde, negro, blanco;

// SONIDO: aquí irán las variables de sonido, por ejemplo:
// let cancionInicio, canciones = [], stems = [], alarma, cancionRave, partesUltra = [];
// let amplitud, fft;

// FUENTES: más adelante se cargan las fuentes del moodboard (Acidic, Aero Matics Stencil)
// let fuenteTitulos, fuenteTextos;


// ============================================================
//  SETUP Y DRAW
// ============================================================

function setup() {
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

  // SONIDO: amplitud = new p5.Amplitude();  fft = new p5.FFT();
}

function draw() {
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
}


// ============================================================
//  HERRAMIENTAS QUE USAN TODAS LAS ESCENAS
// ============================================================

// Cambiar de escena pasando primero por el separador
function irAEscena(numero) {
  escenaDestino = numero;
  escena = 0;
  inicioSeparador = millis();
  // SONIDO: aquí se detiene la música de la escena que estamos dejando
}

// Pulso simulado: vale 1 justo en cada golpe del bombo y baja rápido a 0.
// SONIDO: cuando tengamos la música, se cambia por amplitud.getLevel()
// o por fft.getEnergy("bass") / 255
function pulsoSimulado() {
  let duracionGolpe = 60000 / BPM;                           // milisegundos entre golpes
  let fase = (millis() % duracionGolpe) / duracionGolpe;     // va de 0 a 1 en cada golpe
  return pow(1 - fase, 3);
}

// Agudos simulados: un valor entre 0 y 1 que cambia suave.
// SONIDO: después será fft.getEnergy("treble") / 255
function agudosSimulados() {
  return noise(millis() * 0.002);
}

// Título y frase de instrucción arriba de cada escena
function dibujarTituloEscena(titulo, instruccion) {
  noStroke();
  fill(blanco);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(30);
  text(titulo, ANCHO / 2, 38);
  textStyle(NORMAL);
  textSize(15);
  text(instruccion, ANCHO / 2, 70);
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
  textStyle(BOLD);
  textSize(26);
  text("9", 45, 46);
  textStyle(NORMAL);
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
  textStyle(BOLD);

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
  textStyle(NORMAL);

  // cuando termina, entramos a la escena
  if (progreso >= 1) {
    escena = escenaDestino;
    if (escena == 4) {
      reiniciarGira(); // el cronómetro del laberinto empieza al entrar
    }
    // SONIDO: aquí empieza la música de la nueva escena
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
  let pulso = pulsoSimulado();

  // siluetas de los dos DJs a los lados (mueven la cabeza con el ritmo)
  dibujarDJ(160, 470, "CARLO", pulso);
  dibujarDJ(840, 470, "GIOVANNI", pulso);

  // título
  noStroke();
  fill(negro);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(60);
  text("999999999", ANCHO / 2, 70);
  textStyle(NORMAL);
  textSize(20);
  text("Detrás de la máquina", ANCHO / 2, 120);
  textSize(14);
  text("Haz clic en un pad con borde verde para entrar a una escena", ANCHO / 2, 160);

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
  // SONIDO: "09 09 1999" suena a volumen bajo en esta escena
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
      // SONIDO: aquí suena el golpe del pad
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
  let canciones = [
    { titulo: "300000003", anio: "2018", archivo: "300000003.png" },
    { titulo: "Rave 4 Love", anio: "2020", archivo: "Rave4love.png" },
    { titulo: "Acid Blood", anio: "2025", archivo: "AcidBlood.png" },
    { titulo: "I Got Acid", anio: "", archivo: "IGotAcid.png" },
    { titulo: "IN MY HOUSE", anio: "", archivo: "InMyHouse.png" }
  ];
  let tonos = [verde, blanco, rojo, verde, blanco]; // color de respaldo si la portada no carga

  for (let i = 0; i < canciones.length; i++) {
    let yCasa = 135 + i * 110;
    let vinilo = {
      titulo: canciones[i].titulo,
      anio: canciones[i].anio,
      tono: tonos[i],
      portada: null, // aquí queda la portada recortada en círculo cuando cargue
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
  // SONIDO: canciones[i] = loadSound("assets/sonidos/300000003.mp3"), etc.
}

function dibujarEscena2() {
  let sonando = viniloSonando >= 0;
  let bajos = sonando ? pulsoSimulado() : 0; // SONIDO: fft.getEnergy("bass") / 255

  // el fondo se oscurece con cada golpe de bajo
  background(lerpColor(rojo, color(70, 0, 0), bajos));

  dibujarTituloEscena("EL TOCADISCOS", "Arrastra un vinilo hasta el tocadiscos para escucharlo");

  // base del tocadiscos
  noStroke();
  fill(negro);
  rect(plato.x - 220, plato.y - 200, 440, 400, 20);

  // anillo verde que crece con la amplitud
  if (sonando) {
    noFill();
    stroke(verde);
    strokeWeight(3);
    circle(plato.x, plato.y, plato.radio * 2 + 30 + bajos * 50);
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

  if (sonando) {
    noStroke();
    fill(blanco);
    textAlign(CENTER, CENTER);
    textSize(15);
    text("Sonando: " + vinilos[viniloSonando].titulo + "   (haz clic en el disco para quitarlo)", plato.x, 595);
  }
  // SONIDO: cancion.setVolume(volumen)
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
    viniloSonando = -1;
    // SONIDO: cancion.stop()
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
      // SONIDO: detener la canción anterior y reproducir canciones[viniloSonando]
    }
    // el vinilo vuelve a su lugar en la columna (el que suena se dibuja en el plato)
    v.x = v.xCasa;
    v.y = v.yCasa;
    viniloArrastrado = -1;
  }
}


// ============================================================
//  ESCENA 3 — LA MEZCLA
//  Cada criatura es un sonido (stem). Al ponerla en un carril
//  empieza a sonar en loop; al sacarla se calla.
// ============================================================

let carriles = [];
let criaturas = [];
let criaturaArrastrada = -1;

function crearMezcla() {
  for (let i = 0; i < 4; i++) {
    carriles.push({ x: 360, y: 150 + i * 115, ancho: 580, alto: 95, ocupadoPor: -1 });
  }

  // patron: 16 pasos; 1 = suena en ese paso, 0 = silencio
  let datos = [
    { tipo: "kick",  nombre: "Kick",              patron: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] },
    { tipo: "acido", nombre: "Línea ácida (303)", patron: [1,1,0,1, 0,1,1,0, 1,0,1,1, 0,1,0,1] },
    { tipo: "hihat", nombre: "Hi-hats",           patron: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0] },
    { tipo: "synth", nombre: "Sintetizador",      patron: [1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0] }
  ];

  for (let i = 0; i < datos.length; i++) {
    let yCasa = carriles[i].y + carriles[i].alto / 2;
    criaturas.push({
      tipo: datos[i].tipo,
      nombre: datos[i].nombre,
      patron: datos[i].patron,
      x: 170,
      y: yCasa,
      xCasa: 170,
      yCasa: yCasa,
      carril: -1 // -1 = no está en ningún carril
    });
  }
  // SONIDO: stems[i] = loadSound("assets/sonidos/stem_kick.mp3"), etc.
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

  // en qué paso (de 16) va el loop
  let duracionPaso = 60000 / BPM / 4;
  let pasoActual = floor(millis() / duracionPaso) % 16;
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
  text("Así hacen sus sets en vivo: capa por capa, sin computador   ·   Capas sonando: " + capas + " / 4", ANCHO / 2, 630);
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

  } else if (cr.tipo == "synth") {
    // SINTETIZADOR: una cajita con una onda en la boca
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
        // SONIDO: stems[i].stop()
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
      // SONIDO: stems[criaturaArrastrada].loop()
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
let estadoGira = "jugando";      // "jugando", "ganaste" o "perdiste"
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
  estadoGira = "jugando";
  protegidoHasta = 0;
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
  // SONIDO: alarma.rate(map(urgencia, 0, 1, 1, 1.4))  → "Alarm 303" se acelera

  dibujarTituloEscena("LA GIRA", "Usa las flechas: recoge los 9 pases y llega a la cabina (DJ) antes de que se acabe el tiempo");

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

  // cronómetro y contador de pases
  noStroke();
  fill(blanco);
  textAlign(RIGHT, CENTER);
  textSize(18);
  text("TIEMPO: " + ceil(tiempoRestante / 1000), ANCHO - 40, 25);
  text("PASES: " + contarPases() + " / 9", ANCHO - 40, 50);

  // pantalla de final
  if (estadoGira != "jugando") {
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

// Cada 20 cuadros los fans dan un paso.
// La mitad de las veces se acercan al jugador; la otra mitad caminan al azar.
function moverFans() {
  if (frameCount % 20 != 0) {
    return;
  }
  for (let fan of fans) {
    let opciones = [];
    if (!esPared(fan.fila - 1, fan.col)) opciones.push({ fila: fan.fila - 1, col: fan.col });
    if (!esPared(fan.fila + 1, fan.col)) opciones.push({ fila: fan.fila + 1, col: fan.col });
    if (!esPared(fan.fila, fan.col - 1)) opciones.push({ fila: fan.fila, col: fan.col - 1 });
    if (!esPared(fan.fila, fan.col + 1)) opciones.push({ fila: fan.fila, col: fan.col + 1 });

    let elegida;
    if (random() < 0.5) {
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
      // SONIDO: efecto de choque
    }
  }
}

function revisarPases() {
  for (let p of pases) {
    if (!p.tomado && p.fila == jugador.fila && p.col == jugador.col) {
      p.tomado = true;
      // SONIDO: efecto de recoger pase
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
  let pulso = pulsoSimulado();      // SONIDO: amplitud.getLevel()
  let agudos = agudosSimulados();   // SONIDO: fft.getEnergy("treble") / 255

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
  // SONIDO: "Acid World"
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
  // SONIDO: partesUltra[0] = loadSound("assets/sonidos/ultra_parte1.mp3"), etc.
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
  let pulso = pulsoSimulado(); // SONIDO: fft.getEnergy("bass") / 255
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
      parteElegida = i;
      // SONIDO: detener la parte anterior y reproducir partesUltra[i]
    }
  }
}


// ============================================================
//  MOUSE Y TECLADO
//  Revisan en qué escena estamos y le pasan el evento a esa escena
// ============================================================

function mousePressed() {
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
  } else if (escena == 5) {
    presionarEscena5();
  } else if (escena == 6) {
    presionarEscena6();
  }
}

function mouseDragged() {
  if (escena == 2) {
    arrastrarEscena2();
  } else if (escena == 3) {
    arrastrarEscena3();
  }
}

function mouseReleased() {
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