export const worldArt = (id: string) => (id === "conduct" ? "ethics" : id);
export const assetUrl = (path: string) => `/api/assets/${path.replace(/^assets\//, "")}`;
export const arabicNumber = (value: number) => value.toLocaleString("ar-u-nu-arab");
export const kidOf = (child: { characterId?: string; gender?: string }) =>
  child.characterId || (child.gender === "female" ? "maryam" : "sami");
