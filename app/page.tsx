import Image from 'next/image';
import Link from 'next/link';
import styles from './landing.module.css';
import MapBackground from './MapBackground';

const androidDownloadUrl =
  'https://drive.usercontent.google.com/download?id=1m1OG1tgdtt6rVMFGaE6gHnkFinwHTrqW&export=download&authuser=0&fbclid=IwY2xjawSvQIFleHRuA2FlbQIxMABicmlkETF5QWF6NWdIaVU1NkQwMVM5c3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHjtFreIJQnS7pn7d34YPtfNQxlaSzVNiCmLr6w5DvmYkOtdXZJNlBIgoKyVB_aem_xLtcUftBcqeQ09_ZS5zFHQ';

export const metadata = {
  title: 'MovSikel — Ride your way',
  description:
    'MovSikel is a modern tricycle ride-booking app for Kidapawan City with Pakyaw fare offers, Shared Ride, live matching, and trusted local drivers.',
};

const featureCards = [
  {
    icon: 'M12 2.75c-4.28 0-7.75 3.47-7.75 7.75S12 21.25 12 21.25s7.75-6.47 7.75-10.75S16.28 2.75 12 2.75Zm0 10.25a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z',
    title: 'Live location pickup',
    text: 'Passengers can book from their real pickup point and follow the driver on the map.',
  },
  {
    icon: 'M7 6.25A3.25 3.25 0 1 1 13.5 6.25 3.25 3.25 0 0 1 7 6.25Zm8.25.75A2.75 2.75 0 1 1 20.75 7a2.75 2.75 0 0 1-5.5 0ZM4.25 18.2c0-3 2.75-5.45 6.1-5.45h.3c3.35 0 6.1 2.45 6.1 5.45 0 .86-.7 1.55-1.55 1.55H5.8c-.86 0-1.55-.7-1.55-1.55Zm12.6-5.12c2.66.52 4.9 2.6 4.9 5.12 0 .86-.7 1.55-1.55 1.55h-2.56c.4-.45.61-1.04.61-1.68 0-1.95-.9-3.72-2.37-5Z',
    title: 'Shared Ride',
    text: 'A simple pickup request for passengers who want a faster and affordable shared option.',
  },
  {
    icon: 'M5.5 17.25h13l1.25-5.25H4.25l1.25 5.25Zm1-8.75h11l1.35 2H5.15l1.35-2ZM7 18.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6.5 7.25l1.3-2.6A2 2 0 0 1 9.6 3.5h4.8a2 2 0 0 1 1.8 1.15l1.3 2.6h-11Z',
    title: 'Pakyaw booking',
    text: 'Passengers can set a fare offer before sending the request to nearby drivers.',
  },
  {
    icon: 'M12 2.75 19.25 6v5.25c0 4.47-2.92 8.38-7.25 10-4.33-1.62-7.25-5.53-7.25-10V6L12 2.75Zm3.44 7.1-4.3 4.3-2.08-2.08-1.41 1.42 3.49 3.49 5.72-5.72-1.42-1.41Z',
    title: 'Trust built in',
    text: 'Driver ratings and trip history help make every ride feel safer and more reliable.',
  },
];

const storySteps = [
  ['01', 'Home screen', 'The main dashboard introduces Pakyaw and Shared Ride clearly.'],
  ['02', 'Shared Ride', 'A pickup-only flow for passengers who do not need a fare offer.'],
  ['03', 'Booking Ride', 'A private ride flow where the passenger sets the fare amount.'],
];

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.iconSvg}>
      <path d={path} fill="currentColor" />
    </svg>
  );
}

function IPhone({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`${styles.iphone} ${className}`}>
      <div className={styles.dynamicIsland} />
      <div className={styles.phoneButtonLeft} />
      <div className={styles.phoneButtonRight} />
      <div className={styles.phoneBezelGlow} />
      <div className={styles.screenClip}>
        <Image
          src={src}
          alt={alt}
          width={946}
          height={2048}
          priority={priority}
          className={styles.screenImage}
        />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.bgLayer} aria-hidden="true">
        <div className={`${styles.liquidBlob} ${styles.blobA}`} />
        <div className={`${styles.liquidBlob} ${styles.blobB}`} />
        <div className={`${styles.liquidBlob} ${styles.blobC}`} />
        <div className={styles.gridGlow} />
        <MapBackground />
      </div>

      <nav className={styles.nav}>
        <Link href="/" className={styles.brand} aria-label="MovSikel home">
          <Image
            src="/images/movsikel-logo.png"
            alt="MovSikel"
            width={190}
            height={70}
            priority
            className={styles.logo}
          />
        </Link>

        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#ride-modes">Ride modes</a>
          <a href="#how">How it works</a>
          <Link href="/admin/login" className={styles.adminLink}>Admin</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <span /> Smart tricycle booking for Kidapawan
          </div>

          <h1>
            Your ride,
            <br />
            <em>your way.</em>
          </h1>

          <p className={styles.lede}>
            MovSikel brings Pakyaw fare offers, Shared Ride, live matching, and trusted
            local drivers into one clean passenger experience.
          </p>

          <div className={styles.heroActions}>
            <a href="#download" className={styles.primaryButton}>Get the app</a>
            <a href="#ride-modes" className={styles.secondaryButton}>See ride modes</a>
          </div>

          <div className={styles.miniStats}>
            <div><b>2</b><span>ride modes</span></div>
            <div><b>Live</b><span>driver status</span></div>
            <div><b>₱</b><span>fare control</span></div>
          </div>
        </div>

        <div className={styles.heroPhoneStage} aria-label="MovSikel app dashboard preview">
          <div className={styles.liquidDisk} />
          <div className={`${styles.floatingChip} ${styles.chipOne}`}>
            <strong>On the way</strong>
            <span>Driver arriving soon</span>
          </div>
          <div className={`${styles.floatingChip} ${styles.chipTwo}`}>
            <strong>₱200</strong>
            <span>Fare estimate</span>
          </div>
          <div className={`${styles.floatingChip} ${styles.chipThree}`}>
            <strong>Shared Ride</strong>
            <span>Popular pick</span>
          </div>
          <div className={styles.phoneShadow} />
          <IPhone
            src="/images/movsikel-dashboard.jpg"
            alt="MovSikel passenger dashboard"
            priority
            className={styles.heroPhone}
          />
        </div>
      </section>

      <section id="features" className={styles.featureStrip}>
        {featureCards.map((feature) => (
          <article className={styles.featureItem} key={feature.title}>
            <div className={styles.featureIcon}>
              <Icon path={feature.icon} />
            </div>
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className={styles.passengerDownloadSection}>
        <div className={styles.passengerImageCard}>
          <Image
            src="/images/passengerlocal.png"
            alt="MovSikel passenger app promo for students, teachers, professionals, and local commuters"
            width={1920}
            height={1080}
            className={styles.passengerImage}
          />
        </div>
        <div className={styles.passengerCopy}>
          <span className={styles.kicker}>For passengers</span>
          <h2>Book local tricycle rides for school, work, and daily errands.</h2>
          <p>
            Students, teachers, professionals, and families can use MovSikel to request
            nearby tricycle rides with clear pickup, fare, and driver updates.
          </p>
          <a
            href={androidDownloadUrl}
            className={styles.primaryButton}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Passenger App
          </a>
        </div>
      </section>

      <section id="ride-modes" className={styles.scrollySection}>
        <div className={styles.scrollyGlass}>
          <div className={styles.storyCopy}>
            <span className={styles.kicker}>Ride your way</span>
            <h2>Choose how you ride.</h2>
            <p>
              As visitors scroll, the landing page moves from the home dashboard into the
              two real booking flows: Shared Ride and Pakyaw Booking Ride.
            </p>

            <div className={styles.storyTimeline}>
              {storySteps.map(([number, title, text]) => (
                <div className={styles.storyStep} key={number}>
                  <span>{number}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.storyPhones} aria-label="Shared Ride and Booking Ride app previews">
            <div className={styles.storyPhoneWrap}>
              <div className={styles.phoneLabel}>Shared Ride</div>
              <IPhone
                src="/images/movsikel-shared-ride.jpg"
                alt="MovSikel Shared Ride screen"
                className={`${styles.storyPhone} ${styles.sharedPhone}`}
              />
            </div>

            <div className={styles.storyPhoneWrap}>
              <div className={styles.phoneLabel}>Booking Ride</div>
              <IPhone
                src="/images/movsikel-booking-ride.jpg"
                alt="MovSikel Booking Ride screen"
                className={`${styles.storyPhone} ${styles.bookingPhone}`}
              />
            </div>
          </div>
        </div>
      </section>

      <section id="how" className={styles.howSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.kicker}>How it works</span>
          <h2>Four clear steps from request to ride.</h2>
          <p>Simple enough for daily passengers, but polished enough for a modern mobility brand.</p>
        </div>

        <div className={styles.howGrid}>
          <article>
            <span>01</span>
            <h3>Select ride mode</h3>
            <p>Choose Pakyaw for fare offer booking or Shared Ride for a pickup request.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Confirm place</h3>
            <p>Search a location, confirm pickup or destination, and check the route preview.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Find driver</h3>
            <p>Nearby drivers receive the request and accept when the trip works for them.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Track and rate</h3>
            <p>Follow the driver live, complete the ride, and rate the trip afterward.</p>
          </article>
        </div>
      </section>

      <section className={styles.localSection}>
        <div>
          <span className={styles.kicker}>Built local</span>
          <h2>Designed for real tricycle movement around town.</h2>
          <p>
            MovSikel focuses on practical transport needs: trusted drivers, flexible fare
            offers, pickup requests, and a clean experience for everyday commuters.
          </p>
        </div>
        <div className={styles.localImageCard}>
          <Image
            src="/images/driverlocal.png"
            alt="MovSikel local tricycle driver recruitment banner"
            width={1920}
            height={1080}
            className={styles.localImage}
          />
        </div>
      </section>

      <section id="download" className={styles.downloadSection}>
        <div className={styles.downloadCard}>
          <Image src="/images/movsikel-logo.png" alt="MovSikel" width={148} height={54} />
          <div>
            <h2>Ready to move smarter?</h2>
            <p>Download MovSikel and book your next local tricycle ride faster.</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <Image src="/images/movsikel-logo.png" alt="MovSikel" width={130} height={48} />
        <div>
          <a href="#features">Features</a>
          <a href="#ride-modes">Ride modes</a>
          <a href="#how">How it works</a>
          <Link href="/policy">Privacy</Link>
          <Link href="/admin/login">Admin</Link>
        </div>
        <p>© {new Date().getFullYear()} MovSikel · Kidapawan City</p>
      </footer>
    </main>
  );
}
