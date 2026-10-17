import { todayISO } from "@/lib/date";
import { VehicleWizard } from "./vehicle-wizard";

export const metadata = { title: "Tambah kendaraan" };

export default function TambahPage() {
  return <VehicleWizard today={todayISO()} />;
}
