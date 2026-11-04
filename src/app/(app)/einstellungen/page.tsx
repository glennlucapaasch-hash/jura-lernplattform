import { PageHeader } from "@/components/ui";
import { SettingsClient } from "./SettingsClient";
import { DATA_DIR } from "@/lib/db";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Einstellungen" subtitle="KI, Kosten, Sprache, Sicherheit und Datensicherung" />
      <SettingsClient dataDir={DATA_DIR} />
    </div>
  );
}
