import { jsonLdText } from '../src/jsonld.ts';

// Structured data block, escaped by jsonLdText (tests/security.test.ts).
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
