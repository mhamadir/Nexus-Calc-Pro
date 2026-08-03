export type TabType = 'Standard' | 'Matrices' | 'Centroids' | 'MOI' | 'History' | 'Settings';

export type UserStatus = 'unverified' | 'pending' | 'active' | 'blocked';
export type PaymentMethod = 'ZainCash' | 'FastPay' | 'FIB' | 'SuperQi' | 'AsiaPay';

export interface PaymentDetails {
  fullName: string;
  transactionId: string;
  paymentMethod: PaymentMethod;
  dateTime: string;
  submittedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status: UserStatus;
  paymentDetails?: PaymentDetails;
  activeDeviceId?: string | null;
  failedDeviceAttempts?: number;
  lastAttemptDeviceId?: string | null;
  blockedReason?: 'multi_device' | 'manual' | string;
  createdAt?: any;
  updatedAt?: any;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  updatedBy?: string;
  updatedAt?: any;
}

export interface HistoryItem {
  id: string;
  type: 'Standard' | 'Matrices' | 'Centroids' | 'MOI';
  expression: string;
  result: string;
  timestamp: string; // ISO date format, displayed statically
  details?: {
    // For Matrices:
    matrixA?: number[][];
    matrixB?: number[][];
    resultMatrix?: number[][];
    resultScalar?: number;
    operation?: string;
    // For Centroids or MOI:
    shape?: string;
    width?: number;
    height?: number;
    radius?: number;
    degree?: number;
    parabolicType?: string;
    // Centroid output metrics:
    area?: number;
    xBar?: number;
    yBar?: number;
    // MOI output metrics:
    ix?: number;
    iy?: number;
    rx?: number;
    ry?: number;
  };
}

export type CentroidShape = 
  | 'Rectangle' 
  | 'Triangle' 
  | 'Circle' 
  | 'Semi-circle' 
  | 'Quarter-circle' 
  | 'Parabolic Spandrel';

export interface ShapeCentroidResult {
  area: number;
  xBar: number;
  yBar: number;
}

export interface ShapeMOIResult {
  ix: number;
  iy: number;
  rx: number;
  ry: number;
}
