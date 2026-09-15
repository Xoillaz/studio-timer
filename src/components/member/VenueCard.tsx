'use client';

import styles from './VenueCard.module.css';

interface VenueCardProps {
  venue: {
    id: number;
    name: string;
    pricePerHour: number;
    description: string;
  };
  onClick: () => void;
  disabled?: boolean;
}

export default function VenueCard({ venue, onClick, disabled }: VenueCardProps) {
  return (
    <div
      className={`${styles.venueCard} ${disabled ? styles.disabled : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <div className={styles.venueInfo}>
        <div className={styles.venueRow}>
          <span className={styles.venueName}>{venue.name.replace(/^[A-Z]棚-/, '')}</span>
          <span className={styles.venuePrice}>
            ¥{venue.pricePerHour}
            <span className={styles.priceUnit}>/时</span>
          </span>
        </div>
        <div className={styles.venueDesc}>{venue.description || '暂无备注'}</div>
      </div>
    </div>
  );
}
