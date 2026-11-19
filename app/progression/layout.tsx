import ProgressionTabs from '../../components/progression/ProgressionTabs';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <ProgressionTabs />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
