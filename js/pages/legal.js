// ================================================================
// GoHappy Legal — Documentación legal completa
// 4 documentos bilingües ES/EN, GDPR + UK GDPR + LSSI compliant
// ================================================================
window.GoHappyLegal = {

    // Datos editables de la empresa (rellenar antes del lanzamiento)
    COMPANY: {
        name:        '[GoHappy Family S.L.]',
        tradeName:   'GoHappy',
        nif:         '[NIF / VAT pendiente]',
        address:     '[Dirección postal pendiente]',
        city:        'Valladolid, España',
        email:       'hola@gohappyfamily.app',
        dpoEmail:    'privacidad@gohappyfamily.app',
        web:         'https://gohappyfamily.app',
        appHost:     'https://kindr-8d660.web.app',
        lastUpdate:  '2026-05-11'
    },

    _currentTab: 'terms',

    render: async (container) => {
        const lang = window.GoHappyI18n?.lang || 'es';

        container.innerHTML = `
            <div class="legal-page">
                <div class="unified-hero">
                    <div style="position:relative; z-index:2;">
                        <h2>📜 Legal</h2>
                        <p>${lang === 'en' ? 'Terms, privacy, cookies and legal notice' : 'Términos, privacidad, cookies y aviso legal'}</p>
                    </div>
                </div>

                <div class="legal-tabs">
                    <button class="legal-tab active" data-doc="terms"><span>📋</span><span>${lang === 'en' ? 'Terms' : 'Términos'}</span></button>
                    <button class="legal-tab" data-doc="privacy"><span>🔒</span><span>${lang === 'en' ? 'Privacy' : 'Privacidad'}</span></button>
                    <button class="legal-tab" data-doc="cookies"><span>🍪</span><span>Cookies</span></button>
                    <button class="legal-tab" data-doc="legal"><span>🏛️</span><span>${lang === 'en' ? 'Legal' : 'Aviso'}</span></button>
                </div>

                <div id="legal-content" class="legal-content">
                    <div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>
                </div>

                <div style="height: calc(var(--nav-total, 110px) + 24px);"></div>
            </div>
        `;

        const styleId = 'legal-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .legal-page { width:100%; min-height:100vh; box-sizing:border-box; overflow-x:hidden; }
                .legal-tabs { display:flex; gap:6px; padding:5px; margin:-10px 16px 16px; background:rgba(255,255,255,0.78); backdrop-filter:blur(20px) saturate(180%); border:0.5px solid rgba(255,255,255,0.95); border-radius:999px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 24px rgba(11,76,143,0.10); position:relative; z-index:5; overflow-x:auto; scrollbar-width:none; }
                .legal-tabs::-webkit-scrollbar { display:none; }
                .legal-tab { flex:1; min-width:80px; background:transparent; border:none; padding:9px 6px; border-radius:999px; font-family:-apple-system,sans-serif; font-size:12px; font-weight:700; color:var(--text-secondary); cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px; transition:all 0.22s cubic-bezier(0.34,1.56,0.64,1); white-space:nowrap; }
                .legal-tab span:first-child { font-size:16px; }
                .legal-tab.active { background:var(--brand-bright); color:white; font-weight:800; box-shadow:0 6px 16px rgba(11,113,252,0.28); }
                .legal-tab:active { transform:scale(0.94); }
                .legal-content { padding:0 16px; }
                .legal-doc { background:rgba(255,255,255,0.92); backdrop-filter:blur(30px) saturate(180%); border:0.5px solid rgba(255,255,255,0.95); border-radius:24px; padding:24px 22px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 28px rgba(11,76,143,0.08); }
                .legal-doc h2 { font-family:'Poppins',sans-serif; font-size:1.4rem; font-weight:900; color:var(--cobalt); margin-bottom:4px; line-height:1.2; letter-spacing:-0.4px; }
                .legal-doc .updated { font-size:11.5px; color:var(--text-tertiary); margin-bottom:18px; font-style:italic; }
                .legal-doc h3 { font-family:'Poppins',sans-serif; font-size:1.05rem; font-weight:800; color:var(--cobalt); margin-top:22px; margin-bottom:8px; line-height:1.3; }
                .legal-doc p { font-size:14px; color:var(--text-primary); line-height:1.6; margin-bottom:12px; }
                .legal-doc ul, .legal-doc ol { padding-left:22px; margin:8px 0 14px; }
                .legal-doc li { font-size:14px; color:var(--text-primary); line-height:1.55; margin-bottom:6px; }
                .legal-doc strong { color:var(--cobalt); font-weight:700; }
                .legal-doc a { color:var(--cobalt-bright); text-decoration:none; font-weight:600; }
                .legal-doc a:hover { text-decoration:underline; }
                .legal-doc .highlight { background:linear-gradient(135deg,rgba(11,113,252,0.06),rgba(23,200,212,0.08)); border-left:3px solid var(--cobalt-bright); padding:12px 16px; border-radius:12px; margin:14px 0; font-size:13px; }
                .legal-doc .contact-box { background:rgba(11,76,143,0.04); border-radius:16px; padding:16px; margin-top:20px; border:0.5px solid rgba(11,76,143,0.1); font-size:13px; }
                .legal-doc .contact-box strong { display:inline-block; margin-bottom:4px; }
                .legal-doc table { width:100%; border-collapse:collapse; font-size:13px; margin:12px 0; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(11,76,143,0.04); }
                .legal-doc th, .legal-doc td { padding:10px 12px; text-align:left; border-bottom:0.5px solid rgba(11,76,143,0.08); line-height:1.4; }
                .legal-doc th { background:rgba(11,76,143,0.06); color:var(--cobalt); font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.3px; }
                .legal-doc tr:last-child td { border-bottom:none; }
                .legal-actions { display:flex; gap:10px; margin-top:20px; padding:0 4px; }
                .legal-action-btn { flex:1; background:rgba(11,76,143,0.06); border:0.5px solid rgba(11,76,143,0.12); border-radius:14px; padding:11px; font-size:13px; font-weight:700; color:var(--cobalt); cursor:pointer; text-align:center; transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1); }
                .legal-action-btn:active { transform:scale(0.94); }
            `;
            document.head.appendChild(style);
        }

        container.querySelectorAll('.legal-tab').forEach(tab => {
            tab.onclick = () => {
                container.querySelectorAll('.legal-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                window.GoHappyLegal._currentTab = tab.dataset.doc;
                window.GoHappyLegal._renderDoc();
            };
        });

        window.GoHappyLegal._renderDoc();
    },

    _renderDoc: () => {
        const content = document.getElementById('legal-content');
        if (!content) return;
        const lang = window.GoHappyI18n?.lang || 'es';
        const doc = window.GoHappyLegal._currentTab;

        let html = '';
        if (doc === 'terms')   html = window.GoHappyLegal._termsHtml(lang);
        if (doc === 'privacy') html = window.GoHappyLegal._privacyHtml(lang);
        if (doc === 'cookies') html = window.GoHappyLegal._cookiesHtml(lang);
        if (doc === 'legal')   html = window.GoHappyLegal._legalNoticeHtml(lang);

        content.innerHTML = `
            <div class="legal-doc card-anim">${html}</div>
            <div class="legal-actions">
                <button class="legal-action-btn" onclick="window.print()">🖨️ ${lang === 'en' ? 'Print' : 'Imprimir'}</button>
                <button class="legal-action-btn" onclick="navigator.share && navigator.share({title:'GoHappy Legal',url:window.location.href}).catch(()=>{})">📤 ${lang === 'en' ? 'Share' : 'Compartir'}</button>
            </div>
        `;
        const main = document.getElementById('main-content');
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ─── 1. TÉRMINOS Y CONDICIONES ───
    _termsHtml: (lang) => {
        const c = window.GoHappyLegal.COMPANY;
        if (lang === 'en') return `
            <h2>Terms and Conditions of Use</h2>
            <div class="updated">Last updated: ${c.lastUpdate}</div>
            <div class="highlight">By using GoHappy you accept these Terms. Please read them carefully. If you do not agree, do not use the service.</div>
            <h3>1. About these Terms</h3>
            <p>These Terms govern access to and use of the <strong>GoHappy Family</strong> mobile and web application ("the App"), operated by <strong>${c.name}</strong> ("we", "us", "GoHappy").</p>
            <h3>2. Service description</h3>
            <p>GoHappy is a digital platform for families with children offering: AI-generated activity plans (Today), missions and gamification (Quests), 3D map with community reviews, private family timeline (Moments), AI parenting coach (Care) and community ranking (Top).</p>
            <h3>3. Account and minimum age</h3>
            <ul>
                <li>You must be <strong>at least 16 years old</strong> to create an account autonomously.</li>
                <li>Children under 16 require <strong>explicit parental consent</strong> and adult supervision.</li>
                <li>You are responsible for keeping your password secure and for all account activity.</li>
                <li>One account per person. Sharing or selling accounts is prohibited.</li>
            </ul>
            <h3>4. Acceptable use</h3>
            <ul>
                <li>Not publish illegal, offensive, discriminatory or violent content</li>
                <li>Not impersonate others or provide false information</li>
                <li>Not collect data on other users without consent</li>
                <li>Not attempt to bypass security, scrape data or attack our systems</li>
                <li>Not use the App for commercial purposes without prior written authorisation</li>
            </ul>
            <h3>5. User-generated content (Moments, reviews, posts)</h3>
            <p>By posting content you: (a) confirm you own the rights or have permission to share it; (b) grant GoHappy a non-exclusive, royalty-free worldwide licence to host and display it within the App; (c) accept that we may moderate or remove content violating these Terms; (d) remain solely responsible for it.</p>
            <h3>6. Artificial Intelligence — Disclaimer</h3>
            <p>GoHappy uses Google Gemini AI to generate plans, events and parenting advice. <strong>IMPORTANT</strong>:</p>
            <ul>
                <li>AI-generated information is <strong>orientative</strong>, not professional advice.</li>
                <li>The AI Coach (Care) does <strong>NOT replace medical, psychological or paediatric consultation</strong>.</li>
                <li>Events and schedules generated by AI must be verified on the official source before attending.</li>
                <li>GoHappy is not liable for decisions made based on AI content.</li>
            </ul>
            <h3>7. Free plan and Premium subscription</h3>
            <ul>
                <li>Premium €4.99/month or £4.99/month, billed via Apple App Store or Google Play.</li>
                <li>Cancellable anytime; access continues until end of paid period.</li>
                <li>14-day cooling-off period for EU/UK consumers on first subscription.</li>
                <li>Prices may change with 30 days notice; you may cancel if not accepting the new price.</li>
            </ul>
            <h3>8. Intellectual property</h3>
            <p>The App, design, code, logos, name and content (except UGC) are property of ${c.name} or licensors. No reproduction without prior written authorisation.</p>
            <h3>9. Liability limitation</h3>
            <p>GoHappy is offered "as is". To the maximum extent permitted by law, we are not liable for: indirect or consequential damages; service interruptions or AI errors; inaccurate AI-generated information; decisions taken based on App content. Maximum liability shall not exceed amount paid in the prior 12 months.</p>
            <h3>10. Termination</h3>
            <p>You may delete your account anytime from Profile. We may suspend accounts violating these Terms after due notice (except serious cases).</p>
            <h3>11. Modifications</h3>
            <p>Significant changes will be notified 30 days in advance via the App. Continued use implies acceptance.</p>
            <h3>12. Governing law</h3>
            <p>Spanish law for users in Spain; English law for users in the UK. Disputes go to courts of user's residence (consumer protection).</p>
            <div class="contact-box"><strong>Contact:</strong> <a href="mailto:${c.email}">${c.email}</a></div>
        `;
        return `
            <h2>Términos y Condiciones de Uso</h2>
            <div class="updated">Última actualización: ${c.lastUpdate}</div>
            <div class="highlight">Al usar GoHappy aceptas estos Términos. Léelos detenidamente. Si no estás de acuerdo, no uses el servicio.</div>
            <h3>1. Sobre estos Términos</h3>
            <p>Estos Términos regulan el acceso y uso de la aplicación móvil y web <strong>GoHappy Family</strong> ("la App"), operada por <strong>${c.name}</strong> ("nosotros", "GoHappy").</p>
            <h3>2. Descripción del servicio</h3>
            <p>GoHappy es una plataforma digital dirigida a familias con hijos que ofrece: planes familiares por IA (Today), misiones y gamificación (Quests), mapa 3D con reseñas comunitarias, línea de tiempo familiar privada (Moments), coach IA de crianza (Care) y ranking comunitario (Top).</p>
            <h3>3. Cuenta y edad mínima</h3>
            <ul>
                <li>Debes tener al menos <strong>16 años</strong> para crear una cuenta de forma autónoma.</li>
                <li>Los menores de 16 años requieren <strong>consentimiento parental explícito</strong> y supervisión adulta.</li>
                <li>Eres responsable de mantener tu contraseña segura y de toda la actividad de tu cuenta.</li>
                <li>Una cuenta por persona. Prohibido compartir o vender cuentas.</li>
            </ul>
            <h3>4. Uso aceptable</h3>
            <ul>
                <li>No publicar contenido ilegal, ofensivo, discriminatorio o violento</li>
                <li>No suplantar a otros ni proporcionar información falsa</li>
                <li>No recopilar datos de otros usuarios sin consentimiento</li>
                <li>No intentar evadir medidas de seguridad, hacer scraping o atacar sistemas</li>
                <li>No usar la App con fines comerciales sin autorización previa por escrito</li>
            </ul>
            <h3>5. Contenido del usuario (Moments, reseñas, posts)</h3>
            <p>Al publicar contenido: (a) confirmas que posees los derechos o permiso para compartirlo; (b) concedes a GoHappy una licencia no exclusiva, gratuita y mundial para alojarlo y mostrarlo dentro de la App; (c) aceptas que podamos moderar o retirar contenido infractor; (d) eres único responsable del mismo.</p>
            <h3>6. Inteligencia Artificial — Aviso</h3>
            <p>GoHappy usa Google Gemini IA para generar planes, eventos y consejos. <strong>IMPORTANTE</strong>:</p>
            <ul>
                <li>La información generada por IA es <strong>orientativa</strong>, no es asesoramiento profesional.</li>
                <li>El Coach IA (Care) <strong>NO sustituye</strong> consulta médica, psicológica o pediátrica.</li>
                <li>Eventos y horarios generados por IA deben verificarse en la fuente oficial antes de acudir.</li>
                <li>GoHappy no se responsabiliza de decisiones tomadas en base al contenido IA.</li>
            </ul>
            <h3>7. Plan gratuito y suscripción Premium</h3>
            <ul>
                <li>Premium 4,99 €/mes o 4,99 £/mes, facturado vía Apple App Store o Google Play.</li>
                <li>Cancelable en cualquier momento; el acceso continúa hasta el fin del periodo pagado.</li>
                <li>Derecho de desistimiento de 14 días para consumidores UE/UK en primera contratación.</li>
                <li>Los precios pueden cambiar con 30 días de aviso; puedes cancelar si no aceptas.</li>
            </ul>
            <h3>8. Propiedad intelectual</h3>
            <p>La App, diseño, código, logos, nombre y contenido (excepto UGC) son propiedad de ${c.name} o licenciantes. Prohibida reproducción sin autorización previa por escrito.</p>
            <h3>9. Limitación de responsabilidad</h3>
            <p>GoHappy se ofrece "tal cual". En la máxima medida permitida por ley, no nos responsabilizamos de: daños indirectos o consecuentes; interrupciones del servicio o errores de la IA; información imprecisa generada por IA; decisiones tomadas en base al contenido. Responsabilidad máxima no excederá lo pagado en los 12 meses previos.</p>
            <h3>10. Cancelación</h3>
            <p>Puedes eliminar tu cuenta en cualquier momento desde Perfil. Podemos suspender cuentas que infrinjan estos Términos previo aviso (excepto casos graves).</p>
            <h3>11. Modificaciones</h3>
            <p>Los cambios significativos se notificarán con 30 días de antelación a través de la App. El uso continuado implica aceptación.</p>
            <h3>12. Ley aplicable</h3>
            <p>Ley española para usuarios en España; ley inglesa para usuarios en Reino Unido. Las disputas se someten a los tribunales del lugar de residencia del usuario (protección al consumidor).</p>
            <div class="contact-box"><strong>Contacto:</strong> <a href="mailto:${c.email}">${c.email}</a></div>
        `;
    },

    // ─── 2. POLÍTICA DE PRIVACIDAD ───
    _privacyHtml: (lang) => {
        const c = window.GoHappyLegal.COMPANY;
        if (lang === 'en') return `
            <h2>Privacy Policy</h2>
            <div class="updated">Last updated: ${c.lastUpdate}</div>
            <div class="highlight">We take your privacy seriously. This Policy explains what data we collect, why, how we protect it and your rights under GDPR and UK GDPR.</div>
            <h3>1. Data controller</h3>
            <p><strong>${c.name}</strong> ("Controller"), based in ${c.city}.<br>Contact: <a href="mailto:${c.email}">${c.email}</a><br>Data Protection Officer: <a href="mailto:${c.dpoEmail}">${c.dpoEmail}</a></p>
            <h3>2. Data we collect</h3>
            <table>
                <tr><th>Category</th><th>Data</th></tr>
                <tr><td>Identification</td><td>Email, nickname, name, profile photo (emoji), age range</td></tr>
                <tr><td>Family</td><td>Children's ages (range), family code, family role</td></tr>
                <tr><td>Location</td><td>Approximate GPS coordinates (only with consent)</td></tr>
                <tr><td>Content</td><td>Photos in Moments, map reviews, Tribe posts, AI chat history</td></tr>
                <tr><td>Usage</td><td>Quests completed, points, sections visited, technical errors</td></tr>
                <tr><td>Technical</td><td>Device model, OS, app version, anonymised IP</td></tr>
            </table>
            <h3>3. Purposes and legal basis</h3>
            <table>
                <tr><th>Purpose</th><th>Legal basis (GDPR Art. 6)</th></tr>
                <tr><td>Provide the service</td><td>Performance of contract</td></tr>
                <tr><td>Personalise AI content</td><td>Legitimate interest + consent</td></tr>
                <tr><td>Geolocation for events</td><td>Explicit consent (withdrawable)</td></tr>
                <tr><td>Push notifications</td><td>Consent (withdrawable)</td></tr>
                <tr><td>Safety and fraud prevention</td><td>Legitimate interest</td></tr>
                <tr><td>Legal compliance</td><td>Legal obligation</td></tr>
            </table>
            <h3>4. Data retention</h3>
            <ul>
                <li><strong>Account</strong>: while active. Deletion → erasure within 30 days (except legal duties).</li>
                <li><strong>AI chat (Care)</strong>: stored locally on your device, deleted on uninstall.</li>
                <li><strong>Moments</strong>: until you delete them or close your account.</li>
                <li><strong>Inactive accounts</strong>: anonymised or deleted after 24 months.</li>
                <li><strong>Legal logs</strong>: 6 years for tax/billing (legal requirement).</li>
            </ul>
            <h3>5. Sharing with third parties</h3>
            <ul>
                <li><strong>Google Firebase</strong> (Google Ireland Ltd) — hosting, auth, database in EU.</li>
                <li><strong>Google Gemini AI</strong> (Google LLC, USA) — content generation. Protected by SCCs + EU-US Data Privacy Framework.</li>
                <li><strong>Apple App Store / Google Play</strong> — payment processing.</li>
                <li><strong>OpenFreeMap, Photon (Komoot)</strong> — maps and geocoding. No personal data.</li>
            </ul>
            <p>We do NOT sell your data. We do NOT use targeted advertising.</p>
            <h3>6. International transfers</h3>
            <p>Transfers to USA (Gemini) protected by Standard Contractual Clauses (SCCs) approved by EU Commission, Google's adherence to EU-U.S. Data Privacy Framework and additional technical measures (anonymisation, prompt sanitisation).</p>
            <h3>7. Your rights (GDPR)</h3>
            <ul>
                <li><strong>Access</strong>: request a copy of your data</li>
                <li><strong>Rectification</strong>: correct inaccurate data</li>
                <li><strong>Erasure</strong>: delete your data ("right to be forgotten")</li>
                <li><strong>Restriction</strong>: limit processing</li>
                <li><strong>Portability</strong>: receive data in machine-readable format</li>
                <li><strong>Objection</strong>: object to certain processing</li>
                <li><strong>Withdraw consent</strong> at any time</li>
            </ul>
            <p>Email <a href="mailto:${c.dpoEmail}">${c.dpoEmail}</a>. Response within 30 days (extendable to 60).</p>
            <p>You also have the right to lodge a complaint with the supervisory authority: <strong>AEPD</strong> (aepd.es) in Spain or <strong>ICO</strong> (ico.org.uk) in UK.</p>
            <h3>8. Minors</h3>
            <p>GoHappy is aimed at families. We <strong>do not knowingly</strong> collect data from children under 14 (Spain) or 13 (UK). Children using GoHappy must do so under parental supervision via parent's account.</p>
            <h3>9. Security</h3>
            <ul>
                <li>HTTPS encryption in transit (TLS 1.3)</li>
                <li>Firebase Auth (industry standard)</li>
                <li>Firestore Security Rules with strict field validation</li>
                <li>Gemini API key stored in Firebase Secret Manager (never client-side)</li>
                <li>Rate limiting and anti-fraud at all endpoints</li>
                <li>Periodic security audits</li>
            </ul>
            <h3>10. Cookies</h3>
            <p>We use minimum essential localStorage. NO third-party advertising cookies. See <a href="#" onclick="window.GoHappyLegal._currentTab='cookies';window.GoHappyLegal._renderDoc();return false">Cookies Policy</a>.</p>
            <h3>11. Changes</h3>
            <p>Substantial changes notified via in-app notification and email at least 30 days in advance.</p>
            <div class="contact-box"><strong>DPO:</strong> <a href="mailto:${c.dpoEmail}">${c.dpoEmail}</a><br>${c.name} · ${c.city}</div>
        `;
        return `
            <h2>Política de Privacidad</h2>
            <div class="updated">Última actualización: ${c.lastUpdate}</div>
            <div class="highlight">Tomamos tu privacidad en serio. Esta Política explica qué datos recopilamos, por qué, cómo los protegemos y tus derechos según el RGPD y UK GDPR.</div>
            <h3>1. Responsable del tratamiento</h3>
            <p><strong>${c.name}</strong> (el "Responsable"), con sede en ${c.city}.<br>Contacto: <a href="mailto:${c.email}">${c.email}</a><br>Delegado de Protección de Datos (DPO): <a href="mailto:${c.dpoEmail}">${c.dpoEmail}</a></p>
            <h3>2. Datos que recopilamos</h3>
            <table>
                <tr><th>Categoría</th><th>Datos</th></tr>
                <tr><td>Identificación</td><td>Email, nickname, nombre, foto perfil (emoji), edad aprox.</td></tr>
                <tr><td>Familia</td><td>Edades de los hijos (rango), código familiar, rol familiar</td></tr>
                <tr><td>Ubicación</td><td>Coordenadas GPS aproximadas (solo con consentimiento)</td></tr>
                <tr><td>Contenido</td><td>Fotos en Moments, reseñas en mapa, posts en Tribu, historial chat IA</td></tr>
                <tr><td>Uso</td><td>Quests completadas, puntos, secciones visitadas, errores técnicos</td></tr>
                <tr><td>Técnicos</td><td>Modelo de dispositivo, SO, versión app, IP anonimizada</td></tr>
            </table>
            <h3>3. Finalidades y base legal</h3>
            <table>
                <tr><th>Finalidad</th><th>Base legal (RGPD Art. 6)</th></tr>
                <tr><td>Prestar el servicio</td><td>Ejecución del contrato</td></tr>
                <tr><td>Personalizar contenido IA</td><td>Interés legítimo + consentimiento</td></tr>
                <tr><td>Geolocalización para eventos</td><td>Consentimiento explícito (revocable)</td></tr>
                <tr><td>Notificaciones push</td><td>Consentimiento (revocable)</td></tr>
                <tr><td>Seguridad y prevención fraude</td><td>Interés legítimo</td></tr>
                <tr><td>Cumplimiento legal</td><td>Obligación legal</td></tr>
            </table>
            <h3>4. Conservación de datos</h3>
            <ul>
                <li><strong>Cuenta</strong>: mientras esté activa. Si la eliminas, borramos en 30 días (excepto obligaciones legales).</li>
                <li><strong>Chat IA (Care)</strong>: almacenado localmente en tu dispositivo, se borra al desinstalar.</li>
                <li><strong>Moments</strong>: hasta que los elimines o cierres tu cuenta.</li>
                <li><strong>Cuentas inactivas</strong>: anonimizadas o eliminadas tras 24 meses de inactividad.</li>
                <li><strong>Logs legales</strong>: 6 años para asuntos fiscales/facturación (obligación legal).</li>
            </ul>
            <h3>5. Compartición con terceros</h3>
            <ul>
                <li><strong>Google Firebase</strong> (Google Ireland Ltd) — hosting, auth, BBDD en UE.</li>
                <li><strong>Google Gemini IA</strong> (Google LLC, EEUU) — generación de contenido. Protegida por SCCs + EU-US Data Privacy Framework.</li>
                <li><strong>Apple App Store / Google Play</strong> — procesamiento de pagos.</li>
                <li><strong>OpenFreeMap, Photon (Komoot)</strong> — mapas y geocoding. Sin datos personales.</li>
            </ul>
            <p>NO vendemos tus datos. NO usamos publicidad dirigida.</p>
            <h3>6. Transferencias internacionales</h3>
            <p>Las transferencias a EEUU (Gemini) están protegidas por Cláusulas Contractuales Tipo (SCCs) aprobadas por la Comisión Europea, la adhesión de Google al EU-U.S. Data Privacy Framework y medidas técnicas adicionales (anonimización, sanitización de prompts).</p>
            <h3>7. Tus derechos (RGPD)</h3>
            <ul>
                <li><strong>Acceso</strong>: solicitar copia de tus datos</li>
                <li><strong>Rectificación</strong>: corregir datos inexactos</li>
                <li><strong>Supresión</strong>: eliminar tus datos ("derecho al olvido")</li>
                <li><strong>Limitación</strong>: limitar el tratamiento</li>
                <li><strong>Portabilidad</strong>: recibir tus datos en formato legible</li>
                <li><strong>Oposición</strong>: oponerte a ciertos tratamientos</li>
                <li><strong>Revocar consentimiento</strong> en cualquier momento</li>
            </ul>
            <p>Escribe a <a href="mailto:${c.dpoEmail}">${c.dpoEmail}</a>. Respuesta en 30 días (ampliable a 60).</p>
            <p>También tienes derecho a presentar reclamación ante la autoridad de control: <strong>AEPD</strong> (aepd.es) en España o <strong>ICO</strong> (ico.org.uk) en Reino Unido.</p>
            <h3>8. Menores</h3>
            <p>GoHappy está dirigido a familias. <strong>No recopilamos conscientemente</strong> datos de niños menores de 14 años (España) o 13 años (Reino Unido). Los niños deben usar GoHappy bajo supervisión parental a través de la cuenta del padre/madre.</p>
            <h3>9. Seguridad</h3>
            <ul>
                <li>Cifrado HTTPS en tránsito (TLS 1.3)</li>
                <li>Firebase Auth (estándar de la industria)</li>
                <li>Firestore Security Rules con validación estricta de campos</li>
                <li>API key de Gemini en Firebase Secret Manager (nunca en cliente)</li>
                <li>Rate limiting y antifraude en todos los endpoints</li>
                <li>Auditorías de seguridad periódicas</li>
            </ul>
            <h3>10. Cookies</h3>
            <p>Usamos localStorage esencial mínimo. NO cookies publicitarias de terceros. Ver <a href="#" onclick="window.GoHappyLegal._currentTab='cookies';window.GoHappyLegal._renderDoc();return false">Política de Cookies</a>.</p>
            <h3>11. Cambios</h3>
            <p>Los cambios sustanciales se notificarán por notificación en la app y email al menos 30 días antes.</p>
            <div class="contact-box"><strong>DPO:</strong> <a href="mailto:${c.dpoEmail}">${c.dpoEmail}</a><br>${c.name} · ${c.city}</div>
        `;
    },

    // ─── 3. COOKIES ───
    _cookiesHtml: (lang) => {
        const c = window.GoHappyLegal.COMPANY;
        if (lang === 'en') return `
            <h2>Cookies Policy</h2>
            <div class="updated">Last updated: ${c.lastUpdate}</div>
            <h3>What are cookies?</h3>
            <p>Small data files stored on your device. GoHappy uses <strong>technical localStorage</strong> (similar to cookies) to function correctly.</p>
            <h3>What we store</h3>
            <table>
                <tr><th>Type</th><th>Purpose</th><th>Duration</th></tr>
                <tr><td>Session</td><td>Keep you logged in (Firebase Auth)</td><td>1 year</td></tr>
                <tr><td>Preferences</td><td>Language (ES/EN), Today family prefs</td><td>Until deleted</td></tr>
                <tr><td>AI Cache</td><td>Avoid repeating AI calls for same query</td><td>2 hours</td></tr>
                <tr><td>Onboarding</td><td>Remember if tutorials were shown</td><td>Permanent</td></tr>
                <tr><td>Quest progress</td><td>Local state of completed missions</td><td>Daily</td></tr>
            </table>
            <h3>Third-party cookies</h3>
            <p>We do NOT use third-party advertising or tracking cookies. We do not load Google Analytics, Facebook Pixel or similar.</p>
            <h3>How to disable</h3>
            <p>You may clear localStorage anytime. <strong>Note</strong>: this will log you out and reset preferences.</p>
            <ul>
                <li><strong>iPhone</strong>: Settings → Safari → Clear History and Data</li>
                <li><strong>Android</strong>: Chrome → Settings → Privacy → Clear browsing data</li>
                <li><strong>Web</strong>: Browser settings → Cookies and site data</li>
            </ul>
            <div class="contact-box"><strong>Questions?</strong> <a href="mailto:${c.email}">${c.email}</a></div>
        `;
        return `
            <h2>Política de Cookies</h2>
            <div class="updated">Última actualización: ${c.lastUpdate}</div>
            <h3>¿Qué son las cookies?</h3>
            <p>Pequeños archivos de datos almacenados en tu dispositivo. GoHappy usa <strong>localStorage técnico</strong> (similar a cookies) para funcionar correctamente.</p>
            <h3>Qué almacenamos</h3>
            <table>
                <tr><th>Tipo</th><th>Finalidad</th><th>Duración</th></tr>
                <tr><td>Sesión</td><td>Mantenerte autenticado (Firebase Auth)</td><td>1 año</td></tr>
                <tr><td>Preferencias</td><td>Idioma (ES/EN), prefs familia Today</td><td>Hasta borrado</td></tr>
                <tr><td>Caché IA</td><td>Evitar repetir llamadas IA para misma pregunta</td><td>2 horas</td></tr>
                <tr><td>Onboarding</td><td>Recordar si has visto tutoriales</td><td>Permanente</td></tr>
                <tr><td>Progreso quests</td><td>Estado local de misiones completadas</td><td>Diario</td></tr>
            </table>
            <h3>Cookies de terceros</h3>
            <p>NO usamos cookies publicitarias o de seguimiento de terceros. No cargamos Google Analytics, Facebook Pixel ni similares.</p>
            <h3>Cómo desactivarlas</h3>
            <p>Puedes borrar localStorage en cualquier momento. <strong>Nota</strong>: hacerlo te desconectará y reiniciará preferencias.</p>
            <ul>
                <li><strong>iPhone</strong>: Ajustes → Safari → Borrar historial y datos</li>
                <li><strong>Android</strong>: Chrome → Configuración → Privacidad → Borrar datos</li>
                <li><strong>Web</strong>: Configuración del navegador → Cookies y datos del sitio</li>
            </ul>
            <div class="contact-box"><strong>¿Dudas?</strong> <a href="mailto:${c.email}">${c.email}</a></div>
        `;
    },

    // ─── 4. AVISO LEGAL (LSSI-CE) ───
    _legalNoticeHtml: (lang) => {
        const c = window.GoHappyLegal.COMPANY;
        if (lang === 'en') return `
            <h2>Legal Notice</h2>
            <div class="updated">Last updated: ${c.lastUpdate}</div>
            <h3>Service Holder</h3>
            <p>In compliance with art. 10 of Spanish Law 34/2002 on Information Society Services (LSSI-CE):</p>
            <div class="contact-box">
                <strong>Corporate name:</strong> ${c.name}<br>
                <strong>Trade name:</strong> ${c.tradeName}<br>
                <strong>Tax ID:</strong> ${c.nif}<br>
                <strong>Address:</strong> ${c.address}, ${c.city}<br>
                <strong>Email:</strong> <a href="mailto:${c.email}">${c.email}</a><br>
                <strong>Website:</strong> <a href="${c.web}" target="_blank">${c.web}</a><br>
                <strong>App:</strong> <a href="${c.appHost}" target="_blank">${c.appHost}</a>
            </div>
            <h3>Service description</h3>
            <p>GoHappy is a digital service for modern families to organise family leisure, parenting and shared memories, with AI assistance.</p>
            <h3>Intellectual property</h3>
            <p>All IP rights over the App, source code, design, logos, name and content belong to ${c.name} or are duly licensed. Reproduction, distribution or transformation without prior written authorisation is prohibited.</p>
            <h3>Liability</h3>
            <ul>
                <li>Improper or illicit use of the App</li>
                <li>External links accessed from the App</li>
                <li>Information from AI (informational only)</li>
                <li>Temporary interruptions due to maintenance or force majeure</li>
            </ul>
            <h3>Applicable law</h3>
            <p>This Legal Notice is governed by Spanish law. Disputes submitted to courts of user's domicile (consumer protection).</p>
        `;
        return `
            <h2>Aviso Legal</h2>
            <div class="updated">Última actualización: ${c.lastUpdate}</div>
            <h3>Titular del servicio</h3>
            <p>En cumplimiento del art. 10 de la Ley 34/2002 de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSI-CE):</p>
            <div class="contact-box">
                <strong>Denominación social:</strong> ${c.name}<br>
                <strong>Nombre comercial:</strong> ${c.tradeName}<br>
                <strong>NIF/CIF:</strong> ${c.nif}<br>
                <strong>Domicilio:</strong> ${c.address}, ${c.city}<br>
                <strong>Email:</strong> <a href="mailto:${c.email}">${c.email}</a><br>
                <strong>Web:</strong> <a href="${c.web}" target="_blank">${c.web}</a><br>
                <strong>App:</strong> <a href="${c.appHost}" target="_blank">${c.appHost}</a>
            </div>
            <h3>Descripción del servicio</h3>
            <p>GoHappy es un servicio digital dirigido a familias modernas para la organización del ocio familiar, crianza y creación de recuerdos compartidos, con asistencia de IA.</p>
            <h3>Propiedad intelectual e industrial</h3>
            <p>Todos los derechos de propiedad intelectual sobre la App, código fuente, diseño, logos, nombre y contenido pertenecen a ${c.name} o están debidamente licenciados. Queda prohibida su reproducción, distribución o transformación sin autorización previa por escrito.</p>
            <h3>Responsabilidad</h3>
            <ul>
                <li>El uso indebido o ilícito de la App</li>
                <li>Los enlaces externos accesibles desde la App</li>
                <li>Información proporcionada por la IA (carácter orientativo)</li>
                <li>Interrupciones temporales del servicio por mantenimiento o fuerza mayor</li>
            </ul>
            <h3>Legislación aplicable</h3>
            <p>El presente Aviso Legal se rige por la legislación española. Para cualquier controversia, las partes se someten a los tribunales del domicilio del usuario (protección al consumidor).</p>
        `;
    }
};
