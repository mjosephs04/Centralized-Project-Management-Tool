import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import powerLinesImg from '../imgs/high-voltage-power-lines-blue-sky.jpg';

/* ----------------- colors ----------------- */
const COLORS = {
  white: "#ffffff",
  lightBg: "rgba(86, 146, 188, 0.6)",            // page background - light blue-gray
  heroTint: "#E3EDF9",           // soft hero gradient base
  textDark: "#111827",
  textMedium: "#4B5563",
  accentBlue: "#1F3B63",         // brand blue
  accentCopper: "#bc8056",
  accentMagenta: "#b356bc",
  borderSoft: "rgba(15, 23, 42, 0.08)",
  cardShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
};

export default function Home() {
  const nav = useNavigate();

  return (
    <div style={styles.page}>

      {/* hover + bullet styles */}
      <style>{`
        .primary-cta-btn:hover {
          background: #27496b !important;
          border-color: white !important;
        }

        .secondary-cta-btn:hover {
          background: #27496b !important;
          border-color: white !important;
        }

        .support-cta-btn:hover {
          background: #27496b !important;
          border-color: white !important;
        }

        .tertiary-cta-btn:hover {
          color: ${COLORS.accentMagenta};
        }

        .feature-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease,
            border-color 0.18s ease, background-color 0.18s ease;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.12);
          border-color: rgba(15, 23, 42, 0.12);
        }

        .bullet::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.68em;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(135deg, ${COLORS.accentCopper}, ${COLORS.accentMagenta});
        }
      `}</style>

      <main style={styles.main}>
        {/* HERO */}
        <section style={{...styles.hero, backgroundImage: `url(${powerLinesImg})`}}>
          <div style={styles.heroOverlay}></div>
          <div style={styles.heroInner}>
            <p style={styles.heroTagline}>
              Lone Star Grid Solutions • Statewide Electric Grid Operations
            </p>

            <h1 style={styles.heroTitle}>
              Transmission Operations & Distribution Dashboard
            </h1>

            <p style={styles.heroLead}>
              TODD is the centralized, web-based control panel for every LSGS project, work order,
              supply request, and schedule across Texas. It replaces scattered legacy tools with one
              real-time view of the grid.
            </p>

            <p style={styles.heroSub}>
              From transmission upgrades to distribution maintenance, TODD connects project managers,
              crews, contractors, and leadership around a single source of truth.
            </p>

            <div style={styles.ctaRow}>
              <button
                type="button"
                onClick={() => nav("/login")}
                style={styles.primaryCtaBtn}
                className="primary-cta-btn"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => nav("/create-account")}
                style={styles.secondaryCtaBtn}
                className="secondary-cta-btn"
              >
                Create Account
              </button>
            </div>
          </div>
        </section>

        {/* WHY TODD */}
<section id="todd-features" style={styles.section}>
  {/* Why TODD Card */}
  <div style={styles.whyToddCard}>
    <h2 style={styles.sectionTitle}>Why LSGS built TODD</h2>
    <p style={styles.sectionIntro}>
      Legacy systems split project and field information across multiple platforms,
      making it difficult to see progress, manage deadlines, or understand financial
      impact in real time. TODD consolidates that work into one modern dashboard.
    </p>

    <ul style={styles.bulletList}>
      <li style={styles.bulletItem} className="bullet">
        Replace disconnected legacy tools with an integrated platform that speaks the
        language of grid operations.
      </li>
      <li style={styles.bulletItem} className="bullet">
        Give control center staff a live view of work orders, dependencies, and risk
        areas across the state.
      </li>
      <li style={styles.bulletItem} className="bullet">
        Improve accountability for schedules, crews, contractors, and budget performance.
      </li>
      <li style={styles.bulletItem} className="bullet">
        Provide leadership with reliable, unified data to guide regulatory and strategic
        decisions.
      </li>
    </ul>
  </div>

  {/* What TODD Centralizes */}
  <div style={styles.centralizesSection}>
    <h3 style={styles.subheading}>What TODD centralizes</h3>
    <div style={styles.featureGrid}>
      <div style={{ ...styles.featureCard, borderTopColor: COLORS.accentBlue }} className="feature-card">
        <h4 style={styles.cardTitle}>Project Portfolio</h4>
        <p style={styles.cardBody}>
          Track every project—from line rebuilds to substation upgrades—in one portfolio
          view, filtered by region, voltage class, or priority.
        </p>
      </div>
      <div style={{ ...styles.featureCard, borderTopColor: COLORS.accentBlue }} className="feature-card">
        <h4 style={styles.cardTitle}>Work Orders & Field Execution</h4>
        <p style={styles.cardBody}>
          Create, assign, and monitor work orders in real time, keeping plans aligned with
          what is actually happening in the field.
        </p>
      </div>
      <div style={{ ...styles.featureCard, borderTopColor: COLORS.accentBlue }} className="feature-card">
        <h4 style={styles.cardTitle}>Supplies & Logistics</h4>
        <p style={styles.cardBody}>
          Connect supply requests, vendor deliveries, and material constraints to the
          projects and work orders that depend on them.
        </p>
      </div>
      <div style={{ ...styles.featureCard, borderTopColor: COLORS.accentBlue }} className="feature-card">
        <h4 style={styles.cardTitle}>Financials & Performance</h4>
        <p style={styles.cardBody}>
          Tie cost and progress together so managers can see budget, commitments, and
          earned value across the entire grid program.
        </p>
      </div>
      <div style={{ ...styles.featureCard, borderTopColor: COLORS.accentBlue }} className="feature-card">
        <h4 style={styles.cardTitle}>Team Collaboration</h4>
        <p style={styles.cardBody}>
          Streamline communication across project teams with integrated messaging, role-based
          permissions, and real-time updates on project activities.
        </p>
      </div>
    </div>
  </div>
</section>

        {/* ROLES */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Built for every role in the grid</h2>
          <div style={styles.rolesGrid}>
            <div style={styles.roleCard}>
              <h3 style={styles.roleTitle}>Grid Operations</h3>
              <p style={styles.roleBody}>
                Monitor system-critical work, understand field activity at a glance, and coordinate
                outages with confidence in the data.
              </p>
            </div>
            <div style={styles.roleCard}>
              <h3 style={styles.roleTitle}>Project Managers</h3>
              <p style={styles.roleBody}>
                Plan and sequence work, track dependencies, and keep leadership informed with
                accurate timelines and risk visibility.
              </p>
            </div>
            <div style={styles.roleCard}>
              <h3 style={styles.roleTitle}>Crews & Contractors</h3>
              <p style={styles.roleBody}>
                Receive clear assignments, access scope and documentation, and update progress so
                the control center always sees the latest status.
              </p>
            </div>
          </div>
        </section>

        {/* SUPPORT BAND */}
        <section style={styles.supportBand}>
          <div style={styles.supportLeft}>
            <h2 style={styles.supportTitle}>Need help with TODD access or onboarding?</h2>
            <p style={styles.supportBody}>
              The LSGS support team can assist with account setup, role configuration, and training
              for project teams, crews, and contractors.
            </p>
          </div>
          <div style={styles.supportRight}>
            <div style={styles.supportBlock}>
              <div style={styles.supportLabel}>LSGS Support Center</div>
              <div style={styles.supportValue}>1-800-LSGS-TX1</div>
              <div style={styles.supportSub}>Monday–Friday • 7:00 a.m.–6:00 p.m. CT</div>
            </div>
            <button
              type="button"
              style={styles.supportBtn}
              className="support-cta-btn"
              onClick={() => {
                window.location.href = "mailto:support@lsgs-todd.com";
              }}
            >
              Contact Support
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ----------------- styles ----------------- */
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: COLORS.lightBg, // Clean light blue-gray background
    color: COLORS.textDark,
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },

  main: {
    flex: 1,
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
    padding: "40px 24px 72px",
    position: "relative",
    zIndex: 1,
  },

  /* HERO */
  hero: {
    marginBottom: 72,
    marginTop: 20,
    position: "relative",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    borderRadius: 20,
    padding: "60px 40px",
    overflow: "hidden",
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(255, 255, 255, 0.85)",
    zIndex: 1,
  },
  heroInner: {
    maxWidth: 760,
    margin: "0 auto",
    textAlign: "center",
    position: "relative",
    zIndex: 2,
  },
  heroTagline: {
    display: "inline-block",
    padding: "6px 14px",
    borderRadius: 999,
    background: "rgba(31, 59, 99, 0.06)",
    color: COLORS.accentBlue,
    fontSize: 12,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: 16,
    fontWeight: 600,
  },
  heroTitle: {
    fontSize: 40,
    lineHeight: 1.2,
    fontWeight: 800,
    margin: "0 0 16px",
  },
  heroLead: {
    fontSize: 18,
    color: COLORS.textMedium,
    lineHeight: 1.7,
    margin: "0 0 8px",
  },
  heroSub: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 1.7,
    margin: "0 0 24px",
  },

  ctaRow: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  primaryCtaBtn: {
    background: "#6a97c4",
    color: COLORS.white,
    height: "50px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "40px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition: "all 0.3s ease",
    padding: "0 20px",
  },
  secondaryCtaBtn: {
    background: "#6a97c4",
    color: COLORS.white,
    height: "50px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "40px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition: "all 0.3s ease",
    padding: "0 20px",
  },
  tertiaryCtaBtn: {
    background: "transparent",
    color: COLORS.textMedium,
    padding: "12px 10px",
    border: "none",
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "underline",
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginTop: 8,
  },
  statCard: {
    background: COLORS.white,
    borderRadius: 14,
    padding: "14px 16px",
    border: `1px solid ${COLORS.borderSoft}`,
    boxShadow: COLORS.cardShadow,
    textAlign: "left",
  },
  statLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#9CA3AF",
    marginBottom: 6,
    fontWeight: 600,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
    color: COLORS.accentBlue,
  },
  statText: {
    fontSize: 14,
    color: COLORS.textMedium,
  },

  /* GENERIC SECTION */
  section: {
    marginBottom: 64,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 14px",
    lineHeight: 1.3,
    color: COLORS.textDark,
  },
  sectionIntro: {
    fontSize: 15,
    lineHeight: 1.8,
    color: COLORS.textMedium,
    margin: "0 0 18px",
    maxWidth: 540,
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.1fr)",
    gap: 40,
    alignItems: "flex-start",
  },

  bulletList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  bulletItem: {
    position: "relative",
    paddingLeft: 20,
    fontSize: 14,
    color: COLORS.textMedium,
    lineHeight: 1.8,
    marginBottom: 10,
  },

  subheading: {
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 14px",
    color: COLORS.textDark,
    lineHeight: 1.3,
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginTop: 0,
  },
  featureCard: {
    background: COLORS.white,
    borderRadius: 14,
    padding: "18px 18px 16px",
    border: `1px solid ${COLORS.borderSoft}`,
    boxShadow: COLORS.cardShadow,
    borderTopWidth: 4,
    borderTopStyle: "solid",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    margin: "0 0 8px",
  },
  cardBody: {
    fontSize: 14,
    color: COLORS.textMedium,
    lineHeight: 1.7,
    margin: 0,
  },

  rolesGrid: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
  roleCard: {
    background: COLORS.white,
    borderRadius: 14,
    padding: "18px 18px 16px",
    border: `1px solid ${COLORS.borderSoft}`,
    boxShadow: COLORS.cardShadow,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: "0 0 8px",
  },
  roleBody: {
    fontSize: 14,
    color: COLORS.textMedium,
    lineHeight: 1.7,
    margin: 0,
  },

 /* SUPPORT BAND */
supportBand: {
  marginTop: 8,
  padding: "28px 32px",
  borderRadius: 24,
  background: "linear-gradient(180deg, #f4f7fb 0%, #ffffff 60%)",
  border: `1px solid ${COLORS.borderSoft}`,
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.10)",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 0.9fr)",
  gap: 28,
  alignItems: "center",
},

supportLeft: {
  minWidth: 0,
},

supportRight: {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 12,
},

supportTitle: {
  fontSize: 20,
  fontWeight: 700,
  margin: "0 0 10px",
  color: COLORS.textDark,
},

supportBody: {
  fontSize: 14,
  color: COLORS.textMedium,
  lineHeight: 1.7,
  margin: 0,
  maxWidth: 520,
},

supportBlock: {
  alignSelf: "stretch",
  padding: "12px 18px 10px",
  borderRadius: 18,
  border: "1px solid rgba(148,163,184,0.35)",
  backgroundColor: COLORS.white,
  boxShadow: "0 10px 30px rgba(148,163,184,0.18)",
},

supportLabel: {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#9CA3AF",
  marginBottom: 4,
  fontWeight: 600,
},

supportValue: {
  fontSize: 18,
  fontWeight: 700,
  color: COLORS.accentBlue,
  marginBottom: 2,
},

supportSub: {
  fontSize: 13,
  color: COLORS.textMedium,
},

supportBtn: {
  background: "#6a97c4",
  color: COLORS.white,
  height: "50px",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: "40px",
  fontSize: "16px",
  fontWeight: 600,
  cursor: "pointer",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  transition: "all 0.3s ease",
  padding: "0 20px",
  alignSelf: "flex-end",
  marginTop: 2,
},
whyToddCard: {
  background: COLORS.white,
  borderRadius: 14,
  padding: "24px 28px",
  border: `1px solid ${COLORS.borderSoft}`,
  boxShadow: COLORS.cardShadow,
  marginBottom: 32,
},

centralizesSection: {
  marginTop: 0,
}
};