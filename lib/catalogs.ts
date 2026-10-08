import type {
  Equipment,
  GreenAreaCondition,
  GreenAreaType,
  GreenAreaUse,
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
  CONSULTORIOS: "Consultorios",
  OTROS: "Otros",
};

export const GREEN_TYPE_LABELS: Record<GreenAreaType, string> = {
  JARDIN: "Jardín",
  PARQUE: "Parque",
  CAMELLON: "Camellón",
  OTRA_AREA_VERDE: "Otra área verde",
};

export const GREEN_USE_LABELS: Record<GreenAreaUse, string> = {
  RECREACION: "Recreación",
  DESCANSO_CONVIVENCIA: "Descanso y convivencia",
  JUEGO_INFANTIL: "Juego infantil",
  ACTIVIDAD_FISICA_DEPORTIVA: "Actividad física o deportiva",
  ORNAMENTAL: "Ornamental",
  CONSERVACION_AMBIENTAL: "Conservación / ambiental",
  OTRO: "Otro",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  NINGUNO: "Ninguno",
  BANCAS_MOBILIARIO_DESCANSO: "Bancas o mobiliario de descanso",
  JUEGOS_INFANTILES: "Juegos infantiles",
  EQUIPAMIENTO_DEPORTIVO: "Equipamiento deportivo",
  SENDEROS: "Senderos",
  OTRO: "Otro",
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
