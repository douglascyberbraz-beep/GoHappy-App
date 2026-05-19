# GoHappy Premium — Roadmap del Asistente Personal Real

> **Estado:** En cajón. Reservado para la versión Premium de pago.
> **Última actualización:** 2026-05-19
> **Objetivo:** convertir GoHappy de "app con IA contextual" a **asistente personal inteligente de verdad** para padres.

---

## 🎯 Visión

Hoy GoHappy es una app premium con IA que mete contexto en cada llamada. Premium dará el salto cualitativo: **una entidad que se anticipa, conversa naturalmente, actúa por ti y aprende de tu familia día a día**.

El cambio conceptual:
> De **"varias pantallas con IA"** → a **"un asistente con varias vistas auxiliares"**.

---

## 🧠 Las 7 capas del asistente Premium

### 1. Voz (input + output)
- Botón flotante 🎙️ en TODAS las páginas
- Web Speech API (gratis, cliente) para reconocer voz
- Speech Synthesis para respuestas habladas
- Ejemplo: *"Oye GoHappy, dime un plan para esta tarde"* → respuesta hablada en 4s
- **Esfuerzo:** 1 día · **Impacto:** 🔥🔥🔥

### 2. Notificaciones push reales (FCM)
Hoy los banners proactivos solo disparan al abrir la app. Un asistente real **te encuentra**.
- Firebase Cloud Messaging + service worker push
- Ejemplos:
  - *"Hoy hace 22°C en Valladolid. El parque del Pinar está vacío. ¿Vais?"* (sábado 10am)
  - *"Mateo lleva 3 días sin Quest. ¿Le propongo Cuento en voz alta?"*
- iOS PWA push tiene limitaciones — funciona en Safari 16.4+ con app instalada
- Android: full push con FCM sin restricciones
- **Esfuerzo:** 2 días · **Impacto:** 🔥🔥🔥🔥

### 3. Chat único con tool-calling — EL CORE
**La diferencia más grande conceptualmente.** Una sola entrada donde le pides lo que sea.

- Nueva pantalla "GoHappy" (sustituye al orbital del mapa)
- Gemini con `tools: [...]` (function calling) para que el modelo decida internamente qué herramienta usar:
  - `searchPlaces({query, near})` → Map
  - `getPlansForToday(prefs)` → Today
  - `addQuest(title, points)` → Quests
  - `getParentingAdvice(topic)` → Care
  - `findEvents(when, city)` → Eventbrite/Ticketmaster + Grounding
  - `analyzeMoment(imageUrl)` → Vision
  - `saveMemory(text)` → Moments
- Memoria persistente del hilo (subcolección `users/{uid}/assistant_history`)
- UI estilo iMessage premium con burbujas + acciones inline
- **Esfuerzo:** 3-4 días · **Impacto:** 🔥🔥🔥🔥🔥

### 4. Briefing matutino diario
El asistente prepara cada mañana un resumen personalizado.

- Cloud Function programada (Pub/Sub cron) que cada noche a las 23:00 genera el briefing del día siguiente para cada usuario activo
- Cruza datos: clima previsto, quests pendientes, Care challenges activos, eventos del día en la ciudad, cumpleaños familiares
- Push 8am: *"Buenos días, Douglas. He preparado tu briefing — ábreme"*
- Al abrir, GoHappy ya tiene un mensaje generado esperándote:
  > *"Buenos días ☀️ Hoy llueve en Valladolid hasta las 12. Tienes la Quest 'Cocinar juntos' pendiente desde el martes — ideal para hoy. A las 17h hay cuentacuentos gratis en la Biblioteca Reina Sofía (3 min andando). ¿Te lo apunto?"*
- **Esfuerzo:** 1-2 días · **Impacto:** 🔥🔥🔥🔥

### 5. Acciones reales (no solo sugerencias)
Hoy te dice "ve al Museo". Premium **hace cosas por ti**:

- **Calendar integration** (Google Calendar / Apple via .ics): "Te lo añado al calendario familiar"
- **WhatsApp Web Share** con mensaje prefilled a tu pareja: *"He apuntado plan sábado 17h al Museo de la Ciencia"*
- **Lista de la compra automática** a partir de una receta familiar IA
- **Reserva en 1 clic** cuando se integre Eventbrite/Ticketmaster
- **Recordatorios**: *"En 10 min sales hacia el Pinar"*
- **Esfuerzo:** 2 días · **Impacto:** 🔥🔥

### 6. Multi-modal: voz + foto + texto
Gemini Vision ya está disponible vía proxy.

- 📷 Sube foto del plato → *"¿Es saludable para Mateo? Análisis nutricional + sugerencias"*
- 📚 Sube foto del cole/lista de lectura → *"Detecto un libro recomendado. ¿Lo añado a Quests de lectura?"*
- 🎨 Sube dibujo de tu hijo → *"Análisis evolutivo. Para 4 años está en el percentil de…"*
- 🎟️ Sube ticket de evento → *"He extraído fecha, hora, ubicación. ¿Te lo apunto?"*
- **Esfuerzo:** 1 día · **Impacto:** 🔥🔥

### 7. Personalidad GoHappy coherente
Hoy son 7 pantallas. Premium tiene **una voz única** (literal y figurada).

- Avatar GoHappy persistente que evoluciona con tu uso (el orbital del mapa puede ser este)
- Tono consistente: cálido, optimista, nunca juzga, siempre valida emoción primero
- Frases firmadas: *"— GoHappy"*
- Microanimaciones: parpadeo, "está pensando", celebra logros
- Estados de ánimo del avatar según contexto (preocupado si llevas 5 días sin Quest, feliz si completaste un plan)
- **Esfuerzo:** 1 día · **Impacto:** 🔥🔥🔥

---

## 📊 Priorización por ROI

| # | Capa | Impacto WOW | Esfuerzo | Prioridad |
|---|---|---|---|---|
| 3 | **Chat único con tool-calling** | 🔥🔥🔥🔥🔥 | 3-4 días | ⭐ ALTA |
| 2 | **Push notifications reales** | 🔥🔥🔥🔥 | 2 días | ⭐ ALTA |
| 4 | **Briefing matutino diario** | 🔥🔥🔥🔥 | 1-2 días | ⭐ ALTA |
| 1 | **Voz (input + output)** | 🔥🔥🔥 | 1 día | media |
| 7 | **Personalidad GoHappy** | 🔥🔥🔥 | 1 día | media |
| 6 | **Visión (foto análisis)** | 🔥🔥 | 1 día | media-baja |
| 5 | **Acciones (calendar/WA)** | 🔥🔥 | 2 días | baja |

---

## 🎯 Recomendación de lanzamiento Premium

**MVP Premium (5-7 días) = capas 3 + 2 + 4 + 7**

> El usuario Premium ve:
> 1. Botón "GoHappy" central (sustituye orbital del mapa)
> 2. Chat único con tool-calling — punto único de entrada
> 3. Push notifications reales (FCM)
> 4. Briefing matutino cada día a las 8am
> 5. Personalidad coherente con avatar evolutivo
>
> Las pantallas actuales (Today, Care, Map, Quests, Moments, Top, Profile) se mantienen como vistas auxiliares accesibles desde el chat o la nav.

**Expansiones siguientes (después del MVP):**
- Voz (capa 1)
- Visión multimodal (capa 6)
- Acciones (capa 5)

---

## 💰 Justificación del precio Premium

Razones para que valga 4,99 €/mes (vs el plan Free):

1. **Tu asistente personal real para familia** — equivalente a un coach 24/7
2. **Briefing diario** — ahorra 30 min/día de planificación
3. **Push proactivo** — la app te encuentra, no la abres
4. **Conversación natural** — pides cualquier cosa por voz o texto
5. **Memoria larga** — recuerda toda vuestra historia familiar
6. **Análisis con foto** — sube cualquier cosa y obtén consejo
7. **Tribu privada ilimitada** — comentarios, real-time, 1 año memory
8. **Sin límites IA** — todas las consultas que quieras
9. **Soporte prioritario** — respuesta en <4h

**Coste real por usuario/mes (estimado para 1000 users activos):**
- Gemini API con caching: ~1,5 €
- FCM push: gratis
- Search Grounding: ~0,8 €
- Firestore: ~0,2 €
- **Total coste ≈ 2,5 €/usuario** → margen 50% a 4,99 € sin contar economías de escala

---

## ⚠️ Consideraciones técnicas

- **iOS push:** funciona desde Safari 16.4+ con PWA instalada (requiere prompt manual). Capacitor para nativo si queremos garantizar 100%.
- **Voz en iOS Safari:** Speech Recognition limitada — requiere fallback a Whisper API si queremos calidad.
- **Tool-calling cost:** cada llamada con tools cuesta ~2x más tokens. Crítico el caching server-side.
- **Briefing diario:** Pub/Sub gratis hasta 10M mensajes/mes — sobrado para fase early.

---

## 📌 Próximos pasos cuando reactivemos esto

1. Activar este documento como Epic en el sistema de gestión
2. Definir tier de precios (Free vs Premium concreto)
3. Diseñar wireframe del chat único
4. Spike técnico de Gemini tool-calling con 1-2 herramientas
5. Configurar FCM y probar push en iOS PWA
6. Plan de migración: ¿añadimos `isPremium` al user doc desde ya?

---

*Este roadmap está vivo. Cualquier idea nueva sobre el asistente Premium, añadirla aquí.*
