import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { contactSchema, type ContactInput } from "../lib/formSchemas";

const CONTACT_EMAIL = "yuktingyukti143@gmail.com";

type Status = "idle" | "sending" | "sent";

export function ContactForm({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>("idle");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: { firstName: "", lastName: "", email: "", message: "" },
  });

  function onSubmit(values: ContactInput) {
    setStatus("sending");

    const subject = encodeURIComponent(
      `FLOW-3D Contact — ${values.firstName.trim()} ${values.lastName.trim()}`,
    );
    const body = encodeURIComponent(
      `Name: ${values.firstName.trim()} ${values.lastName.trim()}\n` +
      `Email: ${values.email.trim()}\n\n` +
      `Message:\n${values.message.trim()}\n`,
    );

    // Open the user's email client with the message pre-populated so it lands
    // in the thesis team's inbox via the user's own provider.
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    setTimeout(() => setStatus("sent"), 250);
  }

  if (status === "sent") {
    return (
      <div className="space-y-4 text-center py-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-11" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Message ready to send</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Your email client should now be open with the message pre-filled and addressed to{" "}
          <span className="text-white">{CONTACT_EMAIL}</span>. Press <span className="text-white">Send</span>{" "}
          there to deliver it to the FLOW-3D thesis team.
        </p>
        <button
          onClick={onClose}
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-white text-gray-900 px-5 py-2.5 text-sm font-semibold hover:bg-gray-100 transition"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <p className="text-gray-400 -mt-1">
        Send a message to the FLOW-3D thesis team. Submitting opens your email client
        with the message pre-filled and addressed to{" "}
        <span className="text-white">{CONTACT_EMAIL}</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First Name" htmlFor="contact-first" error={errors.firstName?.message}>
          <input
            id="contact-first"
            type="text"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            className={fieldInputCls(!!errors.firstName)}
            {...register("firstName")}
          />
        </Field>
        <Field label="Last Name" htmlFor="contact-last" error={errors.lastName?.message}>
          <input
            id="contact-last"
            type="text"
            autoComplete="family-name"
            aria-invalid={!!errors.lastName}
            className={fieldInputCls(!!errors.lastName)}
            {...register("lastName")}
          />
        </Field>
      </div>

      <Field label="Email" htmlFor="contact-email" error={errors.email?.message}>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          className={fieldInputCls(!!errors.email)}
          {...register("email")}
        />
      </Field>

      <Field label="Message" htmlFor="contact-message" error={errors.message?.message}>
        <textarea
          id="contact-message"
          rows={6}
          aria-invalid={!!errors.message}
          className={`${fieldInputCls(!!errors.message)} resize-y min-h-[120px]`}
          {...register("message")}
        />
      </Field>

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-semibold text-gray-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-5 py-2.5 text-sm font-semibold shadow-[0_10px_30px_-10px_rgba(59,130,246,0.7)] hover:brightness-110 disabled:opacity-60 transition"
        >
          {status === "sending" ? "Sending…" : "Submit message"}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </form>
  );
}

function fieldInputCls(invalid: boolean): string {
  return [
    "w-full rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500",
    "bg-[#0b0d12] border focus:outline-none focus:ring-2 transition",
    invalid
      ? "border-red-500/60 focus:border-red-400 focus:ring-red-400/30"
      : "border-white/10 focus:border-blue-400 focus:ring-blue-400/30",
  ].join(" ");
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="block text-xs font-semibold tracking-wide uppercase text-gray-400 mb-1.5">
        {label}
      </span>
      {children}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-300 flex items-start gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </label>
  );
}
