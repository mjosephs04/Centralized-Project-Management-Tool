import { NavLink, useNavigate, useLocation } from "react-router-dom";

export default function NavBar({
  primaryCta = { label: "Login", to: "/login" },
  secondaryCta = { label: "Create Account", to: "/register" }, // set to null to hide
}) {
  const nav = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav style={styles.bar} aria-label="Primary">
      {/* brand */}
      <div style={styles.brandRow}>
        <div style={styles.brandDot} aria-hidden />
        <div>
          <div style={styles.brandTop}>LSGS</div>
          <div style={styles.brandSub}>Pariveda</div>
        </div>
      </div>

      {/* CTAs */}
      <div style={styles.ctaRow}>
        {secondaryCta ? (
          <button onClick={() => nav(secondaryCta.to)} style={styles.ghostPill}>
            {secondaryCta.label}
          </button>
        ) : null}
        {primaryCta ? (
          <button onClick={() => nav(primaryCta.to)} style={styles.solidPill}>
            {primaryCta.label}
          </button>
        ) : null}
      </div>
    </nav>
  );
}

/* ----- small subcomponent for nav items ----- */
function NavItem({ to, label, active }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...styles.link,
        color: isActive || active ? "#22d3ee" : "#e6edf7",
        fontWeight: isActive || active ? 800 : 600,
      })}
    >
      {label}
    </NavLink>
  );
}

/* ----- styles ----- */
const COLORS = {
  blue: "#143088",
  blueDark: "#0b1f64",
  text: "#e6edf7",
  pillGrad: "linear-gradient(180deg, #c6587a 0%, #b64c6c 70%, #a64562 100%)",
};

const styles = {
  bar: {
    height: 76,
    paddingInline: 20,
    background: COLORS.blue,
    borderBottom: `1px solid ${COLORS.blueDark}`,
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: 16,
    position: "relative",
    zIndex: 3,
    fontFamily:
      "Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 10 },
  brandDot: {
    width: 14,
    height: 14,
    borderRadius: 14,
    background: "#ff5e57",
    boxShadow: "0 0 18px rgba(255,94,87,0.9)",
  },
  brandTop: { fontWeight: 900, fontSize: 24, letterSpacing: 1, color: COLORS.text },
  brandSub: { marginTop: -4, fontWeight: 700, opacity: 0.9, color: COLORS.text },

  linksRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    justifyContent: "center",
  },
  link: {
    textDecoration: "none",
    color: COLORS.text,
    padding: "8px 10px",
    borderRadius: 10,
  },

  // Right-align the CTA group in the grid cell
  ctaRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    justifySelf: "end",   // <-- key change
    textAlign: "right",   // optional, keeps content right-aligned inside the cell
  },
  solidPill: {
    background: COLORS.pillGrad,
    color: COLORS.text,
    border: "none",
    padding: "10px 16px",
    borderRadius: 999,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  },
  ghostPill: {
    background: "transparent",
    color: COLORS.text,
    border: "1px solid rgba(255,255,255,0.55)",
    padding: "10px 16px",
    borderRadius: 999,
    fontWeight: 700,
    cursor: "pointer",
  },
};
