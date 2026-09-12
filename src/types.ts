export type TabType = 'Standard' | 'Matrices' | 'Centroids' | 'MOI' | 'History' | 'Settings';

export interface HistoryItem {
  id: string;
  type: 'Standard' | 'Matrices' | 'Centroids' | 'MOI';
  expression: string;
  result: string;
  timestamp: string;
  details?: {
    // For Matrices:
    matrixA?: (number | string)[][];
    matrixB?: (number | string)[][];
    resultMatrix?: number[][];
    resultScalar?: number;
    operation?: string;
    // For Centroids or MOI:
    shape?: string;
    width?: number | string;
    height?: number | string;
    radius?: number | string;
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
