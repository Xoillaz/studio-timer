'use client';

import { useState } from 'react';
import styles from './TitleSection.module.css';

export default function TitleSection() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={styles.titleSection}>
      <h1 className={styles.pageTitle}>请选择需要租赁的场地</h1>
      <div className={styles.subtitleRow}>
        <p className={styles.pageSubtitle}>需预留足以抵扣 3 小时费用的余额</p>
        <div 
          className={styles.tooltipTrigger}
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <span className={styles.tooltipIcon}>?</span>
        </div>
        {showTooltip && (
          <div className={styles.tooltip}>
            入场需冻结 3 小时费用作为预授权，离场结算后多退少补
          </div>
        )}
      </div>
    </div>
  );
}
