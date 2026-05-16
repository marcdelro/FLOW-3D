import { useState } from "react";
import { Link } from "react-router-dom";

import { ContactForm } from "./ContactForm";
import { Modal } from "./Modal";
import { PrivacyPolicy } from "./PrivacyPolicy";
import { TermsOfService } from "./TermsOfService";

type ModalKey = "privacy" | "terms" | "contact" | null;

const PRODUCT_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Glossary", href: "#glossary" },
  { label: "FAQ", href: "#faq" },
];

export function Footer() {
  const [openModal, setOpenModal] = useState<ModalKey>(null);
  const close = () => setOpenModal(null);

  return (
    <footer className="border-t border-white/[0.06] bg-[#070a0f] text-gray-400">
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" />
                  <path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
                </svg>
              </div>
              <span className="text-white font-bold tracking-tight text-lg">FLOW-3D</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-sm">
              Routing-aware 3D furniture loading plans for Philippine haulers. Built at FEU Institute of
              Technology as a BS Computer Science thesis.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm tracking-tight mb-3">Product</h3>
            <ul className="space-y-2 text-sm">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="hover:text-white transition">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <FooterButton onClick={() => setOpenModal("contact")}>Contact</FooterButton>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm tracking-tight mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <FooterButton onClick={() => setOpenModal("privacy")}>Privacy Policy</FooterButton>
              </li>
              <li>
                <FooterButton onClick={() => setOpenModal("terms")}>Terms of Service</FooterButton>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col gap-3 text-xs text-gray-500">
          <p>© 2026 Yukti — FLOW-3D. All rights reserved. FEU Institute of Technology · BS Computer Science Thesis.</p>
          <p className="text-gray-600">
            FLOW-3D is a thesis-grade Decision Support System. Loading plans are advisory; the dispatcher remains
            responsible for final load verification.
          </p>
        </div>
      </div>

      <Modal open={openModal === "privacy"} onClose={close} title="Privacy Policy">
        <PrivacyPolicy />
      </Modal>
      <Modal open={openModal === "terms"} onClose={close} title="Terms of Service">
        <TermsOfService />
      </Modal>
      <Modal open={openModal === "contact"} onClose={close} title="Contact the FLOW-3D Team" size="md">
        <ContactForm onClose={close} />
      </Modal>
    </footer>
  );
}

function FooterButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left hover:text-white transition cursor-pointer"
    >
      {children}
    </button>
  );
}
