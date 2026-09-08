import { notFound } from "next/navigation";
import Harness from "./harness";

export default function ActivitiesQaPage() {
  if (process.env.NODE_ENV === "production" || process.env.CONTENT_PREVIEW !== "true") {
    notFound();
  }
  return <Harness />;
}
