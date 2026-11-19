// ads.txt declares who may sell ads on this site. Empty (404) until AdSense is configured.
export const dynamic = 'force-static';

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT; // ca-pub-XXXXXXXXXXXXXXXX
  if (!client) return new Response('Not found', { status: 404 });
  return new Response(`google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`, { headers: { 'content-type': 'text/plain' } });
}
