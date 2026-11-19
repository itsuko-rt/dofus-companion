import PersonnageTabs from '../../components/character/PersonnageTabs';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <PersonnageTabs />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
