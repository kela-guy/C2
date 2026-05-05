/**
 * Project-local ambient declarations.
 *
 * `react-dom` is shipped at runtime but the project doesn't pull in
 * `@types/react-dom` — the dashboard never needed it because all the
 * client-side rendering is handled by libraries that bring their own
 * types. The styleguide's icon exporter is the first consumer of the
 * server-side renderer, so we declare the bits we use here rather than
 * widening the dependency surface for one helper.
 */
declare module 'react-dom/server' {
  import type { ReactElement } from 'react';
  export function renderToStaticMarkup(element: ReactElement): string;
  export function renderToString(element: ReactElement): string;
}
