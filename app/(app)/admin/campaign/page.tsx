import { getCampaign, toDateInput } from "@/lib/campaign";
import { CONTRACT_MIN_PHOTOS, getMinPhotos } from "@/lib/campaign-rules";
import { requireCan } from "@/lib/dal";
import { CampaignForm } from "./campaign-form";

export default async function CampaignPage() {
  await requireCan("admin:manage");
  const campaign = await getCampaign();
  const minPhotos = getMinPhotos();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Campaña</h1>
      <div className="flex flex-col gap-1 rounded-md border p-3 text-sm">
        <p>
          Fotos requeridas por unidad localizada: <span className="font-semibold">{minPhotos}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Se configura con la variable de entorno <code>MIN_PHOTOS</code> (por defecto 1) y requiere reiniciar el servidor.
        </p>
        {minPhotos < CONTRACT_MIN_PHOTOS && (
          <p role="status" className="text-destructive">
            Valor de prueba: el levantamiento real exige {CONTRACT_MIN_PHOTOS} fotos. Definí MIN_PHOTOS={CONTRACT_MIN_PHOTOS} antes de usar datos reales.
          </p>
        )}
      </div>
      <CampaignForm
        defaults={
          campaign && {
            name: campaign.name,
            municipality: campaign.municipality,
            startsOn: toDateInput(campaign.startsOn),
            endsOn: toDateInput(campaign.endsOn),
          }
        }
      />
    </div>
  );
}
