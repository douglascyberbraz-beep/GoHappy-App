window.KindrLegal = {
    render: (container) => {
        container.innerHTML = `
            <div class="legal-page" style="padding: 20px; max-width: 640px; margin: 0 auto;">
                <button id="legal-back" class="btn-text" style="margin-bottom: 15px; color: var(--primary-blue);">← Volver</button>
                
                <h2 style="color: var(--primary-navy); margin-bottom: 20px;">📜 Términos y Condiciones</h2>

                <div class="legal-section premium-glass" style="padding: 20px; border-radius: 16px; margin-bottom: 20px;">
                    <h3 style="color: var(--primary-navy); margin-bottom: 10px;">1. Uso de la Aplicación</h3>
                    <p style="font-size: 13px; line-height: 1.6; color: #555;">
                        KINDR es una plataforma colaborativa para familias. Al usar esta aplicación, te comprometes a:
                    </p>
                    <ul style="font-size: 13px; line-height: 1.8; color: #555; padding-left: 20px; margin-top: 8px;">
                        <li>Proporcionar información veraz y respetuosa en tus reseñas y publicaciones.</li>
                        <li>No publicar contenido ofensivo, discriminatorio o que viole los derechos de terceros.</li>
                        <li>Respetar la privacidad de otros usuarios y menores de edad.</li>
                    </ul>
                </div>

                <div class="legal-section premium-glass" style="padding: 20px; border-radius: 16px; margin-bottom: 20px;">
                    <h3 style="color: var(--primary-navy); margin-bottom: 10px;">2. Política de Privacidad (GDPR)</h3>
                    <p style="font-size: 13px; line-height: 1.6; color: #555;">
                        Nos comprometemos a proteger tus datos personales conforme al Reglamento General de Protección de Datos (RGPD/GDPR):
                    </p>
                    <ul style="font-size: 13px; line-height: 1.8; color: #555; padding-left: 20px; margin-top: 8px;">
                        <li><strong>Datos recogidos:</strong> Email, nombre/apodo, ubicación geográfica (sólo con tu permiso), reseñas y publicaciones.</li>
                        <li><strong>Finalidad:</strong> Ofrecer una experiencia personalizada — reseñas locales, eventos cercanos y noticias relevantes.</li>
                        <li><strong>Base legal:</strong> Consentimiento explícito del usuario al registrarse.</li>
                        <li><strong>Almacenamiento:</strong> Tus datos se almacenan de forma segura en Google Firebase (servidores en la UE).</li>
                        <li><strong>Retención:</strong> Tus datos se conservan mientras mantengas tu cuenta activa. Puedes solicitar la eliminación en cualquier momento.</li>
                    </ul>
                </div>

                <div class="legal-section premium-glass" style="padding: 20px; border-radius: 16px; margin-bottom: 20px;">
                    <h3 style="color: var(--primary-navy); margin-bottom: 10px;">3. Tus Derechos</h3>
                    <p style="font-size: 13px; line-height: 1.6; color: #555;">
                        De acuerdo con el RGPD, tienes derecho a:
                    </p>
                    <ul style="font-size: 13px; line-height: 1.8; color: #555; padding-left: 20px; margin-top: 8px;">
                        <li><strong>Acceso:</strong> Solicitar una copia de todos los datos que tenemos sobre ti.</li>
                        <li><strong>Rectificación:</strong> Corregir datos incorrectos o incompletos.</li>
                        <li><strong>Supresión:</strong> Solicitar la eliminación completa de tu cuenta y datos.</li>
                        <li><strong>Portabilidad:</strong> Recibir tus datos en formato legible por máquina.</li>
                        <li><strong>Oposición:</strong> Oponerte al tratamiento de tus datos en cualquier momento.</li>
                    </ul>
                    <p style="font-size: 13px; line-height: 1.6; color: #555; margin-top: 10px;">
                        Para ejercer estos derechos, contacta a: <strong>privacy@kindr.app</strong>
                    </p>
                </div>

                <div class="legal-section premium-glass" style="padding: 20px; border-radius: 16px; margin-bottom: 20px;">
                    <h3 style="color: var(--primary-navy); margin-bottom: 10px;">4. Contenido y Propiedad Intelectual</h3>
                    <p style="font-size: 13px; line-height: 1.6; color: #555;">
                        Al publicar contenido en KINDR (reseñas, fotos, posts), mantienes la propiedad de tu contenido pero nos otorgas una licencia no exclusiva para mostrarlo dentro de la plataforma. KINDR se reserva el derecho de moderar o eliminar contenido que viole estos términos.
                    </p>
                </div>

                <div class="legal-section premium-glass" style="padding: 20px; border-radius: 16px; margin-bottom: 20px;">
                    <h3 style="color: var(--primary-navy); margin-bottom: 10px;">5. Cookies y Tecnologías de Seguimiento</h3>
                    <p style="font-size: 13px; line-height: 1.6; color: #555;">
                        KINDR utiliza tecnologías estándar de almacenamiento local (localStorage, Firebase Authentication tokens) exclusivamente para mantener tu sesión activa y tus preferencias. No utilizamos cookies de publicidad ni rastreamos tu actividad fuera de la aplicación.
                    </p>
                </div>

                <div class="legal-section premium-glass" style="padding: 20px; border-radius: 16px; margin-bottom: 30px;">
                    <h3 style="color: var(--primary-navy); margin-bottom: 10px;">6. Contacto</h3>
                    <p style="font-size: 13px; line-height: 1.6; color: #555;">
                        Para cualquier consulta sobre estos términos o tu privacidad:<br>
                        📧 <strong>legal@kindr.app</strong><br>
                        🌐 <strong>kindr.app</strong>
                    </p>
                </div>

                <p style="font-size: 11px; color: #999; text-align: center; padding-bottom: 40px;">
                    Última actualización: Marzo 2026 · v1.0.0
                </p>
            </div>
        `;

        document.getElementById('legal-back').addEventListener('click', () => {
            const user = window.KindrAuth.checkAuth();
            if (user) {
                window.KindrApp.loadPage('profile');
            } else {
                // If not logged in, they likely came from the Auth Modal
                // Re-render auth modal effectively by reloading or calling the check
                window.location.reload();
            }
        });
    }
};
