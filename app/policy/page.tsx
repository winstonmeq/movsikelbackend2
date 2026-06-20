
import styles from "./privacy-policy.module.css";

export const metadata = {
  title: "Privacy Policy — MovSikel Driver",
  description:
    "How MovSikel Driver collects, uses, and protects driver data for tricycle ride-hailing in Kidapawan City.",
};

const LAST_UPDATED = "June 20, 2026";
const CONTACT_EMAIL = "support@mail.movsikel.com"; // change if you prefer another inbox
const PRIVACY_EMAIL = "privacy@mail.movsikel.com";

const sections = [
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
            <span className={styles.brandTag}>Driver</span>
          </div>
          <p className={styles.eyebrow}>Legal · Privacy</p>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.lede}>
            What we collect when you drive with MovSikel, why we need it, and
            the control you keep over it. Written for tricycle drivers in
            Kidapawan City.
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
            This policy explains how MovSikel (&ldquo;we&rdquo;) handles your
            information in the MovSikel Driver app, the tricycle ride-hailing
            driver app serving Kidapawan City, Cotabato, Philippines. Using the
            app means you agree to what&rsquo;s described here.
          </p>

          <section id="collect" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>01</span> Information We
              Collect
            </h2>
            <p>To match you with passengers and run the app, we collect:</p>
            <ul>
              <li>
                <strong>Account details</strong> — name, mobile number, email,
                TODA membership, tricycle plate or body number, and the driver
                credentials you enter at sign-up.
              </li>
              <li>
                <strong>Location</strong> — precise GPS position, in the
                foreground and background while you are online, to match you
                with nearby passengers and guide you to pickup and drop-off.
              </li>
              <li>
                <strong>Trip data</strong> — ride requests, accepted and
                declined trips, pickup and destination points, fares, booking
                fees, and history.
              </li>
              <li>
                <strong>Subscription &amp; fees</strong> — your monthly
                subscription status and booking fees tied to your trips.
              </li>
              <li>
                <strong>Device data</strong> — device model, OS, app version,
                and crash or diagnostic information.
              </li>
            </ul>
          </section>

          <section id="use" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>02</span> How We Use It
            </h2>
            <ul>
              <li>Match you with nearby passengers and confirm requests.</li>
              <li>Provide real-time navigation to pickup and drop-off.</li>
              <li>Calculate fares and booking fees and keep your history.</li>
              <li>Manage your subscription and verify your account.</li>
              <li>Improve performance, reliability, and safety.</li>
              <li>Send service updates, support, and important notices.</li>
              <li>Meet obligations under Philippine law.</li>
            </ul>
          </section>

          <section id="location" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>03</span> Background Location
            </h2>
            <p>
              MovSikel Driver uses location in the background only while your
              status is <strong>online</strong> and you are available for rides.
              This lets the app send nearby requests and show passengers your
              live position. Setting your status to{" "}
              <strong>offline</strong> stops background location collection. You
              can change location permissions any time in your device settings.
            </p>
          </section>

          <section id="sharing" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>04</span> Sharing of
              Information
            </h2>
            <p>We do not sell your personal information. We share only:</p>
            <ul>
              <li>
                <strong>With passengers</strong> — limited details such as your
                name, tricycle identifier, and live location needed to complete
                a trip.
              </li>
              <li>
                <strong>With service providers</strong> — trusted partners for
                hosting, maps, and notifications, bound by confidentiality.
              </li>
              <li>
                <strong>With partner TODAs and local authorities</strong> —
                where needed for accreditation, disputes, or compliance.
              </li>
              <li>
                <strong>When required by law</strong> — to meet legal process or
                protect users and the public.
              </li>
            </ul>
          </section>

          <section id="retention" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>05</span> Data Retention
            </h2>
            <p>
              We keep your information while your account is active and as needed
              to run the service, resolve disputes, and meet legal obligations.
              You can request deletion at any time.
            </p>
          </section>

          <section id="security" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>06</span> Data Security
            </h2>
            <p>
              We use reasonable technical and organizational measures to protect
              your information. No system is perfectly secure, so we cannot
              guarantee absolute security.
            </p>
          </section>

          <section id="rights" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>07</span> Your Rights
            </h2>
            <p>
              Under the Philippine Data Privacy Act of 2012 (Republic Act No.
              10173) you may access, correct, object to, or delete your personal
              data, and withdraw consent. Contact us to exercise these rights.
            </p>
          </section>

          <section id="deletion" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>08</span> Account &amp; Data
              Deletion
            </h2>
            <p>
              Request deletion of your account and data by emailing{" "}
              <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. We process
              verified requests within a reasonable period, except records we
              are legally required to keep.
            </p>
          </section>

          <section id="children" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>09</span> Children&rsquo;s
              Privacy
            </h2>
            <p>
              The app is for licensed tricycle drivers aged 18 and above. We do
              not knowingly collect data from minors.
            </p>
          </section>

          <section id="changes" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>10</span> Changes
            </h2>
            <p>
              We may update this policy. Material changes are reflected in the
              &ldquo;Last updated&rdquo; date above, and continued use means you
              accept them.
            </p>
          </section>

          <section id="contact" className={styles.section}>
            <h2>
              <span className={styles.sectionNum}>11</span> Contact
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
