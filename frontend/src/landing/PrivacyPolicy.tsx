export function PrivacyPolicy() {
  return (
    <div className="space-y-5">
      <p className="text-gray-400">
        Effective date: 14 May 2026. FLOW-3D ("we", "us") is a Decision Support System
        developed at FEU Institute of Technology as a BS Computer Science thesis. This
        Privacy Policy explains how we collect, use, store, and protect your personal
        information, in compliance with{" "}
        <span className="text-white">Republic Act No. 10173 — the Data Privacy Act of
        2012 of the Philippines</span>, its Implementing Rules and Regulations, and the
        issuances of the National Privacy Commission (NPC).
      </p>

      <Section title="1. Information We Collect">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <span className="text-white">Account data:</span> username, email address, and
            hashed password — supplied when you register or sign in.
          </li>
          <li>
            <span className="text-white">Manifest data:</span> truck dimensions, item
            dimensions, weights, fragility flags, route stops, and any plans you generate.
          </li>
          <li>
            <span className="text-white">Email correspondence:</span> messages you submit
            through the Contact form, including your name and email address.
          </li>
          <li>
            <span className="text-white">Cookies and local storage:</span> a session token
            and user-preference flags are stored in your browser to keep you signed in and
            to remember UI choices. We do not use third-party advertising cookies.
          </li>
          <li>
            <span className="text-white">Analytics:</span> aggregated, anonymized usage
            counters (e.g. number of plans solved, solver mode, runtime) collected on our
            backend to support the thesis evaluation. No analytics data is sold or shared
            with advertisers.
          </li>
        </ul>
      </Section>

      <Section title="2. Lawful Basis and Purpose">
        <p>
          We process personal information under Sections 12 and 13 of the Data Privacy Act —
          specifically with your <span className="text-white">consent</span>, for the{" "}
          <span className="text-white">performance of the service</span> you request, and
          for <span className="text-white">legitimate academic interests</span> related to
          the thesis. Manifest data is processed solely to compute your loading plan.
        </p>
      </Section>

      <Section title="3. Your Rights as a Data Subject">
        <p>Under the Data Privacy Act, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Be informed of how your data is collected and used.</li>
          <li>Access, correct, or update your data.</li>
          <li>Object to processing and withdraw consent.</li>
          <li>Request erasure or blocking of your data.</li>
          <li>Data portability, where applicable.</li>
          <li>File a complaint with the National Privacy Commission (privacy.gov.ph).</li>
        </ul>
      </Section>

      <Section title="4. Data Retention and Security">
        <p>
          Account and manifest data are retained for the duration of your use of the
          service and for the academic life of the thesis. We apply reasonable
          organizational, physical, and technical safeguards — hashed passwords, HTTPS in
          production, role-based access — proportionate to the sensitivity of the data.
        </p>
      </Section>

      <Section title="5. Sharing and Disclosure">
        <p>
          We do not sell or rent personal data. Data is accessible only to the FLOW-3D
          thesis team and the FEU Institute of Technology panel reviewing the project.
          Disclosure may occur only when required by Philippine law or a valid order of
          court or competent authority.
        </p>
      </Section>

      <Section title="6. Cookies">
        <p>
          We use strictly necessary cookies and browser local storage to maintain your
          authenticated session and to remember preferences such as theme and viewer
          settings. You may disable cookies through your browser, but the application may
          not function correctly without them.
        </p>
      </Section>

      <Section title="7. Contact and Data Protection Officer">
        <p>
          For data privacy concerns, exercise of your rights, or to withdraw consent,
          contact the FLOW-3D thesis team through the in-app Contact form or by email at{" "}
          <span className="text-white">yuktingyukti143@gmail.com</span>.
        </p>
      </Section>

      <p className="text-xs text-gray-500 pt-2">
        This document is provided for academic and informational purposes within the
        FLOW-3D thesis project and does not constitute legal advice.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-white font-semibold tracking-tight text-base mb-1.5">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
