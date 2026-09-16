'use client';

import styles from './ProfileMenu.module.css';

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

interface MenuGroup {
  title?: string;
  items: MenuItem[];
}

interface ProfileMenuProps {
  groups: MenuGroup[];
}

export default function ProfileMenu({ groups }: ProfileMenuProps) {
  return (
    <div className={styles.menuContainer}>
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className={styles.menuGroup}>
          <div className={styles.menuSection}>
            {group.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className={`${styles.menuItem} ${item.danger ? styles.danger : ''}`}
                onClick={item.onClick}
              >
                <span className={styles.menuIcon}>{item.icon}</span>
                <span className={styles.menuLabel}>{item.label}</span>
                <span className={styles.menuArrow}>→</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
