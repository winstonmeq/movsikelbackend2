
import styles from "./privacy-policy.module.css";

export const metadata = {
  title: "Terms & Privacy Policy — MovSikel",
  description:
    "The terms of service and privacy policy for the MovSikel passenger and driver apps — tricycle ride-hailing in Kidapawan City.",
};

const LAST_UPDATED = "June 23, 2026";
const CONTACT_EMAIL = "support@mail.movsikel.com";
const PRIVACY_EMAIL = "privacy@mail.movsikel.com";

const sections = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "eligibility", label: "Eligibility & Accounts" },
  { id: "service", label: "The Service" },
  { id: "fares", label: "Fares, Booking Fees & Payments" },
  { id: "conduct", label: "User Conduct" },
  { id: "liability", label: "Disclaimers & Liability" },
  { id: "termination", label: "Suspension & Termination" },
  { id: "collect", label: "Information We Collect" },
  { id: "use", label: "How We Use It" },
  { id: "location", label: "Background Location" },
  { id: "sharing", label: "Sharing of Information" },
  { id: "retention", label: "Data Retention" },
  { id: "security", label: "Data Security" },
  { id: "rights", label: "Your Rights" },
  { id: "deletion", label: "Account & Data Deletion" },
  { id: "children", label: "Children's Privacy" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden="true" />
            <span className={styles.brandName}>MovSikel</span>
          </div>
          <p className={styles.eyebrow}>Legal · Terms &amp; Privacy</p>
          <h1 className={styles.title}>Terms &amp; Privacy Policy</h1>
          <p className={styles.lede}>
            The terms you agree to when using MovSikel, plus what we collect, why
            we need it, and the control you keep over it. Applies to both the
            MovSikel passenger and driver apps in Kidapawan City.
          </p>
          <p className={styles.updated}>Last updated {LAST_UPDATED}</p>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.toc} aria-label="On this page">
          <p className={styles.tocTitle}>On this page</p>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className={styles.tocNum}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main className={styles.content}>
          <p className={styles.intro}>
            This document covers both the <strong>Terms of Service</strong> and
            the <strong>Privacy Policy</strong> for MovSikel (&ldquo;we&rdquo;),
            a tricycle ride-hailing platform serving Kidapawan City, Cotabato,
            Philippines. It applies to passengers and drivers using the MovSikel
            apps. By creating an account or using the apps, you agree to these
            terms and to this privacy policy.
          </p>

          {/* ── Terms of Service ─────────────────────────────────────────── */}

          <section id="acceptance" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>01</span> Acceptance of Terms
            </h2>
            <p>
              By registering for or using MovSikel, you confirm that you have
              read, understood, and agree to be bound by these Terms of Service
              and the Privacy Policy below. If you do not agree, please do not
              use the apps.
            </p>
          </section>

          <section id="eligibility" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>02</span> Eligibility &amp;
              Accounts
            </h2>
            <ul>
              <li>
                <strong>Passengers</strong> must be able to enter a valid
                contact number and provide accurate pickup and destination
                information.
              </li>
              <li>
                <strong>Drivers</strong> must be at least 18 years old, hold a
                valid driver&rsquo;s license, and operate a roadworthy,
                properly registered tricycle.
              </li>
              <li>
                You are responsible for keeping your account credentials secure
                and for all activity under your account.
              </li>
              <li>
                You agree to provide truthful information and to keep it up to
                date.
              </li>
            </ul>
          </section>

          <section id="service" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>03</span> The Service
            </h2>
            <p>
              MovSikel is a technology platform that connects passengers seeking
              tricycle rides with nearby drivers. MovSikel itself does not
              provide transportation — drivers are independent operators. We do
              not guarantee the availability of drivers or that a request will be
              accepted.
            </p>
          </section>

          <section id="fares" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>04</span> Fares, Booking Fees
              &amp; Payments
            </h2>
            <ul>
              <li>
                <strong>Pakyaw (Booking Ride)</strong> — the passenger sets a
                fare offer, which the driver sees before accepting. The agreed
                fare is paid by the passenger directly to the driver in cash.
              </li>
              <li>
                <strong>Shared Ride</strong> — a pickup request without a fare
                offer; fares follow local tricycle practice.
              </li>
              <li>
                <strong>Booking fees</strong> — a small platform fee may be
                charged to the driver per completed booking ride, deducted from
                the driver&rsquo;s in-app wallet. Fees and any rewards are shown
                in the driver app.
              </li>
              <li>
                Payments between passengers and drivers are settled in cash.
                MovSikel is not a party to those payments.
              </li>
            </ul>
          </section>

          <section id="conduct" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>05</span> User Conduct
            </h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the apps for any unlawful, harmful, or fraudulent purpose.</li>
              <li>Harass, threaten, or endanger other users.</li>
              <li>Provide false information or impersonate another person.</li>
              <li>Interfere with, disrupt, or attempt to misuse the platform.</li>
              <li>
                Game the matching, rating, referral, or fee systems (e.g. fake
                rides or false ratings).
              </li>
            </ul>
          </section>

          <section id="liability" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>06</span> Disclaimers &amp;
              Liability
            </h2>
            <p>
              The apps are provided &ldquo;as is&rdquo; without warranties of any
              kind. To the extent permitted by law, MovSikel is not liable for
              the conduct of drivers or passengers, for the condition of any
              vehicle, or for incidents that occur during a trip. Rides are taken
              at your own risk, and drivers are responsible for safe operation
              and compliance with traffic laws.
            </p>
          </section>

          <section id="termination" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>07</span> Suspension &amp;
              Termination
            </h2>
            <p>
              We may suspend or terminate an account that violates these terms,
              abuses the service, or poses a risk to other users. You may stop
              using the apps and request account deletion at any time (see
              section 15).
            </p>
          </section>

          {/* ── Privacy Policy ──────────────────────────────────────────── */}

          <section id="collect" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>08</span> Information We
              Collect
            </h2>
            <p>To run the service, we collect:</p>
            <ul>
              <li>
                <strong>Account details</strong> — name, mobile number, and
                email. For drivers, also tricycle plate or body number and the
                credentials entered at sign-up.
              </li>
              <li>
                <strong>Location</strong> — passengers&rsquo; pickup and
                destination points; drivers&rsquo; precise GPS position
                (foreground and background while online) to match rides and guide
                navigation.
              </li>
              <li>
                <strong>Trip data</strong> — ride requests, accepted and declined
                trips, fares, booking fees, ratings, and history.
              </li>
              <li>
                <strong>Wallet &amp; fees</strong> — for drivers, wallet balance,
                top-ups, booking fees, and referral activity.
              </li>
              <li>
                <strong>Device data</strong> — device model, OS, app version, and
                crash or diagnostic information.
              </li>
            </ul>
          </section>

          <section id="use" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>09</span> How We Use It
            </h2>
            <ul>
              <li>Match passengers with nearby drivers and confirm requests.</li>
              <li>Provide real-time tracking and navigation to pickup and drop-off.</li>
              <li>Calculate fares and booking fees and keep trip history.</li>
              <li>Manage driver wallets, referrals, and account verification.</li>
              <li>Improve performance, reliability, and safety.</li>
              <li>Send service updates, support, and important notices.</li>
              <li>Meet obligations under Philippine law.</li>
            </ul>
          </section>

          <section id="location" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>10</span> Background Location
            </h2>
            <p>
              The driver app uses location in the background only while a
              driver&rsquo;s status is <strong>online</strong> and available for
              rides — this lets the app send nearby requests and show passengers
              the driver&rsquo;s live position. Setting status to{" "}
              <strong>offline</strong> stops background location collection. The
              passenger app uses location only while you are booking or tracking a
              ride. You can change location permissions any time in your device
              settings.
            </p>
          </section>

          <section id="sharing" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>11</span> Sharing of
              Information
            </h2>
            <p>We do not sell your personal information. We share only:</p>
            <ul>
              <li>
                <strong>Between passenger and driver</strong> — limited details
                needed to complete a trip, such as name, contact number,
                tricycle identifier, and live location.
              </li>
              <li>
                <strong>With service providers</strong> — trusted partners for
                hosting, maps, and notifications, bound by confidentiality.
              </li>
              <li>
                <strong>With partner TODAs and local authorities</strong> — where
                needed for accreditation, disputes, or compliance.
              </li>
              <li>
                <strong>When required by law</strong> — to meet legal process or
                protect users and the public.
              </li>
            </ul>
          </section>

          <section id="retention" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>12</span> Data Retention
            </h2>
            <p>
              We keep your information while your account is active and as needed
              to run the service, resolve disputes, and meet legal obligations.
              You can request deletion at any time.
            </p>
          </section>

          <section id="security" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>13</span> Data Security
            </h2>
            <p>
              We use reasonable technical and organizational measures to protect
              your information. No system is perfectly secure, so we cannot
              guarantee absolute security.
            </p>
          </section>

          <section id="rights" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>14</span> Your Rights
            </h2>
            <p>
              Under the Philippine Data Privacy Act of 2012 (Republic Act No.
              10173) you may access, correct, object to, or delete your personal
              data, and withdraw consent. Contact us to exercise these rights.
            </p>
          </section>

          <section id="deletion" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>15</span> Account &amp; Data
              Deletion
            </h2>
            <p>
              Request deletion of your account and data by emailing{" "}
              <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. We process
              verified requests within a reasonable period, except records we are
              legally required to keep.
            </p>
          </section>

          <section id="children" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>16</span> Children&rsquo;s
              Privacy
            </h2>
            <p>
              MovSikel is intended for adults. The driver app is for licensed
              tricycle drivers aged 18 and above. We do not knowingly collect
              data from minors.
            </p>
          </section>

          <section id="changes" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>17</span> Changes
            </h2>
            <p>
              We may update these terms or this policy. Material changes are
              reflected in the &ldquo;Last updated&rdquo; date above, and
              continued use means you accept them.
            </p>
          </section>

          <section id="contact" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>18</span> Contact
            </h2>
            <div className={styles.contactCard}>
              <p className={styles.contactCompany}>MovSikel</p>
              <p>Kidapawan City, Cotabato, Philippines</p>
              <p>
                Support:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
              <p>
                Privacy:{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
              </p>
              <p>
                Web: <a href="https://movsikel.com">movsikel.com</a>
              </p>
            </div>
          </section>
        </main>
      </div>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} MovSikel · Kidapawan City</span>
        <a href="https://movsikel.com">movsikel.com</a>
      </footer>
    </div>
  );
}
