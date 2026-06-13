import "server-only";

export type DnsRecordInput = { type: string; name: string; content: string; ttl?: number; proxied?: boolean };
export type DnsAnswer = { name: string; type: number; TTL: number; data: string };
export type DnsCheck = { key: string; label: string; status: "HEALTHY" | "NEEDS_ATTENTION" | "INVALID"; answers: string[]; guidance: string };

export interface DnsProvider {
  verifyDomain(hostname: string, verificationToken?: string): Promise<boolean>;
  inspectDomain(hostname: string, verificationToken?: string): Promise<DnsCheck[]>;
  createRecord(zoneId: string, record: DnsRecordInput): Promise<{ id: string }>;
  updateRecord(zoneId: string, recordId: string, record: DnsRecordInput): Promise<{ id: string }>;
  deleteRecord(zoneId: string, recordId: string): Promise<void>;
  listRecords(zoneId: string): Promise<Array<{ id: string; type: string; name: string; content: string }>>;
}

export class CloudflareDnsProvider implements DnsProvider {
  private async resolve(name: string, type: string) {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`DNS lookup failed for ${name} ${type}`);
    const body = await response.json() as { Status: number; Answer?: DnsAnswer[] };
    return body.Status === 0 ? body.Answer ?? [] : [];
  }
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
  async verifyDomain(hostname: string, verificationToken?: string) {
    if (!verificationToken) return false;
    const answers = await this.resolve(`_clearkey.${hostname}`, "TXT");
    return answers.some((answer) => answer.data.replaceAll("\"", "").trim() === verificationToken);
  }
  async inspectDomain(hostname: string, verificationToken?: string) {
    const [ownership, a, aaaa, cname, mx, rootTxt, dmarc, dkim] = await Promise.all([
      this.resolve(`_clearkey.${hostname}`, "TXT"),
      this.resolve(hostname, "A"),
      this.resolve(hostname, "AAAA"),
      this.resolve(hostname, "CNAME"),
      this.resolve(hostname, "MX"),
      this.resolve(hostname, "TXT"),
      this.resolve(`_dmarc.${hostname}`, "TXT"),
      this.resolve(`zmail._domainkey.${hostname}`, "TXT"),
    ]);
    const values = (answers: DnsAnswer[]) => answers.map((answer) => answer.data.replaceAll("\"", ""));
    const owned = Boolean(verificationToken && values(ownership).some((value) => value.trim() === verificationToken));
    const webAnswers = [...values(a), ...values(aaaa), ...values(cname)];
    const spf = values(rootTxt).filter((value) => value.toLowerCase().startsWith("v=spf1"));
    const dmarcValues = values(dmarc).filter((value) => value.toLowerCase().startsWith("v=dmarc1"));
    const dkimValues = values(dkim).filter((value) => value.toLowerCase().includes("v=dkim1"));
    const check = (key: string, label: string, healthy: boolean, answers: string[], guidance: string, invalid = false): DnsCheck => ({
      key,
      label,
      status: healthy ? "HEALTHY" : invalid ? "INVALID" : "NEEDS_ATTENTION",
      answers,
      guidance,
    });
    return [
      check("ownership", "Ownership TXT", owned, values(ownership), `Create TXT _clearkey.${hostname} with the verification value shown in ClearKey.`),
      check("web", "Website routing", webAnswers.length > 0, webAnswers, "Point the apex or www hostname to the ClearKey website target."),
      check("mx", "Mail exchange", mx.length > 0, values(mx), "Add the MX records supplied by the connected mail provider."),
      check("spf", "SPF", spf.length === 1, spf, spf.length > 1 ? "Merge duplicate SPF policies into a single TXT record." : "Publish one SPF TXT policy for authorized senders.", spf.length > 1),
      check("dkim", "DKIM", dkimValues.length > 0, dkimValues, "Publish the Zoho DKIM selector record after mailbox provisioning."),
      check("dmarc", "DMARC", dmarcValues.length === 1, dmarcValues, dmarcValues.length > 1 ? "Remove duplicate DMARC policies." : "Publish a DMARC policy at _dmarc.", dmarcValues.length > 1),
    ];
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
