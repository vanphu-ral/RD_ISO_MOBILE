function setupProxy({ tls }) {
  const serverResources = ['/api', '/services', '/management', '/v3/api-docs', '/h2-console', '/auth', '/oauth2', '/login', '/health'];
  const conf = [
    {
      context: serverResources,
      target: `http${tls ? 's' : ''}://localhost:9030`,
      secure: false,
      changeOrigin: tls,
    },
  ];
  return conf;
}

module.exports = setupProxy;
