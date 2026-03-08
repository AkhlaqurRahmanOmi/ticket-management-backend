export const APP_NAME = 'Ticket Booking';
export const API_DOCS_TITLE_SUFFIX = 'API';
export const API_DOCS_FALLBACK_TITLE = `${APP_NAME} ${API_DOCS_TITLE_SUFFIX}`;

export const buildApiDocsTitle = (
  appEnv: string,
  domainLabel?: string,
): string =>
  `${APP_NAME} ${API_DOCS_TITLE_SUFFIX}${domainLabel ? ` - ${domainLabel}` : ''} (${appEnv})`;

export const buildApiDocsDescription = (
  deployedAt: string,
  domainLabel?: string,
): string =>
  `${APP_NAME} service API documentation${domainLabel ? ` for ${domainLabel}` : ''}. Last deployed: ${deployedAt}`;
