import { getCampaign, toDateInput } from "@/lib/campaign";
import { CONTRACT_MAX_PHOTOS, CONTRACT_MIN_PHOTOS, getMaxPhotos, getMinPhotos } from "@/lib/campaign-rules";
import { requireCan } from "@/lib/dal";
import { CampaignForm } from "./campaign-form";

export default async function CampaignPage() {
  await requireCan("admin:manage");
  const campaign = await getCampaign();
  const minPhotos = getMinPhotos();
  const maxPhotos = getMaxPhotos();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Campaña</h1>
      <div className="flex flex-col gap-1 rounded-md border p-3 text-sm">
        <p>
          Fotos por unidad: mínimo <span className="font-semibold">{minPhotos}</span>, máximo{" "}
          <span className="font-semibold">{maxPhotos}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Se configuran con las variables de entorno <code>MIN_PHOTOS</code> (por defecto {CONTRACT_MIN_PHOTOS}) y <code>MAX_PHOTOS</code> (por
          defecto {CONTRACT_MAX_PHOTOS}) y requieren reiniciar el servidor.
        </p>
        {minPhotos < CONTRACT_MIN_PHOTOS && (
          <p role="status" className="text-destructive">
            Mínimo reducido: el levantamiento real exige {CONTRACT_MIN_PHOTOS} fotos. Quitá MIN_PHOTOS o definí MIN_PHOTOS={CONTRACT_MIN_PHOTOS}.
          </p>
        )}
        {maxPhotos !== CONTRACT_MAX_PHOTOS && (
          <p role="status" className="text-destructive">
            Límite distinto del contrato: el levantamiento real permite {CONTRACT_MAX_PHOTOS} fotos. Quitá MAX_PHOTOS o definí MAX_PHOTOS={CONTRACT_MAX_PHOTOS}.
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
