// JSON-LD text for a <script type="application/ld+json">: every "<" becomes the JSON escape <
// (still valid JSON, same value), so a "</script>" in game text cannot close the script element.
export const jsonLdText = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c');
