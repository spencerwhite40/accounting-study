import { chapter1 } from "./ac241/ch1";
import { chapter2 } from "./ac241/ch2";
import { chapter3 } from "./ac241/ch3";
import { chapter4 } from "./ac241/ch4";
import type { Chapter } from "./types";

export const chapters: Chapter[] = [chapter1, chapter2, chapter3, chapter4];
export const COURSE = { id: "ac241", name: "AC241 Uses of Accounting Information II" };
