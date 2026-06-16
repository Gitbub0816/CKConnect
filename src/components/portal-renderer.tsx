import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import {
  PublicBookingForm,
  PublicContactForm,
} from "@/components/public-endpoint-actions";

type PortalBlock = {
  type: string;
  id?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  quote?: string;
  attribution?: string;
  action?: string;
  primaryAction?: string;
  secondaryAction?: string;
  layout?: string;
  imageUrl?: string;
  items?: Array<Record<string, string>>;
  steps?: Array<Record<string, string>>;
};

type NavigationItem = { label: string; href: string };
type PageSettings = {
  showClientPortal?: boolean;
  showPoweredBy?: boolean;
  navigationAlignment?: "left" | "center" | "right";
  buttonStyle?: "solid" | "outline" | "pill";
  sectionSpacing?: "compact" | "comfortable" | "spacious";
  maxWidth?: "standard" | "wide" | "full";
  logoSize?: number;
  coverOverlay?: number;
  darkMode?: boolean;
};

function Block({
  block,
  organizationSlug,
}: {
  block: PortalBlock;
  organizationSlug: string;
}) {
  if (block.type === "hero")
    return (
      <section className={`portal-hero portal-hero-${block.layout ?? "split"}`}>
        <div className="portal-hero-copy">
          {block.eyebrow && (
            <div className="portal-eyebrow">{block.eyebrow}</div>
          )}
          <h1>{block.title}</h1>
          <p>{block.body}</p>
          <div className="portal-actions">
            <a className="portal-button" href="#contact">
              {block.primaryAction}
              <ArrowRight size={16} />
            </a>
            {block.secondaryAction && (
              <a
                className="portal-button portal-button-secondary"
                href="#contact"
              >
                {block.secondaryAction}
              </a>
            )}
          </div>
        </div>
        {block.imageUrl ? (
          <div
            className="portal-hero-art bg-cover bg-center"
            style={{ backgroundImage: `url("${block.imageUrl}")` }}
          />
        ) : (
          <div className="portal-hero-art">
            <span />
            <span />
            <span />
          </div>
        )}
      </section>
    );
  if (block.type === "serviceGrid" || block.type === "services")
    return (
      <section className="portal-section" id={block.id}>
        {block.imageUrl && (
          <div
            className="mb-10 h-80 rounded-[var(--portal-radius)] bg-cover bg-center"
            style={{ backgroundImage: `url("${block.imageUrl}")` }}
          />
        )}
        <div className="portal-section-heading">
          <span>Services</span>
          <h2>{block.title}</h2>
        </div>
        {block.items?.length ? (
          <div className="portal-grid">
            {block.items.map((item, index) => (
              <article className="portal-service" key={item.title}>
                <div>0{index + 1}</div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <ArrowRight size={16} />
              </article>
            ))}
          </div>
        ) : (
          <p>{block.body}</p>
        )}
      </section>
    );
  if (block.type === "content")
    return (
      <section className="portal-section" id={block.id}>
        <div className="portal-section-heading">
          <span>Overview</span>
          <h2>{block.title}</h2>
        </div>
        <p className="max-w-3xl text-lg leading-8 opacity-70">{block.body}</p>
        {block.action && (
          <a className="portal-button mt-8" href="#contact">
            {block.action}
            <ArrowRight size={16} />
          </a>
        )}
      </section>
    );
  if (block.type === "payment")
    return (
      <section className="portal-cta" id={block.id}>
        <div>
          <span>Secure payments</span>
          <h2>{block.title}</h2>
          <p>{block.body}</p>
        </div>
        <a
          className="portal-button portal-button-light"
          href="#contact"
        >
          {block.action ?? "Pay an invoice"}
          <ArrowRight size={16} />
        </a>
      </section>
    );
  if (block.type === "booking")
    return (
      <section
        className="portal-section portal-process"
        id={block.id ?? "booking"}
      >
        <div className="portal-section-heading">
          <span>Scheduling</span>
          <h2>{block.title}</h2>
        </div>
        <p>{block.body}</p>
        <PublicBookingForm
          organizationSlug={organizationSlug}
          service={block.title}
        />
      </section>
    );
  if (block.type === "form")
    return (
      <section className="portal-section" id={block.id ?? "contact"}>
        <div className="portal-section-heading">
          <span>Contact</span>
          <h2>{block.title}</h2>
        </div>
        <p>{block.body}</p>
        <PublicContactForm organizationSlug={organizationSlug} />
      </section>
    );
  if (block.type === "portal")
    return (
      <section className="portal-section" id={block.id}>
        <div className="portal-section-heading">
          <span>Customer portal</span>
          <h2>{block.title}</h2>
        </div>
        <p>{block.body}</p>
        <a
          className="portal-button mt-8"
          href="#contact"
        >
          {block.action ?? "Open portal"}
          <ShieldCheck size={16} />
        </a>
      </section>
    );
  if (block.type === "stats")
    return (
      <section className="portal-stats">
        {block.items?.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>
    );
  if (block.type === "testimonial")
    return (
      <section className="portal-quote" id={block.id}>
        <div>“</div>
        <blockquote>{block.quote}</blockquote>
        <cite>{block.attribution}</cite>
      </section>
    );
  if (block.type === "portfolio")
    return (
      <section className="portal-section" id={block.id}>
        <div className="portal-section-heading">
          <span>Selected work</span>
          <h2>{block.title}</h2>
        </div>
        <div className="portal-portfolio">
          {block.items?.map((item, index) => (
            <article key={item.title} style={{ background: item.color }}>
              <span>0{index + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.tag}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  if (block.type === "process")
    return (
      <section className="portal-section portal-process" id={block.id}>
        <div className="portal-section-heading">
          <span>Process</span>
          <h2>{block.title}</h2>
        </div>
        <div className="portal-process-grid">
          {block.steps?.map((step, index) => (
            <article key={step.title}>
              <span>0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>
    );
  if (block.type === "team")
    return (
      <section className="portal-section" id={block.id}>
        <div className="portal-section-heading">
          <span>People</span>
          <h2>{block.title}</h2>
        </div>
        <div className="portal-grid">
          {block.items?.map((item) => (
            <article className="portal-person" key={item.name}>
              <div>
                {item.name
                  ?.split(" ")
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <h3>{item.name}</h3>
              <p>{item.role}</p>
            </article>
          ))}
        </div>
      </section>
    );
  if (block.type === "resourceLinks")
    return (
      <section className="portal-section" id={block.id}>
        <div className="portal-section-heading">
          <span>Resources</span>
          <h2>{block.title}</h2>
        </div>
        <div className="portal-resources">
          {block.items?.map((item) => (
            <Link
              href={
                item.action === "booking" ? "#booking" : "#contact"
              }
              key={item.label}
            >
              {item.action === "payment" ? (
                <FileText size={20} />
              ) : (
                <CalendarDays size={20} />
              )}
              <span>{item.label}</span>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      </section>
    );
  if (block.type === "cta")
    return (
      <section className="portal-cta" id={block.id}>
        <div>
          <span>Let&apos;s begin</span>
          <h2>{block.title}</h2>
          <p>{block.body}</p>
        </div>
        <a className="portal-button portal-button-light" href="#contact">
          {block.action}
          <ArrowRight size={16} />
        </a>
      </section>
    );
  return null;
}

export function PortalRenderer({
  organization,
  navigation,
  blocks,
  settings = {},
}: {
  organization: {
    name: string;
    slug: string;
    theme: {
      logoUrl: string | null;
      primaryColor: string;
      accentColor: string;
      backgroundColor: string;
      surfaceColor: string;
      textColor: string;
      headingFont: string;
      bodyFont: string;
      borderRadius: number;
      customCss: string | null;
      coverImageUrl?: string | null;
    } | null;
  };
  navigation: NavigationItem[];
  blocks: PortalBlock[];
  settings?: PageSettings;
}) {
  const theme = organization.theme;
  const overlay = Math.max(0, Math.min(100, settings.coverOverlay ?? 88)) / 100;
  const style = {
    "--portal-primary": theme?.primaryColor ?? "#c9a033",
    "--portal-accent": theme?.accentColor ?? "#504a44",
    "--portal-background": theme?.backgroundColor ?? "#f5f0e8",
    "--portal-surface": theme?.surfaceColor ?? "#ffffff",
    "--portal-text": theme?.textColor ?? "#1c1917",
    "--portal-radius": `${theme?.borderRadius ?? 12}px`,
    "--portal-heading": theme?.headingFont ?? "Cormorant Garamond",
    "--portal-body": theme?.bodyFont ?? "Geist",
    "--portal-logo-size": `${settings.logoSize ?? 48}px`,
    "--portal-section-padding":
      settings.sectionSpacing === "compact"
        ? "52px"
        : settings.sectionSpacing === "spacious"
          ? "108px"
          : "80px",
    "--portal-max-width":
      settings.maxWidth === "standard"
        ? "1120px"
        : settings.maxWidth === "full"
          ? "100%"
          : "1440px",
    backgroundImage: theme?.coverImageUrl
      ? `linear-gradient(rgb(245 240 232 / ${overlay}), rgb(245 240 232 / ${overlay})), url("${theme.coverImageUrl}")`
      : undefined,
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as React.CSSProperties;
  const initials = organization.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2);
  return (
    <main
      className={`portal-root portal-buttons-${settings.buttonStyle ?? "solid"} ${settings.darkMode ? "portal-dark" : ""}`}
      id="top"
      style={style}
    >
      <div className="portal-shell">
        <nav className="portal-nav">
          <a className="portal-brand" href="#top">
            {theme?.logoUrl ? (
              // Customer logos can be hosted on arbitrary verified domains.
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={`${organization.name} logo`} src={theme.logoUrl} />
            ) : (
              <span>{initials}</span>
            )}
            <div>
              <strong>{organization.name}</strong>
              <small>Client services</small>
            </div>
          </a>
          <div
            className={`portal-links portal-links-${settings.navigationAlignment ?? "center"}`}
          >
            {navigation.map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </div>
          {settings.showClientPortal === true && (
            <Link
              className="portal-button portal-button-small"
              href={`/c/${organization.slug}/login`}
            >
              Client portal
            </Link>
          )}
        </nav>
        {blocks.map((block, index) => (
          <Block
            block={block}
            key={`${block.type}-${index}`}
            organizationSlug={organization.slug}
          />
        ))}
        <footer className="portal-footer">
          <span>© 2026 {organization.name}</span>
          <div>
            <Link href="/legal">Legal</Link>
            {settings.showPoweredBy !== false && (
              <span>
                <ShieldCheck size={14} />
                Securely hosted by <Link href="/">ClearKey Connect</Link>
              </span>
            )}
          </div>
        </footer>
      </div>
    </main>
  );
}
