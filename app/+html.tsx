import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * Document web Expo : flex racine + cream de marque.
 * `translate="no"` évite que Chrome lance translate-pa.googleapis.com
 * (CORS / 502 dans la console, sans lien avec l’API OnMangeOu).
 */
export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="fr-CI" translate="no">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="google" content="notranslate" />
        <ScrollViewStyleReset />
        <style>{`html,body,#root{background:#f7f2e8}`}</style>
      </head>
      <body className="notranslate" translate="no">
        {children}
      </body>
    </html>
  );
}
