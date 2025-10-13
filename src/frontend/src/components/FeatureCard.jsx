import { Link } from "react-router-dom";
import { useState } from "react";

export default function FeatureCard({ title, children, to, icon }) {
  const [hovered, setHovered] = useState(false);
  const isLink = Boolean(to);

  const content = (
    <article
      style={{ ...styles.card, ...(hovered ? styles.cardHover : null) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={isLink ? -1 : 0} // keep it tabbable if not wrapped by a Link
    >
      <div style={styles.headerRow}>
        {icon ? <div style={styles.iconWrap}>{icon}</div> : null}
        <h3 style={styles.title}>{title}</h3>
      </div>
      <p style={styles.body}>{children}</p>
    </article>
  );

  return isLink ? (
    <Link to={to} style={styles.linkReset}>
      {content}
    </Link>
  ) : (
    content
  );
}

/* ----- styles ----- */
const styles = {
  linkReset: {
    textDecoration: "none",
    color: "inherit",
    display: "block", // make the whole card area clickable
  },
  card: {
    background: "#27496b",
    border: "1px solid #243047",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
    transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
    outline: "none",
  },
  cardHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
    borderColor: "#2d3a57",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background:
      "#6a97c4",
    display: "grid",
    placeItems: "center",
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.2,
    color: "#e6edf7",
  },
  body: {
    margin: 0,
    opacity: 0.9,
    lineHeight: 1.5,
    color: "#cfd8ea",
  },
};