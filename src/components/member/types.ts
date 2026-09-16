export interface VasServiceItem {
  name: string;
  pricePerUse: number;
  quantity: number;
  subtotal: number;
  createdAt?: string;
}

export interface TimelineItem {
  action: string;
  time: string;
  details?: string;
}

export interface OrderDetail {
  id: number;
  orderNo: string;
  status: string;
  venueName: string;
  venuePricePerHour: number;
  entryTime: string | null;
  exitTime: string | null;
  durationMinutes: number;
  baseAmount: number;
  extraAmount: number;
  finalAmount: number;
  vasServiceTotal: number;
  vasServices: VasServiceItem[];
  leaderName: string | null;
  leaderPhone: string | null;
  remark: string | null;
  createdAt: string;
  rejectReason: string | null;
  timeline: TimelineItem[];
  currentAmount?: number;
}
