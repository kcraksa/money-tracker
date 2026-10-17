import { ChecklistTabs } from "./tabs";

export default function ChecklistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <ChecklistTabs />
      {children}
    </div>
  );
}
