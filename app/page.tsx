export default async function Home() {
  if (process.env.NODE_ENV !== "production" && process.env.CONTENT_PREVIEW === "true") {
    const { default: Preview } = await import("./components/preview");
    return <Preview />;
  }

  return (
    <main className="production-landing">
      <p>رِحلة الإسلام</p>
      <h1>قريبًا بإذن الله</h1>
      <span>يجري تجهيز رحلة تعليمية آمنة للأطفال.</span>
    </main>
  );
}
