/**
 * OmniParse Engine Configuration
 *
 * Remote processing engine connection details.
 * Managed transparently by the platform — users don't configure this.
 */

export const ENGINE_CONFIG = {
  // Remote engine target
  spaceTarget: 'ManvithReddy/omniparse-backend',
  directHost: 'https://manvithreddy-omniparse-backend.hf.space',

  // Branding
  engineName: 'OmniParse Engine',
  defaultLanguage: 'auto',

  // Developer API base (for SDK snippets)
  publicApiBase: typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : 'https://api.omniparse.dev/v1',
};
