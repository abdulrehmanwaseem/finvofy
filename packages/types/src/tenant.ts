export interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  settings: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
