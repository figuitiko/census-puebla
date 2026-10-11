import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { STATE_LABELS } from "@/features/dashboard/filters";
import { cedulaSections } from "./cedula-rows";
import type { Dossier } from "./dossier";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 9.5, color: "#111827" },
  folio: { fontSize: 9, color: "#6b7280", fontFamily: "Courier" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 },
  subtitle: { color: "#4b5563", marginTop: 2 },
  badge: { marginTop: 8, alignSelf: "flex-start", backgroundColor: "#e5e7eb", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3 },
  h2: { fontSize: 11.5, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 4, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: "#d1d5db" },
  row: { flexDirection: "row", paddingVertical: 2 },
  label: { width: "38%", color: "#4b5563", paddingRight: 8 },
  value: { width: "62%" },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoBox: { width: "48.5%", marginBottom: 6 },
  photo: { width: "100%", height: 150, objectFit: "contain", backgroundColor: "#f3f4f6" },
  photoMissing: { width: "100%", height: 150, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center", color: "#6b7280" },
  caption: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  review: { marginBottom: 6 },
  muted: { color: "#6b7280" },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, fontSize: 8, color: "#9ca3af", flexDirection: "row", justifyContent: "space-between" },
});

const osmLink = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

/**
 * Unit dossier: cedula, photos, location and review status. Location is coordinates + an OpenStreetMap
 * link (the plan's fallback while no static-map provider/key is chosen).
 */
export function DossierPdf({ dossier, minPhotos }: { dossier: Dossier; minPhotos: number }) {
  const { capture, history, photos } = dossier;
  const started = capture.submissionId !== null;
  const state = started ? capture.status : "NOT_STARTED";
  const { lat, lng } = capture.values;
  const generated = new Date().toLocaleString("es-MX");

  const sections = started
    ? cedulaSections(capture.values, {
        folio: capture.folio,
        responsible: capture.authorName ?? "—",
        visitedAt: capture.visitedAt,
      })
    : [];

  return (
    <Document title={`Expediente ${capture.folio}`} author="dash-senso">
      <Page size="A4" style={styles.page}>
        <Text style={styles.folio}>{capture.folio}</Text>
        <Text style={styles.title}>{capture.values.name}</Text>
        <Text style={styles.subtitle}>
          {[capture.values.colonia, capture.values.juntaAuxiliar].filter(Boolean).join(" · ") || "Sin colonia"}
        </Text>
        <Text style={styles.badge}>{STATE_LABELS[state]}</Text>

        <Text style={styles.h2}>Ubicación</Text>
        {lat !== null && lng !== null ? (
          <View>
            <Text>
              Coordenadas: {lat}, {lng}
            </Text>
            <Link src={osmLink(lat, lng)}>Ver en OpenStreetMap</Link>
          </View>
        ) : (
          <Text style={styles.muted}>Sin coordenadas registradas.</Text>
        )}

        <Text style={styles.h2}>Estado de revisión</Text>
        {history.length === 0 ? (
          <Text style={styles.muted}>Sin revisiones todavía.</Text>
        ) : (
          history.map((review) => (
            <View key={review.id} style={styles.review} wrap={false}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                {review.decision === "APPROVED" ? "Aprobada" : "Devuelta"} por {review.reviewer.name}
                <Text style={{ fontFamily: "Helvetica", color: "#6b7280" }}> · {review.createdAt.toLocaleString("es-MX")}</Text>
              </Text>
              {review.comment ? <Text>{review.comment}</Text> : null}
            </View>
          ))
        )}

        {!started ? (
          <Text style={[styles.muted, { marginTop: 16 }]}>Todavía no se inició la cédula de esta unidad.</Text>
        ) : (
          sections.map((section) => (
            <View key={section.title}>
              <Text style={styles.h2} minPresenceAhead={40}>
                {section.title}
              </Text>
              {section.rows.map(([label, value]) => (
                <View key={label} style={styles.row} wrap={false}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.value}>{value}</Text>
                </View>
              ))}
            </View>
          ))
        )}

        <Text style={styles.h2} minPresenceAhead={160}>
          Fotografías ({photos.length} de {minPhotos} requeridas)
        </Text>
        {photos.length === 0 ? (
          <Text style={styles.muted}>Sin fotografías confirmadas.</Text>
        ) : (
          <View style={styles.photos}>
            {photos.map((photo, index) => (
              <View key={photo.id} style={styles.photoBox} wrap={false}>
                {photo.image ? (
                  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf <Image> has no alt prop
                  <Image src={photo.image} style={styles.photo} />
                ) : (
                  <View style={styles.photoMissing}>
                    <Text>No disponible en el PDF</Text>
                  </View>
                )}
                <Text style={styles.caption}>
                  Foto {index + 1}
                  {photo.image ? "" : ` (${photo.contentType})`}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            {capture.folio} · generado {generated}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
