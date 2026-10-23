import type {
  GreenAreaCondition,
  GreenAreaType,
  InfoSource,
  OrganizationFigure,
  PrivateUnitType,
  SubmissionStatus,
  TriState,
} from "@/lib/generated/prisma/enums";

// Labels follow the workbook sheet "Catálogos". Keys are the Prisma enums.

export const TRISTATE_LABELS: Record<TriState, string> = {
  YES: "Sí",
  NO: "No",
  UNDETERMINED: "No fue posible determinar",
};

export const PRIVATE_UNIT_LABELS: Record<PrivateUnitType, string> = {
  LOCAL_COMERCIAL: "Local comercial",
  OFICINAS: "Oficinas",
};

export const GREEN_TYPE_LABELS: Record<GreenAreaType, string> = {
  JARDIN: "Jardín",
  CAMELLON: "Camellón",
};

export const GREEN_CONDITION_LABELS: Record<GreenAreaCondition, string> = {
  BUENA: "Buena",
  REGULAR: "Regular",
  DEFICIENTE: "Deficiente",
  NO_FUE_POSIBLE_VALORAR: "No fue posible valorar",
};

export const ORG_FIGURE_LABELS: Record<OrganizationFigure, string> = {
  ADMINISTRADOR: "Administrador/a",
  COMITE_ADMINISTRACION: "Comité de administración",
  MESA_DIRECTIVA: "Mesa directiva",
  OTRA: "Otra",
};

export const SOURCE_LABELS: Record<InfoSource, string> = {
  ADMINISTRADOR: "Administrador/a",
  COMITE_O_MESA_DIRECTIVA: "Comité o mesa directiva",
  PERSONA_RESIDENTE: "Persona residente",
  DOCUMENTO_DISPONIBLE: "Documento disponible",
  REGISTRO_MUNICIPIO: "Registro proporcionado por el Municipio",
  OBSERVACION_DIRECTA: "Observación directa",
  OTRA: "Otra",
};

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  DRAFT: "Borrador",
  SUBMITTED: "Enviada",
  APPROVED: "Aprobada",
  RETURNED: "Devuelta",
};
