"use client";

import { useState } from "react";
import Recorder from "../../recorder";

export default function RecorderHarness() {
  const [consent, setConsent] = useState(true);
  const [failUpload, setFailUpload] = useState(false);
  const [uploads, setUploads] = useState(0);

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>Recorder technical QA</h1>
      <p>This is a development-only harness. It contains no learner or religious content.</p>
      <label style={{ display: "block", margin: "1rem 0" }}>
        <input
          id="qa-consent"
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />{" "}
        Consent enabled
      </label>
      <label style={{ display: "block", margin: "1rem 0" }}>
        <input
          id="qa-fail-upload"
          type="checkbox"
          checked={failUpload}
          onChange={(event) => setFailUpload(event.target.checked)}
        />{" "}
        Simulate upload failure
      </label>
      <p data-testid="upload-count">Simulated successful uploads: {uploads}</p>
      <Recorder
        consent={consent}
        upload={async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          if (failUpload) {
            throw new Error("technical QA failure");
          }
          setUploads((count) => count + 1);
        }}
      />
    </main>
  );
}
