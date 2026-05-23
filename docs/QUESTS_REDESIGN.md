# QUESTS → "Aventuras Familiares" — Propuesta de rediseño

> **Visión:** "Ayudar a las familias a tener momentos reales de aventuras y momentos mágicos juntos, crear recuerdos y pasar tiempo de calidad juntos."

## 🩺 Diagnóstico actual

**Por qué Quests tiene poca demanda:**

| Problema | Realidad |
|---|---|
| Tareas demasiado genéricas | "Paseo sin pantallas", "Desayuno juntos" — son cosas que ya hacen sin app |
| Sin narrativa emocional | Es un checklist, no una experiencia |
| Recompensa abstracta (puntos) | Los padres no quieren puntos, quieren **recuerdos** |
| No genera contenido nuevo | Una vez completada, no hay nada más |
| Difícil verificar | (ya añadimos foto pero la quest sigue sin valor por sí misma) |
| Solo "hacer" — sin "vivir" | No conecta planes IA + sitios reales + Moments |

---

## 💡 Propuesta: pasar de **CHECKLIST → AVENTURAS NARRATIVAS**

La pestaña se renombra **"Aventuras"** (icono mantiene ⚔️ pero contexto diferente).

### Concepto central
Cada Aventura es una **historia interactiva de 1 semana** con:
1. **Introducción narrativa** ("Esta semana sois los **Detectives del Otoño**...")
2. **3–5 misiones encadenadas** que tienen sentido juntas
3. **Foto como prueba** de cada misión (ya implementado)
4. **Recompensa final REAL:**
   - 📖 **Cuento personalizado** generado por IA con los nombres de la familia, los lugares visitados y las fotos como ilustración base
   - 🏆 Insignia desbloqueable ("Familia Exploradora del Bosque")
   - 📸 **Álbum mensual auto-generado** con las fotos de la aventura

### Ejemplos de Aventuras (catálogo inicial)

#### 🍂 "Cazadores del Otoño" (Octubre–Noviembre)
1. Recoged 5 hojas de colores distintos en el parque (foto)
2. Encontrad una castaña Y un piñón (foto)
3. Haced un dibujo de familia con las hojas pegadas (foto del resultado)
4. Cocinad algo con sabor a otoño juntos (calabaza, manzana asada) (foto)
5. **Recompensa:** cuento "Los García y el Bosque Encantado" + insignia 🍁

#### 💧 "Exploradores del Agua" (Verano)
1. Encontrad la fuente más bonita del barrio (foto)
2. Visitad un río, lago o playa (foto del lugar)
3. Aprended sobre un animal acuático local (foto en libro/web)
4. Hacer un experimento simple con agua en casa (foto)
5. **Recompensa:** cuento + insignia 🐠

#### 🔍 "Detectives del Barrio"
1. Encontrad la calle más antigua de vuestro barrio
2. Buscad un detalle escondido en la fachada de un edificio (gárgola, escudo, fecha)
3. Hablad con un vecino mayor y preguntadle por una historia del lugar
4. Dibujad o fotografiad vuestro lugar favorito secreto
5. **Recompensa:** cuento "Los detectives del barrio" + insignia 🕵️

#### 🍳 "Chefs Familiares"
1. Cada miembro propone un plato que quiera probar
2. Hacéis la lista de compra juntos
3. Comprad ingredientes (foto en mercado/super)
4. Cocináis todos juntos (foto del proceso)
5. **Recompensa:** **recetario familiar PDF** + insignia 👨‍🍳

#### 🌌 "Astronautas de Salón"
1. Mirad el cielo nocturno e identificad 3 constelaciones (app gratuita)
2. Construid un cohete con cajas de cartón
3. Dibujad un planeta inventado, le ponéis nombre y reglas
4. Mirad un documental espacial cortito juntos
5. **Recompensa:** cuento "El viaje de los [apellido] a [planeta inventado]" + insignia 🚀

#### 🎨 "Galería Familiar"
1. Cada miembro elige una técnica (acuarela, fotos, collage)
2. Crean obra inspirada en la misma palabra ("hogar", "verano")
3. Hacen exposición en el salón
4. Voto familiar al favorito (cada uno explica el suyo)
5. **Recompensa:** Galería digital + insignia 🖼️

### Generación AUTO con IA

Cada lunes, GoHappy ofrece **1 aventura recomendada** basada en:
- Edad de los niños (de `family_context`)
- Estación del año actual
- Ubicación (ciudad/zona)
- Intereses detectados (de Moments/Care)
- Aventuras ya completadas (no repetir)

Prompt a Gemini: *"Genera una aventura familiar de 4 misiones para familia con niños de 5 y 8 años en Valladolid en noviembre. Temática otoño. Cada misión con: descripción, prueba requerida (foto), pista útil."*

### Conexión con otras secciones

- **Today:** algunas misiones son "sitios reales" → botón "ver en mapa"
- **Map:** los lugares de la aventura aparecen como POIs especiales
- **Moments:** las fotos-prueba van automáticas al feed privado familiar con etiqueta de la aventura
- **Mi Familia:** ver progreso de aventura, miembros que han participado
- **Profile/ADN familiar:** las aventuras completadas alimentan los intereses

### Modelo de datos

```js
// Firestore: families/{familyId}/adventures/{adventureId}
{
  id: 'aut-2026-w45',
  titulo: 'Cazadores del Otoño',
  emoji: '🍂',
  tema: 'otoño',
  introNarrativa: 'Esta semana sois detectives del bosque...',
  misiones: [
    {
      id: 1,
      titulo: 'Recoged 5 hojas de colores distintos',
      pista: 'Los parques con tilos y robles son ideales',
      pruebaTipo: 'foto',
      completada: false,
      proofPhoto: null,
      completadoPor: null,
      ts: null
    },
    // ... 4 más
  ],
  recompensa: {
    tipo: 'cuento',
    insignia: '🍁',
    nombreInsignia: 'Familia Exploradora del Otoño'
  },
  fechaInicio: timestamp,
  fechaFin: timestamp,  // +7 días
  estado: 'activa' | 'completada' | 'expirada',
  cuentoGenerado: null  // se llena al completar
}
```

### Nuevas Cloud Functions necesarias

1. **`generateWeeklyAdventure(familyId)`** — cron semanal, genera 1 aventura con IA
2. **`completeAdventureMission(familyId, adventureId, missionId, proofPhoto)`** — valida y marca
3. **`generateFinalStory(familyId, adventureId)`** — al completar todas, genera cuento personalizado con IA usando Gemini

### Recompensa Premium

Premium desbloquea:
- 📖 **PDF descargable** del cuento personalizado
- 🖼️ **Imágenes generadas con IA** (Imagen / Flux) para ilustrar el cuento
- 🎁 **Aventuras especiales** (cumpleaños, primer día de cole, vacaciones)
- 📚 **Libro físico imprimible** anual con todas las aventuras (link a print-on-demand)

---

## 🚀 Plan de implementación (3 fases)

### Fase 1 — MVP (3 días) — **VALIDA EL CONCEPTO**
- [ ] Renombrar pestaña a "Aventuras" (mantener "Quests" como ruta legacy)
- [ ] Cargar **5 aventuras estáticas** del catálogo (no IA todavía)
- [ ] UI: una aventura activa por familia, con sus 3-5 misiones
- [ ] Click misión → modal pide foto (reusar el de quests actual)
- [ ] Al completar TODAS las misiones: mensaje épico + insignia visual
- [ ] Lista de insignias ganadas en Profile

### Fase 2 — IA (3 días)
- [ ] Cloud Function `generateWeeklyAdventure(familyId)`
- [ ] Cada lunes 09:00 cron → crear aventura recomendada para cada familia activa
- [ ] Push notification (cuando esté FCM activo): *"🎉 Nueva aventura disponible: Cazadores del Otoño"*
- [ ] Sistema de "saltar" aventura si no encaja

### Fase 3 — Cuento + Premium (3-5 días)
- [ ] Cloud Function `generateFinalStory()` con prompt narrativo personalizado
- [ ] Vista del cuento renderizado bonito
- [ ] PDF export (jsPDF en cliente, gratis)
- [ ] Imágenes IA (Premium): Imagen 3 vía Vertex AI o Flux Schnell vía Replicate
- [ ] Link a print-on-demand (Premium): Bookwright, Blurb, Mixam

---

## 📊 Métrica de éxito

| Antes (Quests) | Después (Aventuras) — objetivo |
|---|---|
| 0.5 quests completadas/semana/familia | 3-5 misiones |
| 5% usuarios completan algo | 40% completa al menos 1 aventura/mes |
| 0 recuerdos generados | 1 cuento PDF/mes/familia |

Es una conversión del módulo entero. **Más esfuerzo pero alineado con la visión real.**

---

## ❓ Decisión que necesitas tomar

**Opción A — Conservador (no romper nada todavía):**
Mantener Quests actuales + añadir "Aventuras" como sub-tab. Coexistir 2-4 semanas. Si Aventuras gana, retirar Quests.

**Opción B — Disruptivo (mi recomendación):**
Reemplazar Quests por Aventuras en próximo release. La beta es el momento de cambiar.

**Opción C — Esperar:**
Documentar idea (este archivo) y dejarlo para v7.0.0 cuando tengas más feedback de usuarios.

---

*Cuando decidas A/B/C, implementamos. Mientras tanto este doc queda como plan.*
