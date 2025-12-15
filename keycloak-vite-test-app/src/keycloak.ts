import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: 'http://localhost:8080/',
  realm: 'exploravis-dev',
  clientId: 'f3377df3-f354-4b68-b369-cd5cbb0f68ae',
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
