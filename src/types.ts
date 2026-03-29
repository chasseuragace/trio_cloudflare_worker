import { z } from "zod";

export const BookingFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  timestamp: z.string().optional(),
});

export type BookingForm = z.infer<typeof BookingFormSchema>;

export interface Asset {
  title: string;
  description: string;
  images: string[];
}

export interface Env {
  KAHA_TOKEN: string;
  GROQ_TOKEN: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}
