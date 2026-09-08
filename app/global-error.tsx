"use client";

import "./globals.css";
import ErrorPage from "./error";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>تعذر إكمال الرحلة | رِحلة الإسلام</title>
      </head>
      <body>
        <ErrorPage retry={retry} />
      </body>
    </html>
  );
}
