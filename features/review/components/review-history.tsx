type Entry = {
  id: string;
  decision: "APPROVED" | "RETURNED";
  comment: string | null;
  createdAt: Date;
  reviewer: { name: string };
};

export function ReviewHistory({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Sin revisiones todavía.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((review) => (
        <li key={review.id} className="rounded-md border p-3 text-sm">
          <p className="font-medium">
            {review.decision === "APPROVED" ? "Aprobada" : "Devuelta"} por {review.reviewer.name}
            <span className="font-normal text-muted-foreground">
              {" · "}
              {review.createdAt.toLocaleString("es-MX")}
            </span>
          </p>
          {review.comment && <p className="mt-1 whitespace-pre-wrap">{review.comment}</p>}
        </li>
      ))}
    </ul>
  );
}
