'use client';

import { OrderDetail } from './types';
import styles from './OrderContent.module.css';

interface OrderDetailContentProps {
  order: OrderDetail;
  currentAmount?: number;
  equipmentTotal?: number;
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
}

export function OrderDetailContent({ order, currentAmount = 0, equipmentTotal = 0 }: OrderDetailContentProps) {
  const baseAmount = currentAmount || order.baseAmount || 0;
  const eqTotal = equipmentTotal || order.equipmentTotal || 0;
  const vasTotal = order.vasServiceTotal || 0;

  return (
    <div className={styles.detailContent}>
      {/* 订单信息 */}
      <div className={styles.infoCard}>
        <h3 className={styles.cardTitle}>订单信息</h3>
        <div className={styles.infoRow}>
          <span className={styles.label}>订单号</span>
          <span className={styles.value}>{order.orderNo}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>下单时间</span>
          <span className={styles.value}>
            {order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN') : '-'}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>支付方式</span>
          <span className={styles.value}>余额支付</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>场地</span>
          <span className={styles.value}>{order.venueName}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>场地单价</span>
          <span className={styles.value}>¥{order.venuePricePerHour}/小时</span>
        </div>
      </div>

      {/* 设备信息 */}
      {order.equipments && order.equipments.length > 0 && (
        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>设备</h3>
          {order.equipments.map((eq, index) => (
            <div key={index} className={styles.infoRow}>
              <span className={styles.label}>{eq.name} × {eq.quantity}</span>
              <span className={styles.value}>¥{eq.subtotal}</span>
            </div>
          ))}
        </div>
      )}

      {/* 增值服务信息 */}
      {order.vasServices && order.vasServices.length > 0 && (
        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>增值服务</h3>
          {order.vasServices.map((vas, index) => (
            <div key={index} className={styles.infoRow}>
              <span className={styles.label}>{vas.name} × {vas.quantity}</span>
              <span className={styles.value}>¥{vas.subtotal}</span>
            </div>
          ))}
        </div>
      )}

      {/* 时间信息 */}
      <div className={styles.infoCard}>
        <h3 className={styles.cardTitle}>时间信息</h3>
        <div className={styles.infoRow}>
          <span className={styles.label}>入场时间</span>
          <span className={styles.value}>
            {order.entryTime ? new Date(order.entryTime).toLocaleString('zh-CN') : '-'}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>离场时间</span>
          <span className={styles.value}>
            {order.exitTime ? new Date(order.exitTime).toLocaleString('zh-CN') : '-'}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>使用时长</span>
          <span className={styles.value}>{formatDuration(order.durationMinutes)}</span>
        </div>
      </div>

      {/* 费用信息 */}
      <div className={styles.infoCard}>
        <h3 className={styles.cardTitle}>费用信息</h3>
        <div className={styles.infoRow}>
          <span className={styles.label}>场地费</span>
          <span className={styles.value}>¥{baseAmount.toFixed(2)}</span>
        </div>
        {eqTotal > 0 && (
          <div className={styles.infoRow}>
            <span className={styles.label}>设备费</span>
            <span className={styles.value}>¥{eqTotal.toFixed(2)}</span>
          </div>
        )}
        {vasTotal > 0 && (
          <div className={styles.infoRow}>
            <span className={styles.label}>增值服务费</span>
            <span className={styles.value}>¥{vasTotal.toFixed(2)}</span>
          </div>
        )}
        {order.extraAmount > 0 && (
          <div className={styles.infoRow}>
            <span className={styles.label}>额外费用</span>
            <span className={styles.value}>¥{order.extraAmount.toFixed(2)}</span>
          </div>
        )}
        <div className={`${styles.infoRow} ${styles.totalRow}`}>
          <span className={styles.label}>合计</span>
          <span className={`${styles.value} ${styles.totalValue}`}>¥{(baseAmount + eqTotal + order.extraAmount).toFixed(2)}</span>
        </div>
      </div>

      {/* 联系管理员 */}
      <div className={styles.infoCard}>
        <h3 className={styles.cardTitle}>联系管理员</h3>
        <div className={styles.contactInfo}>
          <span>请联系管理员处理</span>
        </div>
      </div>

      {/* 拒单原因 */}
      {order.rejectReason && (
        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>拒单原因</h3>
          <p className={styles.rejectReason}>{order.rejectReason}</p>
        </div>
      )}
    </div>
  );
}

interface TimelineItem {
  action: string;
  time: string;
  details?: string;
}

const TIMELINE_LABELS: Record<string, string> = {
  created: '创建订单',
  vas_added: '增值服务',
  end_timer: '结束计时',
};

function formatTimelineTime(time: string | undefined | null): string {
  if (!time) return '-';
  // 统一格式：去掉毫秒，只显示到秒
  return time.replace(/\.\d{3}/, '');
}

export function OrderStatusContent({ timeline }: { timeline: TimelineItem[] }) {
  return (
    <div className={styles.statusContent}>
      {/* 时间列表 */}
      <div className={styles.timeList}>
        {timeline && timeline.length > 0 ? (
          timeline.map((item, index) => (
            <div key={index} className={styles.timeItem}>
              <div className={styles.timeHeader}>
                <span className={styles.timeLabel}>
                  {TIMELINE_LABELS[item.action] || item.action}
                </span>
                <span className={styles.timeValue}>
                  {formatTimelineTime(item.time)}
                </span>
              </div>
              {item.details && <div className={styles.timeDetails}>{item.details}</div>}
            </div>
          ))
        ) : (
          <div className={styles.emptyTimeline}>
            暂无时间轴记录
          </div>
        )}
      </div>
    </div>
  );
}
