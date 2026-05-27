export type VarType = 'Int' | 'Real' | 'Bool' | { BitVec: number };
export type Z3Value = bigint | number | boolean;
export type SolveResult = Record<string, Z3Value> | null;
