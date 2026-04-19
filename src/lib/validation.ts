import { z } from "zod";

export const clientCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  age: z.string().regex(/^\d+$/, "Age must be numeric"),
  gender: z.enum(["Male", "Female", "Other"], {
    errorMap: () => ({ message: "Gender must be Male, Female, or Other" }),
  }),
  height: z.string().max(20).optional().default(""),
  weight: z.string().max(20).optional().default(""),
  bloodPressure: z.string().max(50).optional().default(""),
  bloodGlucose: z.string().max(50).optional().default(""),
  address: z.string().max(500).optional().default(""),
  phoneNumber: z.string().max(20, "Phone number too long").optional().default(""),
  followUpDate: z.string().max(30).optional().default(""),
  status: z.enum(["Open", "Closed", "Discontinued"]).optional().default("Open"),
  isAcute: z.boolean().optional().default(false),
  healthInfo: z.record(z.string(), z.string()).optional().default({}),
  medications: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        dosage: z.string(),
        duration: z.string().optional().default(""),
        prescribedDate: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  labInvestigations: z
    .array(
      z.object({
        id: z.string().optional(),
        testName: z.string().min(1),
        testDate: z.string(),
        results: z.string(),
        notes: z.string().optional().default(""),
      })
    )
    .optional()
    .default([]),
});

export const clientUpdateSchema = clientCreateSchema.partial();

export const documentCategorySchema = z.enum(["Report", "Prescription", "Image", "Other"]);

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
