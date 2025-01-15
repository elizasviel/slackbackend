import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

export const sanitizeHtml = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "p",
      "b",
      "i",
      "em",
      "strong",
      "code",
      "pre",
      "ul",
      "ol",
      "li",
      "br",
    ],
    ALLOWED_ATTR: [],
  });
};
