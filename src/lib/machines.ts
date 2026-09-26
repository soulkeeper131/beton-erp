import { z } from "zod";

// Валидация за машини и ремонти. Празни стрингове от формите → null.
const optStr = z.string().trim().optional().nullable().transform((v) => (v ? v : null));
const optDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v == null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Невалидна дата");
const optInt = z.coerce.number({ invalid_type_error: "Невалидно число" }).int().min(0).optional().nullable();

export const machineSchema = z.object({
  name: z.string({ required_error: "Името е задължително" }).trim().min(1, "Името е задължително"),
  type: z.string({ required_error: "Типът е задължителен" }).trim().min(1, "Типът е задължителен"),
  category: z.string().optional().nullable().transform((v) => v || "other"),
  plateNumber: optStr,
  fuelType: optStr,
  year: optStr.or(z.number().transform(String)),
  vin: optStr,
  mileage: optInt,
  vignetteExpiry: optDate,
  insuranceExpiry: optDate,
  techInspectionExpiry: optDate,
  status: z.string().optional(),
  location: optStr,
  lastMaintenanceDate: optDate,
  nextMaintenanceDate: optDate,
  notes: optStr,
});

export const machinePatchSchema = machineSchema.partial();

export const repairSchema = z.object({
  date: z.string({ required_error: "Датата е задължителна" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата"),
  type: z.string({ required_error: "Изберете тип" }).trim().min(1, "Изберете тип"),
  description: z.string({ required_error: "Описанието е задължително" }).trim().min(1, "Описанието е задължително"),
  cost: z.coerce.number({ invalid_type_error: "Невалидна сума" }).min(0, "Сумата не може да е отрицателна").optional().default(0),
  provider: optStr,
  mileageAtRepair: optInt,
  nextDate: optDate,
  notes: optStr,
});
