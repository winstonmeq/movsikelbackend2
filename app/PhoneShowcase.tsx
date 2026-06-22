'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './landing.module.css';

const SLIDES = [
  {
    src: '/images/movsikel-shared.jpg',
    tag: 'Shared Ride',
    title: 'Send a pickup request',
    text: 'No fare negotiation — pick a place and a nearby driver accepts your shared ride.',
  },
  {
    src: '/images/movsikel-booking.jpg',
    tag: 'Booking Ride',
    title: 'Set your own Pakyaw fare',
    text: 'Add the fare you want to offer. The driver sees it before accepting your trip.',
  },
];

/**
 * Scroll-triggered reveal: two phones (Shared Ride + Booking Ride) fade and
 * slide up as they enter the viewport. Simple, robust scrollytelling — no
 * sticky pinning.
 */
export default function PhoneShowcase() {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add(styles.revealOn);
            obs.unobserve(e.target); // reveal once, then stop watching
          }
        }
      },
      { threshold: 0.25 }
    );
    itemRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section className={styles.showcase} id="showcase">
      <div className={styles.showcaseHead}>
        <span>See it in action</span>
        <h2>One app, two ways to ride.</h2>
        <p>Shared Ride for quick pickups, Pakyaw booking when you set the fare.</p>
      </div>

      <div className={styles.showcaseRows}>
        {SLIDES.map((s, i) => (
          <div
            key={s.tag}
            ref={(el) => { itemRefs.current[i] = el; }}
            className={`${styles.revealRow} ${i % 2 === 1 ? styles.revealRowAlt : ''}`}
          >
            <div className={styles.revealPhone}>
              <div className={styles.iphone}>
                <div className={styles.dynamicIsland} />
                <div className={styles.sideButtonLeft} />
                <div className={styles.sideButtonRight} />
                <div className={styles.screenClip}>
                  <Image
                    src={s.src}
                    alt={`MovSikel ${s.tag} screen`}
                    width={430}
                    height={932}
                    className={styles.screenImage}
                  />
                </div>
              </div>
            </div>

            <div className={styles.revealCopy}>
              <div className={styles.showcaseTag}>{s.tag}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
