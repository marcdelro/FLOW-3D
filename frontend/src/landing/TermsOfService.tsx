export function TermsOfService() {
  return (
    <div className="space-y-5">
      <p className="text-gray-400">
        Effective date: 14 May 2026. By creating an account or using the FLOW-3D web
        application (the "Service"), you ("User", "you") agree to the following Terms of
        Service. If you do not agree, please discontinue use of the Service.
      </p>

      <Section title="1. Nature of the Service">
        <p>
          FLOW-3D is a thesis-grade Decision Support System developed at FEU Institute of
          Technology. It generates LIFO-correct, route-aware 3D truck-loading plans as
          advisory output. Final responsibility for load verification, safety, and
          regulatory compliance rests with the dispatcher and the driver.
        </p>
      </Section>

      <Section title="2. Eligibility and Account">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>You must be at least 18 years old or have authorization from a guardian.</li>
          <li>You must provide accurate registration information and keep it current.</li>
          <li>You are responsible for safeguarding your password and all activity under your account.</li>
          <li>Each account is for a single user — credential sharing is prohibited.</li>
        </ul>
      </Section>

      <Section title="3. Acceptable Use">
        <p>You agree NOT to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Submit manifests that you do not have the right to use.</li>
          <li>Reverse-engineer, decompile, or attempt to extract the solver source code.</li>
          <li>Attempt to gain unauthorized access to other users' data or to backend systems.</li>
          <li>Use the Service to plan or facilitate the transport of illegal goods.</li>
          <li>Run automated scrapers, denial-of-service traffic, or load-testing without permission.</li>
          <li>Upload malicious code, exploits, or content that infringes third-party rights.</li>
          <li>Misrepresent the output of the Service as a guarantee of structural or transport safety.</li>
        </ul>
      </Section>

      <Section title="4. Accurate Input">
        <p>
          Loading plans are only as correct as the manifest provided. You agree to enter
          accurate truck dimensions, payload capacity, item dimensions, weights, fragility
          flags, and stop sequences. The thesis team is not liable for plans produced
          from inaccurate input.
        </p>
      </Section>

      <Section title="5. Advisory Output and Operational Safety">
        <p>
          Plans produced by FLOW-3D are computational suggestions. You are expected to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Physically verify the load before transport.</li>
          <li>Comply with all applicable LTO/LTFRB and DOTr regulations.</li>
          <li>Secure fragile and high-value items independently of the solver's output.</li>
          <li>Observe weight and balance limits regardless of solver computation.</li>
        </ul>
      </Section>

      <Section title="6. Intellectual Property">
        <p>
          FLOW-3D, its source code, documentation, and the underlying thesis ("Routing-Aware
          3D Furniture Logistics Simulator and Decision Support System Utilizing Integer
          Linear Programming and First-Fit Decreasing") are the intellectual property of
          the thesis team and FEU Institute of Technology. You retain ownership of the
          manifest data you submit.
        </p>
      </Section>

      <Section title="7. Privacy">
        <p>
          Your use of the Service is also governed by our Privacy Policy, which describes
          how we collect, use, and protect personal information in compliance with
          Republic Act No. 10173 (Data Privacy Act of 2012).
        </p>
      </Section>

      <Section title="8. Service Availability">
        <p>
          The Service is provided on an "as is" and "as available" basis. Because it is
          an active research artifact, downtime, breaking changes, and resets of test
          accounts may occur without prior notice.
        </p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>
          To the maximum extent permitted by Philippine law, the FLOW-3D thesis team and
          FEU Institute of Technology shall not be liable for indirect, incidental, or
          consequential damages — including loss of cargo, delivery delays, vehicular
          damage, or business loss — arising from use of or reliance on the Service.
        </p>
      </Section>

      <Section title="10. Suspension and Termination">
        <p>
          We may suspend or terminate accounts that violate these Terms, threaten
          system integrity, or are used for unlawful purposes. You may terminate your
          account at any time by contacting the thesis team.
        </p>
      </Section>

      <Section title="11. Governing Law">
        <p>
          These Terms are governed by the laws of the Republic of the Philippines. Any
          dispute shall be resolved in the appropriate courts of Metro Manila.
        </p>
      </Section>

      <Section title="12. Changes to the Terms">
        <p>
          We may update these Terms as the thesis evolves. Material changes will be
          announced through the Service or via the registered email address on your
          account. Continued use of the Service after such changes constitutes acceptance.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          Questions or concerns regarding these Terms may be sent to the thesis team
          through the in-app Contact form or by email at{" "}
          <span className="text-white">yuktingyukti143@gmail.com</span>.
        </p>
      </Section>
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
