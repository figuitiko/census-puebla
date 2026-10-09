/** Read-only photo grid. Images come from the authenticated route, so no signed or public URL is exposed. */
export function EvidenceGrid({ photos }: { photos: { id: string }[] }) {
  if (photos.length === 0) return <p className="text-sm text-muted-foreground">Sin fotos.</p>;

  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((photo, index) => (
        <li key={photo.id} className="aspect-square overflow-hidden rounded-md border bg-muted">
          <a href={`/api/evidence/${photo.id}`} target="_blank" rel="noreferrer">
            {/* Private route behind auth: next/image's optimizer cannot authenticate, a plain img is intended. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/evidence/${photo.id}`} alt={`Foto ${index + 1}`} loading="lazy" className="size-full object-cover" />
          </a>
        </li>
      ))}
    </ul>
  );
}
