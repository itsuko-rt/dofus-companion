import { redirect } from 'next/navigation';

// No dashboard yet: the quest map is the only page.
export default function Home() {
  redirect('/quetes');
}
