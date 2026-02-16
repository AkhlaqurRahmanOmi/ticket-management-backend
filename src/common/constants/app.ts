export const APP_NAME = 'Ticket Booking';
export const API_DOCS_TITLE_SUFFIX = 'API';
export const API_DOCS_FALLBACK_TITLE = `${APP_NAME} ${API_DOCS_TITLE_SUFFIX}`;

export const buildApiDocsTitle = (appEnv: string): string =>
  `${APP_NAME} ${API_DOCS_TITLE_SUFFIX} (${appEnv})`;

export const buildApiDocsDescription = (deployedAt: string): string =>
  `${APP_NAME} service API documentation. Last deployed: ${deployedAt}`;
