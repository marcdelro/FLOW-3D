import { useState, type FormEvent } from "react";

const CONTACT_EMAIL = "yuktingyukti143@gmail.com";

type Status = "idle" | "sending" | "sent";

export function ContactForm({ onClose }: { onClose: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [message, setMessage]     = useState("");
  const [status, setStatus]       = useState<Status>("idle");
  const [error, setError]         = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in every field.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setStatus("sending");

    const subject = encodeURIComponent(
      `FLOW-3D Contact — ${firstName.trim()} ${lastName.trim()}`,
    );
    const body = encodeURIComponent(
      `Name: ${firstName.trim()} ${lastName.trim()}\n` +
      `Email: ${email.trim()}\n\n` +
      `Message:\n${message.trim()}\n`,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-gray-400 -mt-1">
        Send a message to the FLOW-3D thesis team. Submitting opens your email client
        with the message pre-filled and addressed to{" "}
        <span className="text-white">{CONTACT_EMAIL}</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First Name" htmlFor="first-name">
          <input
            id="first-name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            autoComplete="given-name"
            className={inputCls}
          />
        </Field>
        <Field label="Last Name" htmlFor="last-name">
          <input
            id="last-name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            autoComplete="family-name"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Email" htmlFor="contact-email">
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className={inputCls}
        />
      </Field>

      <Field label="Message" htmlFor="contact-message">
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          className={`${inputCls} resize-y min-h-[120px]`}
        />
      </Field>

      {error && (
        <p className="text-sm text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

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

const inputCls =
  "w-full rounded-lg bg-[#0b0d12] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="block text-xs font-semibold tracking-wide uppercase text-gray-400 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
