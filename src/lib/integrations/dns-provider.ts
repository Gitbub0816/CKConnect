import "server-only";

export type DnsRecordInput = { type: string; name: string; content: string; ttl?: number; proxied?: boolean };

export interface DnsProvider {
  verifyDomain(hostname: string): Promise<boolean>;
  createRecord(zoneId: string, record: DnsRecordInput): Promise<{ id: string }>;
  updateRecord(zoneId: string, recordId: string, record: DnsRecordInput): Promise<{ id: string }>;
  deleteRecord(zoneId: string, recordId: string): Promise<void>;
  listRecords(zoneId: string): Promise<Array<{ id: string; type: string; name: string; content: string }>>;
}

export class CloudflareDnsProvider implements DnsProvider {
  private async request<T>(path: string, init?: RequestInit) {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (!token) throw new Error("CLOUDFLARE_API_TOKEN is not configured");
    const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init?.headers },
    });
    const body = await response.json() as { success: boolean; result: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.success) throw new Error(body.errors?.[0]?.message ?? "Cloudflare request failed");
    return body.result;
  }
  async verifyDomain(hostname: string) {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=NS`, { headers: { accept: "application/dns-json" } });
    const body = await response.json() as { Answer?: unknown[] };
    return Boolean(body.Answer?.length);
  }
  createRecord(zoneId: string, record: DnsRecordInput) {
    return this.request<{ id: string }>(`/zones/${zoneId}/dns_records`, { method: "POST", body: JSON.stringify(record) });
  }
  updateRecord(zoneId: string, recordId: string, record: DnsRecordInput) {
    return this.request<{ id: string }>(`/zones/${zoneId}/dns_records/${recordId}`, { method: "PUT", body: JSON.stringify(record) });
  }
  async deleteRecord(zoneId: string, recordId: string) {
    await this.request(`/zones/${zoneId}/dns_records/${recordId}`, { method: "DELETE" });
  }
  listRecords(zoneId: string) {
    return this.request<Array<{ id: string; type: string; name: string; content: string }>>(`/zones/${zoneId}/dns_records`);
  }
}
