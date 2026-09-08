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

// Every approved record the book attaches to one lesson, so the lesson page stands
// alone and the child never has to open the PDF or hop to the library.
const onPages = (pages: number[], item: { source_pages?: number[]; source_page?: number }) =>
  (item.source_pages ?? (item.source_page ? [item.source_page] : [])).some((page) =>
    pages.includes(page),
  );

export function lessonBundle(lesson: {
  id: string;
  source_pages: number[];
  memorization_ids: string[];
}) {
  return {
    activities: activities.filter((item) => item.lesson_ids.includes(lesson.id)),
    memory: memoryItems.filter((item) => lesson.memorization_ids.includes(item.id)),
    questions: sourceQuestions.filter((item) => onPages(lesson.source_pages, item)),
    remembrances: remembrances.filter((item) => onPages(lesson.source_pages, item)),
    hadiths: hadiths.filter((item) => onPages(lesson.source_pages, item)),
  };
}

export const hadithById = (id: string) => hadiths.find((item) => item.id === id);

// The lesson that retells a hadith is where its wording lives on the site.
export const lessonForPages = (pages: number[]) =>
  lessons.find((lesson) => lesson.source_pages.some((page) => pages.includes(page)));
