import { z } from "zod";

/**
 * Shared Zod schemas used across login, register, change-password,
 * contact, and admin user-management forms. Centralising them keeps
 * validation rules consistent (e.g. username length, password length)
 * and gives every form the same error copy.
 */

export const usernameSchema = z
  .string({ message: "Username is required." })
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(/^[A-Za-z0-9_.-]+$/, "Use letters, digits, dot, dash, or underscore only.");

export const passwordSchema = z
  .string({ message: "Password is required." })
  .min(6, "Password must be at least 6 characters.")
  .max(128, "Password must be 128 characters or fewer.");

/** Login is more forgiving: empty username is the only thing we reject up-front. */
export const loginPasswordSchema = z
  .string({ message: "Password is required." })
  .min(1, "Password is required.");

export const emailSchema = z
  .string({ message: "Email is required." })
  .trim()
  .min(1, "Email is required.")
  .email("Please enter a valid email address.");

export const personNameSchema = z
  .string({ message: "This field is required." })
  .trim()
  .min(1, "This field is required.")
  .max(64, "Must be 64 characters or fewer.")
  .regex(/^[\p{L}\p{M}'\-\s.]+$/u, "Use letters, spaces, apostrophes, or hyphens only.");

/* ─── Login ──────────────────────────────────────────────────────────────── */

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: loginPasswordSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

/* ─── Register ───────────────────────────────────────────────────────────── */

export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirm:  z.string().min(1, "Please re-enter your password."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

/* ─── Change password ────────────────────────────────────────────────────── */

export const changePasswordSchema = z
  .object({
    newPassword:     passwordSchema,
    confirmPassword: z.string().min(1, "Please re-enter your password."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/* ─── Contact form ───────────────────────────────────────────────────────── */

export const contactSchema = z.object({
  firstName: personNameSchema,
  lastName:  personNameSchema,
  email:     emailSchema,
  message:
    z.string({ message: "Message is required." })
      .trim()
      .min(10, "Message must be at least 10 characters.")
      .max(2000, "Message must be 2000 characters or fewer."),
});
export type ContactInput = z.infer<typeof contactSchema>;

/* ─── Admin: add user / edit user ────────────────────────────────────────── */

export const addUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});
export type AddUserInput = z.infer<typeof addUserSchema>;

/** Edit user: password may be left blank to keep the existing one. */
export const editUserSchema = z.object({
  username: usernameSchema,
  password: z
    .string()
    .max(128, "Password must be 128 characters or fewer.")
    .refine((v) => v === "" || v.length >= 6, "Password must be at least 6 characters.")
    .optional()
    .or(z.literal("")),
  role: z.enum(["user", "admin"], { message: "Choose a role." }),
});
export type EditUserInput = z.infer<typeof editUserSchema>;
