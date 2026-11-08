import { z } from "zod";

export const clientCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  age: z
    .string()
    .refine((value) => value === "" || /^\d+$/.test(value), "Age must be numeric")
    .default(""),
  gender: z.enum(["Male", "Female", "Other"], {
    errorMap: () => ({ message: "Gender must be Male, Female, or Other" }),
  }),
  height: z.string().max(20).optional().default(""),
  weight: z.string().max(20).optional().default(""),
  bloodPressure: z.string().max(50).optional().default(""),
  bloodGlucose: z.string().max(50).optional().default(""),
  address: z.string().max(500).optional().default(""),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  startDate: z.string().max(30).optional().default(""),
  followUpDate: z.string().max(30).optional().default(""),
  notes: z.string().max(5000).optional().default(""),
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

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer");

export const userSeedSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  gender: z.enum(["Male", "Female"]),
  loginId: z.string().trim().min(1, "Login ID is required").max(100),
  password: passwordSchema,
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm the new password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const documentCategorySchema = z.enum(["Report", "Prescription", "Image", "Other"]);

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
