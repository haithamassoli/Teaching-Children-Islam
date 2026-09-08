import sourceActivities from "../content/activities.json";
import sourceHadiths from "../content/hadith-index.json";
import catalog from "../content/lessons.json";
import memory from "../content/memorization.json";
import sourceRemembrances from "../content/remembrances.json";
import sourceQuestionData from "../content/source/questions-answers.json";

// Text lessons can ship before optional narration and teaching illustrations exist.
export function isReviewed(record: {
  status?: string;
  publishable: boolean;
  approved_by?: string;
  approved_at?: string;
  review_status?: Record<string, string>;
}) {
  return (
    record.status === "approved" &&
    record.publishable &&
    Boolean(record.approved_by && record.approved_at) &&
    ["text", "religious_content", "age_suitability"].every(
      (key) => record.review_status?.[key] === "approved",
    )
  );
}

export const lessons = catalog.lessons.filter(isReviewed);
export const memoryItems = memory.items.filter(isReviewed);
export const remembrances = sourceRemembrances.filter(isReviewed);
export const activities = sourceActivities.filter(isReviewed);
export const hadiths = sourceHadiths.filter(isReviewed);
export const sourceQuestions = sourceQuestionData.filter(isReviewed);
export const worlds = catalog.worlds;
