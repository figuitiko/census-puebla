import { getCampaign, toDateInput } from "@/lib/campaign";
import { requireCan } from "@/lib/dal";
import { CampaignForm } from "./campaign-form";

export default async function CampaignPage() {
  await requireCan("admin:manage");
  const campaign = await getCampaign();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Campaña</h1>
      <CampaignForm
        defaults={
          campaign && {
            name: campaign.name,
            municipality: campaign.municipality,
            startsOn: toDateInput(campaign.startsOn),
            endsOn: toDateInput(campaign.endsOn),
            minPhotos: campaign.minPhotos,
          }
        }
      />
    </div>
  );
}
