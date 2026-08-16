# FinançasPRO 5.0.0 — App Foundation

Esta versão inaugura a camada de aplicativo sem descartar o núcleo financeiro 4.7.x.

### Teste local no Windows
1. Extraia o ZIP.
2. Execute `start-app.bat`.
3. Abra `http://localhost:8080`.
4. No Chrome/Edge, use a opção de instalar o FinançasPRO quando aparecer.

Abrir `index.html` diretamente via `file://` continua funcionando para o teste do sistema local, mas Service Worker/PWA exigem um contexto servido (localhost ou HTTPS).
